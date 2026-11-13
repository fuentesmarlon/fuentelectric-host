import type { Prisma } from '@prisma/client'

// Datos de un turno para las vistas de lista y calendario.
// De las relaciones solo se traen los campos que se muestran (no el registro completo),
// para no enviar al navegador más datos de los necesarios.
export const INCLUDE_TURNO_LISTA = {
  asignado: { select: { id: true, nombre: true } },
  vehiculo: { select: { id: true, codigo: true } },
  area: { select: { id: true, nombre: true } },
} satisfies Prisma.TurnoDiarioInclude

export type TurnoLista = Prisma.TurnoDiarioGetPayload<{ include: typeof INCLUDE_TURNO_LISTA }>

// ── Ventana de fechas que se carga en la página de Asistencias ───────────────

/** Rango máximo que se carga de una vez. Para periodos más largos: exportar a Excel/PDF. */
export const MAX_DIAS_VENTANA = 93

export type VentanaTurnos = {
  /** Primer y último día cargados (YYYY-MM-DD, inclusive) */
  desde: string
  hasta: string
  /** Mes mostrado en el calendario (YYYY-MM) */
  mes: string
  /** Filtro de fechas pedido por el usuario (vacío si no hay) */
  filtroDesde: string
  filtroHasta: string
  /** true si el rango pedido superaba MAX_DIAS_VENTANA y se recortó */
  recortado: boolean
}

const ISO_DIA = /^\d{4}-\d{2}-\d{2}$/
const ISO_MES = /^\d{4}-\d{2}$/
const DIA_MS = 24 * 60 * 60 * 1000

const aFecha = (iso: string) => new Date(`${iso}T12:00:00Z`)
const aIso = (d: Date) => d.toISOString().slice(0, 10)
const sumarDias = (iso: string, dias: number) => aIso(new Date(aFecha(iso).getTime() + dias * DIA_MS))
const esDiaValido = (v?: string) => Boolean(v && ISO_DIA.test(v) && aIso(aFecha(v)) === v)

/** Cuadrícula del calendario de un mes: del lunes anterior al día 1 al domingo posterior al último día. */
export function cuadriculaDelMes(mes: string): { desde: string; hasta: string } {
  const [y, m] = mes.split('-').map(Number)
  const primero = new Date(Date.UTC(y, m - 1, 1, 12))
  const ultimo = new Date(Date.UTC(y, m, 0, 12))
  const diasAntes = (primero.getUTCDay() + 6) % 7 // lunes = 0
  const diasDespues = (7 - ultimo.getUTCDay()) % 7 // domingo = 0
  return { desde: sumarDias(aIso(primero), -diasAntes), hasta: sumarDias(aIso(ultimo), diasDespues) }
}

/**
 * Decide qué rango de turnos cargar según la URL:
 *  - con ?desde / ?hasta: ese rango (máximo MAX_DIAS_VENTANA días)
 *  - si no: la cuadrícula del mes ?mes=YYYY-MM (por defecto, el mes actual)
 */
export function calcularVentanaTurnos(
  params: { mes?: string; desde?: string; hasta?: string },
  hoyIso: string,
): VentanaTurnos {
  const mes = params.mes && ISO_MES.test(params.mes) ? params.mes : hoyIso.slice(0, 7)
  const filtroDesde = esDiaValido(params.desde) ? params.desde! : ''
  const filtroHasta = esDiaValido(params.hasta) ? params.hasta! : ''

  if (!filtroDesde && !filtroHasta) {
    return { ...cuadriculaDelMes(mes), mes, filtroDesde, filtroHasta, recortado: false }
  }

  let desde = filtroDesde || sumarDias(filtroHasta, -(MAX_DIAS_VENTANA - 1))
  let hasta = filtroHasta || sumarDias(filtroDesde, MAX_DIAS_VENTANA - 1)
  if (desde > hasta) [desde, hasta] = [hasta, desde]

  const dias = Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / DIA_MS) + 1
  const recortado = dias > MAX_DIAS_VENTANA && Boolean(filtroDesde && filtroHasta)
  if (dias > MAX_DIAS_VENTANA) hasta = sumarDias(desde, MAX_DIAS_VENTANA - 1)

  return { desde, hasta, mes: desde.slice(0, 7), filtroDesde, filtroHasta, recortado }
}
