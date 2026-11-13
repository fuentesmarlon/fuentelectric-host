'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { headers } from 'next/headers'
import { consumirIntento, mensajeEspera } from '@/lib/rate-limit'
import { duracionSesionSeg } from '@/lib/auth'
import { esAdministrador } from '@/lib/roles'

// Inicio de sesión. Depende del rol guardado en la tabla Usuario (ver lib/roles.ts):
//  - ADMIN y SUPERADMIN: eligen entre su contraseña de Supabase o un código por correo.
//    La sesión dura 1 hora.
//  - TRABAJADOR: solo código de 6 dígitos por correo (enviado con Resend). La sesión dura 30 días.
// Las duraciones están en lib/auth.ts y se revisan en el servidor en cada página.
//
// Las cuentas se crean desde el panel (Cuentas de acceso, solo superadministrador), que da
// de alta a la persona en Supabase Auth y en la tabla Usuario con el mismo id.

// Límites contra abuso (por ejemplo, alguien probando correos o pidiendo códigos sin parar)
const VENTANA_MS = 10 * 60 * 1000 // 10 minutos
const MAX_INTENTOS_POR_IP = 10 // identificaciones / reenvíos / verificaciones por IP
const MAX_CODIGOS_POR_CORREO = 3 // correos OTP enviados a una misma dirección
const MAX_VERIFICACIONES_POR_CORREO = 5 // códigos ingresados para una misma dirección

async function obtenerIpCliente(): Promise<string> {
  const h = await headers()
  const reenviada = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  return reenviada || h.get('x-real-ip') || 'desconocida'
}

async function limitarPorIp(accion: string): Promise<string | null> {
  const ip = await obtenerIpCliente()
  const res = consumirIntento(`${accion}:ip:${ip}`, MAX_INTENTOS_POR_IP, VENTANA_MS)
  return res.permitido ? null : mensajeEspera(res.reintentarEnSeg)
}

function limitarEnvioCodigo(email: string): string | null {
  const res = consumirIntento(`otp-envio:email:${email}`, MAX_CODIGOS_POR_CORREO, VENTANA_MS)
  return res.permitido ? null : mensajeEspera(res.reintentarEnSeg)
}

// A dónde va la persona al iniciar sesión. Si el superadministrador le pidió cambiar la
// contraseña (cuenta nueva o contraseña restablecida), primero pasa por /cambiar-contrasena.
// Aunque se saltara este paso, lib/sesion.ts no la deja entrar al panel hasta cambiarla.
function destinoTrasLogin(debeCambiarContrasena: boolean) {
  return debeCambiarContrasena ? '/cambiar-contrasena' : '/tableros'
}

export type IdentificacionResult =
  | { ok: true; tipo: 'PASSWORD'; nombre: string; email: string }
  | { ok: true; tipo: 'OTP'; nombre: string; email: string; mensaje?: string }
  | { ok: false; error: string }

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Plantilla de correo corporativa para envío de código OTP
 */
async function enviarCorreoOtp(email: string, otp: string, nombre?: string) {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Código de Acceso Fuentelectric</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(10,38,70,0.06);">
    <!-- Encabezado con identidad Fuentelectric -->
    <tr>
      <td style="background-color: #003B63; padding: 28px 24px; text-align: center;">
        <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">Fuentelectric</h1>
        <p style="color: #F2E500; font-size: 12px; font-weight: 600; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px;">Control de Asistencias y Turnos</p>
      </td>
    </tr>
    <!-- Contenido del código -->
    <tr>
      <td style="padding: 32px 28px; text-align: center; color: #1e293b;">
        <h2 style="font-size: 19px; font-weight: 700; margin: 0 0 8px 0; color: #00274c;">Tu código de acceso</h2>
        <p style="font-size: 14px; line-height: 1.5; color: #64748b; margin: 0 0 24px 0;">
          Hola${nombre ? ` <strong>${nombre}</strong>` : ''}, usa el siguiente código para iniciar sesión en el portal operativo:
        </p>
        
        <div style="background-color: #f8fafc; border: 2px dashed #004884; border-radius: 12px; padding: 18px 20px; display: inline-block; margin-bottom: 24px;">
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #003B63;">
            ${otp}
          </span>
        </div>

        <p style="font-size: 12px; color: #94a3b8; line-height: 1.4; margin: 0;">
          Este código expira en 10 minutos por motivos de seguridad.<br>
          Si no solicitaste este acceso, puedes ignorar este mensaje.
        </p>
      </td>
    </tr>
    <!-- Pie institucional -->
    <tr>
      <td style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          Fuentelectric · Trabajando para EEGSA · Red de Distribución Eléctrica
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  return resend.emails.send({
    from: 'Fuentelectric <no-reply@codigos.fuentelectric.com>',
    to: [email],
    subject: `${otp} es tu código de acceso · Fuentelectric`,
    html,
  })
}

/**
 * Paso 1: Valida el correo contra la base de datos de forma segura.
 * - Por seguridad no divulga qué rol tiene la cuenta.
 * - Si requiere contraseña: solicita contraseña.
 * - Si requiere OTP: genera el código firmado con Supabase y lo envía con Resend.
 */
export async function identificarUsuario(emailRaw: string): Promise<IdentificacionResult> {
  const email = emailRaw?.trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Por favor, ingresa un correo electrónico válido.' }
  }

  const bloqueoIp = await limitarPorIp('identificar')
  if (bloqueoIp) return { ok: false, error: bloqueoIp }

  const dbUser = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, nombre: true, email: true, rol: true },
  })

  // Nota: este mensaje confirma que el correo no está registrado (prioriza la usabilidad
  // en una herramienta interna). El límite por IP de arriba frena la enumeración masiva.
  if (!dbUser) {
    return {
      ok: false,
      error: 'No se encontró ninguna cuenta asociada a este correo electrónico. Verifica la dirección ingresada.',
    }
  }

  // Administradores: primero se les pide la contraseña; desde ahí pueden pedir un código
  // por correo si lo prefieren (reenviarCodigoOtp). Así no se envían correos sin que lo pidan.
  if (esAdministrador(dbUser.rol)) {
    return {
      ok: true,
      tipo: 'PASSWORD',
      nombre: dbUser.nombre,
      email: dbUser.email,
    }
  }

  // Si su autenticación configurada es por código OTP (TRABAJADOR)
  const bloqueoCorreo = limitarEnvioCodigo(dbUser.email)
  if (bloqueoCorreo) return { ok: false, error: bloqueoCorreo }

  try {
    const supabaseAdmin = createAdminClient()

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: dbUser.email,
    })

    if (linkError || !linkData?.properties?.email_otp) {
      console.error('Error generando OTP con Supabase Admin:', linkError)
      return {
        ok: false,
        error: 'No se pudo generar el código de acceso temporal. Por favor intenta de nuevo.',
      }
    }

    const otpCode = linkData.properties.email_otp

    // Envío del correo vía Resend
    const { error: resendError } = await enviarCorreoOtp(dbUser.email, otpCode, dbUser.nombre)

    if (resendError) {
      console.error('Error enviando correo con Resend:', resendError)
      return {
        ok: false,
        error: `No pudimos enviar el correo de acceso: ${resendError.message}`,
      }
    }

    return {
      ok: true,
      tipo: 'OTP',
      nombre: dbUser.nombre,
      email: dbUser.email,
      mensaje: `Hemos enviado un código a ${dbUser.email}`,
    }
  } catch (err: unknown) {
    console.error('Error inesperado en identificación:', err)
    return {
      ok: false,
      error: 'Ocurrió un error al procesar el acceso. Por favor intenta nuevamente.',
    }
  }
}

/**
 * Envía (o reenvía) un código de acceso al correo. Lo usan los trabajadores para reenviar
 * el código y los administradores cuando eligen entrar con código en lugar de contraseña.
 */
export async function reenviarCodigoOtp(emailRaw: string): Promise<{ ok: boolean; error?: string }> {
  const email = emailRaw?.trim().toLowerCase()
  if (!email) return { ok: false, error: 'Correo inválido.' }

  const bloqueoIp = await limitarPorIp('reenviar')
  if (bloqueoIp) return { ok: false, error: bloqueoIp }

  const dbUser = await prisma.usuario.findUnique({
    where: { email },
    select: { rol: true, nombre: true },
  })

  if (!dbUser) {
    return { ok: false, error: 'Acción no permitida.' }
  }

  const bloqueoCorreo = limitarEnvioCodigo(email)
  if (bloqueoCorreo) return { ok: false, error: bloqueoCorreo }

  try {
    const supabaseAdmin = createAdminClient()
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    if (linkError || !linkData?.properties?.email_otp) {
      return { ok: false, error: 'No se pudo generar un nuevo código.' }
    }

    const { error: resendError } = await enviarCorreoOtp(email, linkData.properties.email_otp, dbUser.nombre)
    if (resendError) {
      return { ok: false, error: `Error al enviar el correo: ${resendError.message}` }
    }

    return { ok: true }
  } catch {
    return { ok: false, error: 'Error al reenviar el código.' }
  }
}

/**
 * Valida el código de acceso y abre la sesión con la duración de su rol
 * (30 días trabajador, 1 hora administradores).
 */
export async function verificarCodigoOtp(
  emailRaw: string,
  tokenRaw: string
): Promise<{ ok: boolean; error?: string }> {
  const email = emailRaw?.trim().toLowerCase()
  const token = tokenRaw?.trim()

  if (!email || !token || token.length < 6) {
    return { ok: false, error: 'Por favor, ingresa el código completo de acceso.' }
  }

  const bloqueoIp = await limitarPorIp('verificar')
  if (bloqueoIp) return { ok: false, error: bloqueoIp }

  const intentoCorreo = consumirIntento(`otp-verificar:email:${email}`, MAX_VERIFICACIONES_POR_CORREO, VENTANA_MS)
  if (!intentoCorreo.permitido) return { ok: false, error: mensajeEspera(intentoCorreo.reintentarEnSeg) }

  const dbUser = await prisma.usuario.findUnique({
    where: { email },
    select: { rol: true, debeCambiarContrasena: true },
  })
  if (!dbUser) {
    return { ok: false, error: 'El código ingresado es incorrecto o ha vencido. Solicita uno nuevo si es necesario.' }
  }

  // La cookie dura lo mismo que la sesión de su rol; el límite real se revisa en el servidor
  const supabase = await createClient({ maxAge: duracionSesionSeg(dbUser.rol) })

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })

  if (error) {
    console.error('Error al verificar OTP en Supabase:', error)
    return {
      ok: false,
      error: 'El código ingresado es incorrecto o ha vencido. Solicita uno nuevo si es necesario.',
    }
  }

  revalidatePath('/', 'layout')
  // Un administrador con la contraseña restablecida puede entrar con código y desde ahí elegir una nueva
  redirect(destinoTrasLogin(dbUser.debeCambiarContrasena))
}

/**
 * Inicio de sesión con contraseña (administradores y superadministradores). Sesión de 1 hora.
 */
export async function loginAdmin(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/login?error=Por+favor+ingresa+correo+y+contraseña')
  }

  const bloqueoIp = await limitarPorIp('login-admin')
  if (bloqueoIp) {
    redirect(`/login?error=${encodeURIComponent(bloqueoIp)}`)
  }

  const dbUser = await prisma.usuario.findUnique({
    where: { email },
    select: { rol: true, debeCambiarContrasena: true },
  })

  if (!dbUser || !esAdministrador(dbUser.rol)) {
    redirect('/login?error=Credenciales+incorrectas')
  }

  const supabase = await createClient({ maxAge: duracionSesionSeg(dbUser.rol) })

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/login?error=Credenciales+incorrectas')
  }

  revalidatePath('/', 'layout')
  redirect(destinoTrasLogin(dbUser.debeCambiarContrasena))
}

