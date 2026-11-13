// Excel · hoja de detalle de turnos.
import ExcelJS from 'exceljs'
import { type DatosReporteExportacion } from '@/lib/reportes-exportacion'

import { COLOR, THIN_BORDER, aplicarBannerCorporativo } from './estilos'

export function construirHojaDetalleTurnos(
  workbook: ExcelJS.Workbook,
  logoId: number | null,
  datos: DatosReporteExportacion,
) {
  const sheet = workbook.addWorksheet('Detalle de Turnos', {
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
    'LISTADO DETALLADO DE TURNOS PROGRAMADOS',
    `Total de registros operativos: ${datos.turnosDetalle.length}   ·   Diurnos: ${datos.kpis.turnosDiurnos}   ·   Nocturnos: ${datos.kpis.turnosNocturnos}   ·   Turnos Extras: ${datos.kpis.turnosExtras}   ·   Cupos Extras: ${datos.kpis.cuposExtras}`,
    datos,
    12,
  )

  const widths = [14, 13, 12, 26, 18, 22, 13, 18, 15, 13, 20, 38]
  widths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w
  })

  sheet.getRow(5).height = 8
  const headIdx = 6
  const headers = [
    'Fecha Turno',
    'Día',
    'Unidad',
    'Trabajador',
    'Puesto',
    'Área Operativa',
    'Jornada',
    'Horario',
    'Modalidad',
    'Cupo Extra',
    'Registrado por',
    'Observaciones',
  ]
  const hRow = sheet.getRow(headIdx)
  hRow.height = 24
  headers.forEach((h, i) => {
    const cell = hRow.getCell(i + 1)
    cell.value = h
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR.white } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navyDark } }
    cell.alignment = { vertical: 'middle', horizontal: i === 2 || i === 6 || i === 8 || i === 9 ? 'center' : 'left', indent: i === 2 || i === 6 || i === 8 || i === 9 ? 0 : 1 }
    cell.border = { bottom: { style: 'medium', color: { argb: COLOR.goldAccent } } }
  })

  sheet.pageSetup.printTitlesRow = `${headIdx}:${headIdx}`

  datos.turnosDetalle.forEach((t, idx) => {
    const r = sheet.getRow(headIdx + 1 + idx)
    r.height = 20
    const zebra = idx % 2 === 1 ? COLOR.zebraBg : COLOR.white

    const vals = [
      t.fechaFormateada,
      t.diaSemana,
      t.unidad,
      t.trabajador,
      t.puesto,
      t.area,
      t.tipoTurnoLabel,
      t.horario,
      t.esTurnoExtra ? 'Turno Extra' : 'Ordinario',
      t.esCupoExtra ? 'Sí (+Cupo)' : 'No',
      t.registradoPor,
      t.comentario || '—',
    ]

    vals.forEach((v, cIdx) => {
      const col = cIdx + 1
      const cell = r.getCell(col)
      cell.value = v
      cell.border = THIN_BORDER
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebra } }
      cell.font = {
        name: 'Calibri',
        size: 9.5,
        bold: col === 3 || col === 4,
        color: { argb: col === 2 || col === 5 || col === 11 ? COLOR.textMuted : COLOR.textPrimary },
      }
      cell.alignment = {
        vertical: 'middle',
        horizontal: col === 3 || col === 7 || col === 9 || col === 10 ? 'center' : 'left',
        indent: col === 3 || col === 7 || col === 9 || col === 10 ? 0 : 1,
        wrapText: col === 12,
      }

      if (col === 7) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: t.tipoTurno === 'NOCTURNO' ? COLOR.nocturnoBg : COLOR.diurnoBg },
        }
        cell.font = {
          name: 'Calibri',
          size: 9,
          bold: true,
          color: { argb: t.tipoTurno === 'NOCTURNO' ? COLOR.nocturnoText : COLOR.diurnoText },
        }
      }
      if (col === 9 && t.esTurnoExtra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.extraBg } }
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR.extraText } }
      }
    })
  })

  const lastRow = Math.max(headIdx, headIdx + datos.turnosDetalle.length)
  sheet.autoFilter = { from: `A${headIdx}`, to: `L${lastRow}` }
}
