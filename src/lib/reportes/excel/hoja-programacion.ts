// Excel · hoja "Programa de turnos" (matriz por unidad y día).
import ExcelJS from 'exceljs'
import {
  obtenerInfoFechaIso,
  type DatosReporteExportacion,
} from '@/lib/reportes-exportacion'

import { COLOR, THIN_BORDER, colLetter, aplicarBannerCorporativo } from './estilos'

export function construirHojaProgramacion(
  workbook: ExcelJS.Workbook,
  logoId: number | null,
  datos: DatosReporteExportacion,
) {
  const sheet = workbook.addWorksheet('Programación de Turnos', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  })

  const numFechas = datos.fechasMatriz.length
  const totalCols = 4 + numFechas + 3 // 4 fijas + fechas + (Turnos, Extras, Horas)

  aplicarBannerCorporativo(
    workbook,
    sheet,
    logoId,
    'PROGRAMACIÓN OPERATIVA DE TURNOS POR UNIDAD Y CUADRILLA',
    `Resumen Operativo:   ${datos.kpis.totalTurnos} Turnos Programados (${datos.kpis.totalHoras} h)   ·   ${datos.kpis.turnosDiurnos} Diurnos   ·   ${datos.kpis.turnosNocturnos} Nocturnos   ·   ${datos.kpis.turnosExtras} Turnos Extras   ·   ${datos.kpis.unidadesActivas} Unidades Activas   ·   ${datos.kpis.trabajadoresActivos} Trabajadores`,
    datos,
    totalCols,
  )

  // Fila 5: leyenda de los códigos que aparecen en la matriz (12D, 12N, D…)
  const rowLeyenda = sheet.getRow(5)
  rowLeyenda.height = 20
  const bloquesLeyenda: Array<{ texto: string; bg: string; fg: string }> = [
    { texto: '12D = Turno Diurno (12h)', bg: COLOR.diurnoBg, fg: COLOR.diurnoText },
    { texto: '12N = Turno Nocturno (12h)', bg: COLOR.nocturnoBg, fg: COLOR.nocturnoText },
    { texto: '12D+ / 12N+ = Turno Extra (12h)', bg: COLOR.extraBg, fg: COLOR.extraText },
    { texto: '24H = Doble Jornada (24h)', bg: COLOR.extraBg, fg: COLOR.extraText },
    { texto: 'D = Descanso / Sin turno', bg: COLOR.descansoBg, fg: COLOR.textMuted },
  ]
  sheet.getCell('A5').value = 'NOMENCLATURA:'
  sheet.getCell('A5').font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: COLOR.textMuted } }
  sheet.getCell('A5').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

  const leyendaTexto = bloquesLeyenda.map((b) => `[ ${b.texto} ]`).join('    ')
  const lastCol = colLetter(Math.max(totalCols, 8))
  sheet.mergeCells(`B5:${lastCol}5`)
  const cellLeyenda = sheet.getCell('B5')
  cellLeyenda.value = datos.notaMatriz ? `${leyendaTexto}    ·    Nota: ${datos.notaMatriz}` : leyendaTexto
  cellLeyenda.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: COLOR.corporateBlue } }
  cellLeyenda.alignment = { vertical: 'middle', horizontal: 'left' }

  sheet.getRow(6).height = 8

  // Anchos de las 4 columnas fijas; las de fechas se ajustan más abajo
  sheet.getColumn(1).width = 13 // UNIDAD
  sheet.getColumn(2).width = 28 // TRABAJADOR
  sheet.getColumn(3).width = 16 // HORARIO
  sheet.getColumn(4).width = 24 // ÁREA
  for (let i = 0; i < numFechas; i++) {
    sheet.getColumn(5 + i).width = 6.8
  }
  const colTurnos = 5 + numFechas
  const colExtras = 6 + numFechas
  const colHoras = 7 + numFechas
  sheet.getColumn(colTurnos).width = 10
  sheet.getColumn(colExtras).width = 10
  sheet.getColumn(colHoras).width = 11

  // Filas 7 y 8: Encabezado doble de Matriz (Día de semana + Fecha DD/MM)
  const rHead1 = sheet.getRow(7)
  const rHead2 = sheet.getRow(8)
  rHead1.height = 18
  rHead2.height = 19

  const fijas = ['UNIDAD', 'TRABAJADOR', 'HORARIO BASE', 'ÁREA OPERATIVA']
  fijas.forEach((titulo, idx) => {
    const col = idx + 1
    const letra = colLetter(col)
    sheet.mergeCells(`${letra}7:${letra}8`)
    const cell = sheet.getCell(`${letra}7`)
    cell.value = titulo
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR.white } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navyDark } }
    cell.alignment = { vertical: 'middle', horizontal: idx === 1 || idx === 3 ? 'left' : 'center', indent: idx === 1 || idx === 3 ? 1 : 0 }
    sheet.getCell(`${letra}8`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navyDark } }
  })

  datos.fechasMatriz.forEach((fechaIso, idx) => {
    const col = 5 + idx
    const info = obtenerInfoFechaIso(fechaIso)
    const bgHeader = info.esFinDeSemana ? COLOR.navyWeekend : COLOR.navyMid
    const fgDia = info.esFinDeSemana ? COLOR.goldSoftText : COLOR.iceText

    const cTop = rHead1.getCell(col)
    cTop.value = info.diaCorto
    cTop.font = { name: 'Calibri', size: 8, bold: true, color: { argb: fgDia } }
    cTop.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgHeader } }
    cTop.alignment = { vertical: 'middle', horizontal: 'center' }
    cTop.border = { left: { style: 'thin', color: { argb: COLOR.navyDark } }, right: { style: 'thin', color: { argb: COLOR.navyDark } } }

    const cBot = rHead2.getCell(col)
    cBot.value = info.ddMm
    cBot.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: COLOR.white } }
    cBot.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgHeader } }
    cBot.alignment = { vertical: 'middle', horizontal: 'center' }
    cBot.border = {
      left: { style: 'thin', color: { argb: COLOR.navyDark } },
      right: { style: 'thin', color: { argb: COLOR.navyDark } },
      bottom: { style: 'medium', color: { argb: COLOR.goldAccent } },
    }
  })

  const totalesHeaders = [
    { col: colTurnos, label: 'TURNOS' },
    { col: colExtras, label: 'EXTRAS' },
    { col: colHoras, label: 'HORAS' },
  ]
  for (const th of totalesHeaders) {
    const letra = colLetter(th.col)
    sheet.mergeCells(`${letra}7:${letra}8`)
    const cell = sheet.getCell(`${letra}7`)
    cell.value = th.label
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR.goldSoftText } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navyDark } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    sheet.getCell(`${letra}8`).border = { bottom: { style: 'medium', color: { argb: COLOR.goldAccent } } }
  }

  sheet.pageSetup.printTitlesRow = '7:8'

  if (datos.filasProgramacion.length === 0) {
    const emptyRow = sheet.getRow(9)
    emptyRow.height = 28
    sheet.mergeCells(`A9:${colLetter(totalCols)}9`)
    const c = sheet.getCell('A9')
    c.value = 'No existen turnos programados en el rango de fechas seleccionado.'
    c.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLOR.textMuted } }
    c.alignment = { vertical: 'middle', horizontal: 'center' }
    return
  }

  let currentRowIdx = 9
  let unidadAnterior = ''

  for (const fila of datos.filasProgramacion) {
    // Fila separadora cada vez que cambia la unidad, para leer cada cuadrilla por bloque
    if (fila.unidad !== unidadAnterior) {
      unidadAnterior = fila.unidad
      const groupRow = sheet.getRow(currentRowIdx)
      groupRow.height = 19
      sheet.mergeCells(`A${currentRowIdx}:${colLetter(totalCols)}${currentRowIdx}`)
      const gCell = sheet.getCell(`A${currentRowIdx}`)
      gCell.value = `UNIDAD ${fila.unidad}   ·   ${fila.areaPrincipal.toUpperCase()}`
      gCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR.unitGroupText } }
      gCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.unitGroupBg } }
      gCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      for (let c = 1; c <= totalCols; c++) {
        groupRow.getCell(c).border = {
          top: { style: 'thin', color: { argb: COLOR.borderMedium } },
          bottom: { style: 'thin', color: { argb: COLOR.borderMedium } },
        }
      }
      currentRowIdx += 1
    }

    const r = sheet.getRow(currentRowIdx)
    r.height = 20

    const cUnidad = r.getCell(1)
    cUnidad.value = fila.unidad
    cUnidad.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR.corporateBlue } }
    cUnidad.alignment = { vertical: 'middle', horizontal: 'center' }
    cUnidad.border = THIN_BORDER

    const cTrab = r.getCell(2)
    cTrab.value = fila.trabajador
    cTrab.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR.textPrimary } }
    cTrab.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    cTrab.border = THIN_BORDER

    const cHor = r.getCell(3)
    cHor.value = fila.horarioPrincipal
    cHor.font = {
      name: 'Calibri',
      size: 9,
      bold: true,
      color: { argb: fila.esNocturnoPrincipal ? COLOR.nocturnoText : COLOR.diurnoText },
    }
    cHor.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fila.esNocturnoPrincipal ? COLOR.nocturnoBg : COLOR.diurnoBg },
    }
    cHor.alignment = { vertical: 'middle', horizontal: 'center' }
    cHor.border = THIN_BORDER

    const cArea = r.getCell(4)
    cArea.value = fila.areaPrincipal
    cArea.font = { name: 'Calibri', size: 9, color: { argb: COLOR.textMuted } }
    cArea.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    cArea.border = THIN_BORDER

    datos.fechasMatriz.forEach((fechaIso, idx) => {
      const celda = fila.celdasPorFecha[fechaIso]
      const infoFecha = obtenerInfoFechaIso(fechaIso)
      const cell = r.getCell(5 + idx)
      cell.value = celda.codigo
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = THIN_BORDER

      if (celda.codigo === '12D') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.diurnoBg } }
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR.diurnoText } }
      } else if (celda.codigo === '12N') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.nocturnoBg } }
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR.nocturnoText } }
      } else if (celda.codigo === '12D+' || celda.codigo === '12N+' || celda.codigo === '24H') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.extraBg } }
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR.extraText } }
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: infoFecha.esFinDeSemana ? COLOR.descansoWeekendBg : COLOR.descansoBg },
        }
        cell.font = { name: 'Calibri', size: 8.5, color: { argb: COLOR.textSubtle } }
      }
    })

    const cTotTurnos = r.getCell(colTurnos)
    cTotTurnos.value = fila.totalTurnos
    cTotTurnos.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR.navyDark } }
    cTotTurnos.alignment = { vertical: 'middle', horizontal: 'center' }
    cTotTurnos.border = THIN_BORDER

    const cTotExtras = r.getCell(colExtras)
    cTotExtras.value = fila.totalExtras
    cTotExtras.alignment = { vertical: 'middle', horizontal: 'center' }
    cTotExtras.border = THIN_BORDER
    if (fila.totalExtras > 0) {
      cTotExtras.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.extraBg } }
      cTotExtras.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR.extraText } }
    } else {
      cTotExtras.font = { name: 'Calibri', size: 9, color: { argb: COLOR.textSubtle } }
    }

    const cTotHoras = r.getCell(colHoras)
    cTotHoras.value = fila.totalHoras
    cTotHoras.numFmt = '0" h"'
    cTotHoras.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR.corporateBlue } }
    cTotHoras.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.kpiBg } }
    cTotHoras.alignment = { vertical: 'middle', horizontal: 'center' }
    cTotHoras.border = THIN_BORDER

    currentRowIdx += 1
  }

  // Fila final de cobertura diaria activa
  const rTotal = sheet.getRow(currentRowIdx)
  rTotal.height = 22
  sheet.mergeCells(`A${currentRowIdx}:D${currentRowIdx}`)
  const lblTotal = sheet.getCell(`A${currentRowIdx}`)
  lblTotal.value = 'COBERTURA DIARIA (TURNOS ACTIVOS POR DÍA)'
  lblTotal.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR.white } }
  lblTotal.alignment = { vertical: 'middle', horizontal: 'right' }
  for (let c = 1; c <= 4; c++) {
    rTotal.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navyDark } }
  }

  let sumaTurnosMatriz = 0
  let sumaExtrasMatriz = 0
  for (const f of datos.filasProgramacion) {
    sumaTurnosMatriz += f.totalTurnos
    sumaExtrasMatriz += f.totalExtras
  }

  datos.fechasMatriz.forEach((fechaIso, idx) => {
    const cell = rTotal.getCell(5 + idx)
    cell.value = datos.totalesPorFecha[fechaIso] || 0
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR.goldSoftText } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navyMid } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })

  const totalCells = [
    { col: colTurnos, val: sumaTurnosMatriz, fmt: '0' },
    { col: colExtras, val: sumaExtrasMatriz, fmt: '0' },
    { col: colHoras, val: sumaTurnosMatriz * 12, fmt: '0" h"' },
  ]
  for (const tc of totalCells) {
    const cell = rTotal.getCell(tc.col)
    cell.value = tc.val
    cell.numFmt = tc.fmt
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR.white } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navyDark } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  }
}
