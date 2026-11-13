'use server'

import { prisma } from '@/lib/prisma'
import { verificarAdmin } from '@/lib/auth'
import { formText, isEnumValue } from '@/lib/form-validation'
import { revalidatePath } from 'next/cache'
import { EstadoArea, Prisma } from '@prisma/client'

export async function crearArea(prevState: string | null, formData: FormData) {
  const acceso = await verificarAdmin()
  if (!acceso.ok) return acceso.error

  const nombre = formText(formData, 'nombre')

  if (!nombre || nombre.trim() === '') {
    return 'El nombre del área es obligatorio.'
  }

  try {
    await prisma.area.create({
      data: {
        nombre: nombre.trim(),
        estado: 'Activo',
      },
    })

    revalidatePath('/tableros')
    revalidatePath('/tableros/areas')
    revalidatePath('/tableros/asistencias')
    return null
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return `El área "${nombre}" ya está registrada (si se encuentra inactiva, puedes reactivarla desde el botón de editar).`
    }
    return 'Ocurrió un error inesperado al guardar el área.'
  }
}

export async function actualizarArea(prevState: string | null, formData: FormData) {
  const acceso = await verificarAdmin()
  if (!acceso.ok) return acceso.error

  const id = formText(formData, 'id')
  const nombre = formText(formData, 'nombre')
  const estadoRaw = formText(formData, 'estado')

  if (!id) {
    return 'Falta el identificador del área.'
  }

  if (!nombre || nombre.trim() === '') {
    return 'El nombre del área es obligatorio.'
  }

  const estado = estadoRaw || 'Activo'
  if (!isEnumValue(EstadoArea, estado)) {
    return 'Selecciona un estado válido para el área.'
  }

  try {
    await prisma.area.update({
      where: { id },
      data: {
        nombre: nombre.trim(),
        estado,
      },
    })

    revalidatePath('/tableros')
    revalidatePath('/tableros/areas')
    revalidatePath('/tableros/asistencias')
    return null
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return `Ya existe otra área registrada con el nombre "${nombre}".`
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return 'Esta área ya no existe.'
    }
    console.error(error)
    return 'Ocurrió un error inesperado al actualizar el área.'
  }
}

export async function eliminarArea(prevState: string | null, formData: FormData) {
  const acceso = await verificarAdmin()
  if (!acceso.ok) return acceso.error

  const id = formText(formData, 'id')

  if (!id) {
    return 'Falta el identificador del área.'
  }

  try {
    // Baja lógica: no se borra de la base de datos, pasa a estado Inactivo
    // y deja de aparecer al asignar turnos.
    await prisma.area.update({
      where: { id },
      data: {
        estado: 'Inactivo',
      },
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return 'Esta área ya fue eliminada o no existe.'
    }
    console.error(error)
    return 'Ocurrió un error al desactivar el área.'
  }

  revalidatePath('/tableros')
  revalidatePath('/tableros/areas')
  revalidatePath('/tableros/asistencias')
  return null
}

export async function reactivarArea(prevState: string | null, formData: FormData) {
  const acceso = await verificarAdmin()
  if (!acceso.ok) return acceso.error

  const id = formText(formData, 'id')
  if (!id) return 'Falta el identificador del área.'

  try {
    await prisma.area.update({
      where: { id },
      data: { estado: EstadoArea.Activo },
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return 'Esta área ya no existe.'
    }
    console.error(error)
    return 'Ocurrió un error al reactivar el área.'
  }

  revalidatePath('/tableros')
  revalidatePath('/tableros/areas')
  revalidatePath('/tableros/asistencias')
  return null
}
