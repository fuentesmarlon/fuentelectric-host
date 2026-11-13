// Excel · hoja del historial de auditoría.
import ExcelJS from 'exceljs'
import { type DatosReporteExportacion } from '@/lib/reportes-exportacion'

import { COLOR, THIN_BORDER, aplicarBannerCorporativo } from './estilos'

export function construirHojaHistorialAuditoria(
  workbook: ExcelJS.Workbook,
  logoId: number | null,
  datos: DatosReporteExportacion,
) {
  const sheet = workbook.addWorksheet('Historial', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  })

  const creaciones = datos.snapshots.filter((s) => s.accion === 'CREACION').length
  const ediciones = datos.snapshots.filter((s) => s.accion === 'EDICION').length
  const eliminaciones = datos.snapshots.filter((s) => s.accion === 'ELIMINACION').length

  aplicarBannerCorporativo(
    workbook,
    sheet,
    logoId,
    'BITÁCORA DE AUDITORÍA Y TRAZABILIDAD DE MOVIMIENTOS',
    `Movimientos auditados: ${datos.snapshots.length}   ·   Creaciones: ${creaciones}   ·   Ediciones: ${ediciones}   ·   Eliminaciones: ${eliminaciones}`,
    datos,
    10,
  )

  const widths = [20, 14, 26, 22, 14, 14, 18, 13, 22, 46]
  widths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w
  })

  sheet.getRow(5).height = 8
  const headIdx = 6
  const headers = [
    'Fecha de Registro',
    'Acción',
    'Trabajador',
    'Área',
    'Vehículo',
    'Tipo de Turno',
    'Horario',
    'Turno Extra',
    'Registrado por',
    'Detalle',
  ]

  const hRow = sheet.getRow(headIdx)
  hRow.height = 24
  headers.forEach((h, i) => {
    const cell = hRow.getCell(i + 1)
    cell.value = h
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: COLOR.white } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navyDark } }
    cell.alignment = {
      vertical: 'middle',
      horizontal: i === 1 || i === 4 || i === 5 || i === 7 ? 'center' : 'left',
      indent: i === 1 || i === 4 || i === 5 || i === 7 ? 0 : 1,
    }
    cell.border = { bottom: { style: 'medium', color: { argb: COLOR.goldAccent } } }
  })

  sheet.pageSetup.printTitlesRow = `${headIdx}:${headIdx}`

  datos.snapshots.forEach((snap, idx) => {
    const r = sheet.getRow(headIdx + 1 + idx)
    r.height = 20
    const zebra = idx % 2 === 1 ? COLOR.zebraBg : COLOR.white

    const vals = [
      snap.fechaFormateada,
      snap.accionLabel,
      snap.nombreTrabajador,
      snap.areaTrabajo,
      snap.vehiculoPlaca,
      snap.tipoTurno,
      snap.horario,
      snap.esTurnoExtra ? 'Sí' : 'No',
      snap.usuarioResponsable,
      snap.comentario,
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
        bold: col === 3 || col === 5,
        color: { argb: col === 4 || col === 9 ? COLOR.textMuted : COLOR.textPrimary },
      }
      cell.alignment = {
        vertical: 'middle',
        horizontal: col === 2 || col === 5 || col === 6 || col === 8 ? 'center' : 'left',
        indent: col === 2 || col === 5 || col === 6 || col === 8 ? 0 : 1,
        wrapText: col === 10,
      }

      if (col === 2) {
        if (snap.accion === 'CREACION') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.diurnoBg } }
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR.diurnoText } }
        } else if (snap.accion === 'EDICION') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.nocturnoBg } }
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR.nocturnoText } }
        } else if (snap.accion === 'ELIMINACION') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.errorBg } }
          cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR.errorText } }
        }
      }
      if (col === 8 && snap.esTurnoExtra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.extraBg } }
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLOR.extraText } }
      }
    })
  })

  const lastRow = Math.max(headIdx, headIdx + datos.snapshots.length)
  sheet.autoFilter = { from: `A${headIdx}`, to: `J${lastRow}` }
}
