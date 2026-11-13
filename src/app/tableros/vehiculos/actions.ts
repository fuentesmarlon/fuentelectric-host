'use server'

import { prisma } from '@/lib/prisma'
import { verificarAdmin } from '@/lib/auth'
import { formText, isEnumValue } from '@/lib/form-validation'
import { ESTADOS_VEHICULO } from '@/lib/estados-vehiculo'
import { revalidatePath } from 'next/cache'
import { Prisma, TipoVehiculo } from '@prisma/client'

export async function crearVehiculo(prevState: string | null, formData: FormData) {
  const acceso = await verificarAdmin()
  if (!acceso.ok) return acceso.error

  const codigo = formText(formData, 'codigo')
  const tipo = formText(formData, 'tipo')
  const noPersonas = Number(formText(formData, 'noPersonas'))

  if (!codigo || !isEnumValue(TipoVehiculo, tipo) || !Number.isInteger(noPersonas) || noPersonas < 1) {
    return 'Faltan datos obligatorios o el número de personas es inválido.'
  }

  try {
    await prisma.vehiculo.create({
      data: {
        codigo: codigo.trim(),
        tipo,
        noPersonas,
        estado: ESTADOS_VEHICULO.DISPONIBLE,
      },
    })

    revalidatePath('/tableros')
    revalidatePath('/tableros/vehiculos')
    revalidatePath('/tableros/usuarios')
    revalidatePath('/tableros/asistencias')
    return null
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return `Ya existe un vehículo registrado con el código ${codigo}.`
    }
    return 'Ocurrió un error inesperado al guardar el vehículo.'
  }
}

export async function actualizarVehiculo(prevState: string | null, formData: FormData) {
  const acceso = await verificarAdmin()
  if (!acceso.ok) return acceso.error

  const id = formText(formData, 'id')
  const codigo = formText(formData, 'codigo')
  const tipo = formText(formData, 'tipo')
  const noPersonas = Number(formText(formData, 'noPersonas'))
  const estadoRaw = formText(formData, 'estado')

  if (!id) {
    return 'Falta el identificador del vehículo.'
  }

  if (!codigo || !isEnumValue(TipoVehiculo, tipo) || !Number.isInteger(noPersonas) || noPersonas < 1) {
    return 'Faltan datos obligatorios o el número de personas es inválido.'
  }

  const estado = estadoRaw || ESTADOS_VEHICULO.DISPONIBLE
  if (!isEnumValue(ESTADOS_VEHICULO, estado)) {
    return 'Selecciona un estado válido para el vehículo.'
  }

  try {
    await prisma.vehiculo.update({
      where: { id },
      data: {
        codigo: codigo.trim(),
        tipo,
        noPersonas,
        estado,
      },
    })

    // Si el vehículo sale definitivamente de la flota, liberamos trabajadores asignados
    if (
      estado === ESTADOS_VEHICULO.DADO_DE_BAJA ||
      estado === ESTADOS_VEHICULO.VENDIDO
    ) {
      await prisma.trabajador.updateMany({
        where: { vehiculoId: id },
        data: { vehiculoId: null },
      })
    }

    revalidatePath('/tableros')
    revalidatePath('/tableros/vehiculos')
    revalidatePath('/tableros/usuarios')
    revalidatePath('/tableros/asistencias')
    return null
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return `Ya existe otro vehículo registrado con el código ${codigo}.`
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return 'Este vehículo ya no existe.'
    }
    console.error(error)
    return 'Ocurrió un error inesperado al actualizar el vehículo.'
  }
}

export async function eliminarVehiculo(prevState: string | null, formData: FormData) {
  const acceso = await verificarAdmin()
  if (!acceso.ok) return acceso.error

  const id = formText(formData, 'id')

  if (!id) {
    return 'Falta el identificador del vehículo.'
  }

  try {
    // Baja lógica: no se elimina de la base de datos, pasa a "Dado de Baja / Chatarra"
    // y libera cualquier trabajador que la tuviera asignada como unidad fija.
    await prisma.vehiculo.update({
      where: { id },
      data: {
        estado: ESTADOS_VEHICULO.DADO_DE_BAJA,
      },
    })

    await prisma.trabajador.updateMany({
      where: { vehiculoId: id },
      data: { vehiculoId: null },
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return 'Este vehículo ya fue eliminado o no existe.'
    }
    console.error(error)
    return 'Ocurrió un error al dar de baja el vehículo.'
  }

  revalidatePath('/tableros')
  revalidatePath('/tableros/vehiculos')
  revalidatePath('/tableros/usuarios')
  revalidatePath('/tableros/asistencias')
  return null
}

export async function reactivarVehiculo(prevState: string | null, formData: FormData) {
  const acceso = await verificarAdmin()
  if (!acceso.ok) return acceso.error

  const id = formText(formData, 'id')
  if (!id) return 'Falta el identificador del vehículo.'

  try {
    await prisma.vehiculo.update({
      where: { id },
      data: { estado: ESTADOS_VEHICULO.DISPONIBLE },
    })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return 'Este vehículo ya no existe.'
    }
    console.error(error)
    return 'Ocurrió un error al reactivar el vehículo.'
  }

  revalidatePath('/tableros')
  revalidatePath('/tableros/vehiculos')
  revalidatePath('/tableros/usuarios')
  revalidatePath('/tableros/asistencias')
  return null
}
