'use server'

import { prisma } from '@/lib/prisma'
import { verificarAdmin } from '@/lib/auth'
import { formText, isEnumValue, isPastShiftDate, shiftDate } from '@/lib/form-validation'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { Prisma, EstadoDia, TipoTurno, HorarioBase } from '@prisma/client'
import { procesarBufferExcel } from '@/lib/carga-masiva'
import { bloquearFechasTurno } from '@/lib/bloqueos-turno'
import { esHorarioValidoParaTipoTurno } from '@/lib/horarios-turno'
import { validarCatalogosTurno, validarConflictosDelDia } from '@/lib/reglas-turno'

function revalidarVistasDeTurnos() {
  revalidatePath('/tableros')
  revalidatePath('/tableros/asistencias')
  revalidatePath('/tableros/historial')
}

/**
 * Crear y editar comparten el mismo flujo:
 * leer formulario → validar → (transacción con bloqueo por fecha) validar conflictos → guardar + auditoría.
 */
async function guardarAsistencia(modo: 'crear' | 'editar', formData: FormData): Promise<string | null> {
  const acceso = await verificarAdmin()
  if (!acceso.ok) return acceso.error
  const admin = acceso.user

  const id = formText(formData, 'id')
  const asignadoId = formText(formData, 'asignadoId')
  const fechaStr = formText(formData, 'fecha') // Formato YYYY-MM-DD
  const tipoTurno = formText(formData, 'tipoTurno')
  const horario = formText(formData, 'horario')
  const areaId = formText(formData, 'areaId')
  const vehiculoId = formText(formData, 'vehiculoId')
  const comentario = formText(formData, 'comentario')
  const esTurnoExtra = formData.get('esTurnoExtra') === 'on'
  const esCupoExtra = formData.get('esCupoExtra') === 'on'

  if (modo === 'editar' && !id) return 'Falta el identificador de la asistencia.'

  if (!asignadoId || !fechaStr || !tipoTurno || !horario || !areaId || !vehiculoId) {
    return 'Por favor, llena todos los campos obligatorios.'
  }

  if (
    !isEnumValue(TipoTurno, tipoTurno) ||
    !isEnumValue(HorarioBase, horario) ||
    !esHorarioValidoParaTipoTurno(tipoTurno, horario)
  ) {
    return 'Selecciona un tipo de turno y horario válidos.'
  }

  const fecha = shiftDate(fechaStr)
  if (!fecha) return 'La fecha no es válida. Selecciona una fecha del calendario.'

  try {
    const [vehiculo, trabajador, area, turnoActual] = await Promise.all([
      prisma.vehiculo.findUnique({ where: { id: vehiculoId } }),
      prisma.trabajador.findUnique({ where: { id: asignadoId } }),
      prisma.area.findUnique({ where: { id: areaId } }),
      modo === 'editar' ? prisma.turnoDiario.findUnique({ where: { id } }) : Promise.resolve(null),
    ])

    if (!vehiculo || !trabajador || !area) return 'Error al buscar los datos de referencia.'
    if (modo === 'editar' && !turnoActual) {
      return 'Esta asistencia ya no existe (puede que la hayan eliminado en otra pestaña).'
    }

    const motivoCatalogo = validarCatalogosTurno({ trabajador, vehiculo, area })
    if (motivoCatalogo) return motivoCatalogo

    if (modo === 'editar') {
      if (turnoActual && isPastShiftDate(turnoActual.fecha)) {
        return 'No se puede modificar esta asistencia porque la fecha del turno ya pasó.'
      }
      if (isPastShiftDate(fecha)) return 'No se puede reprogramar un turno a una fecha que ya pasó.'
    }

    const errorValidacion = await prisma.$transaction(async (tx) => {
      // Bloqueo por fecha: dos asignaciones simultáneas del mismo día se validan
      // una después de otra, evitando exceder el cupo del vehículo.
      await bloquearFechasTurno(tx, [fecha])

      const turnosMismoDia = await tx.turnoDiario.findMany({
        where: {
          fecha,
          ...(modo === 'editar' ? { NOT: { id } } : {}),
          OR: [{ vehiculoId }, { asignadoId }],
        },
        select: { asignadoId: true, vehiculoId: true, tipoTurno: true, horario: true, esTurnoExtra: true },
      })

      const conflicto = validarConflictosDelDia(
        {
          asignadoId,
          nombreTrabajador: trabajador.nombre,
          vehiculoId,
          codigoVehiculo: vehiculo.codigo,
          cupoVehiculo: vehiculo.noPersonas,
          tipoTurno,
          horario,
          esTurnoExtra,
          esCupoExtra,
        },
        turnosMismoDia,
      )
      if (conflicto) return conflicto

      const datos = {
        asignadoId,
        asignadoNombre: trabajador.nombre,
        fecha,
        estado: EstadoDia.TRABAJO_12,
        tipoTurno,
        horario,
        areaId,
        areaNombre: area.nombre,
        vehiculoId,
        vehiculoCodigo: vehiculo.codigo,
        comentario: comentario || null,
        esTurnoExtra,
        esCupoExtra,
      }

      if (modo === 'crear') {
        await tx.turnoDiario.create({ data: { ...datos, registradoPor: admin.nombre } })
      } else {
        await tx.turnoDiario.update({ where: { id }, data: datos })
      }

      const prefijo = modo === 'crear' ? 'Turno del' : 'Edición · Turno del'
      const textoFecha = format(fecha, 'dd/MM/yyyy')
      await tx.snapshotTurno.create({
        data: {
          nombreTrabajador: trabajador.nombre,
          areaTrabajo: area.nombre,
          vehiculoPlaca: vehiculo.codigo,
          tipoTurno,
          hora: horario,
          esTurnoExtra,
          comentario: comentario ? `[${prefijo} ${textoFecha}] ${comentario}` : `[${prefijo} ${textoFecha}]`,
          usuarioResponsable: admin.nombre,
          accion: modo === 'crear' ? 'CREACION' : 'EDICION',
        },
      })

      return null
    })

    if (errorValidacion) return errorValidacion

    revalidarVistasDeTurnos()
    return null
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return 'Este trabajador ya tiene un turno registrado en esa misma jornada y fecha.'
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return 'Esta asistencia ya no existe.'
    }
    console.error(error)
    return modo === 'crear'
      ? 'Ocurrió un error inesperado al guardar la asistencia.'
      : 'Ocurrió un error inesperado al actualizar la asistencia.'
  }
}

export async function crearAsistencia(prevState: string | null, formData: FormData) {
  return guardarAsistencia('crear', formData)
}

export async function actualizarAsistencia(prevState: string | null, formData: FormData) {
  return guardarAsistencia('editar', formData)
}

export async function eliminarAsistencia(prevState: string | null, formData: FormData) {
  const acceso = await verificarAdmin()
  if (!acceso.ok) return acceso.error
  const admin = acceso.user

  const id = formText(formData, 'id')
  if (!id) return 'Falta el identificador de la asistencia.'

  try {
    const turno = await prisma.turnoDiario.findUnique({ where: { id } })
    if (!turno) return 'Esta asistencia ya fue eliminada.'

    if (isPastShiftDate(turno.fecha)) {
      return 'No se puede eliminar esta asistencia porque la fecha del turno ya pasó.'
    }

    await prisma.$transaction(async (tx) => {
      await tx.turnoDiario.delete({ where: { id } })

      const textoFecha = format(turno.fecha, 'dd/MM/yyyy')
      const comentarioSnapshot = turno.comentario
        ? `[Eliminado · Turno del ${textoFecha}] ${turno.comentario}`
        : `[Eliminado · Turno del ${textoFecha}]`

      await tx.snapshotTurno.create({
        data: {
          nombreTrabajador: turno.asignadoNombre ?? 'Trabajador no disponible',
          areaTrabajo: turno.areaNombre ?? 'Área no disponible',
          vehiculoPlaca: turno.vehiculoCodigo ?? 'Vehículo no disponible',
          tipoTurno: turno.tipoTurno,
          hora: turno.horario,
          esTurnoExtra: turno.esTurnoExtra,
          comentario: comentarioSnapshot,
          usuarioResponsable: admin.nombre,
          accion: 'ELIMINACION',
        },
      })
    })

    revalidarVistasDeTurnos()
    return null
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return 'Esta asistencia ya fue eliminada.'
    }
    console.error(error)
    return 'Ocurrió un error inesperado al eliminar la asistencia.'
  }
}

export async function importarTurnosExcel(prevState: string | null, formData: FormData): Promise<string | null> {
  const acceso = await verificarAdmin()
  if (!acceso.ok) return acceso.error

  const archivo = formData.get('archivo') as File | null
  if (!archivo || typeof archivo === 'string' || archivo.size === 0) {
    return 'Por favor selecciona un archivo Excel válido (.xlsx o .xls).'
  }

  const modoDuplicados = (formData.get('modoDuplicados') as 'omitir' | 'sobrescribir') || 'omitir'
  const permitirCupoExtra = formData.get('permitirCupoExtra') === 'on' || formData.get('permitirCupoExtra') === 'true'

  try {
    const arrayBuffer = await archivo.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const res = await procesarBufferExcel(buffer, acceso.user.nombre, modoDuplicados, permitirCupoExtra)

    if (!res.ok) {
      return res.mensaje || 'Error al procesar el archivo Excel.'
    }

    revalidarVistasDeTurnos()
    return null
  } catch (error: unknown) {
    console.error(error)
    return 'Ocurrió un error inesperado al procesar el archivo Excel.'
  }
}
