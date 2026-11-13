import { NextResponse } from 'next/server'
import { verificarAdminApi } from '@/lib/auth'
import { obtenerDatosExportacion } from '@/lib/reportes-exportacion'
import { generarPdfReporte } from '@/lib/reportes/pdf'
import { nombreArchivoReporte } from '@/lib/reportes/comun'

export async function GET(request?: Request) {
  const acceso = await verificarAdminApi()
  if (!acceso.ok) return acceso.respuesta

  const datos = await obtenerDatosExportacion(request?.url || '')
  const archivo = generarPdfReporte(datos)

  return new NextResponse(archivo, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nombreArchivoReporte(datos, 'pdf')}"`,
    },
  })
}
