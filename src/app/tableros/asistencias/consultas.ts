'use server'

import { prisma } from '@/lib/prisma'
import { verificarAdmin } from '@/lib/auth'
import { shiftDate } from '@/lib/form-validation'
import type { TurnoDelDia } from '@/lib/reglas-turno'

/**
 * Turnos de una fecha concreta, para las ayudas del formulario de alta
 * (cupo de la unidad, doble jornada, horarios disponibles) cuando esa fecha
 * está fuera del rango que tiene cargado la página.
 * Solo lectura; la validación definitiva siempre la hace el servidor al guardar.
 */
export async function obtenerTurnosDeFecha(fechaIso: string): Promise<TurnoDelDia[]> {
  const acceso = await verificarAdmin()
  if (!acceso.ok) return []

  const fecha = shiftDate(fechaIso)
  if (!fecha) return []

  return prisma.turnoDiario.findMany({
    where: { fecha },
    select: { asignadoId: true, vehiculoId: true, tipoTurno: true, horario: true, esTurnoExtra: true },
  })
}
