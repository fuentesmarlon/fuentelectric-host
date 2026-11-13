// Periodos para la lista de turnos del Dashboard (la página que ven todos los usuarios).
// Por defecto se muestran los turnos de HOY; también mañana, esta semana, este mes o un día elegido.
// Todas las fechas son días YYYY-MM-DD en hora de Guatemala.

export type PeriodoDashboard = 'hoy' | 'manana' | 'semana' | 'mes' | 'dia'

export const OPCIONES_PERIODO: { id: Exclude<PeriodoDashboard, 'dia'>; etiqueta: string }[] = [
  { id: 'hoy', etiqueta: 'Hoy' },
  { id: 'manana', etiqueta: 'Mañana' },
  { id: 'semana', etiqueta: 'Esta semana' },
  { id: 'mes', etiqueta: 'Este mes' },
]

export type RangoDashboard = {
  periodo: PeriodoDashboard
  desde: string
  hasta: string
  /** Para el título: "Turnos de hoy", "Turnos de esta semana", … */
  titulo: string
}

const DIA_MS = 86_400_000
const aFecha = (iso: string) => new Date(`${iso}T12:00:00Z`)
const aIso = (d: Date) => d.toISOString().slice(0, 10)
const sumarDias = (iso: string, n: number) => aIso(new Date(aFecha(iso).getTime() + n * DIA_MS))
const esDiaValido = (v?: string): v is string => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v) && aIso(aFecha(v)) === v)

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** "jueves 5 de noviembre" */
export function nombreDia(iso: string): string {
  const d = aFecha(iso)
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`
}

export function calcularPeriodoDashboard(
  params: { periodo?: string; dia?: string },
  hoyIso: string,
): RangoDashboard {
  if (esDiaValido(params.dia)) {
    const titulo = params.dia === hoyIso ? 'Turnos de hoy' : `Turnos del ${nombreDia(params.dia)}`
    return { periodo: params.dia === hoyIso ? 'hoy' : 'dia', desde: params.dia, hasta: params.dia, titulo }
  }

  switch (params.periodo) {
    case 'manana': {
      const dia = sumarDias(hoyIso, 1)
      return { periodo: 'manana', desde: dia, hasta: dia, titulo: 'Turnos de mañana' }
    }
    case 'semana': {
      const diaSemana = (aFecha(hoyIso).getUTCDay() + 6) % 7 // lunes = 0
      const lunes = sumarDias(hoyIso, -diaSemana)
      return { periodo: 'semana', desde: lunes, hasta: sumarDias(lunes, 6), titulo: 'Turnos de esta semana' }
    }
    case 'mes': {
      const [y, m] = hoyIso.split('-').map(Number)
      const ultimo = aIso(new Date(Date.UTC(y, m, 0, 12)))
      return { periodo: 'mes', desde: `${hoyIso.slice(0, 7)}-01`, hasta: ultimo, titulo: 'Turnos de este mes' }
    }
    default:
      return { periodo: 'hoy', desde: hoyIso, hasta: hoyIso, titulo: 'Turnos de hoy' }
  }
}

/** Texto bajo el título: "jueves 5 de noviembre" o "del lunes 2 al domingo 8 de noviembre". */
export function describirRango(r: RangoDashboard): string {
  return r.desde === r.hasta ? nombreDia(r.desde) : `del ${nombreDia(r.desde)} al ${nombreDia(r.hasta)}`
}
