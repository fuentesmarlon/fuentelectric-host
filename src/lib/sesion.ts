import { cache } from 'react'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'
import { sesionExpirada } from '@/lib/auth'
import { esAdministrador, esSuperadmin, type Rol } from '@/lib/roles'

export type SesionActual = {
  id: string
  email: string
  nombre: string
  rol: Rol
  lastSignInAt: string | null
  debeCambiarContrasena: boolean
}

/**
 * Usuario de la sesión actual, consultado UNA sola vez por petición.
 * `cache` comparte el resultado entre el layout y la página de /tableros,
 * así cada navegación hace una sola llamada a Supabase Auth y una a la tabla Usuario.
 */
export const obtenerSesion = cache(async (): Promise<SesionActual | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const dbUser = await prisma.usuario.findUnique({
    where: { id: user.id },
    select: { rol: true, nombre: true, debeCambiarContrasena: true },
  })

  return {
    id: user.id,
    email: user.email ?? '',
    nombre: dbUser?.nombre || user.email || 'Usuario',
    rol: dbUser?.rol ?? 'TRABAJADOR',
    lastSignInAt: user.last_sign_in_at ?? null,
    debeCambiarContrasena: dbUser?.debeCambiarContrasena ?? false,
  }
})

/**
 * Sesión iniciada y no caducada, sin mirar el cambio de contraseña pendiente.
 * La usa directamente /cambiar-contrasena; el resto de páginas usa requerirSesion.
 */
export async function requerirSesionVigente(): Promise<SesionActual> {
  const sesion = await obtenerSesion()
  if (!sesion) redirect('/login')

  if (sesionExpirada(sesion.lastSignInAt, sesion.rol)) {
    const mensaje =
      esAdministrador(sesion.rol)
        ? 'Tu sesión ha expirado (límite de 1 hora). Vuelve a iniciar sesión.'
        : 'Tu sesión ha caducado (límite de 30 días). Por favor solicita un nuevo código.'
    redirect(`/login?expirada=1&error=${encodeURIComponent(mensaje)}`)
  }

  return sesion
}

/**
 * Para páginas: exige sesión iniciada y vigente (1 hora administradores / 30 días trabajador).
 * Una sesión caducada se envía a /login?expirada=1, donde el middleware la cierra
 * (un Server Component no puede borrar cookies; el middleware sí).
 * Si el superadministrador pidió un cambio de contraseña, no deja ver nada hasta hacerlo.
 */
export async function requerirSesion(): Promise<SesionActual> {
  const sesion = await requerirSesionVigente()
  if (sesion.debeCambiarContrasena) redirect('/cambiar-contrasena')
  return sesion
}

/** Para páginas de administración (ADMIN o SUPERADMIN): los demás vuelven al tablero. */
export async function requerirAdminPagina(): Promise<SesionActual> {
  const sesion = await requerirSesion()
  if (!esAdministrador(sesion.rol)) redirect('/tableros')
  return sesion
}

/** Para páginas solo del superadministrador (Cuentas de acceso). */
export async function requerirSuperadminPagina(): Promise<SesionActual> {
  const sesion = await requerirSesion()
  if (!esSuperadmin(sesion.rol)) redirect('/tableros')
  return sesion
}
