export const HORARIO_LABELS: Record<string, string> = {
  DIURNO_06_18: '06:00 – 18:00',
  DIURNO_07_19: '07:00 – 19:00',
  DIURNO_08_20: '08:00 – 20:00',
  DIURNO_09_21: '09:00 – 21:00',
  NOCTURNO_19_07: '19:00 – 07:00',
  NOCTURNO_20_08: '20:00 – 08:00',
  NOCTURNO_21_09: '21:00 – 09:00',
}

export const HORARIO_CORTO: Record<string, string> = {
  DIURNO_06_18: '06-18h',
  DIURNO_07_19: '07-19h',
  DIURNO_08_20: '08-20h',
  DIURNO_09_21: '09-21h',
  NOCTURNO_19_07: '19-07h',
  NOCTURNO_20_08: '20-08h',
  NOCTURNO_21_09: '21-09h',
}

export const HORARIOS_DIURNOS = [
  'DIURNO_06_18',
  'DIURNO_07_19',
  'DIURNO_08_20',
  'DIURNO_09_21',
] as const

export const HORARIOS_NOCTURNOS = [
  'NOCTURNO_19_07',
  'NOCTURNO_20_08',
  'NOCTURNO_21_09',
] as const

type RangoHorarioInfo = {
  inicio: number // Hora de inicio respecto a las 00:00 de la fecha del turno
  fin: number // Hora de salida respecto a las 00:00 de la fecha del turno (ej. 31 = 07:00 del día siguiente)
  tipo: 'DIURNO' | 'NOCTURNO'
}

export const RANGO_HORARIO: Record<string, RangoHorarioInfo> = {
  DIURNO_06_18: { inicio: 6, fin: 18, tipo: 'DIURNO' },
  DIURNO_07_19: { inicio: 7, fin: 19, tipo: 'DIURNO' },
  DIURNO_08_20: { inicio: 8, fin: 20, tipo: 'DIURNO' },
  DIURNO_09_21: { inicio: 9, fin: 21, tipo: 'DIURNO' },
  NOCTURNO_19_07: { inicio: 19, fin: 31, tipo: 'NOCTURNO' },
  NOCTURNO_20_08: { inicio: 20, fin: 32, tipo: 'NOCTURNO' },
  NOCTURNO_21_09: { inicio: 21, fin: 33, tipo: 'NOCTURNO' },
}

export function esHorarioValidoParaTipoTurno(tipoTurno: string, horario: string): boolean {
  const info = RANGO_HORARIO[horario]
  if (!info) return false
  return info.tipo === tipoTurno
}

/**
 * Verifica que dos turnos en distinta zona horaria (DIURNO vs NOCTURNO) en el mismo día
 * NO se traslapen en horario.
 * Ejemplo:
 * - DIURNO_06_18 (termina 18:00) -> compatible con 19:00, 20:00 y 21:00
 * - DIURNO_07_19 (termina 19:00) -> compatible con 19:00, 20:00 y 21:00
 * - DIURNO_08_20 (termina 20:00) -> compatible con 20:00 y 21:00 (NO con 19:00)
 * - DIURNO_09_21 (termina 21:00) -> compatible con 21:00 (NO con 19:00 ni 20:00)
 */
export function horariosCompatiblesEnMismoDia(horarioA: string, horarioB: string): boolean {
  const infoA = RANGO_HORARIO[horarioA]
  const infoB = RANGO_HORARIO[horarioB]
  if (!infoA || !infoB) return false
  if (infoA.tipo === infoB.tipo) return false

  const diurno = infoA.tipo === 'DIURNO' ? infoA : infoB
  const nocturno = infoA.tipo === 'NOCTURNO' ? infoA : infoB

  return diurno.fin <= nocturno.inicio
}

export function obtenerEtiquetaHorario(horario: string): string {
  return HORARIO_LABELS[horario] ?? horario
}

