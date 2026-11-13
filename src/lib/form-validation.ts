// Utilidades para leer formularios y manejar fechas de turnos.
//
// Regla importante de fechas: la columna `fecha` de un turno se guarda a las 12:00 UTC
// del día (06:00 en Guatemala). Así el día nunca "se corre" al convertir entre zonas
// horarias. Para buscar turnos de un día usa rangoFechaTurno(); no armes las fechas a mano.

/** Texto de un campo del formulario ('' si no viene). */
export function formText(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

export function isEnumValue<T extends string>(values: Record<string, T>, value: unknown): value is T {
  return typeof value === 'string' && Object.values(values).some(option => option === value)
}

/** "YYYY-MM-DD" -> fecha del turno a las 12:00 UTC, o null si el día no existe (ej. 31/02). */
export function shiftDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null
}

// Zona horaria operativa. El servidor (p. ej. Vercel) corre en UTC, así que "hoy"
// debe calcularse en hora de Guatemala para que los turnos del día no pasen a
// considerarse "pasados" a partir de las 18:00 locales.
export const ZONA_HORARIA_OPERATIVA = 'America/Guatemala'

const formatoFechaOperativa = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA_OPERATIVA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function todayIsoDate(now: Date = new Date()): string {
  // 'en-CA' produce el formato YYYY-MM-DD
  return formatoFechaOperativa.format(now)
}

export function isPastShiftDate(date: Date | string, now: Date = new Date()): boolean {
  const dateIso = typeof date === 'string'
    ? date.slice(0, 10)
    : new Date(date).toISOString().slice(0, 10)
  return dateIso < todayIsoDate(now)
}

// Guatemala está en UTC-6 todo el año (no usa horario de verano).
const DESFASE_OPERATIVO = '-06:00'

/** Primer instante del día `YYYY-MM-DD` en hora de Guatemala (para filtrar timestamps). */
export function inicioDiaOperativo(iso: string): Date {
  return new Date(`${iso}T00:00:00.000${DESFASE_OPERATIVO}`)
}

/** Último instante del día `YYYY-MM-DD` en hora de Guatemala. */
export function finDiaOperativo(iso: string): Date {
  return new Date(`${iso}T23:59:59.999${DESFASE_OPERATIVO}`)
}

/** Rango de búsqueda para la columna `fecha` de los turnos (guardada a las 12:00 UTC). */
export function rangoFechaTurno(iso: string): { gte: Date; lte: Date } {
  return { gte: new Date(`${iso}T00:00:00.000Z`), lte: new Date(`${iso}T23:59:59.999Z`) }
}

const formatoFechaHoraOperativa = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONA_HORARIA_OPERATIVA,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** `dd/MM/yyyy HH:mm` en hora de Guatemala, sin importar la zona del servidor. */
export function formatearFechaHoraOperativa(fecha: Date): string {
  const p = Object.fromEntries(formatoFechaHoraOperativa.formatToParts(fecha).map((x) => [x.type, x.value]))
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`
}

/** `dd/MM/yyyy` de un día `YYYY-MM-DD`. */
export function formatearIsoCorto(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
