// Prepara TODOS los datos de los reportes de Historial (PDF y Excel): consulta la base,
// arma la matriz de programación, el consolidado por trabajador, los extras y la auditoría.
// Los archivos de lib/reportes/pdf y lib/reportes/excel solo "dibujan" lo que sale de aquí,
// así que si un número del reporte está mal, el error casi siempre está en este archivo.
import fs from 'node:fs'
import path from 'node:path'
import { addDays, differenceInCalendarDays, format, subMonths } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { HORARIO_CORTO, HORARIO_LABELS } from '@/lib/horarios-turno'
import {
  finDiaOperativo,
  formatearFechaHoraOperativa,
  formatearIsoCorto,
  inicioDiaOperativo,
  todayIsoDate,
} from '@/lib/form-validation'

export type TipoReporteExportacion = 'completo' | 'programacion' | 'auditoria'

export type CeldaDiaProgramacion = {
  codigo: '12D' | '12N' | '12D+' | '12N+' | '24H' | 'D'
  turnosCount: number
  extrasCount: number
  horas: number
}

export type FilaMatrizProgramacion = {
  unidad: string
  trabajador: string
  puesto: string
  horarioPrincipal: string
  esNocturnoPrincipal: boolean
  areaPrincipal: string
  celdasPorFecha: Record<string, CeldaDiaProgramacion>
  totalTurnos: number
  totalExtras: number
  totalHoras: number
}

export type FilaConsolidadoTrabajador = {
  trabajador: string
  puesto: string
  unidades: string
  areas: string
  turnosNormales: number
  turnosExtras: number
  totalTurnos: number
  horasNormales: number
  horasExtras: number
  totalHoras: number
  extrasPorFecha: Record<string, number>
  detalleFechasExtra: string
}

export type TurnoDetalleExportacion = {
  id: string
  fechaIso: string
  fechaFormateada: string
  diaSemana: string
  unidad: string
  trabajador: string
  puesto: string
  area: string
  tipoTurno: 'DIURNO' | 'NOCTURNO'
  tipoTurnoLabel: string
  horario: string
  horarioCorto: string
  esTurnoExtra: boolean
  esCupoExtra: boolean
  registradoPor: string
  comentario: string
}

export type SnapshotExportacion = {
  id: string
  fechaGuardado: Date
  fechaFormateada: string
  accion: 'CREACION' | 'EDICION' | 'ELIMINACION'
  accionLabel: string
  nombreTrabajador: string
  areaTrabajo: string
  vehiculoPlaca: string
  tipoTurno: string
  horario: string
  esTurnoExtra: boolean
  usuarioResponsable: string
  comentario: string
}

export type DatosReporteExportacion = {
  tipoReporte: TipoReporteExportacion
  etiquetaPeriodo: string
  notaMatriz: string | null
  generadoEn: Date
  generadoTexto: string
  fechasMatriz: string[]
  filasProgramacion: FilaMatrizProgramacion[]
  totalesPorFecha: Record<string, number>
  consolidadoTrabajadores: FilaConsolidadoTrabajador[]
  turnosDetalle: TurnoDetalleExportacion[]
  snapshots: SnapshotExportacion[]
  kpis: {
    totalTurnos: number
    turnosDiurnos: number
    turnosNocturnos: number
    turnosExtras: number
    cuposExtras: number
    totalHoras: number
    unidadesActivas: number
    trabajadoresActivos: number
    totalSnapshots: number
  }
  logoBase64: string | null
}

const ACCION_LABELS: Record<string, string> = {
  CREACION: 'Creación',
  EDICION: 'Edición',
  ELIMINACION: 'Eliminación',
}

const DIAS_CORTOS_UTC = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const DIAS_LARGOS_UTC = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function obtenerInfoFechaIso(fechaIso: string): {
  diaCorto: string
  diaLargo: string
  ddMm: string
  ddMmYyyy: string
  esFinDeSemana: boolean
} {
  const [y, m, d] = fechaIso.split('-').map(Number)
  const utcDate = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0))
  const dow = utcDate.getUTCDay()
  const dd = String(d).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  return {
    diaCorto: DIAS_CORTOS_UTC[dow] ?? '',
    diaLargo: DIAS_LARGOS_UTC[dow] ?? '',
    ddMm: `${dd}/${mm}`,
    ddMmYyyy: `${dd}/${mm}/${y}`,
    esFinDeSemana: dow === 0 || dow === 6,
  }
}

function generarRangoFechasIso(desdeIso: string, hastaIso: string): string[] {
  const [y1, m1, d1] = desdeIso.split('-').map(Number)
  const [y2, m2, d2] = hastaIso.split('-').map(Number)
  const inicio = new Date(Date.UTC(y1, m1 - 1, d1, 12, 0, 0))
  const fin = new Date(Date.UTC(y2, m2 - 1, d2, 12, 0, 0))
  if (inicio > fin) return []

  const resultado: string[] = []
  let cursor = inicio
  while (cursor <= fin && resultado.length < 62) {
    resultado.push(cursor.toISOString().slice(0, 10))
    cursor = addDays(cursor, 1)
  }
  return resultado
}

export function cargarLogoFteBase64(): string | null {
  try {
    const logoPath = path.resolve('public/images/fte-logo.png')
    if (!fs.existsSync(logoPath)) return null
    return fs.readFileSync(logoPath).toString('base64')
  } catch {
    return null
  }
}

export function extraerParametroUrl(url: string, key: string): string {
  const match = url.match(new RegExp(`[?&]${key}=([^&#]*)`))
  return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : ''
}

export async function obtenerDatosExportacion(url: string): Promise<DatosReporteExportacion> {
  const desdeParam = extraerParametroUrl(url, 'desde')
  const hastaParam = extraerParametroUrl(url, 'hasta')
  const todoParam = extraerParametroUrl(url, 'todo') === '1'
  const tipoRaw = extraerParametroUrl(url, 'tipo').toLowerCase()
  const tipoReporte: TipoReporteExportacion =
    tipoRaw === 'programacion' || tipoRaw === 'auditoria' ? tipoRaw : 'completo'

  const areaIdParam = extraerParametroUrl(url, 'areaId')
  const vehiculoIdParam = extraerParametroUrl(url, 'vehiculoId')
  const trabajadorIdParam = extraerParametroUrl(url, 'trabajadorId')
  const tipoTurnoParam = extraerParametroUrl(url, 'tipoTurno')
  const extraParam = extraerParametroUrl(url, 'extra')

  // Fechas por defecto calculadas en hora de Guatemala (el servidor corre en UTC)
  const ahora = new Date()
  const hastaDefaultIso = todayIsoDate(ahora)
  const desdeDefaultIso = format(subMonths(new Date(`${hastaDefaultIso}T12:00:00Z`), 1), 'yyyy-MM-dd')

  const desdeValido = /^\d{4}-\d{2}-\d{2}$/.test(desdeParam) ? desdeParam : ''
  const hastaValido = /^\d{4}-\d{2}-\d{2}$/.test(hastaParam) ? hastaParam : ''

  const fechaDesde = desdeValido ? new Date(`${desdeValido}T00:00:00.000Z`) : null
  const fechaHasta = hastaValido ? new Date(`${hastaValido}T23:59:59.999Z`) : null


  // 1. Consulta de Historial de Auditoría (SnapshotTurno)
  const whereSnapshot = todoParam
    ? {}
    : desdeValido || hastaValido
      ? {
          fechaGuardado: {
            ...(desdeValido ? { gte: inicioDiaOperativo(desdeValido) } : {}),
            ...(hastaValido ? { lte: finDiaOperativo(hastaValido) } : {}),
          },
        }
      : {
          fechaGuardado: {
            gte: inicioDiaOperativo(desdeDefaultIso),
            lte: ahora,
          },
        }

  const rawSnapshots =
    'snapshotTurno' in prisma
      ? await prisma.snapshotTurno.findMany({
          where: whereSnapshot,
          orderBy: { fechaGuardado: 'desc' },
        })
      : []

  // 2. Consulta de Turnos Operativos (TurnoDiario)
  const whereTurno: Record<string, unknown> = {}
  if (!todoParam) {
    if (fechaDesde || fechaHasta) {
      whereTurno.fecha = {
        ...(fechaDesde ? { gte: fechaDesde } : {}),
        ...(fechaHasta ? { lte: fechaHasta } : {}),
      }
    } else {
      whereTurno.fecha = {
        gte: new Date(`${desdeDefaultIso}T00:00:00.000Z`),
        lte: new Date(`${hastaDefaultIso}T23:59:59.999Z`),
      }
    }
  }
  if (areaIdParam && areaIdParam !== 'todos') whereTurno.areaId = areaIdParam
  if (vehiculoIdParam && vehiculoIdParam !== 'todos') whereTurno.vehiculoId = vehiculoIdParam
  if (trabajadorIdParam && trabajadorIdParam !== 'todos') whereTurno.asignadoId = trabajadorIdParam
  if (tipoTurnoParam === 'DIURNO' || tipoTurnoParam === 'NOCTURNO') whereTurno.tipoTurno = tipoTurnoParam
  if (extraParam === 'SI') whereTurno.esTurnoExtra = true
  if (extraParam === 'NO') whereTurno.esTurnoExtra = false

  const rawTurnos =
    tipoReporte !== 'auditoria' && 'turnoDiario' in prisma
      ? await prisma.turnoDiario.findMany({
          where: whereTurno,
          include: {
            asignado: { select: { nombre: true, puesto: true } },
            vehiculo: { select: { codigo: true } },
            area: { select: { nombre: true } },
          },
          orderBy: [{ fecha: 'asc' }, { tipoTurno: 'asc' }],
        })
      : []

  // 3. Normalizar Turnos Detalle
  const turnosDetalle: TurnoDetalleExportacion[] = rawTurnos.map((t) => {
    const fechaIso = new Date(t.fecha).toISOString().slice(0, 10)
    const infoFecha = obtenerInfoFechaIso(fechaIso)
    const horarioKey = String(t.horario)
    return {
      id: t.id,
      fechaIso,
      fechaFormateada: infoFecha.ddMmYyyy,
      diaSemana: infoFecha.diaLargo,
      unidad: t.vehiculo?.codigo || t.vehiculoCodigo || 'SIN UNIDAD',
      trabajador: t.asignado?.nombre || t.asignadoNombre || 'SIN ASIGNAR',
      puesto: t.asignado?.puesto || 'Operativo',
      area: t.area?.nombre || t.areaNombre || 'General',
      tipoTurno: t.tipoTurno === 'NOCTURNO' ? 'NOCTURNO' : 'DIURNO',
      tipoTurnoLabel: t.tipoTurno === 'NOCTURNO' ? 'Nocturno' : 'Diurno',
      horario: HORARIO_LABELS[horarioKey] ?? horarioKey,
      horarioCorto: HORARIO_CORTO[horarioKey] ?? horarioKey,
      esTurnoExtra: Boolean(t.esTurnoExtra),
      esCupoExtra: Boolean(t.esCupoExtra),
      registradoPor: t.registradoPor || 'Sistema',
      comentario: t.comentario || '',
    }
  })

  // Ordenar detalle por fecha asc, unidad natural, jornada
  turnosDetalle.sort((a, b) => {
    if (a.fechaIso !== b.fechaIso) return a.fechaIso.localeCompare(b.fechaIso)
    const cmpUnidad = a.unidad.localeCompare(b.unidad, 'es', { numeric: true, sensitivity: 'base' })
    if (cmpUnidad !== 0) return cmpUnidad
    if (a.tipoTurno !== b.tipoTurno) return a.tipoTurno === 'DIURNO' ? -1 : 1
    return a.trabajador.localeCompare(b.trabajador, 'es', { sensitivity: 'base' })
  })

  // 4. Determinar ventana de fechas para la Matriz de Programación (máx. 62 días para legibilidad)
  let matrizDesde = desdeValido || desdeDefaultIso
  let matrizHasta = hastaValido || hastaDefaultIso
  let notaMatriz: string | null = null

  if (todoParam) {
    if (turnosDetalle.length > 0) {
      const minFecha = turnosDetalle[0].fechaIso
      const maxFecha = turnosDetalle[turnosDetalle.length - 1].fechaIso
      const [ym, mm, dm] = maxFecha.split('-').map(Number)
      const [yi, mi, di] = minFecha.split('-').map(Number)
      const diff = differenceInCalendarDays(
        new Date(Date.UTC(ym, mm - 1, dm)),
        new Date(Date.UTC(yi, mi - 1, di)),
      )
      if (diff > 30) {
        const inicioReciente = addDays(new Date(Date.UTC(ym, mm - 1, dm, 12, 0, 0)), -30)
        matrizDesde = inicioReciente.toISOString().slice(0, 10)
        matrizHasta = maxFecha
        notaMatriz = `Matriz visual de los últimos 31 días activos (${obtenerInfoFechaIso(matrizDesde).ddMmYyyy} al ${obtenerInfoFechaIso(matrizHasta).ddMmYyyy}). El listado completo está en Detalle de Turnos.`
      } else {
        matrizDesde = minFecha
        matrizHasta = maxFecha
      }
    }
  } else {
    if (desdeValido && !hastaValido) {
      matrizHasta = turnosDetalle.length > 0 ? turnosDetalle[turnosDetalle.length - 1].fechaIso : hastaDefaultIso
      if (matrizHasta < matrizDesde) matrizHasta = matrizDesde
    } else if (!desdeValido && hastaValido) {
      matrizDesde = turnosDetalle.length > 0 ? turnosDetalle[0].fechaIso : desdeDefaultIso
      if (matrizDesde > matrizHasta) matrizDesde = matrizHasta
    }
    const [y1, m1, d1] = matrizDesde.split('-').map(Number)
    const [y2, m2, d2] = matrizHasta.split('-').map(Number)
    const span = differenceInCalendarDays(
      new Date(Date.UTC(y2, m2 - 1, d2)),
      new Date(Date.UTC(y1, m1 - 1, d1)),
    )
    if (span > 61) {
      const tope = addDays(new Date(Date.UTC(y1, m1 - 1, d1, 12, 0, 0)), 61)
      matrizHasta = tope.toISOString().slice(0, 10)
      notaMatriz = `Matriz acotada a los primeros 62 días del periodo para conservar diseño de impresión. El 100% de registros se incluye en Detalle de Turnos.`
    }
  }

  const fechasMatriz = generarRangoFechasIso(matrizDesde, matrizHasta)
  const fechasMatrizSet = new Set(fechasMatriz)

  // 5. Construir Matriz de Programación agrupada por Unidad -> Trabajador
  type AcumuladorFila = {
    unidad: string
    trabajador: string
    puesto: string
    frecuenciaHorario: Map<string, number>
    frecuenciaArea: Map<string, number>
    diurnosCount: number
    nocturnosCount: number
    porFecha: Map<string, TurnoDetalleExportacion[]>
    totalTurnos: number
    totalExtras: number
  }

  const mapaFilas = new Map<string, AcumuladorFila>()
  const totalesPorFecha: Record<string, number> = {}
  for (const f of fechasMatriz) totalesPorFecha[f] = 0

  for (const t of turnosDetalle) {
    if (!fechasMatrizSet.has(t.fechaIso)) continue
    totalesPorFecha[t.fechaIso] = (totalesPorFecha[t.fechaIso] || 0) + 1

    const clave = `${t.unidad.toUpperCase()}||${t.trabajador.toUpperCase()}`
    let acum = mapaFilas.get(clave)
    if (!acum) {
      acum = {
        unidad: t.unidad,
        trabajador: t.trabajador,
        puesto: t.puesto,
        frecuenciaHorario: new Map(),
        frecuenciaArea: new Map(),
        diurnosCount: 0,
        nocturnosCount: 0,
        porFecha: new Map(),
        totalTurnos: 0,
        totalExtras: 0,
      }
      mapaFilas.set(clave, acum)
    }
    acum.frecuenciaHorario.set(t.horarioCorto, (acum.frecuenciaHorario.get(t.horarioCorto) || 0) + 1)
    acum.frecuenciaArea.set(t.area, (acum.frecuenciaArea.get(t.area) || 0) + 1)
    if (t.tipoTurno === 'NOCTURNO') acum.nocturnosCount += 1
    else acum.diurnosCount += 1

    const listaDia = acum.porFecha.get(t.fechaIso) || []
    listaDia.push(t)
    acum.porFecha.set(t.fechaIso, listaDia)
    acum.totalTurnos += 1
    if (t.esTurnoExtra) acum.totalExtras += 1
  }

  const elegirMasFrecuente = (mapa: Map<string, number>, fallback: string): string => {
    let mejor = fallback
    let max = -1
    for (const [k, v] of mapa.entries()) {
      if (v > max) {
        max = v
        mejor = k
      }
    }
    return mejor
  }

  const filasProgramacion: FilaMatrizProgramacion[] = Array.from(mapaFilas.values()).map((acum) => {
    const horarioPrincipal = elegirMasFrecuente(acum.frecuenciaHorario, '—')
    const areaPrincipal = elegirMasFrecuente(acum.frecuenciaArea, 'General')
    const esNocturnoPrincipal = acum.nocturnosCount > acum.diurnosCount

    const celdasPorFecha: Record<string, CeldaDiaProgramacion> = {}
    for (const fechaIso of fechasMatriz) {
      const turnosDia = acum.porFecha.get(fechaIso)
      if (!turnosDia || turnosDia.length === 0) {
        celdasPorFecha[fechaIso] = { codigo: 'D', turnosCount: 0, extrasCount: 0, horas: 0 }
      } else if (turnosDia.length >= 2) {
        const extrasDia = turnosDia.filter((x) => x.esTurnoExtra).length
        celdasPorFecha[fechaIso] = {
          codigo: '24H',
          turnosCount: turnosDia.length,
          extrasCount: extrasDia,
          horas: turnosDia.length * 12,
        }
      } else {
        const unico = turnosDia[0]
        const codigo =
          unico.tipoTurno === 'NOCTURNO'
            ? unico.esTurnoExtra
              ? '12N+'
              : '12N'
            : unico.esTurnoExtra
              ? '12D+'
              : '12D'
        celdasPorFecha[fechaIso] = {
          codigo,
          turnosCount: 1,
          extrasCount: unico.esTurnoExtra ? 1 : 0,
          horas: 12,
        }
      }
    }

    return {
      unidad: acum.unidad,
      trabajador: acum.trabajador,
      puesto: acum.puesto,
      horarioPrincipal,
      esNocturnoPrincipal,
      areaPrincipal,
      celdasPorFecha,
      totalTurnos: acum.totalTurnos,
      totalExtras: acum.totalExtras,
      totalHoras: acum.totalTurnos * 12,
    }
  })

  // Ordenar: Unidad natural -> Diurno antes que Nocturno -> Horario -> Nombre de Trabajador
  filasProgramacion.sort((a, b) => {
    const cmpUnidad = a.unidad.localeCompare(b.unidad, 'es', { numeric: true, sensitivity: 'base' })
    if (cmpUnidad !== 0) return cmpUnidad
    if (a.esNocturnoPrincipal !== b.esNocturnoPrincipal) return a.esNocturnoPrincipal ? 1 : -1
    const cmpHorario = a.horarioPrincipal.localeCompare(b.horarioPrincipal)
    if (cmpHorario !== 0) return cmpHorario
    return a.trabajador.localeCompare(b.trabajador, 'es', { sensitivity: 'base' })
  })

  // 6. Construir Consolidado por Trabajador y Matriz de Turnos Extras
  type AcumTrabajador = {
    trabajador: string
    puesto: string
    unidadesSet: Set<string>
    areasSet: Set<string>
    turnosNormales: number
    turnosExtras: number
    extrasPorFecha: Record<string, number>
    fechasExtraList: string[]
  }
  const mapaTrabajadores = new Map<string, AcumTrabajador>()

  for (const t of turnosDetalle) {
    const key = t.trabajador.toUpperCase()
    let item = mapaTrabajadores.get(key)
    if (!item) {
      item = {
        trabajador: t.trabajador,
        puesto: t.puesto,
        unidadesSet: new Set(),
        areasSet: new Set(),
        turnosNormales: 0,
        turnosExtras: 0,
        extrasPorFecha: {},
        fechasExtraList: [],
      }
      mapaTrabajadores.set(key, item)
    }
    item.unidadesSet.add(t.unidad)
    item.areasSet.add(t.area)
    if (t.esTurnoExtra) {
      item.turnosExtras += 1
      item.extrasPorFecha[t.fechaIso] = (item.extrasPorFecha[t.fechaIso] || 0) + 1
      item.fechasExtraList.push(`${obtenerInfoFechaIso(t.fechaIso).ddMm} (${t.unidad})`)
    } else {
      item.turnosNormales += 1
    }
  }

  const consolidadoTrabajadores: FilaConsolidadoTrabajador[] = Array.from(mapaTrabajadores.values())
    .map((w) => {
      const totalTurnos = w.turnosNormales + w.turnosExtras
      const horasNormales = w.turnosNormales * 12
      const horasExtras = w.turnosExtras * 12
      return {
        trabajador: w.trabajador,
        puesto: w.puesto,
        unidades: Array.from(w.unidadesSet).sort((a, b) => a.localeCompare(b, 'es', { numeric: true })).join(', '),
        areas: Array.from(w.areasSet).join(', '),
        turnosNormales: w.turnosNormales,
        turnosExtras: w.turnosExtras,
        totalTurnos,
        horasNormales,
        horasExtras,
        totalHoras: horasNormales + horasExtras,
        extrasPorFecha: w.extrasPorFecha,
        detalleFechasExtra: w.fechasExtraList.join(', '),
      }
    })
    .sort((a, b) => {
      if (b.turnosExtras !== a.turnosExtras) return b.turnosExtras - a.turnosExtras
      if (b.totalTurnos !== a.totalTurnos) return b.totalTurnos - a.totalTurnos
      return a.trabajador.localeCompare(b.trabajador, 'es', { sensitivity: 'base' })
    })

  // 7. Normalizar Snapshots de Auditoría
  const snapshots: SnapshotExportacion[] = rawSnapshots.map((s) => ({
    id: s.id,
    fechaGuardado: new Date(s.fechaGuardado),
    fechaFormateada: formatearFechaHoraOperativa(new Date(s.fechaGuardado)),
    accion: s.accion,
    accionLabel: ACCION_LABELS[s.accion] ?? s.accion,
    nombreTrabajador: s.nombreTrabajador,
    areaTrabajo: s.areaTrabajo,
    vehiculoPlaca: s.vehiculoPlaca,
    tipoTurno: s.tipoTurno === 'NOCTURNO' ? 'Nocturno' : s.tipoTurno === 'DIURNO' ? 'Diurno' : s.tipoTurno,
    horario: HORARIO_LABELS[s.hora] ?? s.hora,
    esTurnoExtra: Boolean(s.esTurnoExtra),
    usuarioResponsable: s.usuarioResponsable,
    comentario: s.comentario ?? '',
  }))

  // 8. KPIs Ejecutivos
  const turnosDiurnos = turnosDetalle.filter((t) => t.tipoTurno === 'DIURNO').length
  const turnosNocturnos = turnosDetalle.filter((t) => t.tipoTurno === 'NOCTURNO').length
  const turnosExtras = turnosDetalle.filter((t) => t.esTurnoExtra).length
  const cuposExtras = turnosDetalle.filter((t) => t.esCupoExtra).length
  const unidadesSet = new Set(turnosDetalle.map((t) => t.unidad))
  const trabajadoresSet = new Set(turnosDetalle.map((t) => t.trabajador.toUpperCase()))

  const etiquetaPeriodo = todoParam
    ? 'Historial completo registrado'
    : desdeValido || hastaValido
      ? `Del ${desdeValido ? obtenerInfoFechaIso(desdeValido).ddMmYyyy : 'Inicio'} al ${hastaValido ? obtenerInfoFechaIso(hastaValido).ddMmYyyy : 'Actualidad'}`
      : `Último mes (${formatearIsoCorto(desdeDefaultIso)} al ${formatearIsoCorto(hastaDefaultIso)})`

  return {
    tipoReporte,
    etiquetaPeriodo,
    notaMatriz,
    generadoEn: ahora,
    generadoTexto: formatearFechaHoraOperativa(ahora),
    fechasMatriz,
    filasProgramacion,
    totalesPorFecha,
    consolidadoTrabajadores,
    turnosDetalle,
    snapshots,
    kpis: {
      totalTurnos: turnosDetalle.length,
      turnosDiurnos,
      turnosNocturnos,
      turnosExtras,
      cuposExtras,
      totalHoras: turnosDetalle.length * 12,
      unidadesActivas: unidadesSet.size,
      trabajadoresActivos: trabajadoresSet.size,
      totalSnapshots: snapshots.length,
    },
    logoBase64: cargarLogoFteBase64(),
  }
}

