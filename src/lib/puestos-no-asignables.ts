// Puestos administrativos y de dirección que NUNCA se asignan a turnos operativos.
// Se usa en: la lista de personal de Asignación de turnos, la validación al guardar
// un turno, la carga masiva por Excel y la plantilla de Excel.
// Para agregar o quitar un puesto, se cambia SOLO esta lista.

export const PUESTOS_NO_ASIGNABLES = [
  'Gerente General',
  'Administrador',
  'Administrativo Jr',
  'Gerente Administrativo',
  'Supervisor SISO',
] as const

/** "  Administrativo JR. " -> "administrativo jr" (sin tildes, mayúsculas, puntos ni espacios de más). */
function normalizarPuesto(puesto: string): string {
  return puesto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[,;:()\-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const NORMALIZADOS = new Set(PUESTOS_NO_ASIGNABLES.map(normalizarPuesto))

export function esPuestoNoAsignable(puesto: string | null | undefined): boolean {
  return Boolean(puesto) && NORMALIZADOS.has(normalizarPuesto(puesto as string))
}

/** Quita de una lista a las personas con puestos que no se asignan a turnos. */
export function soloPersonalAsignable<T extends { puesto?: string | null }>(trabajadores: T[]): T[] {
  return trabajadores.filter((t) => !esPuestoNoAsignable(t.puesto))
}
