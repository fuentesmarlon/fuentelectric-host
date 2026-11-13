// Roles de las cuentas de acceso y qué puede hacer cada uno. Toda pregunta del tipo
// "¿este usuario puede…?" debe pasar por estas funciones, no comparar el texto del rol
// a mano: así, si mañana aparece otro rol, solo se cambia este archivo.
//
//   TRABAJADOR  · solo consulta el Dashboard. Entra con código por correo (sesión de 30 días).
//   ADMIN       · gestiona turnos, trabajadores, áreas, vehículos y reportes.
//   SUPERADMIN  · todo lo de ADMIN y además crea, edita y elimina cuentas de acceso.
// ADMIN y SUPERADMIN eligen al entrar entre contraseña o código (sesión de 1 hora).

// `import type` para que este archivo se pueda usar también en el navegador.
import type { RolUsuario } from '@prisma/client'

export type Rol = RolUsuario

export const ETIQUETA_ROL: Record<Rol, string> = {
  TRABAJADOR: 'Trabajador',
  ADMIN: 'Administrador',
  SUPERADMIN: 'Superadministrador',
}

/** Largo mínimo de las contraseñas de administrador (al crearlas, restablecerlas o cambiarlas). */
export const LARGO_MINIMO_CONTRASENA = 8

/** Puede gestionar turnos y catálogos (ADMIN o SUPERADMIN). */
export function esAdministrador(rol: string | null | undefined): boolean {
  return rol === 'ADMIN' || rol === 'SUPERADMIN'
}

/** Puede crear, editar y eliminar cuentas de acceso. */
export function esSuperadmin(rol: string | null | undefined): boolean {
  return rol === 'SUPERADMIN'
}
