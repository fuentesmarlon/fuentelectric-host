import type { DatosReporteExportacion } from '@/lib/reportes-exportacion'
import { ZONA_HORARIA_OPERATIVA } from '@/lib/form-validation'

const formatoMarcaArchivo = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA_OPERATIVA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** Nombre del archivo descargado, con la fecha/hora de generación en hora de Guatemala. */
export function nombreArchivoReporte(datos: DatosReporteExportacion, extension: 'pdf' | 'xlsx'): string {
  const prefijo =
    datos.tipoReporte === 'programacion'
      ? 'programa-turnos-fuentelectric'
      : datos.tipoReporte === 'auditoria'
        ? 'auditoria-turnos-fuentelectric'
        : 'reporte-operativo-fuentelectric'
  const p = Object.fromEntries(formatoMarcaArchivo.formatToParts(datos.generadoEn).map((x) => [x.type, x.value]))
  return `${prefijo}-${p.year}-${p.month}-${p.day}_${p.hour}${p.minute}.${extension}`
}
