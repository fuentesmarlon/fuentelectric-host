// PDF · encabezados y pies de página.
import { jsPDF } from 'jspdf'
import { type DatosReporteExportacion } from '@/lib/reportes-exportacion'

import { PALETA, pdfSafe } from './estilos'

export function aplicarEncabezadosYPiePaginas(
  doc: jsPDF,
  datos: DatosReporteExportacion,
  pageW: number,
  pageH: number,
  marginX: number,
) {
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)

    // Encabezado compacto en páginas subsecuentes
    if (p > 1) {
      doc.setFillColor(...PALETA.navyDark)
      doc.rect(0, 0, pageW, 26, 'F')
      doc.setFillColor(...PALETA.goldAccent)
      doc.rect(0, 26, pageW, 1.5, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...PALETA.goldSoft)
      doc.text(pdfSafe('FUENTELECTRIC  ·  CONTROL OPERATIVO DE TURNOS'), marginX, 16.5)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...PALETA.iceText)
      doc.text(pdfSafe(`Periodo: ${datos.etiquetaPeriodo}`), pageW - marginX, 16.5, { align: 'right' })
    }

    // Pie de página corporativo en todas las hojas
    const footerLineY = pageH - 20
    doc.setDrawColor(...PALETA.cardBorder)
    doc.setLineWidth(0.5)
    doc.line(marginX, footerLineY, pageW - marginX, footerLineY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.setTextColor(...PALETA.textMuted)
    doc.text(
      pdfSafe(`Fuentelectric · Trabajando para EEGSA  |  Emitido el ${datos.generadoTexto}`),
      marginX,
      pageH - 10,
    )

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...PALETA.navyDark)
    doc.text(pdfSafe(`Página ${p} de ${totalPages}`), pageW - marginX, pageH - 10, { align: 'right' })
  }
}
