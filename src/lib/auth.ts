import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'
import { esAdministrador, esSuperadmin } from '@/lib/roles'

// Tiempos de vida de sesión por rol
export const DURACION_SESION_ADMIN_SEG = 60 * 60 // 1 hora (administradores y superadministradores)
export const DURACION_SESION_TRABAJADOR_SEG = 30 * 24 * 60 * 60 // 30 días (1 mes)

/** Cuánto dura la sesión de un rol, en segundos. */
export function duracionSesionSeg(rol: string | null | undefined): number {
  return esAdministrador(rol) ? DURACION_SESION_ADMIN_SEG : DURACION_SESION_TRABAJADOR_SEG
}

/**
 * Indica si la sesión superó la duración máxima de su rol, medida desde el último
 * inicio de sesión. Las cookies se renuevan con cada refresh del token, así que este
 * chequeo en el servidor es el que realmente impone el límite.
 */
export function sesionExpirada(
  lastSignInAt: string | null | undefined,
  rol: string | null | undefined,
  ahora: number = Date.now(),
): boolean {
  if (!lastSignInAt) return false
  const inicio = new Date(lastSignInAt).getTime()
  if (Number.isNaN(inicio)) return false
  const maxMs = duracionSesionSeg(rol) * 1000
  return ahora - inicio > maxMs
}

type ResultadoAdmin =
  | { ok: true; user: { id: string; nombre: string } }
  | { ok: false; motivo: 'sin-sesion' | 'sin-permiso' | 'expirada' | 'cambiar-contrasena' }

// Comprobación única: sesión iniciada, rol suficiente, sesión no caducada y sin un cambio
// de contraseña pendiente. nivel 'admin' acepta ADMIN y SUPERADMIN; 'superadmin' solo SUPERADMIN.
async function comprobarAdmin(nivel: 'admin' | 'superadmin' = 'admin'): Promise<ResultadoAdmin> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, motivo: 'sin-sesion' }

  const dbUser = await prisma.usuario.findUnique({
    where: { id: user.id },
    select: { rol: true, nombre: true, debeCambiarContrasena: true },
  })
  const permitido = nivel === 'superadmin' ? esSuperadmin(dbUser?.rol) : esAdministrador(dbUser?.rol)
  if (!dbUser || !permitido) return { ok: false, motivo: 'sin-permiso' }
  if (sesionExpirada(user.last_sign_in_at, dbUser.rol)) return { ok: false, motivo: 'expirada' }
  if (dbUser.debeCambiarContrasena) return { ok: false, motivo: 'cambiar-contrasena' }

  return { ok: true, user: { id: user.id, nombre: dbUser.nombre } }
}

const MENSAJE_ACCION = {
  'sin-sesion': 'No estás autenticado.',
  'sin-permiso': 'No tienes permisos para realizar esta acción.',
  expirada: 'Tu sesión ha expirado. Vuelve a iniciar sesión.',
  'cambiar-contrasena': 'Antes de continuar debes cambiar tu contraseña.',
} as const

// Toda acción que modifica datos (guardar, eliminar, reactivar…) vuelve a revisar que sea
// admin, aunque la página ya lo haya hecho: una acción del servidor se puede llamar
// directamente, sin pasar por la página.
export async function verificarAdmin() {
  const r = await comprobarAdmin()
  if (!r.ok) return { ok: false as const, error: MENSAJE_ACCION[r.motivo] }
  return r
}

/** Igual que verificarAdmin, pero solo deja pasar al superadministrador (cuentas de acceso). */
export async function verificarSuperadmin() {
  const r = await comprobarAdmin('superadmin')
  if (!r.ok) return { ok: false as const, error: MENSAJE_ACCION[r.motivo] }
  return r
}

/**
 * Variante para Route Handlers: devuelve la respuesta HTTP de error (401/403)
 * o los datos del administrador si tiene acceso.
 */
export async function verificarAdminApi(): Promise<
  | { ok: true; user: { id: string; nombre: string } }
  | { ok: false; respuesta: NextResponse }
> {
  const r = await comprobarAdmin()
  if (r.ok) return r
  const [status, error] =
    r.motivo === 'sin-permiso' || r.motivo === 'cambiar-contrasena'
      ? [403, r.motivo === 'sin-permiso' ? 'No autorizado.' : MENSAJE_ACCION['cambiar-contrasena']]
      : [401, r.motivo === 'expirada' ? 'Tu sesión ha expirado.' : 'No autenticado.']
  return { ok: false, respuesta: NextResponse.json({ ok: false, error }, { status }) }
}
