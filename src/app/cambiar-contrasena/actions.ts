'use server'

// Cambio de contraseña obligatorio. Se llega aquí cuando el superadministrador marcó
// «Pedir cambio de contraseña» (al crear la cuenta o al restablecerla): la persona ya
// inició sesión, pero lib/sesion.ts no la deja usar el panel hasta elegir una contraseña propia.

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { duracionSesionSeg, sesionExpirada } from '@/lib/auth'
import { formText } from '@/lib/form-validation'
import { LARGO_MINIMO_CONTRASENA } from '@/lib/roles'
import { createClient } from '@/utils/supabase/server'

export async function cambiarContrasena(prevState: string | null, formData: FormData): Promise<string | null> {
  const nueva = formText(formData, 'nueva')
  const confirmacion = formText(formData, 'confirmacion')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.usuario.findUnique({
    where: { id: user.id },
    select: { rol: true, debeCambiarContrasena: true },
  })
  // Si ya no tiene el cambio pendiente (por ejemplo, lo hizo en otra pestaña), no hay nada que hacer
  if (!dbUser?.debeCambiarContrasena) redirect('/tableros')
  if (sesionExpirada(user.last_sign_in_at, dbUser.rol)) {
    redirect(`/login?expirada=1&error=${encodeURIComponent('Tu sesión ha expirado. Vuelve a iniciar sesión.')}`)
  }

  if (nueva.length < LARGO_MINIMO_CONTRASENA) {
    return `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`
  }
  if (nueva !== confirmacion) return 'Las dos contraseñas no coinciden. Escríbelas otra vez.'

  // Se cambia con la sesión de la propia persona (no con el cliente admin): así Supabase
  // aplica sus reglas de contraseña y la sesión sigue abierta. La cookie conserva la duración del rol.
  const supabaseRol = await createClient({ maxAge: duracionSesionSeg(dbUser.rol) })
  const { error } = await supabaseRol.auth.updateUser({ password: nueva })
  if (error) {
    if (error.code === 'same_password') return 'La contraseña nueva debe ser distinta de la que usabas.'
    if (error.code === 'weak_password') return 'Esa contraseña es muy fácil de adivinar. Elige otra más segura.'
    console.error('Error al cambiar la contraseña:', error)
    return 'No se pudo cambiar la contraseña. Intenta de nuevo.'
  }

  await prisma.usuario.update({ where: { id: user.id }, data: { debeCambiarContrasena: false } })

  revalidatePath('/', 'layout')
  redirect('/tableros')
}
