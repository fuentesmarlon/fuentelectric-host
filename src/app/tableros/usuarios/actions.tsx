'use server'

import { prisma } from '@/lib/prisma'
import { verificarAdmin } from '@/lib/auth'
import { formText, isEnumValue } from '@/lib/form-validation'
import { revalidatePath } from 'next/cache'
import { EstadoTrabajador, HorarioBase, Prisma } from '@prisma/client'

const SIN_UNIDAD = '__sin_unidad__'

export async function crearTrabajador(prevState: string | null, formData: FormData) {
  const acceso = await verificarAdmin()
  if (!acceso.ok) return acceso.error

  const nombre = formText(formData, 'nombre')
  const puesto = formText(formData, 'puesto')
  const horarioEstablecido = formText(formData, 'horarioEstablecido')
  const vehiculoId = formText(formData, 'vehiculoId')

  if (!nombre) {
    return 'El nombre es obligatorio'
  }

  if (!isEnumValue(HorarioBase, horarioEstablecido)) {
    return 'Debes seleccionar un horario establecido'
  }

  try {
    await prisma.trabajador.create({
      data: {
        nombre,
        puesto,
        disponibilidad: 'Activo',
        horarioEstablecido,
        vehiculoId: vehiculoId && vehiculoId !== SIN_UNIDAD ? vehiculoId : null,
      },
    })
  } catch (error: unknown) {
    // P2003: la unidad seleccionada ya no existe (FK inválida)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return 'La unidad seleccionada ya no existe. Recarga la página e intenta de nuevo.'
    }
    console.error(error)
    return 'Ocurrió un error al crear el trabajador.'
  }

  revalidatePath('/tableros')
  revalidatePath('/tableros/usuarios')
  revalidatePath('/tableros/asistencias')
  return null
}

export async function actualizarTrabajador(prevState: string | null, formData: FormData) {
  const acceso = await verificarAdmin()
  if (!acceso.ok) return acceso.error

  const id = formText(formData, 'id')
  const nombre = formText(formData, 'nombre')
  const puesto = formText(formData, 'puesto')
  const disponibilidadRaw = formText(formData, 'disponibilidad')
  const horarioEstablecido = formText(formData, 'horarioEstablecido')
  const vehiculoId = formText(formData, 'vehiculoId')

  if (!id) {
    return 'Falta el identificador del trabajador.'
  }

  if (!nombre) {
    return 'El nombre es obligatorio'
  }

  if (!isEnumValue(HorarioBase, horarioEstablecido)) {
    return 'Debes seleccionar un horario establecido'
  }

  const disponibilidad = disponibilidadRaw || 'Activo'
  if (!isEnumValue(EstadoTrabajador, disponibilidad)) {
    return 'Selecciona un estado válido para el trabajador.'
  }

  try {
    await prisma.trabajador.update({
      where: { id },
      data: {
        nombre,
        puesto,
        disponibilidad,
        horarioEstablecido,
        vehiculoId:
          disponibilidad === 'Inactivo'
            ? null
            : vehiculoId && vehiculoId !== SIN_UNIDAD
            ? vehiculoId
            : null,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return 'Este trabajador ya no existe.'
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return 'La unidad seleccionada ya no existe. Recarga la página e intenta de nuevo.'
    }
    console.error(error)
    return 'Ocurrió un error al actualizar el trabajador.'
  }

  revalidatePath('/tableros')
  revalidatePath('/tableros/usuarios')
  revalidatePath('/tableros/asistencias')
  return null
}

export async function eliminarTrabajador(prevState: string | null, formData: FormData) {
  const acceso = await verificarAdmin()
  if (!acceso.ok) return acceso.error

  const id = formText(formData, 'id')

  if (!id) {
    return 'Falta el identificador del trabajador.'
  }

  try {
    // Baja lógica: no se borra de la base de datos, pasa a estado Inactivo
    // y deja de aparecer al asignar turnos.
    await prisma.trabajador.update({
      where: { id },
      data: {
        disponibilidad: 'Inactivo',
        vehiculoId: null,
      },
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return 'Este trabajador ya fue eliminado o no existe.'
    }
    console.error(error)
    return 'Ocurrió un error al desactivar el trabajador.'
  }

  revalidatePath('/tableros')
  revalidatePath('/tableros/usuarios')
  revalidatePath('/tableros/asistencias')
  return null
}

export async function reactivarTrabajador(prevState: string | null, formData: FormData) {
  const acceso = await verificarAdmin()
  if (!acceso.ok) return acceso.error

  const id = formText(formData, 'id')
  if (!id) return 'Falta el identificador del trabajador.'

  try {
    // Vuelve a estado Activo. La unidad fija se liberó al desactivarlo,
    // así que se asigna de nuevo desde "Editar" si hace falta.
    await prisma.trabajador.update({
      where: { id },
      data: { disponibilidad: EstadoTrabajador.Activo },
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return 'Este trabajador ya no existe.'
    }
    console.error(error)
    return 'Ocurrió un error al reactivar el trabajador.'
  }

  revalidatePath('/tableros')
  revalidatePath('/tableros/usuarios')
  revalidatePath('/tableros/asistencias')
  return null
}
