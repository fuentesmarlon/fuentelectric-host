import { NextResponse } from 'next/server'
import { verificarAdminApi } from '@/lib/auth'
import { obtenerDatosExportacion } from '@/lib/reportes-exportacion'
import { generarExcelReporte } from '@/lib/reportes/excel'
import { nombreArchivoReporte } from '@/lib/reportes/comun'

export async function GET(request?: Request) {
  const acceso = await verificarAdminApi()
  if (!acceso.ok) return acceso.respuesta

  const datos = await obtenerDatosExportacion(request?.url || '')
  const archivo = await generarExcelReporte(datos)

  return new NextResponse(archivo, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombreArchivoReporte(datos, 'xlsx')}"`,
    },
  })
}
