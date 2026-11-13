// Reglas de negocio para asignar un turno. Son funciones puras (sin base de datos)
// compartidas por: crear asistencia, editar asistencia y la carga masiva por Excel.
// Si cambia una regla operativa, se cambia SOLO aquí.

import { obtenerEstadoVehiculoInfo } from '@/lib/estados-vehiculo'
import { horariosCompatiblesEnMismoDia, obtenerEtiquetaHorario } from '@/lib/horarios-turno'
import { esPuestoNoAsignable } from '@/lib/puestos-no-asignables'

const nombreJornada = (tipoTurno: string) => (tipoTurno === 'DIURNO' ? 'diurno' : 'nocturno')

// ── Disponibilidad de catálogos ──────────────────────────────────────────────

export function motivoTrabajadorNoDisponible(t: { nombre: string; disponibilidad: string | null; puesto?: string | null }): string | null {
  if (esPuestoNoAsignable(t.puesto)) {
    return `No se puede asignar un turno a ${t.nombre} porque su puesto (${t.puesto}) no se asigna a turnos operativos.`
  }
  if (t.disponibilidad && t.disponibilidad !== 'Activo') {
    return `No se puede asignar un turno a ${t.nombre} porque su estado actual es "${t.disponibilidad}".`
  }
  return null
}

export function motivoVehiculoNoDisponible(v: { codigo: string; estado?: string | null }): string | null {
  if (v.estado && v.estado !== 'DISPONIBLE') {
    return `No se puede asignar la unidad ${v.codigo} porque su estado actual es "${obtenerEstadoVehiculoInfo(v.estado).label}".`
  }
  return null
}

export function motivoAreaNoDisponible(a: { nombre: string; estado?: string | null }): string | null {
  if (a.estado && a.estado !== 'Activo') {
    return `No se puede asignar el área "${a.nombre}" porque se encuentra inactiva.`
  }
  return null
}

/** Primer motivo por el que no se puede usar el trabajador, la unidad o el área (o null). */
export function validarCatalogosTurno(datos: {
  trabajador: { nombre: string; disponibilidad: string | null; puesto?: string | null }
  vehiculo: { codigo: string; estado?: string | null }
  area: { nombre: string; estado?: string | null }
}): string | null {
  return (
    motivoTrabajadorNoDisponible(datos.trabajador) ??
    motivoVehiculoNoDisponible(datos.vehiculo) ??
    motivoAreaNoDisponible(datos.area)
  )
}

// ── Conflictos con otros turnos del mismo día ───────────────────────────────

export type TurnoDelDia = {
  asignadoId: string | null
  vehiculoId: string | null
  tipoTurno: string
  horario: string
  esTurnoExtra: boolean
}

export type TurnoPropuesto = {
  asignadoId: string
  nombreTrabajador: string
  vehiculoId: string
  codigoVehiculo: string
  cupoVehiculo: number
  tipoTurno: string
  horario: string
  esTurnoExtra: boolean
  esCupoExtra: boolean
}

/**
 * Valida un turno contra los demás turnos de esa fecha (sin incluir el que se edita).
 * Reglas:
 *  1. Un trabajador no puede tener dos turnos de la misma jornada el mismo día.
 *  2. Doble jornada (diurno + nocturno) solo si uno de los dos es "turno extra"
 *     y los horarios no se traslapan.
 *  3. La unidad no puede tener jornadas cuyos horarios se traslapen.
 *  4. Cupo de la unidad por jornada, salvo que se marque "Cupo extra".
 */
export function validarConflictosDelDia(turno: TurnoPropuesto, turnosMismoDia: TurnoDelDia[]): string | null {
  const jornada = nombreJornada(turno.tipoTurno)

  // 1 y 2. Trabajador
  const delTrabajador = turnosMismoDia.filter((t) => t.asignadoId === turno.asignadoId)
  if (delTrabajador.some((t) => t.tipoTurno === turno.tipoTurno)) {
    return `${turno.nombreTrabajador} ya tiene un turno ${jornada} registrado en esa fecha.`
  }

  const otraJornada = delTrabajador.find((t) => t.tipoTurno !== turno.tipoTurno)
  if (otraJornada) {
    if (!turno.esTurnoExtra && !otraJornada.esTurnoExtra) {
      return `${turno.nombreTrabajador} ya tiene un turno ${nombreJornada(otraJornada.tipoTurno)} (${obtenerEtiquetaHorario(otraJornada.horario)}) en esa fecha. Para cubrir doble jornada, uno de los dos turnos debe marcarse como "¿Es turno extra?".`
    }
    if (!horariosCompatiblesEnMismoDia(turno.horario, otraJornada.horario)) {
      return `El horario ${obtenerEtiquetaHorario(turno.horario)} se traslapa con el otro turno de ${turno.nombreTrabajador} (${obtenerEtiquetaHorario(otraJornada.horario)}). Elige un horario compatible según su hora de salida.`
    }
  }

  // 3. Entrega de la unidad entre jornadas
  const deLaUnidad = turnosMismoDia.filter((t) => t.vehiculoId === turno.vehiculoId)
  const traslape = deLaUnidad.find(
    (t) => t.tipoTurno !== turno.tipoTurno && !horariosCompatiblesEnMismoDia(turno.horario, t.horario),
  )
  if (traslape) {
    return `La unidad ${turno.codigoVehiculo} tiene asignado el horario ${obtenerEtiquetaHorario(traslape.horario)} en ese día, por lo que no está disponible para el horario ${obtenerEtiquetaHorario(turno.horario)} (se traslapan las horas de entrega).`
  }

  // 4. Cupo por jornada
  const ocupantes = deLaUnidad.filter((t) => t.tipoTurno === turno.tipoTurno).length
  if (ocupantes >= turno.cupoVehiculo && !turno.esCupoExtra) {
    return `El vehículo ${turno.codigoVehiculo} ya alcanzó su capacidad máxima de ${turno.cupoVehiculo} personas en el turno ${jornada}. Activa la opción de "Cupo extra en vehículo" si necesitas agregar más personal.`
  }

  return null
}
