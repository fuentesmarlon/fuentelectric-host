'use server'

// Cuentas de acceso: crear, editar y eliminar las personas que pueden iniciar sesión.
// Solo el superadministrador puede usarlas (verificarSuperadmin).
//
// Cada cuenta vive en DOS lugares que deben quedar siempre iguales:
//   1. Supabase Auth  → correo, contraseña y la sesión (se maneja con el cliente "admin",
//                        que usa SUPABASE_SERVICE_ROLE_KEY y solo corre en el servidor).
//   2. Tabla Usuario  → nombre y rol, con el MISMO id que en Supabase Auth.
// Por eso cada acción cambia los dos y, si el segundo paso falla, deshace el primero.
//
// Reglas para no quedarse sin acceso:
//   - nadie puede eliminarse ni cambiarse el rol a sí mismo;
//   - siempre debe quedar al menos un superadministrador;
//   - una cuenta de administrador necesita contraseña (además puede entrar con código).
//
// «Pedir cambio de contraseña» (debeCambiarContrasena) obliga a la persona a elegir una
// contraseña propia la próxima vez que entre (ver src/app/cambiar-contrasena). Se usa al
// crear la cuenta y para restablecerla: aunque haya olvidado la anterior, puede entrar
// con código por correo y ahí mismo elegir la nueva. Solo aplica a administradores;
// los trabajadores no tienen contraseña.

import { revalidatePath } from 'next/cache'
import { Prisma, RolUsuario } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verificarSuperadmin } from '@/lib/auth'
import { formText, isEnumValue } from '@/lib/form-validation'
import { esAdministrador, LARGO_MINIMO_CONTRASENA } from '@/lib/roles'
import { createAdminClient } from '@/utils/supabase/admin'

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ClienteAdmin = ReturnType<typeof createAdminClient>
type ErrorAuth = { message?: string; code?: string; status?: number } | null | undefined

const esCorreoRepetido = (e: ErrorAuth) =>
  e?.code === 'email_exists' || /already (been )?registered|already exists/i.test(e?.message ?? '')
const esUsuarioInexistente = (e: ErrorAuth) =>
  e?.code === 'user_not_found' || e?.status === 404

function revalidarCuentas() {
  revalidatePath('/tableros/cuentas')
  // El nombre de la persona aparece en el encabezado del panel
  revalidatePath('/tableros', 'layout')
}

type DatosCuenta = {
  nombre: string
  email: string
  rol: RolUsuario
  contrasena: string
  debeCambiarContrasena: boolean
}

/** Lee y valida los campos comunes de crear y editar. Devuelve el error o los datos. */
function leerFormulario(formData: FormData): { error: string } | { datos: DatosCuenta } {
  const nombre = formText(formData, 'nombre').trim().replace(/\s+/g, ' ')
  const email = formText(formData, 'email').trim().toLowerCase()
  const rol = formText(formData, 'rol')
  const contrasena = formText(formData, 'contrasena')
  // Checkbox: llega 'on' si está marcado. Sin contraseña (trabajadores) no tiene sentido.
  const debeCambiarContrasena = esAdministrador(rol) && formData.get('pedirCambio') === 'on'

  if (!nombre) return { error: 'El nombre es obligatorio.' }
  if (!CORREO_VALIDO.test(email)) return { error: 'Escribe un correo electrónico válido.' }
  if (!isEnumValue(RolUsuario, rol)) return { error: 'Selecciona un rol válido.' }
  if (contrasena && contrasena.length < LARGO_MINIMO_CONTRASENA) {
    return { error: `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.` }
  }
  return { datos: { nombre, email, rol, contrasena, debeCambiarContrasena } }
}

/** Busca en Supabase Auth un usuario por correo (para cuentas que existen allá pero no en Usuario). */
async function buscarEnAuthPorCorreo(admin: ClienteAdmin, email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return null
    const encontrado = data.users.find((u) => u.email?.toLowerCase() === email)
    if (encontrado) return encontrado
    if (data.users.length < 200) return null
  }
  return null
}

export async function crearCuenta(prevState: string | null, formData: FormData): Promise<string | null> {
  const acceso = await verificarSuperadmin()
  if (!acceso.ok) return acceso.error

  const leido = leerFormulario(formData)
  if ('error' in leido) return leido.error
  const { nombre, email, rol, contrasena, debeCambiarContrasena } = leido.datos

  if (esAdministrador(rol) && !contrasena) {
    return 'Las cuentas de administrador necesitan una contraseña (también podrán entrar con código por correo).'
  }

  try {
    if (await prisma.usuario.findUnique({ where: { email }, select: { id: true } })) {
      return `Ya existe una cuenta con el correo ${email}.`
    }

    const admin = createAdminClient()
    let idAuth: string
    let creadaAhora = false

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: contrasena || undefined,
      email_confirm: true, // la empresa ya conoce el correo; no se manda correo de confirmación
      user_metadata: { nombre },
    })

    if (!error && data.user) {
      idAuth = data.user.id
      creadaAhora = true
    } else if (esCorreoRepetido(error)) {
      // Existe en Supabase Auth pero no en Usuario (por ejemplo, una cuenta que se creó a mano
      // y quedó a medias). Se reutiliza en lugar de fallar.
      const existente = await buscarEnAuthPorCorreo(admin, email)
      if (!existente) return 'Ese correo ya está registrado en Supabase, pero no se pudo recuperar la cuenta.'
      idAuth = existente.id
      if (contrasena) {
        const { error: errorClave } = await admin.auth.admin.updateUserById(idAuth, { password: contrasena })
        if (errorClave) return `No se pudo asignar la contraseña: ${errorClave.message}`
      }
    } else {
      return `No se pudo crear la cuenta de acceso: ${error?.message ?? 'error desconocido'}`
    }

    try {
      await prisma.usuario.create({ data: { id: idAuth, nombre, email, rol, debeCambiarContrasena } })
    } catch (errorBd) {
      // Si no se pudo guardar en Usuario, no dejar una cuenta a medias en Supabase Auth
      if (creadaAhora) await admin.auth.admin.deleteUser(idAuth).catch(() => {})
      throw errorBd
    }
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return `Ya existe una cuenta con el correo ${email}.`
    }
    console.error(error)
    return 'Ocurrió un error inesperado al crear la cuenta.'
  }

  revalidarCuentas()
  return null
}

export async function editarCuenta(prevState: string | null, formData: FormData): Promise<string | null> {
  const acceso = await verificarSuperadmin()
  if (!acceso.ok) return acceso.error

  const id = formText(formData, 'id')
  if (!id) return 'Falta el identificador de la cuenta.'

  const leido = leerFormulario(formData)
  if ('error' in leido) return leido.error
  const { nombre, email, rol, contrasena, debeCambiarContrasena } = leido.datos

  try {
    const actual = await prisma.usuario.findUnique({ where: { id }, select: { email: true, rol: true } })
    if (!actual) return 'Esta cuenta ya no existe.'

    if (rol !== actual.rol) {
      if (id === acceso.user.id) {
        return 'No puedes cambiar tu propio rol. Pídeselo a otro superadministrador.'
      }
      if (actual.rol === 'SUPERADMIN' && (await prisma.usuario.count({ where: { rol: 'SUPERADMIN' } })) <= 1) {
        return 'Debe quedar al menos un superadministrador.'
      }
      if (esAdministrador(rol) && !esAdministrador(actual.rol) && !contrasena) {
        return 'Para dar acceso de administrador, asigna también una contraseña.'
      }
    }

    if (email !== actual.email) {
      const otra = await prisma.usuario.findUnique({ where: { email }, select: { id: true } })
      if (otra && otra.id !== id) return `Ya existe otra cuenta con el correo ${email}.`
    }

    // Primero Supabase Auth (correo y contraseña); si falla, la tabla Usuario no se toca
    const cambiosAuth: { email?: string; email_confirm?: boolean; password?: string } = {}
    if (email !== actual.email) Object.assign(cambiosAuth, { email, email_confirm: true })
    if (contrasena) cambiosAuth.password = contrasena
    if (Object.keys(cambiosAuth).length > 0) {
      const { error } = await createAdminClient().auth.admin.updateUserById(id, cambiosAuth)
      if (error) {
        if (esCorreoRepetido(error)) return `El correo ${email} ya lo usa otra cuenta en Supabase.`
        return `No se pudo actualizar el acceso: ${error.message}`
      }
    }

    await prisma.usuario.update({ where: { id }, data: { nombre, email, rol, debeCambiarContrasena } })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return `Ya existe otra cuenta con el correo ${email}.`
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return 'Esta cuenta ya no existe.'
    }
    console.error(error)
    return 'Ocurrió un error inesperado al actualizar la cuenta.'
  }

  revalidarCuentas()
  return null
}

export async function eliminarCuenta(prevState: string | null, formData: FormData): Promise<string | null> {
  const acceso = await verificarSuperadmin()
  if (!acceso.ok) return acceso.error

  const id = formText(formData, 'id')
  if (!id) return 'Falta el identificador de la cuenta.'
  if (id === acceso.user.id) return 'No puedes eliminar tu propia cuenta.'

  try {
    const actual = await prisma.usuario.findUnique({ where: { id }, select: { rol: true } })
    if (!actual) return 'Esta cuenta ya fue eliminada.'
    if (actual.rol === 'SUPERADMIN' && (await prisma.usuario.count({ where: { rol: 'SUPERADMIN' } })) <= 1) {
      return 'Debe quedar al menos un superadministrador.'
    }

    // Primero Supabase Auth: así se cierran sus sesiones y ya no puede pedir códigos.
    // Si ya no existía allá, se sigue igual para limpiar la fila de Usuario.
    const { error } = await createAdminClient().auth.admin.deleteUser(id)
    if (error && !esUsuarioInexistente(error)) {
      return `No se pudo eliminar el acceso: ${error.message}`
    }

    // Los turnos y el historial guardan el nombre como texto, así que no se pierden
    await prisma.usuario.delete({ where: { id } })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return 'Esta cuenta ya fue eliminada.'
    }
    console.error(error)
    return 'Ocurrió un error inesperado al eliminar la cuenta.'
  }

  revalidarCuentas()
  return null
}
