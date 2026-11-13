// Excel · hoja de turnos extras y consolidado por trabajador.
import ExcelJS from 'exceljs'
import { type DatosReporteExportacion } from '@/lib/reportes-exportacion'

import { COLOR, THIN_BORDER, colLetter, aplicarBannerCorporativo } from './estilos'

export function construirHojaTurnosExtrasYConsolidado(
  workbook: ExcelJS.Workbook,
  logoId: number | null,
  datos: DatosReporteExportacion,
) {
  const sheet = workbook.addWorksheet('Turnos Extras y Consolidado', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  })

  aplicarBannerCorporativo(
    workbook,
    sheet,
    logoId,
    'CONSOLIDADO POR TRABAJADOR Y CONTROL DE TURNOS EXTRAS',
    `Personal con turnos: ${datos.consolidadoTrabajadores.length} trabajadores   ·   Turnos Extras acumulados: ${datos.kpis.turnosExtras} (${datos.kpis.turnosExtras * 12} horas extras)   ·   Horas Totales: ${datos.kpis.totalHoras} h`,
    datos,
    11,
  )

  const widths = [7, 28, 20, 16, 24, 15, 14, 14, 15, 14, 34]
  widths.forEach((w, idx) => {
    sheet.getColumn(idx + 1).width = w
  })

  sheet.getRow(5).height = 8
  const headRowIdx = 6
  const headers = [
    'N°',
    'TRABAJADOR',
    'PUESTO',
    'UNIDADES',
    'ÁREA OPERATIVA',
    'TURNOS NORM.',
    'TURNOS EXTRAS',
    'TOTAL TURNOS',
    'HORAS NORM.',
    'HORAS EXTRAS',
    'FECHAS CON TURNO EXTRA',
  ]
  const hRow = sheet.getRow(headRowIdx)
  hRow.height = 24
  headers.forEach((h, idx) => {
    const cell = hRow.getCell(idx + 1)
    cell.value = h
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR.white } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navyDark } }
    cell.alignment = {
      vertical: 'middle',
      horizontal: idx >= 1 && idx <= 4 ? 'left' : idx === 10 ? 'left' : 'center',
      indent: (idx >= 1 && idx <= 4) || idx === 10 ? 1 : 0,
    }
    cell.border = { bottom: { style: 'medium', color: { argb: COLOR.goldAccent } } }
  })

  sheet.pageSetup.printTitlesRow = `${headRowIdx}:${headRowIdx}`

  if (datos.consolidadoTrabajadores.length === 0) {
    sheet.mergeCells('A7:K7')
    const empty = sheet.getCell('A7')
    empty.value = 'Sin registros de turnos para consolidar en este periodo.'
    empty.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLOR.textMuted } }
    empty.alignment = { vertical: 'middle', horizontal: 'center' }
    sheet.getRow(7).height = 26
    return
  }

  const startDataRow = 7
  datos.consolidadoTrabajadores.forEach((item, idx) => {
    const rIdx = startDataRow + idx
    const r = sheet.getRow(rIdx)
    r.height = 20
    const bgZebra = idx % 2 === 1 ? COLOR.zebraBg : COLOR.white

    const valores: Array<string | number | ExcelJS.CellFormulaValue> = [
      idx + 1,
      item.trabajador,
      item.puesto,
      item.unidades,
      item.areas,
      item.turnosNormales,
      item.turnosExtras,
      { formula: `F${rIdx}+G${rIdx}`, result: item.totalTurnos },
      item.horasNormales,
      item.horasExtras,
      item.detalleFechasExtra || '—',
    ]

    valores.forEach((val, cIdx) => {
      const col = cIdx + 1
      const cell = r.getCell(col)
      cell.value = val as ExcelJS.CellValue
      cell.border = THIN_BORDER
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgZebra } }
      cell.font = {
        name: 'Calibri',
        size: 9.5,
        bold: col === 2 || col === 8,
        color: { argb: col === 3 || col === 5 ? COLOR.textMuted : COLOR.textPrimary },
      }
      cell.alignment = {
        vertical: 'middle',
        horizontal: (col >= 2 && col <= 5) || col === 11 ? 'left' : 'center',
        indent: (col >= 2 && col <= 5) || col === 11 ? 1 : 0,
      }

      if (col === 9 || col === 10) cell.numFmt = '0" h"'
      if ((col === 7 || col === 10) && item.turnosExtras > 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.extraBg } }
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR.extraText } }
      }
    })
  })

  const endDataRow = startDataRow + datos.consolidadoTrabajadores.length - 1
  const totalRowIdx = endDataRow + 1
  const rTot = sheet.getRow(totalRowIdx)
  rTot.height = 22
  sheet.mergeCells(`A${totalRowIdx}:E${totalRowIdx}`)
  const cLabel = sheet.getCell(`A${totalRowIdx}`)
  cLabel.value = 'TOTAL CONSOLIDADO DEL PERIODO'
  cLabel.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR.white } }
  cLabel.alignment = { vertical: 'middle', horizontal: 'right' }
  for (let c = 1; c <= 5; c++) {
    rTot.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navyDark } }
  }

  const sumCols = [
    { col: 6, result: datos.kpis.totalTurnos - datos.kpis.turnosExtras, fmt: '0' },
    { col: 7, result: datos.kpis.turnosExtras, fmt: '0' },
    { col: 8, result: datos.kpis.totalTurnos, fmt: '0' },
    { col: 9, result: (datos.kpis.totalTurnos - datos.kpis.turnosExtras) * 12, fmt: '0" h"' },
    { col: 10, result: datos.kpis.turnosExtras * 12, fmt: '0" h"' },
  ]
  for (const sc of sumCols) {
    const letra = colLetter(sc.col)
    const cell = rTot.getCell(sc.col)
    cell.value = { formula: `SUM(${letra}${startDataRow}:${letra}${endDataRow})`, result: sc.result }
    cell.numFmt = sc.fmt
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR.goldSoftText } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navyDark } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  }
  const cNote = rTot.getCell(11)
  cNote.value = `${datos.kpis.totalHoras} horas operativas totales`
  cNote.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR.iceText } }
  cNote.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navyDark } }
  cNote.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

  sheet.autoFilter = { from: `A${headRowIdx}`, to: `K${endDataRow}` }
}
