// PDF · tabla del historial de auditoría.
import { jsPDF } from 'jspdf'
import autoTable, { type RowInput } from 'jspdf-autotable'
import { type DatosReporteExportacion } from '@/lib/reportes-exportacion'

import { PALETA, pdfSafe } from './estilos'
import { dibujarTituloSeccion } from './portada'

export function renderizarAuditoriaPdf(
  doc: jsPDF,
  datos: DatosReporteExportacion,
  marginX: number,
  contentW: number,
  startY: number,
) {
  const numSec = datos.tipoReporte === 'auditoria' ? '1.' : '3.'
  const cursorY = dibujarTituloSeccion(
    doc,
    `${numSec} BITÁCORA DE AUDITORÍA Y TRAZABILIDAD DE MOVIMIENTOS`,
    `${datos.snapshots.length} movimientos registrados en el sistema`,
    marginX,
    contentW,
    startY,
  )

  if (datos.snapshots.length === 0) {
    doc.setFillColor(...PALETA.cardBg)
    doc.setDrawColor(...PALETA.cardBorder)
    doc.roundedRect(marginX, cursorY, contentW, 28, 4, 4, 'FD')
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(...PALETA.textMuted)
    doc.text(
      pdfSafe('No existen movimientos de auditoría registrados en este rango de fechas.'),
      marginX + contentW / 2,
      cursorY + 17,
      { align: 'center' },
    )
    return
  }

  const body: RowInput[] = datos.snapshots.map((snap) => [
    pdfSafe(snap.fechaFormateada),
    pdfSafe(snap.accionLabel),
    pdfSafe(snap.nombreTrabajador),
    pdfSafe(snap.areaTrabajo),
    pdfSafe(snap.vehiculoPlaca),
    pdfSafe(snap.tipoTurno),
    pdfSafe(snap.horario),
    snap.esTurnoExtra ? 'Extra' : 'Normal',
    pdfSafe(snap.usuarioResponsable),
    pdfSafe(snap.comentario || '-'),
  ])

  autoTable(doc, {
    startY: cursorY,
    head: [['Fecha Registro', 'Acción', 'Trabajador', 'Área', 'Unidad', 'Jornada', 'Horario', 'Modalidad', 'Autorizado por', 'Detalle / Observación']],
    body,
    margin: { left: marginX, right: marginX, top: 42, bottom: 28 },
    styles: {
      font: 'helvetica',
      fontSize: 7.1,
      cellPadding: 3,
      lineColor: PALETA.cardBorder,
      lineWidth: 0.35,
      textColor: PALETA.textPrimary,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: PALETA.navyDark,
      textColor: PALETA.white,
      fontStyle: 'bold',
      fontSize: 7.2,
    },
    alternateRowStyles: { fillColor: PALETA.zebraBg },
    columnStyles: {
      0: { cellWidth: 68 },
      1: { cellWidth: 52, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 102, fontStyle: 'bold' },
      3: { cellWidth: 86 },
      4: { cellWidth: 44, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 46, halign: 'center' },
      6: { cellWidth: 62, halign: 'center' },
      7: { cellWidth: 46, halign: 'center' },
      8: { cellWidth: 78 },
      9: { cellWidth: 'auto' },
    },
    didParseCell(hookData) {
      const col = hookData.column.index
      if (hookData.section === 'head' && (col === 1 || (col >= 4 && col <= 7))) {
        hookData.cell.styles.halign = 'center'
      }
      if (hookData.section !== 'body') return
      const raw = String(hookData.cell.raw ?? '')

      if (col === 1) {
        if (raw === 'Creación') {
          hookData.cell.styles.fillColor = PALETA.diurnoBg
          hookData.cell.styles.textColor = PALETA.diurnoText
        } else if (raw === 'Edición') {
          hookData.cell.styles.fillColor = PALETA.nocturnoBg
          hookData.cell.styles.textColor = PALETA.nocturnoText
        } else if (raw === 'Eliminación') {
          hookData.cell.styles.fillColor = PALETA.errorBg
          hookData.cell.styles.textColor = PALETA.errorText
        }
      }
      if (col === 7 && raw === 'Extra') {
        hookData.cell.styles.fillColor = PALETA.extraBg
        hookData.cell.styles.textColor = PALETA.extraText
        hookData.cell.styles.fontStyle = 'bold'
      }
    },
  })
}
