import { prisma } from '@/lib/prisma'
import { verificarAdminApi } from '@/lib/auth'
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { soloPersonalAsignable } from '@/lib/puestos-no-asignables'
import { todayIsoDate } from '@/lib/form-validation'

export async function GET() {
  const acceso = await verificarAdminApi()
  if (!acceso.ok) return acceso.respuesta

  // La plantilla trae una hoja con los trabajadores, unidades y áreas disponibles hoy,
  // para que se copien los nombres exactos (la carga masiva los busca por nombre).
  const [todosLosTrabajadores, vehiculos, areas] = await Promise.all([
    prisma.trabajador.findMany({
      where: { disponibilidad: 'Activo' },
      select: { nombre: true, puesto: true },
      orderBy: { nombre: 'asc' },
    }),
    prisma.vehiculo.findMany({
      where: { estado: 'DISPONIBLE' },
      select: { codigo: true, tipo: true, noPersonas: true },
      orderBy: { codigo: 'asc' },
    }),
    prisma.area.findMany({
      where: { estado: 'Activo' },
      select: { nombre: true },
      orderBy: { nombre: 'asc' },
    }),
  ])

  // Gerencia y personal administrativo no se incluyen en la plantilla de turnos
  const trabajadores = soloPersonalAsignable(todosLosTrabajadores)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Fuentelectric - Sistema de Asistencias'
  workbook.created = new Date()

  // ── HOJA 1: Carga de Turnos ──
  const sheetTurnos = workbook.addWorksheet('Carga_Turnos', {
    views: [{ showGridLines: true }],
  })

  sheetTurnos.columns = [
    { header: 'FECHA (AAAA-MM-DD)', key: 'fecha', width: 22 },
    { header: 'TRABAJADOR', key: 'trabajador', width: 28 },
    { header: 'VEHICULO', key: 'vehiculo', width: 18 },
    { header: 'AREA', key: 'area', width: 24 },
    { header: 'TIPO_TURNO', key: 'tipoTurno', width: 16 },
    { header: 'HORARIO', key: 'horario', width: 22 },
    { header: 'TURNO_EXTRA (SI/NO)', key: 'extra', width: 22 },
    { header: 'COMENTARIO', key: 'comentario', width: 32 },
  ]

  // Estilo de la fila de cabecera
  const headerRow = sheetTurnos.getRow(1)
  headerRow.height = 30
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF002B49' }, // Azul institucional Fuentelectric
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF004884' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    }
  })

  // Filas de ejemplo con datos reales o representativos
  const ejTrabajador1 = trabajadores[0]?.nombre || 'Juan Pérez'
  const ejTrabajador2 = trabajadores[1]?.nombre || 'Carlos Gómez'
  const ejVehiculo1 = vehiculos[0]?.codigo || 'FTE-01'
  const ejArea1 = areas[0]?.nombre || 'Mantenimiento'

  const hoy = todayIsoDate()

  sheetTurnos.addRow({
    fecha: hoy,
    trabajador: ejTrabajador1,
    vehiculo: ejVehiculo1,
    area: ejArea1,
    tipoTurno: 'DIURNO',
    horario: 'DIURNO_07_19',
    extra: 'NO',
    comentario: 'Turno programado normal',
  })

  sheetTurnos.addRow({
    fecha: hoy,
    trabajador: ejTrabajador2,
    vehiculo: ejVehiculo1,
    area: ejArea1,
    tipoTurno: 'NOCTURNO',
    horario: 'NOCTURNO_19_07',
    extra: 'SI',
    comentario: 'Horas extras por apoyo',
  })

  // ── HOJA 2: Catálogos de Referencia ──
  const sheetCatalogos = workbook.addWorksheet('Catalogos_Referencia')

  sheetCatalogos.columns = [
    { header: 'TRABAJADORES ACTIVOS', key: 'colTrabajadores', width: 30 },
    { header: 'PUESTO', key: 'colPuesto', width: 22 },
    { header: '', key: 'sep1', width: 4 },
    { header: 'VEHICULOS', key: 'colVehiculos', width: 18 },
    { header: 'CUPO MAX.', key: 'colCupo', width: 14 },
    { header: '', key: 'sep2', width: 4 },
    { header: 'AREAS', key: 'colAreas', width: 24 },
    { header: '', key: 'sep3', width: 4 },
    { header: 'HORARIOS DISPONIBLES', key: 'colHorario', width: 22 },
    { header: 'DESCRIPCION', key: 'colHorarioDesc', width: 18 },
  ]

  const catHeader = sheetCatalogos.getRow(1)
  catHeader.height = 26
  catHeader.eachCell((cell) => {
    if (cell.value) {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF004884' },
      }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    }
  })

  const horariosLista = [
    { codigo: 'DIURNO_06_18', desc: '06:00 – 18:00' },
    { codigo: 'DIURNO_07_19', desc: '07:00 – 19:00' },
    { codigo: 'DIURNO_08_20', desc: '08:00 – 20:00' },
    { codigo: 'DIURNO_09_21', desc: '09:00 – 21:00' },
    { codigo: 'NOCTURNO_19_07', desc: '19:00 – 07:00' },
    { codigo: 'NOCTURNO_20_08', desc: '20:00 – 08:00' },
    { codigo: 'NOCTURNO_21_09', desc: '21:00 – 09:00' },
  ]

  const maxRows = Math.max(
    trabajadores.length,
    vehiculos.length,
    areas.length,
    horariosLista.length,
  )

  for (let i = 0; i < maxRows; i++) {
    sheetCatalogos.addRow({
      colTrabajadores: trabajadores[i]?.nombre || '',
      colPuesto: trabajadores[i]?.puesto || '',
      sep1: '',
      colVehiculos: vehiculos[i]?.codigo || '',
      colCupo: vehiculos[i] ? `${vehiculos[i].noPersonas} personas` : '',
      sep2: '',
      colAreas: areas[i]?.nombre || '',
      sep3: '',
      colHorario: horariosLista[i]?.codigo || '',
      colHorarioDesc: horariosLista[i]?.desc || '',
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()

  const headers = new Headers({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="plantilla_carga_turnos_fuentelectric.xlsx"',
    'Cache-Control': 'no-store',
  })

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers,
  })
}

