import { prisma } from '@/lib/prisma'
import { EstadoDia, TipoTurno, HorarioBase, AccionSnapshot } from '@prisma/client'
import { isPastShiftDate, shiftDate } from '@/lib/form-validation'
import { bloquearFechasTurno } from '@/lib/bloqueos-turno'
import {
  motivoAreaNoDisponible,
  motivoTrabajadorNoDisponible,
  motivoVehiculoNoDisponible,
  validarConflictosDelDia,
  type TurnoDelDia,
} from '@/lib/reglas-turno'
import {
  esHorarioValidoParaTipoTurno,
  horariosCompatiblesEnMismoDia,
  obtenerEtiquetaHorario,
} from '@/lib/horarios-turno'
import ExcelJS from 'exceljs'
import { format } from 'date-fns'

export interface FilaTurnoProcesada {
  fila: number
  asignadoId: string
  asignadoNombre: string
  vehiculoId: string
  vehiculoCodigo: string
  areaId: string
  areaNombre: string
  fecha: Date
  fechaStr: string
  estado: EstadoDia
  tipoTurno: TipoTurno
  horario: HorarioBase
  esTurnoExtra: boolean
  esCupoExtra: boolean
  comentario: string | null
}

export interface ErrorFila {
  fila: number
  motivo: string
}

export interface ResultadoCargaMasiva {
  ok: boolean
  mensaje?: string
  totalLeidas: number
  creados: number
  actualizados: number
  omitidos: number
  errores: ErrorFila[]
}

// Formas aceptadas de escribir el horario en el Excel (se comparan en minúsculas).
// Si alguien lo escribe de otra forma y la fila se rechaza, se agrega la variante aquí.
const horarioMap: Record<string, HorarioBase> = {
  diurno_06_18: HorarioBase.DIURNO_06_18,
  '06:00 - 18:00': HorarioBase.DIURNO_06_18,
  '06:00 – 18:00': HorarioBase.DIURNO_06_18,
  '06-18': HorarioBase.DIURNO_06_18,
  diurno_07_19: HorarioBase.DIURNO_07_19,
  '07:00 - 19:00': HorarioBase.DIURNO_07_19,
  '07:00 – 19:00': HorarioBase.DIURNO_07_19,
  '07-19': HorarioBase.DIURNO_07_19,
  diurno_08_20: HorarioBase.DIURNO_08_20,
  '08:00 - 20:00': HorarioBase.DIURNO_08_20,
  '08:00 – 20:00': HorarioBase.DIURNO_08_20,
  '08-20': HorarioBase.DIURNO_08_20,
  diurno_09_21: HorarioBase.DIURNO_09_21,
  '09:00 - 21:00': HorarioBase.DIURNO_09_21,
  '09:00 – 21:00': HorarioBase.DIURNO_09_21,
  '09-21': HorarioBase.DIURNO_09_21,
  nocturno_19_07: HorarioBase.NOCTURNO_19_07,
  '19:00 - 07:00': HorarioBase.NOCTURNO_19_07,
  '19:00 – 07:00': HorarioBase.NOCTURNO_19_07,
  '19-07': HorarioBase.NOCTURNO_19_07,
  nocturno_20_08: HorarioBase.NOCTURNO_20_08,
  '20:00 - 08:00': HorarioBase.NOCTURNO_20_08,
  '20:00 – 08:00': HorarioBase.NOCTURNO_20_08,
  '20-08': HorarioBase.NOCTURNO_20_08,
  nocturno_21_09: HorarioBase.NOCTURNO_21_09,
  '21:00 - 09:00': HorarioBase.NOCTURNO_21_09,
  '21:00 – 09:00': HorarioBase.NOCTURNO_21_09,
  '21-09': HorarioBase.NOCTURNO_21_09,
}

function normalizarTexto(txt: unknown): string {
  if (txt === null || txt === undefined) return ''
  return String(txt).trim().toLowerCase().replace(/\s+/g, ' ')
}

function parsearFechaExcel(valor: unknown): string | null {
  if (!valor) return null

  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null
    return valor.toISOString().slice(0, 10)
  }

  if (typeof valor === 'number') {
    const millis = (valor - 25569) * 86400 * 1000
    const d = new Date(millis)
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10)
    }
  }

  const str = String(valor).trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str
  }

  const partes = str.split(/[/ -]/)
  if (partes.length === 3) {
    if (partes[0].length === 2 && partes[2].length === 4) {
      const [dia, mes, anio] = partes
      return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
    }
    if (partes[0].length === 4 && partes[1].length <= 2 && partes[2].length <= 2) {
      const [anio, mes, dia] = partes
      return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
    }
  }

  return null
}

/**
 * Lee el Excel de la carga masiva (misma estructura que la plantilla de
 * /api/asistencias/plantilla), valida cada fila y guarda los turnos válidos.
 *
 * - Las filas con errores se devuelven con su número y el motivo; las demás se guardan.
 * - modoDuplicados: si el trabajador ya tiene turno en esa fecha y jornada,
 *   "omitir" lo deja como está y "sobrescribir" lo reemplaza con lo del archivo.
 * - permitirCupoExtraGlobal: trata todas las filas como si tuvieran "Cupo extra".
 * - Las reglas de turno (doble jornada, cupo, entrega de unidad) son las mismas que
 *   al crear un turno a mano; viven en lib/reglas-turno.ts.
 */
export async function procesarBufferExcel(
  buffer: Buffer,
  adminNombre: string,
  modoDuplicados: 'omitir' | 'sobrescribir' = 'omitir',
  permitirCupoExtraGlobal: boolean = false,
): Promise<ResultadoCargaMasiva> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet || worksheet.rowCount < 2) {
    return {
      ok: false,
      mensaje: 'El archivo Excel no contiene filas de datos.',
      totalLeidas: 0,
      creados: 0,
      actualizados: 0,
      omitidos: 0,
      errores: [],
    }
  }

  // 1. Cargamos catálogos en memoria en paralelo
  const [dbTrabajadores, dbVehiculos, dbAreas] = await Promise.all([
    prisma.trabajador.findMany({
      select: { id: true, nombre: true, disponibilidad: true, puesto: true },
    }),
    prisma.vehiculo.findMany({
      select: { id: true, codigo: true, noPersonas: true, estado: true },
    }),
    prisma.area.findMany({
      select: { id: true, nombre: true, estado: true },
    }),
  ])

  const mapTrabajadores = new Map<string, { id: string; nombre: string; disponibilidad: string; puesto: string | null }>()
  for (const t of dbTrabajadores) {
    const info = { id: t.id, nombre: t.nombre, disponibilidad: t.disponibilidad, puesto: t.puesto ?? null }
    mapTrabajadores.set(t.id, info)
    mapTrabajadores.set(normalizarTexto(t.nombre), info)
  }

  const mapVehiculos = new Map<string, { id: string; codigo: string; noPersonas: number; estado?: string }>()
  for (const v of dbVehiculos) {
    mapVehiculos.set(v.id, { id: v.id, codigo: v.codigo, noPersonas: v.noPersonas, estado: v.estado })
    mapVehiculos.set(normalizarTexto(v.codigo), { id: v.id, codigo: v.codigo, noPersonas: v.noPersonas, estado: v.estado })
  }

  const mapAreas = new Map<string, { id: string; nombre: string; estado?: string }>()
  for (const a of dbAreas) {
    mapAreas.set(a.id, { id: a.id, nombre: a.nombre, estado: a.estado })
    mapAreas.set(normalizarTexto(a.nombre), { id: a.id, nombre: a.nombre, estado: a.estado })
  }

  // 2. Identificar índices de columnas a partir de la fila 1
  const headerRow = worksheet.getRow(1)
  const colIndex = {
    fecha: 1,
    trabajador: 2,
    vehiculo: 3,
    area: 4,
    tipoTurno: 5,
    horario: 6,
    extra: 7,
    comentario: 8,
    cupoExtra: 0,
  }

  headerRow.eachCell((cell, colNumber) => {
    const val = normalizarTexto(cell.value)
    if (val.includes('fecha')) colIndex.fecha = colNumber
    else if (val.includes('trabajador') || val.includes('empleado')) colIndex.trabajador = colNumber
    else if (val.includes('cupo')) colIndex.cupoExtra = colNumber
    else if (val.includes('vehiculo') || val.includes('unidad') || val.includes('placa')) colIndex.vehiculo = colNumber
    else if (val.includes('area') || val.includes('zona')) colIndex.area = colNumber
    else if (val.includes('tipo')) colIndex.tipoTurno = colNumber
    else if (val.includes('horario') || val.includes('hora')) colIndex.horario = colNumber
    else if (val.includes('extra')) colIndex.extra = colNumber
    else if (val.includes('comentario') || val.includes('observac')) colIndex.comentario = colNumber
  })

  const filasValidas: FilaTurnoProcesada[] = []
  const errores: ErrorFila[] = []
  const paresTrabajadorFechaTipoEnArchivo = new Set<string>()
  const turnosTrabajadorEnArchivoPorDia = new Map<
    string,
    { tipoTurno: TipoTurno; horario: HorarioBase; esTurnoExtra: boolean }
  >()

  // 3. Validar fila por fila
  for (let r = 2; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r)
    const c1 = row.getCell(colIndex.fecha).value
    const c2 = row.getCell(colIndex.trabajador).value
    if (!c1 && !c2) continue

    // A. Fecha
    const fechaIso = parsearFechaExcel(c1)
    if (!fechaIso) {
      errores.push({ fila: r, motivo: `Fecha no válida o vacía (${String(c1 ?? '')}). Use el formato AAAA-MM-DD.` })
      continue
    }
    const fechaDate = shiftDate(fechaIso)
    if (!fechaDate) {
      errores.push({ fila: r, motivo: `Fecha imposible (${fechaIso}). Verifique día, mes y año.` })
      continue
    }

    // B. Trabajador
    const rawTrabajador = row.getCell(colIndex.trabajador).value
    const trabajadorKey = normalizarTexto(rawTrabajador)
    const trabajador = mapTrabajadores.get(trabajadorKey)
    if (!trabajador) {
      errores.push({ fila: r, motivo: `Trabajador no encontrado en el sistema (${String(rawTrabajador ?? '')}).` })
      continue
    }

    const motivoTrabajador = motivoTrabajadorNoDisponible(trabajador)
    if (motivoTrabajador) {
      errores.push({ fila: r, motivo: motivoTrabajador })
      continue
    }

    // C. Vehículo
    const rawVehiculo = row.getCell(colIndex.vehiculo).value
    const vehiculoKey = normalizarTexto(rawVehiculo)
    const vehiculo = mapVehiculos.get(vehiculoKey)
    if (!vehiculo) {
      errores.push({ fila: r, motivo: `Vehículo '${String(rawVehiculo ?? '')}' no encontrado en el catálogo de unidades.` })
      continue
    }
    const motivoVehiculo = motivoVehiculoNoDisponible(vehiculo)
    if (motivoVehiculo) {
      errores.push({ fila: r, motivo: motivoVehiculo })
      continue
    }

    // D. Área
    const rawArea = row.getCell(colIndex.area).value
    const areaKey = normalizarTexto(rawArea)
    const area = mapAreas.get(areaKey)
    if (!area) {
      errores.push({ fila: r, motivo: `Área operativa '${String(rawArea ?? '')}' no existe en el sistema.` })
      continue
    }
    const motivoArea = motivoAreaNoDisponible(area)
    if (motivoArea) {
      errores.push({ fila: r, motivo: motivoArea })
      continue
    }

    // E. Tipo de Turno
    const rawTipo = normalizarTexto(row.getCell(colIndex.tipoTurno).value)
    let tipoTurno: TipoTurno | null = null
    if (rawTipo.includes('noct') || rawTipo === 'n') tipoTurno = TipoTurno.NOCTURNO
    else if (rawTipo.includes('diur') || rawTipo === 'd') tipoTurno = TipoTurno.DIURNO
    else {
      errores.push({ fila: r, motivo: `Tipo de turno inválido '${String(row.getCell(colIndex.tipoTurno).value ?? '')}'. Debe ser DIURNO o NOCTURNO.` })
      continue
    }

    // F. Horario
    const rawHorario = normalizarTexto(row.getCell(colIndex.horario).value)
    const horario = horarioMap[rawHorario]
    if (!horario || !esHorarioValidoParaTipoTurno(tipoTurno, horario)) {
      errores.push({ fila: r, motivo: `Horario base inválido o incompatible con ${tipoTurno} ('${String(row.getCell(colIndex.horario).value ?? '')}'). Consulte la pestaña de catálogos.` })
      continue
    }

    // G. Turno Extra y Cupo Extra
    const rawExtra = normalizarTexto(row.getCell(colIndex.extra).value)
    const esTurnoExtra = ['si', 's', 'true', '1', 'yes', 'y', 'extra'].includes(rawExtra)
    const rawCupoExtra = colIndex.cupoExtra > 0 ? normalizarTexto(row.getCell(colIndex.cupoExtra).value) : ''
    const esCupoExtraFila = ['si', 's', 'true', '1', 'yes', 'y', 'extra'].includes(rawCupoExtra)
    const esCupoExtra = permitirCupoExtraGlobal || esCupoExtraFila

    // H. Unicidad y reglas de doble jornada del trabajador dentro del mismo archivo
    const parTipoKey = `${trabajador.id}_${fechaIso}_${tipoTurno}`
    if (paresTrabajadorFechaTipoEnArchivo.has(parTipoKey)) {
      errores.push({
        fila: r,
        motivo: `El trabajador ${trabajador.nombre} aparece más de una vez en el turno ${tipoTurno} para la fecha ${fechaIso}.`,
      })
      continue
    }

    const diaKey = `${trabajador.id}_${fechaIso}`
    const otroEnArchivo = turnosTrabajadorEnArchivoPorDia.get(diaKey)
    if (otroEnArchivo) {
      if (!esTurnoExtra && !otroEnArchivo.esTurnoExtra) {
        errores.push({
          fila: r,
          motivo: `${trabajador.nombre} tiene dos turnos el ${fechaIso} en el archivo; el segundo turno en distinta zona horaria debe marcarse como TURNO_EXTRA = SI.`,
        })
        continue
      }
      if (!horariosCompatiblesEnMismoDia(horario, otroEnArchivo.horario)) {
        errores.push({
          fila: r,
          motivo: `El horario ${obtenerEtiquetaHorario(horario)} se traslapa con el otro turno de ${trabajador.nombre} el ${fechaIso} (${obtenerEtiquetaHorario(otroEnArchivo.horario)}).`,
        })
        continue
      }
    }

    paresTrabajadorFechaTipoEnArchivo.add(parTipoKey)
    turnosTrabajadorEnArchivoPorDia.set(diaKey, { tipoTurno, horario, esTurnoExtra })

    // I. Comentario
    const rawComentario = row.getCell(colIndex.comentario).value
    const comentario = rawComentario ? String(rawComentario).trim().slice(0, 500) : null

    filasValidas.push({
      fila: r,
      asignadoId: trabajador.id,
      asignadoNombre: trabajador.nombre,
      vehiculoId: vehiculo.id,
      vehiculoCodigo: vehiculo.codigo,
      areaId: area.id,
      areaNombre: area.nombre,
      fecha: fechaDate,
      fechaStr: fechaIso,
      estado: EstadoDia.TRABAJO_12,
      tipoTurno,
      horario,
      esTurnoExtra,
      esCupoExtra,
      comentario,
    })
  }

  if (filasValidas.length === 0) {
    return {
      ok: false,
      mensaje: 'No se encontraron filas con datos válidos para procesar.',
      totalLeidas: worksheet.rowCount - 1,
      creados: 0,
      actualizados: 0,
      omitidos: 0,
      errores,
    }
  }

  // 4. Validación contra los turnos que ya existen en la base (cupo por jornada y doble jornada)
  const fechasUnicas = Array.from(new Set(filasValidas.map((f) => f.fecha)))
  const vehiculosUnicos = Array.from(new Set(filasValidas.map((f) => f.vehiculoId)))
  const trabajadoresUnicos = Array.from(new Set(filasValidas.map((f) => f.asignadoId)))

  // Los pasos 4 a 6 van dentro de UNA transacción:
  // - si algo falla a la mitad, no queda una carga parcial;
  // - el bloqueo por fecha evita que otra asignación simultánea exceda el cupo.
  const { creados, actualizados, omitidos } = await prisma.$transaction(
    async (tx) => {
      await bloquearFechasTurno(tx, fechasUnicas)

      const turnosExistentes = await tx.turnoDiario.findMany({
        where: {
          fecha: { in: fechasUnicas },
          OR: [
            { vehiculoId: { in: vehiculosUnicos } },
            { asignadoId: { in: trabajadoresUnicos } },
          ],
        },
        select: {
          id: true,
          asignadoId: true,
          vehiculoId: true,
          fecha: true,
          tipoTurno: true,
          horario: true,
          esTurnoExtra: true,
        },
      })

      // Mapas por jornada (DIURNO y NOCTURNO independientes)
      const ocupacionPorVehiculoFechaTipo = new Map<string, number>()
      const horariosVehiculoPorFecha = new Map<string, { tipoTurno: string; horario?: string }[]>()
      const turnoExistentePorTrabajadorFechaTipo = new Map<string, string>()
      const turnosTrabajadorBD = new Map<string, { id: string; tipoTurno: string; horario?: string; esTurnoExtra?: boolean }[]>()

      for (const t of turnosExistentes) {
        const fIso = t.fecha.toISOString().slice(0, 10)
        const tTipo = t.tipoTurno || 'DIURNO'

        if (t.vehiculoId) {
          const vtKey = `${t.vehiculoId}_${fIso}_${tTipo}`
          ocupacionPorVehiculoFechaTipo.set(vtKey, (ocupacionPorVehiculoFechaTipo.get(vtKey) || 0) + 1)

          const vfKey = `${t.vehiculoId}_${fIso}`
          const listaV = horariosVehiculoPorFecha.get(vfKey) || []
          listaV.push({ tipoTurno: tTipo, horario: t.horario })
          horariosVehiculoPorFecha.set(vfKey, listaV)
        }

        if (t.asignadoId) {
          const tftKey = `${t.asignadoId}_${fIso}_${tTipo}`
          turnoExistentePorTrabajadorFechaTipo.set(tftKey, t.id)

          const tfKey = `${t.asignadoId}_${fIso}`
          const listaT = turnosTrabajadorBD.get(tfKey) || []
          listaT.push({ id: t.id, tipoTurno: tTipo, horario: t.horario, esTurnoExtra: t.esTurnoExtra })
          turnosTrabajadorBD.set(tfKey, listaT)
        }
      }

      // 5. Filtramos filas que superen cupo o tengan conflictos de horario/duplicados
      const filasAInsertar: FilaTurnoProcesada[] = []
      const filasAActualizar: { id: string; fila: FilaTurnoProcesada }[] = []
      let omitidos = 0

      for (const item of filasValidas) {
        const tftKey = `${item.asignadoId}_${item.fechaStr}_${item.tipoTurno}`
        const turnoExistenteId = turnoExistentePorTrabajadorFechaTipo.get(tftKey)

        if (turnoExistenteId) {
          if (modoDuplicados === 'omitir') {
            omitidos++
            continue
          } else {
            if (isPastShiftDate(item.fecha)) {
              errores.push({
                fila: item.fila,
                motivo: `No se puede modificar el turno del ${item.fechaStr} porque la fecha del turno ya pasó.`,
              })
              continue
            }
            filasAActualizar.push({ id: turnoExistenteId, fila: item })
            continue
          }
        }

        // Reglas compartidas con crear/editar (lib/reglas-turno):
        // doble jornada, entrega de la unidad entre jornadas y cupo por jornada.
        const tfKey = `${item.asignadoId}_${item.fechaStr}`
        const vfKey = `${item.vehiculoId}_${item.fechaStr}`
        const vtKey = `${item.vehiculoId}_${item.fechaStr}_${item.tipoTurno}`
        const horariosVehDia = horariosVehiculoPorFecha.get(vfKey) || []
        const ocupacionActual = ocupacionPorVehiculoFechaTipo.get(vtKey) || 0

        const turnosMismoDia: TurnoDelDia[] = [
          ...(turnosTrabajadorBD.get(tfKey) || []).map((t) => ({
            asignadoId: item.asignadoId,
            vehiculoId: null,
            tipoTurno: t.tipoTurno,
            horario: t.horario ?? '',
            esTurnoExtra: Boolean(t.esTurnoExtra),
          })),
          ...horariosVehDia.map((hv) => ({
            asignadoId: null,
            vehiculoId: item.vehiculoId,
            tipoTurno: hv.tipoTurno,
            horario: hv.horario ?? '',
            esTurnoExtra: false,
          })),
        ]

        const conflicto = validarConflictosDelDia(
          {
            asignadoId: item.asignadoId,
            nombreTrabajador: item.asignadoNombre,
            vehiculoId: item.vehiculoId,
            codigoVehiculo: item.vehiculoCodigo,
            cupoVehiculo: mapVehiculos.get(item.vehiculoId)?.noPersonas ?? 3,
            tipoTurno: item.tipoTurno,
            horario: item.horario,
            esTurnoExtra: item.esTurnoExtra,
            esCupoExtra: item.esCupoExtra,
          },
          turnosMismoDia,
        )
        if (conflicto) {
          errores.push({ fila: item.fila, motivo: `${conflicto} (fecha ${item.fechaStr})` })
          continue
        }

        ocupacionPorVehiculoFechaTipo.set(vtKey, ocupacionActual + 1)
        horariosVehDia.push({ tipoTurno: item.tipoTurno, horario: item.horario })
        horariosVehiculoPorFecha.set(vfKey, horariosVehDia)
        filasAInsertar.push(item)
      }

      // 6. Inserción masiva optimizada por lotes de 500 registros
      let creados = 0
      let actualizados = 0

      if (filasAActualizar.length > 0) {
        for (const { id, fila } of filasAActualizar) {
          await tx.turnoDiario.update({
            where: { id },
            data: {
              asignadoId: fila.asignadoId,
              asignadoNombre: fila.asignadoNombre,
              fecha: fila.fecha,
              estado: fila.estado,
              tipoTurno: fila.tipoTurno,
              horario: fila.horario,
              areaId: fila.areaId,
              areaNombre: fila.areaNombre,
              vehiculoId: fila.vehiculoId,
              vehiculoCodigo: fila.vehiculoCodigo,
              comentario: fila.comentario,
              esTurnoExtra: fila.esTurnoExtra,
              esCupoExtra: fila.esCupoExtra,
            },
          })

          const textoFecha = format(fila.fecha, 'dd/MM/yyyy')
          await tx.snapshotTurno.create({
            data: {
              nombreTrabajador: fila.asignadoNombre,
              areaTrabajo: fila.areaNombre,
              vehiculoPlaca: fila.vehiculoCodigo,
              tipoTurno: fila.tipoTurno,
              hora: fila.horario,
              esTurnoExtra: fila.esTurnoExtra,
              comentario: `[Carga Masiva Excel · Edición ${textoFecha}] ${fila.comentario || ''}`.trim(),
              usuarioResponsable: adminNombre,
              accion: AccionSnapshot.EDICION,
            },
          })
          actualizados++
        }
      }

      const BATCH_SIZE = 500
      for (let i = 0; i < filasAInsertar.length; i += BATCH_SIZE) {
        const lote = filasAInsertar.slice(i, i + BATCH_SIZE)

        const turnosData = lote.map((f) => ({
          asignadoId: f.asignadoId,
          asignadoNombre: f.asignadoNombre,
          registradoPor: adminNombre,
          fecha: f.fecha,
          estado: f.estado,
          tipoTurno: f.tipoTurno,
          horario: f.horario,
          areaId: f.areaId,
          areaNombre: f.areaNombre,
          vehiculoId: f.vehiculoId,
          vehiculoCodigo: f.vehiculoCodigo,
          comentario: f.comentario,
          esTurnoExtra: f.esTurnoExtra,
          esCupoExtra: f.esCupoExtra,
        }))

        // createManyAndReturn + skipDuplicates devuelve solo las filas realmente insertadas,
        // así el historial de auditoría no registra turnos que fueron omitidos por duplicado.
        const insertados = await tx.turnoDiario.createManyAndReturn({
          data: turnosData,
          skipDuplicates: true,
          select: { asignadoId: true, fecha: true, tipoTurno: true },
        })
        creados += insertados.length

        const clavesCreadas = new Set(
          insertados.map((t) => `${t.asignadoId}_${t.fecha.toISOString().slice(0, 10)}_${t.tipoTurno}`),
        )

        const snapshotsData = lote
          .filter((f) => clavesCreadas.has(`${f.asignadoId}_${f.fechaStr}_${f.tipoTurno}`))
          .map((f) => {
            const textoFecha = format(f.fecha, 'dd/MM/yyyy')
            return {
              nombreTrabajador: f.asignadoNombre,
              areaTrabajo: f.areaNombre,
              vehiculoPlaca: f.vehiculoCodigo,
              tipoTurno: f.tipoTurno,
              hora: f.horario,
              esTurnoExtra: f.esTurnoExtra,
              comentario: `[Carga Masiva Excel · ${textoFecha}] ${f.comentario || ''}`.trim(),
              usuarioResponsable: adminNombre,
              accion: AccionSnapshot.CREACION,
            }
          })

        if (snapshotsData.length > 0) {
          await tx.snapshotTurno.createMany({
            data: snapshotsData,
          })
        }
      }

      return { creados, actualizados, omitidos }
    },
    { maxWait: 10_000, timeout: 120_000 },
  )

  return {
    ok: true,
    mensaje: `Carga finalizada: ${creados} turnos creados, ${actualizados} actualizados, ${omitidos} omitidos.`,
    totalLeidas: worksheet.rowCount - 1,
    creados,
    actualizados,
    omitidos,
    errores,
  }
}
