// PDF · consolidado de horas y extras por trabajador.
import { jsPDF } from 'jspdf'
import autoTable, { type RowInput } from 'jspdf-autotable'
import { type DatosReporteExportacion } from '@/lib/reportes-exportacion'

import { PALETA, pdfSafe, obtenerFinalY } from './estilos'
import { dibujarTituloSeccion } from './portada'

export function renderizarConsolidadoTrabajadoresPdf(
  doc: jsPDF,
  datos: DatosReporteExportacion,
  marginX: number,
  contentW: number,
  startY: number,
): number {
  if (datos.consolidadoTrabajadores.length === 0) return startY

  const cursorY = dibujarTituloSeccion(
    doc,
    '2. CONSOLIDADO DE TURNOS, HORAS Y EXTRAS POR TRABAJADOR',
    `${datos.consolidadoTrabajadores.length} trabajadores activos  ·  ${datos.kpis.turnosExtras} turnos extras acumulados`,
    marginX,
    contentW,
    startY,
  )

  const body: RowInput[] = datos.consolidadoTrabajadores.map((w, idx) => [
    String(idx + 1),
    pdfSafe(w.trabajador),
    pdfSafe(w.unidades),
    pdfSafe(w.areas),
    String(w.turnosNormales),
    String(w.turnosExtras),
    String(w.totalTurnos),
    `${w.totalHoras} h`,
    pdfSafe(w.detalleFechasExtra || '-'),
  ])

  autoTable(doc, {
    startY: cursorY,
    head: [['N°', 'Trabajador', 'Unidades', 'Área Operativa', 'Normales', 'Extras', 'Total Turnos', 'Total Horas', 'Fechas con Turno Extra']],
    body,
    margin: { left: marginX, right: marginX, top: 42, bottom: 28 },
    styles: {
      font: 'helvetica',
      fontSize: 7.3,
      cellPadding: 3.2,
      lineColor: PALETA.cardBorder,
      lineWidth: 0.35,
      textColor: PALETA.textPrimary,
      valign: 'middle',
    },
    headStyles: {
      fillColor: PALETA.navyDark,
      textColor: PALETA.white,
      fontStyle: 'bold',
      fontSize: 7.3,
    },
    alternateRowStyles: { fillColor: PALETA.zebraBg },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 138, fontStyle: 'bold' },
      2: { cellWidth: 68, halign: 'center' },
      3: { cellWidth: 118 },
      4: { cellWidth: 48, halign: 'center' },
      5: { cellWidth: 44, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 58, halign: 'center', fontStyle: 'bold' },
      7: { cellWidth: 58, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 'auto' },
    },
    didParseCell(hookData) {
      const col = hookData.column.index
      if (hookData.section === 'head' && (col === 0 || col === 2 || (col >= 4 && col <= 7))) {
        hookData.cell.styles.halign = 'center'
      }
      if (hookData.section === 'body' && col === 5) {
        if (Number(hookData.cell.raw) > 0) {
          hookData.cell.styles.fillColor = PALETA.extraBg
          hookData.cell.styles.textColor = PALETA.extraText
        } else {
          hookData.cell.styles.textColor = PALETA.textSubtle
        }
      }
    },
  })

  return obtenerFinalY(doc, cursorY + 30) + 16
}
