// Excel · paleta corporativa, bordes y encabezado común de cada hoja.
import ExcelJS from 'exceljs'
import { type DatosReporteExportacion } from '@/lib/reportes-exportacion'



export const COLOR = {
  navyDark: 'FF0B213D',
  navyMid: 'FF12345B',
  navyWeekend: 'FF1E3A5F',
  corporateBlue: 'FF004884',
  goldAccent: 'FFEAB308',
  goldSoftText: 'FFFDE047',
  iceText: 'FFCBD5E1',
  white: 'FFFFFFFF',
  kpiBg: 'FFF1F5F9',
  zebraBg: 'FFF8FAFC',
  unitGroupBg: 'FFEFF6FF',
  unitGroupText: 'FF0B213D',
  borderLight: 'FFE2E8F0',
  borderMedium: 'FFCBD5E1',
  textPrimary: 'FF0F172A',
  textMuted: 'FF64748B',
  textSubtle: 'FF94A3B8',
  // Fondos y textos según el tipo de turno o celda
  diurnoBg: 'FFDCFCE7',
  diurnoText: 'FF166534',
  nocturnoBg: 'FFDBEAFE',
  nocturnoText: 'FF1E40AF',
  extraBg: 'FFFEF3C7',
  extraText: 'FF92400E',
  descansoBg: 'FFF8FAFC',
  descansoWeekendBg: 'FFF1F5F9',
  errorBg: 'FFFEE2E2',
  errorText: 'FF991B1B',
}

export const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLOR.borderLight } },
  left: { style: 'thin', color: { argb: COLOR.borderLight } },
  bottom: { style: 'thin', color: { argb: COLOR.borderLight } },
  right: { style: 'thin', color: { argb: COLOR.borderLight } },
}

export function colLetter(colNumber: number): string {
  let n = colNumber
  let str = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    str = String.fromCharCode(65 + rem) + str
    n = Math.floor((n - 1) / 26)
  }
  return str || 'A'
}

export function aplicarBannerCorporativo(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  logoId: number | null,
  tituloHoja: string,
  resumenKpi: string,
  datos: DatosReporteExportacion,
  totalCols: number,
) {
  const safeCols = Math.max(totalCols, 8)
  const lastCol = colLetter(safeCols)

  sheet.getRow(1).height = 18
  sheet.getRow(2).height = 24
  sheet.getRow(3).height = 19
  sheet.getRow(4).height = 22

  // Bloque izquierdo blanco para el logotipo corporativo FTE
  sheet.mergeCells('A1:B3')
  const logoCell = sheet.getCell('A1')
  logoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.white } }
  logoCell.alignment = { vertical: 'middle', horizontal: 'center' }
  if (logoId !== null) {
    sheet.addImage(logoId, {
      tl: { col: 0.2, row: 0.18 },
      ext: { width: 112, height: 50 },
    })
  } else {
    logoCell.value = 'FTE · FUENTELECTRIC'
    logoCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: COLOR.corporateBlue } }
  }

  // Bloque derecho Azul Marino Corporativo
  sheet.mergeCells(`C1:${lastCol}1`)
  sheet.mergeCells(`C2:${lastCol}2`)
  sheet.mergeCells(`C3:${lastCol}3`)

  const c1 = sheet.getCell('C1')
  c1.value = 'FUENTELECTRIC  ·  CONTROL OPERATIVO TRABAJANDO PARA EEGSA'
  c1.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR.goldSoftText } }
  c1.alignment = { vertical: 'bottom', horizontal: 'left', indent: 1 }

  const c2 = sheet.getCell('C2')
  c2.value = tituloHoja
  c2.font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLOR.white } }
  c2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

  const c3 = sheet.getCell('C3')
  c3.value = `Periodo: ${datos.etiquetaPeriodo}    |    Generado: ${datos.generadoTexto}`
  c3.font = { name: 'Calibri', size: 9.5, color: { argb: COLOR.iceText } }
  c3.alignment = { vertical: 'top', horizontal: 'left', indent: 1 }

  for (let r = 1; r <= 3; r++) {
    for (let c = 1; c <= safeCols; c++) {
      const cell = sheet.getRow(r).getCell(c)
      if (c >= 3) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navyDark } }
      }
      if (r === 3) {
        cell.border = {
          bottom: { style: 'medium', color: { argb: COLOR.goldAccent } },
        }
      }
    }
  }

  // Franja ejecutiva de KPIs (Fila 4)
  sheet.mergeCells(`A4:${lastCol}4`)
  const kpiCell = sheet.getCell('A4')
  kpiCell.value = resumenKpi
  kpiCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR.navyDark } }
  kpiCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.kpiBg } }
  kpiCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  for (let c = 1; c <= safeCols; c++) {
    sheet.getRow(4).getCell(c).border = {
      bottom: { style: 'thin', color: { argb: COLOR.borderMedium } },
    }
  }
}
