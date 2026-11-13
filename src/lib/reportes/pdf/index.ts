// Genera el PDF del reporte operativo. Cada sección vive en su propio módulo.
import { jsPDF } from 'jspdf'
import type { DatosReporteExportacion } from '@/lib/reportes-exportacion'
import { dibujarBannerPortada, dibujarTarjetasKpi } from './portada'
import { renderizarMatrizProgramacionPdf } from './matriz'
import { renderizarConsolidadoTrabajadoresPdf } from './consolidado'
import { renderizarAuditoriaPdf } from './auditoria'
import { aplicarEncabezadosYPiePaginas } from './paginas'

export function generarPdfReporte(datos: DatosReporteExportacion): Uint8Array<ArrayBuffer> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const marginX = 28
  const contentW = pageW - marginX * 2

  dibujarBannerPortada(doc, datos, pageW, marginX)
  let cursorY = dibujarTarjetasKpi(doc, datos, marginX, contentW, 76)

  if (datos.tipoReporte !== 'auditoria') {
    cursorY = renderizarMatrizProgramacionPdf(doc, datos, marginX, contentW, cursorY)
    cursorY = renderizarConsolidadoTrabajadoresPdf(doc, datos, marginX, contentW, cursorY)
  }

  if (datos.tipoReporte !== 'programacion') {
    renderizarAuditoriaPdf(doc, datos, marginX, contentW, cursorY)
  }

  aplicarEncabezadosYPiePaginas(doc, datos, pageW, pageH, marginX)

  return new Uint8Array(doc.output('arraybuffer'))
}
