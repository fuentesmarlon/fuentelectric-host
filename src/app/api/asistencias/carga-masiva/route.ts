import { verificarAdminApi } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { procesarBufferExcel } from '@/lib/carga-masiva'

export async function POST(request: Request) {
  try {
    const acceso = await verificarAdminApi()
    if (!acceso.ok) return acceso.respuesta

    const formData = await request.formData()
    const archivo = formData.get('archivo') as File | null
    const modoDuplicados = (formData.get('modoDuplicados') as 'omitir' | 'sobrescribir') || 'omitir'
    const permitirCupoExtra = formData.get('permitirCupoExtra') === 'true' || formData.get('permitirCupoExtra') === 'on'

    if (!archivo || typeof archivo === 'string' || archivo.size === 0) {
      return NextResponse.json(
        { ok: false, error: 'Por favor selecciona un archivo Excel válido (.xlsx o .xls).' },
        { status: 400 },
      )
    }

    const nombreArchivo = archivo.name.toLowerCase()
    if (!nombreArchivo.endsWith('.xlsx') && !nombreArchivo.endsWith('.xls')) {
      return NextResponse.json(
        { ok: false, error: 'Formato no soportado. El archivo debe ser un libro de Excel (.xlsx o .xls).' },
        { status: 400 },
      )
    }

    const arrayBuffer = await archivo.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const resultado = await procesarBufferExcel(buffer, acceso.user.nombre, modoDuplicados, permitirCupoExtra)

    if (resultado.ok) {
      revalidatePath('/tableros')
      revalidatePath('/tableros/asistencias')
      revalidatePath('/tableros/historial')
    }

    return NextResponse.json(resultado, {
      status: resultado.ok ? 200 : 400,
    })
  } catch (error: unknown) {
    console.error('Error en carga masiva:', error)
    return NextResponse.json(
      { ok: false, error: 'Ocurrió un error inesperado al procesar el archivo Excel.' },
      { status: 500 },
    )
  }
}

