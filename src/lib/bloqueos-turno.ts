import type { Prisma } from '@prisma/client'

/**
 * Toma un bloqueo de PostgreSQL (pg_advisory_xact_lock) por cada fecha de turno
 * dentro de la transacción actual. Dos asignaciones simultáneas para la misma fecha
 * se ejecutan una detrás de otra, así que la validación de cupo del vehículo y de
 * doble jornada siempre ve los turnos que la otra acaba de guardar.
 *
 * El bloqueo se libera solo al terminar la transacción (commit o rollback).
 * Las fechas se ordenan para que dos transacciones con varias fechas no se bloqueen
 * mutuamente (deadlock).
 */
export async function bloquearFechasTurno(tx: Prisma.TransactionClient, fechas: Date[]) {
  const claves = Array.from(new Set(fechas.map((f) => `turnos:${f.toISOString().slice(0, 10)}`))).sort()
  for (const clave of claves) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${clave}::text))`
  }
}
