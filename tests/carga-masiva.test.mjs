import { test } from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)

// Completa un mock de Prisma con lo necesario para el flujo transaccional de la carga masiva.
function conTransaccion(prisma) {
  if (!prisma) return prisma
  const turnoDiario = { ...prisma.turnoDiario }
  if (turnoDiario.createMany && !turnoDiario.createManyAndReturn) {
    turnoDiario.createManyAndReturn = async (args) => {
      await turnoDiario.createMany(args)
      return args.data.map(({ asignadoId, fecha, tipoTurno }) => ({ asignadoId, fecha, tipoTurno }))
    }
  }
  const completo = { $executeRaw: async () => 0, ...prisma, turnoDiario }
  if (!completo.$transaction) completo.$transaction = async (callback) => callback(completo)
  return completo
}

function loadModule(file, mocks = {}) {
  const path = resolve(file)
  const code = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: path,
  }).outputText
  const exports = {}
  runInNewContext(code, {
    exports,
    Buffer,
    Uint8Array,
    console: { error() {}, log() {} },
    require: name => {
      if (mocks[name]) return mocks[name]
      if (name === '@/lib/prisma') return { prisma: conTransaccion(mocks.prisma) }
      // Cualquier otro módulo propio de src/lib se carga real (con los mismos mocks)
      if (name.startsWith('@/lib/')) return loadModule(`src/lib/${name.slice(6)}.ts`, mocks)
      if (name === '@prisma/client') return require('@prisma/client')
      if (name === 'exceljs') return ExcelJS
      if (name === 'date-fns') return require('date-fns')
      return require(name)
    },
  }, { filename: path })
  return exports
}

test('procesarBufferExcel parses valid Excel data, validates catalogs, and calculates batch inserts', async () => {
  const createdShifts = []
  const createdSnapshots = []

  const mockPrisma = {
    trabajador: {
      findMany: async () => [
        { id: 't-1', nombre: 'Carlos Ruiz', disponibilidad: 'Activo' },
        { id: 't-2', nombre: 'Maria Perez', disponibilidad: 'Activo' },
      ],
    },
    vehiculo: {
      findMany: async () => [
        { id: 'v-1', codigo: 'FTE-01', noPersonas: 2 },
      ],
    },
    area: {
      findMany: async () => [
        { id: 'a-1', nombre: 'Mantenimiento' },
      ],
    },
    turnoDiario: {
      findMany: async () => [],
      createMany: async ({ data }) => {
        createdShifts.push(...data)
        return { count: data.length }
      },
    },
    snapshotTurno: {
      createMany: async ({ data }) => {
        createdSnapshots.push(...data)
        return { count: data.length }
      },
    },
  }

  const { procesarBufferExcel } = loadModule('src/lib/carga-masiva.ts', { prisma: mockPrisma })

  // Build a test workbook in memory
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Carga_Turnos')
  sheet.addRow(['FECHA', 'TRABAJADOR', 'VEHICULO', 'AREA', 'TIPO_TURNO', 'HORARIO', 'TURNO_EXTRA', 'COMENTARIO'])
  // Fila 2: Válida
  sheet.addRow(['2026-11-10', 'Carlos Ruiz', 'FTE-01', 'Mantenimiento', 'DIURNO', 'DIURNO_07_19', 'NO', 'Guardia 1'])
  // Fila 3: Válida
  sheet.addRow(['2026-11-10', 'Maria Perez', 'FTE-01', 'Mantenimiento', 'NOCTURNO', 'NOCTURNO_19_07', 'SI', 'Guardia 2'])
  // Fila 4: Inválida (trabajador inexistente)
  sheet.addRow(['2026-11-10', 'Inexistente Lopez', 'FTE-01', 'Mantenimiento', 'DIURNO', 'DIURNO_07_19', 'NO', ''])

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
  const res = await procesarBufferExcel(buffer, 'Admin Tester', 'omitir')

  assert.equal(res.ok, true)
  assert.equal(res.creados, 2)
  assert.equal(res.errores.length, 1)
  assert.match(res.errores[0].motivo, /Trabajador no encontrado/)
  assert.equal(createdShifts.length, 2)
  assert.equal(createdSnapshots.length, 2)
  assert.equal(createdShifts[0].asignadoNombre, 'Carlos Ruiz')
  assert.equal(createdShifts[1].esTurnoExtra, true)
})

test('procesarBufferExcel respects vehicle capacity limits', async () => {
  const mockPrisma = {
    trabajador: {
      findMany: async () => [
        { id: 't-1', nombre: 'Carlos Ruiz', disponibilidad: 'Activo' },
        { id: 't-2', nombre: 'Maria Perez', disponibilidad: 'Activo' },
      ],
    },
    vehiculo: {
      findMany: async () => [
        { id: 'v-1', codigo: 'FTE-01', noPersonas: 1 }, // Capacidad máxima = 1
      ],
    },
    area: {
      findMany: async () => [
        { id: 'a-1', nombre: 'Mantenimiento' },
      ],
    },
    turnoDiario: {
      findMany: async () => [],
      createMany: async ({ data }) => ({ count: data.length }),
    },
    snapshotTurno: {
      createMany: async ({ data }) => ({ count: data.length }),
    },
  }

  const { procesarBufferExcel } = loadModule('src/lib/carga-masiva.ts', { prisma: mockPrisma })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Carga_Turnos')
  sheet.addRow(['FECHA', 'TRABAJADOR', 'VEHICULO', 'AREA', 'TIPO_TURNO', 'HORARIO', 'TURNO_EXTRA', 'COMENTARIO'])
  sheet.addRow(['2026-11-10', 'Carlos Ruiz', 'FTE-01', 'Mantenimiento', 'DIURNO', 'DIURNO_07_19', 'NO', ''])
  sheet.addRow(['2026-11-10', 'Maria Perez', 'FTE-01', 'Mantenimiento', 'DIURNO', 'DIURNO_07_19', 'NO', ''])

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
  const res = await procesarBufferExcel(buffer, 'Admin Tester', 'omitir')

  assert.equal(res.ok, true)
  assert.equal(res.creados, 1)
  assert.equal(res.errores.length, 1)
  assert.match(res.errores[0].motivo, /capacidad máxima/)
})

test('Past shifts cannot be overwritten or edited after their date has passed', async () => {
  const { isPastShiftDate } = loadModule('src/lib/form-validation.ts')
  assert.equal(isPastShiftDate('2020-01-01'), true)
  assert.equal(isPastShiftDate('2099-12-31'), false)

  const mockPrisma = {
    trabajador: {
      findMany: async () => [{ id: 't-1', nombre: 'Carlos Ruiz', disponibilidad: 'Activo' }],
    },
    vehiculo: {
      findMany: async () => [{ id: 'v-1', codigo: 'FTE-01', noPersonas: 3 }],
    },
    area: {
      findMany: async () => [{ id: 'a-1', nombre: 'Mantenimiento' }],
    },
    turnoDiario: {
      findMany: async () => [
        { id: 'turno-pasado', asignadoId: 't-1', vehiculoId: 'v-1', fecha: new Date('2020-05-10T12:00:00Z') },
      ],
      createMany: async ({ data }) => ({ count: data.length }),
    },
    snapshotTurno: {
      createMany: async ({ data }) => ({ count: data.length }),
    },
  }

  const { procesarBufferExcel } = loadModule('src/lib/carga-masiva.ts', { prisma: mockPrisma })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Carga_Turnos')
  sheet.addRow(['FECHA', 'TRABAJADOR', 'VEHICULO', 'AREA', 'TIPO_TURNO', 'HORARIO', 'TURNO_EXTRA', 'COMENTARIO'])
  sheet.addRow(['2020-05-10', 'Carlos Ruiz', 'FTE-01', 'Mantenimiento', 'DIURNO', 'DIURNO_07_19', 'NO', 'Intento de sobrescribir pasado'])

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
  const res = await procesarBufferExcel(buffer, 'Admin Tester', 'sobrescribir')

  assert.equal(res.actualizados, 0)
  assert.equal(res.errores.length, 1)
  assert.match(res.errores[0].motivo, /fecha del turno ya pasó/)
})

test('procesarBufferExcel rejects non-available vehicles and inactive areas', async () => {
  const mockPrisma = {
    trabajador: {
      findMany: async () => [
        { id: 't-1', nombre: 'Carlos Ruiz', disponibilidad: 'Activo' },
        { id: 't-2', nombre: 'Maria Perez', disponibilidad: 'Activo' },
      ],
    },
    vehiculo: {
      findMany: async () => [
        { id: 'v-taller', codigo: 'FTE-02', noPersonas: 3, estado: 'EN_TALLER' },
        { id: 'v-disp', codigo: 'FTE-01', noPersonas: 3, estado: 'DISPONIBLE' },
      ],
    },
    area: {
      findMany: async () => [
        { id: 'a-act', nombre: 'Zona Central', estado: 'Activo' },
        { id: 'a-inact', nombre: 'Zona Cerrada', estado: 'Inactivo' },
      ],
    },
    turnoDiario: {
      findMany: async () => [],
      createMany: async ({ data }) => ({ count: data.length }),
    },
    snapshotTurno: {
      createMany: async ({ data }) => ({ count: data.length }),
    },
  }

  const { procesarBufferExcel } = loadModule('src/lib/carga-masiva.ts', { prisma: mockPrisma })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Carga_Turnos')
  sheet.addRow(['FECHA', 'TRABAJADOR', 'VEHICULO', 'AREA', 'TIPO_TURNO', 'HORARIO', 'TURNO_EXTRA', 'COMENTARIO'])
  sheet.addRow(['2099-11-10', 'Carlos Ruiz', 'FTE-02', 'Zona Central', 'DIURNO', 'DIURNO_07_19', 'NO', 'Vehículo en taller'])
  sheet.addRow(['2099-11-10', 'Maria Perez', 'FTE-01', 'Zona Cerrada', 'DIURNO', 'DIURNO_07_19', 'NO', 'Área inactiva'])

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
  const res = await procesarBufferExcel(buffer, 'Admin Tester', 'omitir')

  assert.equal(res.creados, 0)
  assert.equal(res.errores.length, 2)
  assert.match(res.errores[0].motivo, /En Taller \/ Mantenimiento/)
  assert.match(res.errores[1].motivo, /inactiva/)
})


test('"Hoy" se calcula en hora de Guatemala aunque el servidor corra en UTC', () => {
  const { todayIsoDate, isPastShiftDate } = loadModule('src/lib/form-validation.ts')
  // 4 nov 2026 a las 20:00 en Guatemala = 5 nov 2026 02:00 UTC
  const nocheGuatemala = new Date('2026-11-05T02:00:00Z')
  assert.equal(todayIsoDate(nocheGuatemala), '2026-11-04')
  // Un turno de hoy sigue siendo editable por la noche
  assert.equal(isPastShiftDate('2026-11-04', nocheGuatemala), false)
  assert.equal(isPastShiftDate(new Date('2026-11-04T12:00:00Z'), nocheGuatemala), false)
  assert.equal(isPastShiftDate('2026-11-03', nocheGuatemala), true)
})

test('El limitador bloquea tras el máximo de intentos y libera al pasar la ventana', () => {
  const { consumirIntento } = loadModule('src/lib/rate-limit.ts')
  const t0 = 1_000_000
  for (let i = 0; i < 3; i++) assert.equal(consumirIntento('test:a@b.com', 3, 60_000, t0 + i).permitido, true)
  const bloqueado = consumirIntento('test:a@b.com', 3, 60_000, t0 + 10)
  assert.equal(bloqueado.permitido, false)
  assert.ok(bloqueado.reintentarEnSeg > 0)
  assert.equal(consumirIntento('test:otro@b.com', 3, 60_000, t0 + 10).permitido, true)
  assert.equal(consumirIntento('test:a@b.com', 3, 60_000, t0 + 60_001).permitido, true)
})

test('La carga masiva corre en una transacción con bloqueo y solo audita los turnos insertados', async () => {
  const llamadas = []
  const snapshots = []
  const tx = {
    $executeRaw: async (strings, ...valores) => { llamadas.push(['lock', valores[0]]); return 0 },
    turnoDiario: {
      findMany: async () => [],
      // Simula que la BD omitió la fila de Maria por duplicado (skipDuplicates)
      createManyAndReturn: async ({ data }) => data
        .filter((d) => d.asignadoId === 't-1')
        .map(({ asignadoId, fecha, tipoTurno }) => ({ asignadoId, fecha, tipoTurno })),
    },
    snapshotTurno: { createMany: async ({ data }) => { snapshots.push(...data); return { count: data.length } } },
  }
  const mockPrisma = {
    trabajador: { findMany: async () => [
      { id: 't-1', nombre: 'Carlos Ruiz', disponibilidad: 'Activo' },
      { id: 't-2', nombre: 'Maria Perez', disponibilidad: 'Activo' },
    ] },
    vehiculo: { findMany: async () => [{ id: 'v-1', codigo: 'FTE-01', noPersonas: 3 }] },
    area: { findMany: async () => [{ id: 'a-1', nombre: 'Mantenimiento' }] },
    $transaction: async (callback, opciones) => { llamadas.push(['tx', opciones]); return callback(tx) },
  }
  const { procesarBufferExcel } = loadModule('src/lib/carga-masiva.ts', { prisma: mockPrisma })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Carga_Turnos')
  sheet.addRow(['FECHA', 'TRABAJADOR', 'VEHICULO', 'AREA', 'TIPO_TURNO', 'HORARIO', 'TURNO_EXTRA', 'COMENTARIO'])
  sheet.addRow(['2099-01-15', 'Carlos Ruiz', 'FTE-01', 'Mantenimiento', 'DIURNO', 'DIURNO_07_19', 'NO', ''])
  sheet.addRow(['2099-01-15', 'Maria Perez', 'FTE-01', 'Mantenimiento', 'DIURNO', 'DIURNO_07_19', 'NO', ''])

  const res = await procesarBufferExcel(Buffer.from(await workbook.xlsx.writeBuffer()), 'Admin', 'omitir')

  assert.equal(res.ok, true)
  assert.equal(res.creados, 1)
  assert.equal(snapshots.length, 1)
  assert.equal(snapshots[0].nombreTrabajador, 'Carlos Ruiz')
  assert.equal(llamadas[0][0], 'tx')
  assert.deepEqual(llamadas[1], ['lock', 'turnos:2099-01-15'])
})

test('Reportes y tablero usan la hora de Guatemala para días y horas', () => {
  const fv = loadModule('src/lib/form-validation.ts')
  // 5 nov 2026 02:30 UTC = 4 nov 2026 20:30 en Guatemala
  assert.equal(fv.formatearFechaHoraOperativa(new Date('2026-11-05T02:30:00Z')), '04/11/2026 20:30')
  assert.equal(fv.inicioDiaOperativo('2026-11-04').toISOString(), '2026-11-04T06:00:00.000Z')
  assert.equal(fv.finDiaOperativo('2026-11-04').toISOString(), '2026-11-05T05:59:59.999Z')
  const rango = fv.rangoFechaTurno('2026-11-04')
  const turnoDelDia = new Date('2026-11-04T12:00:00Z')
  assert.ok(turnoDelDia >= rango.gte && turnoDelDia <= rango.lte)
  assert.equal(fv.formatearIsoCorto('2026-11-04'), '04/11/2026')
})

test('Reglas de turno compartidas: doble jornada, entrega de unidad y cupo', () => {
  const { validarConflictosDelDia, validarCatalogosTurno } = loadModule('src/lib/reglas-turno.ts')
  const base = {
    asignadoId: 'w1', nombreTrabajador: 'Ana', vehiculoId: 'v1', codigoVehiculo: 'A-111', cupoVehiculo: 2,
    tipoTurno: 'NOCTURNO', horario: 'NOCTURNO_20_08', esTurnoExtra: false, esCupoExtra: false,
  }
  const diurnoAna = (extra) => ({ asignadoId: 'w1', vehiculoId: 'v9', tipoTurno: 'DIURNO', horario: 'DIURNO_07_19', esTurnoExtra: extra })

  assert.equal(validarConflictosDelDia(base, []), null)
  // Misma jornada dos veces
  assert.match(validarConflictosDelDia({ ...base, tipoTurno: 'DIURNO', horario: 'DIURNO_07_19' }, [diurnoAna(false)]), /ya tiene un turno diurno/)
  // Doble jornada: basta con que UNO de los dos sea extra
  assert.match(validarConflictosDelDia(base, [diurnoAna(false)]), /turno extra/i)
  assert.equal(validarConflictosDelDia({ ...base, esTurnoExtra: true }, [diurnoAna(false)]), null)
  assert.equal(validarConflictosDelDia(base, [diurnoAna(true)]), null)
  // Traslape del trabajador (07-19 vs 19-07 sí es compatible; 08-20 vs 19-07 no)
  assert.match(validarConflictosDelDia({ ...base, horario: 'NOCTURNO_19_07', esTurnoExtra: true }, [{ ...diurnoAna(false), horario: 'DIURNO_08_20' }]), /se traslapa/)
  // Entrega de unidad
  const unidadDiurna = { asignadoId: 'w2', vehiculoId: 'v1', tipoTurno: 'DIURNO', horario: 'DIURNO_09_21', esTurnoExtra: false }
  assert.match(validarConflictosDelDia(base, [unidadDiurna]), /traslapan las horas de entrega/)
  // Cupo por jornada
  const ocupante = (id) => ({ asignadoId: id, vehiculoId: 'v1', tipoTurno: 'NOCTURNO', horario: 'NOCTURNO_20_08', esTurnoExtra: false })
  assert.match(validarConflictosDelDia(base, [ocupante('w2'), ocupante('w3')]), /capacidad máxima de 2.*Cupo extra/)
  assert.equal(validarConflictosDelDia({ ...base, esCupoExtra: true }, [ocupante('w2'), ocupante('w3')]), null)

  // Catálogos
  const ok = { trabajador: { nombre: 'Ana', disponibilidad: 'Activo' }, vehiculo: { codigo: 'A-111', estado: 'DISPONIBLE' }, area: { nombre: 'Escuintla', estado: 'Activo' } }
  assert.equal(validarCatalogosTurno(ok), null)
  assert.match(validarCatalogosTurno({ ...ok, trabajador: { nombre: 'Ana', disponibilidad: 'Vacaciones' } }), /Vacaciones/)
  assert.match(validarCatalogosTurno({ ...ok, vehiculo: { codigo: 'A-111', estado: 'EN_TALLER' } }), /En Taller/)
  assert.match(validarCatalogosTurno({ ...ok, area: { nombre: 'X', estado: 'Inactivo' } }), /inactiva/)
})

test('Gerencia y personal administrativo nunca se pueden asignar a turnos', () => {
  const { esPuestoNoAsignable, soloPersonalAsignable } = loadModule('src/lib/puestos-no-asignables.ts')
  const { validarCatalogosTurno } = loadModule('src/lib/reglas-turno.ts')

  for (const puesto of ['Gerente General', 'Administrador', 'Administrativo Jr', 'Gerente Administrativo', 'Supervisor SISO']) {
    assert.equal(esPuestoNoAsignable(puesto), true, puesto)
  }
  // Tolera mayúsculas, tildes, puntos y espacios de más
  for (const puesto of ['  gerente   general ', 'ADMINISTRADOR', 'Administrativo JR.', 'Supervisor S.I.S.O', 'Gerénte Administrativo']) {
    assert.equal(esPuestoNoAsignable(puesto), true, puesto)
  }
  // Puestos operativos sí se asignan
  for (const puesto of ['Liniero', 'Supervisor', 'Piloto', 'Ayudante', '', null, undefined]) {
    assert.equal(esPuestoNoAsignable(puesto), false, String(puesto))
  }

  const lista = [{ nombre: 'Ana', puesto: 'Liniero' }, { nombre: 'Jefe', puesto: 'Gerente General' }, { nombre: 'Luis', puesto: null }]
  assert.equal(JSON.stringify(soloPersonalAsignable(lista).map((t) => t.nombre)), '["Ana","Luis"]')

  // Aunque alguien envíe el formulario a mano, el servidor lo rechaza
  const ok = { vehiculo: { codigo: 'A-111', estado: 'DISPONIBLE' }, area: { nombre: 'Escuintla', estado: 'Activo' } }
  assert.match(
    validarCatalogosTurno({ ...ok, trabajador: { nombre: 'Jefe', disponibilidad: 'Activo', puesto: 'Supervisor SISO' } }),
    /no se asigna a turnos operativos/,
  )
  assert.equal(validarCatalogosTurno({ ...ok, trabajador: { nombre: 'Ana', disponibilidad: 'Activo', puesto: 'Liniero' } }), null)
})

test('Ventana de turnos: mes del calendario, rango filtrado y tope de 93 días', () => {
  const { calcularVentanaTurnos, cuadriculaDelMes } = loadModule('src/lib/turnos-consulta.ts')
  // Noviembre 2026 empieza en domingo y termina en lunes -> cuadrícula de lunes a domingo
  assert.deepEqual({ ...cuadriculaDelMes('2026-11') }, { desde: '2026-10-26', hasta: '2026-12-06' })

  const porDefecto = calcularVentanaTurnos({}, '2026-11-04')
  assert.equal(porDefecto.mes, '2026-11')
  assert.equal(porDefecto.desde, '2026-10-26')
  assert.equal(porDefecto.recortado, false)

  assert.equal(calcularVentanaTurnos({ mes: '2027-02' }, '2026-11-04').desde, '2027-02-01')

  const rango = calcularVentanaTurnos({ desde: '2026-11-01', hasta: '2026-11-15' }, '2026-11-04')
  assert.equal(rango.desde, '2026-11-01')
  assert.equal(rango.hasta, '2026-11-15')
  assert.equal(rango.filtroDesde, '2026-11-01')

  const largo = calcularVentanaTurnos({ desde: '2026-01-01', hasta: '2026-12-31' }, '2026-11-04')
  assert.equal(largo.recortado, true)
  assert.equal(largo.hasta, '2026-04-03') // 93 días desde el 1 de enero

  // Parámetros inválidos se ignoran
  const invalido = calcularVentanaTurnos({ desde: '2026-02-31', mes: 'xx' }, '2026-11-04')
  assert.equal(invalido.mes, '2026-11')
  assert.equal(invalido.filtroDesde, '')
})

test('Detección de entorno: valor explícito o, si falta, según el tipo de build', () => {
  const { obtenerEntorno } = loadModule('src/lib/entorno.ts')
  assert.equal(obtenerEntorno('staging', 'production'), 'staging')
  assert.equal(obtenerEntorno(' Produccion ', 'development'), 'produccion')
  assert.equal(obtenerEntorno('desarrollo', 'production'), 'desarrollo')
  // Sin valor (o inválido): un build de producción se considera producción, `next dev` desarrollo
  assert.equal(obtenerEntorno('', 'production'), 'produccion')
  assert.equal(obtenerEntorno('qa', 'production'), 'produccion')
  assert.equal(obtenerEntorno('', 'development'), 'desarrollo')
})

test('Dashboard: periodos de turnos (hoy por defecto, mañana, semana, mes y un día)', () => {
  const { calcularPeriodoDashboard: p, describirRango } = loadModule('src/lib/periodos-dashboard.ts')
  const hoy = '2026-11-05' // jueves
  const r = (params) => { const x = p(params, hoy); return [x.periodo, x.desde, x.hasta] }

  assert.deepEqual(r({}), ['hoy', '2026-11-05', '2026-11-05'])
  assert.deepEqual(r({ periodo: 'xyz' }), ['hoy', '2026-11-05', '2026-11-05'])
  assert.deepEqual(r({ periodo: 'manana' }), ['manana', '2026-11-06', '2026-11-06'])
  assert.deepEqual(r({ periodo: 'semana' }), ['semana', '2026-11-02', '2026-11-08']) // lunes a domingo
  assert.deepEqual(r({ periodo: 'mes' }), ['mes', '2026-11-01', '2026-11-30'])
  assert.deepEqual(r({ dia: '2026-12-24' }), ['dia', '2026-12-24', '2026-12-24'])
  assert.deepEqual(r({ dia: hoy }), ['hoy', hoy, hoy])
  assert.deepEqual(r({ dia: '2026-02-30', periodo: 'mes' }), ['mes', '2026-11-01', '2026-11-30']) // día inválido se ignora

  // Bordes: domingo pertenece a la semana que empezó el lunes anterior; febrero; fin de año
  assert.deepEqual(p({ periodo: 'semana' }, '2026-11-08').desde, '2026-11-02')
  assert.equal(p({ periodo: 'mes' }, '2028-02-10').hasta, '2028-02-29')
  assert.equal(p({ periodo: 'manana' }, '2026-12-31').desde, '2027-01-01')

  assert.equal(describirRango(p({}, hoy)), 'jueves 5 de noviembre')
  assert.equal(describirRango(p({ periodo: 'semana' }, hoy)), 'del lunes 2 de noviembre al domingo 8 de noviembre')
})
