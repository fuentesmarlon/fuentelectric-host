// Genera el libro de Excel del reporte operativo. Cada hoja vive en su propio módulo.
import ExcelJS from 'exceljs'
import type { DatosReporteExportacion } from '@/lib/reportes-exportacion'
import { construirHojaProgramacion } from './hoja-programacion'
import { construirHojaTurnosExtrasYConsolidado } from './hoja-extras'
import { construirHojaDetalleTurnos } from './hoja-detalle'
import { construirHojaHistorialAuditoria } from './hoja-auditoria'

export async function generarExcelReporte(datos: DatosReporteExportacion): Promise<Uint8Array<ArrayBuffer>> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Fuentelectric · Control Operativo de Turnos'
  workbook.company = 'Fuentelectric'
  workbook.created = datos.generadoEn

  const logoId = datos.logoBase64
    ? workbook.addImage({ base64: datos.logoBase64, extension: 'png' })
    : null

  if (datos.tipoReporte !== 'auditoria') {
    construirHojaProgramacion(workbook, logoId, datos)
    construirHojaTurnosExtrasYConsolidado(workbook, logoId, datos)
    construirHojaDetalleTurnos(workbook, logoId, datos)
  }

  if (datos.tipoReporte !== 'programacion') {
    construirHojaHistorialAuditoria(workbook, logoId, datos)
  }

  return new Uint8Array(await workbook.xlsx.writeBuffer())
}
