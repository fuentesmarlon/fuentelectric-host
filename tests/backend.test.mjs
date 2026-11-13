import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const { Prisma } = require('@prisma/client')
const actionFiles = ['areas/actions.ts', 'vehiculos/actions.ts', 'usuarios/actions.tsx', 'asistencias/actions.ts']

// Execute the real actions with isolated auth/database dependencies. Never load .env
// or connect to the live database; unexpected calls fail the test immediately.
function harness({ user = { id: 'admin-test' }, role = 'ADMIN', models = {}, supabaseAdmin = null, supabaseAuth = {} } = {}) {
  const unavailable = new Proxy({}, { get: (_, key) => () => { throw new Error(`Unexpected database call: ${String(key)}`) } })
  const prisma = new Proxy({ usuario: { findUnique: async () => role ? { rol: role, nombre: 'Test admin' } : null }, ...models }, {
    get: (target, key) => key in target ? target[key] : unavailable,
  })
  const cache = new Map()
  const invalidated = []
  function load(file) {
    const path = resolve(file)
    if (cache.has(path)) return cache.get(path)
    const exports = {}
    cache.set(path, exports)
    const code = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: path,
    }).outputText
    runInNewContext(code, {
      exports, Buffer, Uint8Array, console: { error() {} },
      require: name => {
        if (name === '@/lib/prisma') return { prisma }
        if (name === '@/utils/supabase/server') return { createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }), ...supabaseAuth } }) }
        // redirect() de Next corta la ejecución lanzando un error; aquí se lanza uno con la dirección
        if (name === 'next/navigation') return { redirect: url => { throw Object.assign(new Error('REDIRECT'), { url }) } }
        if (name === 'next/cache') return { revalidatePath: path => invalidated.push(path) }
        if (name === '@/utils/supabase/admin') return { createAdminClient: () => { if (!supabaseAdmin) throw new Error('Unexpected Supabase admin call'); return supabaseAdmin } }
        if (name.startsWith('@/') || name.startsWith('./') || name.startsWith('../')) {
          const base = name.startsWith('@/') ? resolve('src', name.slice(2)) : resolve(dirname(path), name)
          const candidatos = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]
          return load(candidatos.find((c) => existsSync(c)) ?? candidatos[0])
        }
        return require(name)
      },
    }, { filename: path })
    return exports
  }
  return { load, invalidated }
}

function form(values) {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}

const validShift = { id: 'shift-test', asignadoId: 'worker-test', fecha: '2026-08-06', tipoTurno: 'DIURNO', horario: 'DIURNO_07_19', areaId: 'area-test', vehiculoId: 'vehicle-test' }
const requestError = code => new Prisma.PrismaClientKnownRequestError('Test error', { code, clientVersion: Prisma.prismaVersion.client })

test('Every mutation rejects anonymous, non-admin and missing database users', async () => {
  for (const options of [{ user: null }, { role: 'TRABAJADOR' }, { role: null }]) {
    const { load } = harness(options)
    for (const file of actionFiles) {
      for (const action of Object.values(load(`src/app/tableros/${file}`))) {
        assert.match(await action(null, form({})), /No estás autenticado|No tienes permisos/)
      }
    }
  }
})

test('Invalid shift enums and impossible dates never reach database mutations', async () => {
  const { load } = harness()
  const { crearAsistencia, actualizarAsistencia } = load('src/app/tableros/asistencias/actions.ts')
  for (const action of [crearAsistencia, actualizarAsistencia]) {
    for (const field of ['tipoTurno', 'horario']) {
      assert.match(await action(null, form({ ...validShift, [field]: 'INVALID' })), /válidos/)
    }
    for (const fecha of ['2026-02-30', 'not-a-date', '2026-13-01']) {
      assert.match(await action(null, form({ ...validShift, fecha })), /fecha no es válida/)
    }
  }
})

test('Vehicle capacity, vehicle type, worker schedule and file inputs are validated', async () => {
  const { load } = harness()
  const { crearVehiculo, actualizarVehiculo } = load('src/app/tableros/vehiculos/actions.ts')
  for (const noPersonas of ['', '0', '-1', '2.5', '3abc']) {
    assert.match(await crearVehiculo(null, form({ codigo: 'TEST', tipo: 'CARRO', noPersonas })), /inválido/)
    assert.match(await actualizarVehiculo(null, form({ id: 'v-1', codigo: 'TEST', tipo: 'CARRO', noPersonas })), /inválido/)
  }
  assert.match(await crearVehiculo(null, form({ codigo: 'TEST', tipo: 'INVALID', noPersonas: '3' })), /inválido/)
  assert.match(await actualizarVehiculo(null, form({ id: 'v-1', codigo: 'TEST', tipo: 'CARRO', noPersonas: '3', estado: 'ESTADO_INVALIDO' })), /estado válido/)
  const workers = load('src/app/tableros/usuarios/actions.tsx')
  for (const action of [workers.crearTrabajador, workers.actualizarTrabajador]) {
    assert.match(await action(null, form({ id: 'worker-test', nombre: 'Test', horarioEstablecido: 'INVALID' })), /horario/)
  }
  const areas = load('src/app/tableros/areas/actions.ts')
  assert.match(await areas.crearArea(null, form({ nombre: new Blob(['text']) })), /obligatorio/)
  assert.match(await areas.actualizarArea(null, form({ id: 'a-1', nombre: 'Zona Sur', estado: 'INVALID' })), /estado válido/)
})

test('Prisma duplicate and missing-record errors remain actionable', async () => {
  const fail = code => async () => { throw requestError(code) }
  const { load } = harness({ models: {
    area: { create: fail('P2002'), update: fail('P2025') },
    vehiculo: { create: fail('P2002'), update: fail('P2025') },
    trabajador: { update: fail('P2025') },
  } })
  const areas = load('src/app/tableros/areas/actions.ts')
  const vehicles = load('src/app/tableros/vehiculos/actions.ts')
  assert.match(await areas.crearArea(null, form({ nombre: 'Test' })), /ya está registrada/)
  assert.match(await vehicles.crearVehiculo(null, form({ codigo: 'TEST', tipo: 'CARRO', noPersonas: '3' })), /Ya existe/)
  for (const action of [areas.eliminarArea, vehicles.eliminarVehiculo, load('src/app/tableros/usuarios/actions.tsx').eliminarTrabajador]) {
    assert.match(await action(null, form({ id: 'missing' })), /ya fue eliminad/)
  }

  // Soft delete sets workers/areas to Inactivo and vehicles to DADO_DE_BAJA instead of hard deleting
  const workerUpdates = []
  const areaUpdates = []
  const vehicleUpdates = []
  const workerUnlinks = []
  const { load: loadSoft } = harness({ models: {
    trabajador: {
      update: async args => workerUpdates.push(args),
      updateMany: async args => workerUnlinks.push(args),
    },
    area: { update: async args => areaUpdates.push(args) },
    vehiculo: { update: async args => vehicleUpdates.push(args) },
  } })
  assert.equal(await loadSoft('src/app/tableros/usuarios/actions.tsx').eliminarTrabajador(null, form({ id: 'w-1' })), null)
  assert.equal(workerUpdates.length, 1)
  assert.equal(workerUpdates[0].where.id, 'w-1')
  assert.equal(workerUpdates[0].data.disponibilidad, 'Inactivo')
  assert.equal(workerUpdates[0].data.vehiculoId, null)

  assert.equal(await loadSoft('src/app/tableros/areas/actions.ts').eliminarArea(null, form({ id: 'a-1' })), null)
  assert.equal(areaUpdates.length, 1)
  assert.equal(areaUpdates[0].where.id, 'a-1')
  assert.equal(areaUpdates[0].data.estado, 'Inactivo')

  assert.equal(await loadSoft('src/app/tableros/vehiculos/actions.ts').eliminarVehiculo(null, form({ id: 'v-1' })), null)
  assert.equal(vehicleUpdates.length, 1)
  assert.equal(vehicleUpdates[0].where.id, 'v-1')
  assert.equal(vehicleUpdates[0].data.estado, 'DADO_DE_BAJA')
  assert.equal(workerUnlinks.length, 1)
  assert.equal(workerUnlinks[0].where.vehiculoId, 'v-1')
  assert.equal(workerUnlinks[0].data.vehiculoId, null)
})

test('Unexpected thrown values return a safe error without a secondary exception', async () => {
  for (const error of [null, 'failure', new Error('Database unavailable')]) {
    const { load } = harness({ models: { area: { create: async () => { throw error } } } })
    assert.match(await load('src/app/tableros/areas/actions.ts').crearArea(null, form({ nombre: 'Test' })), /error inesperado/)
  }
})

test('A valid attendance still writes its audit snapshot in the same transaction', async () => {
  const writes = []
  const { load, invalidated } = harness({ models: {
    vehiculo: { findUnique: async () => ({ codigo: 'TEST', noPersonas: 3 }) },
    trabajador: { findUnique: async () => ({ nombre: 'Test worker' }) },
    area: { findUnique: async () => ({ nombre: 'Test area' }) },
    turnoDiario: { findMany: async () => [] },
    $transaction: async callback => callback({
      $executeRaw: async () => 0,
      turnoDiario: { findMany: async () => [], create: async ({ data }) => writes.push(['shift', data]) },
      snapshotTurno: { create: async ({ data }) => writes.push(['audit', data]) },
    }),
  } })
  assert.equal(await load('src/app/tableros/asistencias/actions.ts').crearAsistencia(null, form(validShift)), null)
  assert.equal(writes.length, 2)
  assert.equal(writes[0][1].fecha.toISOString(), '2026-08-06T12:00:00.000Z')
  assert.equal(writes[1][1].accion, 'CREACION')
  assert.equal(writes[1][1].usuarioResponsable, 'Test admin')
  assert.deepEqual(invalidated, ['/tableros', '/tableros/asistencias', '/tableros/historial'])
})

test('Vehicle handoff schedules, worker extra night shift, and extra passenger capacity work accurately', async () => {
  const created = []
  let existingShifts = []

  const { load } = harness({
    models: {
      vehiculo: { findUnique: async () => ({ id: 'vehicle-test', codigo: 'A-101', noPersonas: 3, estado: 'DISPONIBLE' }) },
      trabajador: { findUnique: async () => ({ id: 'worker-test', nombre: 'Pedro Liniero', disponibilidad: 'Activo' }) },
      area: { findUnique: async () => ({ id: 'area-test', nombre: 'Zona Norte', estado: 'Activo' }) },
      turnoDiario: { findMany: async () => existingShifts },
      $transaction: async callback => callback({
        $executeRaw: async () => 0,
        turnoDiario: { findMany: async () => existingShifts, create: async ({ data }) => created.push(data) },
        snapshotTurno: { create: async () => {} },
      }),
    },
  })

  const { crearAsistencia } = load('src/app/tableros/asistencias/actions.ts')

  // 1. Vehicle full (3/3) in DIURNO_08_20:
  // - Cannot take NOCTURNO_19_07 (overlap with 20:00 exit)
  // - CAN take NOCTURNO_20_08 and NOCTURNO_21_09 with another worker!
  existingShifts = [
    { id: 's1', asignadoId: 'other-1', vehiculoId: 'vehicle-test', tipoTurno: 'DIURNO', horario: 'DIURNO_08_20', esTurnoExtra: false },
    { id: 's2', asignadoId: 'other-2', vehiculoId: 'vehicle-test', tipoTurno: 'DIURNO', horario: 'DIURNO_08_20', esTurnoExtra: false },
    { id: 's3', asignadoId: 'other-3', vehiculoId: 'vehicle-test', tipoTurno: 'DIURNO', horario: 'DIURNO_08_20', esTurnoExtra: false },
  ]

  assert.match(
    await crearAsistencia(null, form({ ...validShift, tipoTurno: 'NOCTURNO', horario: 'NOCTURNO_19_07' })),
    /traslapan/,
  )
  assert.equal(
    await crearAsistencia(null, form({ ...validShift, tipoTurno: 'NOCTURNO', horario: 'NOCTURNO_20_08' })),
    null,
  )

  // 2. Vehicle in DIURNO_09_21: only NOCTURNO_21_09 is compatible
  existingShifts = [
    { id: 's1', asignadoId: 'other-1', vehiculoId: 'vehicle-test', tipoTurno: 'DIURNO', horario: 'DIURNO_09_21', esTurnoExtra: false },
  ]
  assert.match(
    await crearAsistencia(null, form({ ...validShift, tipoTurno: 'NOCTURNO', horario: 'NOCTURNO_20_08' })),
    /traslapan/,
  )
  assert.equal(
    await crearAsistencia(null, form({ ...validShift, tipoTurno: 'NOCTURNO', horario: 'NOCTURNO_21_09' })),
    null,
  )

  // 3. Same worker on same day:
  // - Rejected in same zone (DIURNO + DIURNO)
  // - Rejected in NOCTURNO without esTurnoExtra
  // - Allowed in NOCTURNO when esTurnoExtra='on' and schedule doesn't overlap
  existingShifts = [
    { id: 's1', asignadoId: 'worker-test', vehiculoId: 'other-veh', tipoTurno: 'DIURNO', horario: 'DIURNO_06_18', esTurnoExtra: false },
  ]
  assert.match(
    await crearAsistencia(null, form({ ...validShift, tipoTurno: 'DIURNO', horario: 'DIURNO_06_18', esTurnoExtra: 'on' })),
    /ya tiene un turno diurno/,
  )
  assert.match(
    await crearAsistencia(null, form({ ...validShift, tipoTurno: 'NOCTURNO', horario: 'NOCTURNO_19_07' })),
    /turno extra/i,
  )
  assert.equal(
    await crearAsistencia(null, form({ ...validShift, tipoTurno: 'NOCTURNO', horario: 'NOCTURNO_19_07', esTurnoExtra: 'on' })),
    null,
  )

  // 4. Extra passenger capacity (+3 workers in same shift):
  // - Rejected when 3/3 in DIURNO without esCupoExtra
  // - Allowed when esCupoExtra='on'
  existingShifts = [
    { id: 's1', asignadoId: 'other-1', vehiculoId: 'vehicle-test', tipoTurno: 'DIURNO', horario: 'DIURNO_07_19', esTurnoExtra: false },
    { id: 's2', asignadoId: 'other-2', vehiculoId: 'vehicle-test', tipoTurno: 'DIURNO', horario: 'DIURNO_07_19', esTurnoExtra: false },
    { id: 's3', asignadoId: 'other-3', vehiculoId: 'vehicle-test', tipoTurno: 'DIURNO', horario: 'DIURNO_07_19', esTurnoExtra: false },
  ]
  assert.match(
    await crearAsistencia(null, form({ ...validShift, tipoTurno: 'DIURNO', horario: 'DIURNO_07_19' })),
    /Cupo extra/,
  )
  assert.equal(
    await crearAsistencia(null, form({ ...validShift, tipoTurno: 'DIURNO', horario: 'DIURNO_07_19', esCupoExtra: 'on' })),
    null,
  )
  assert.equal(created.at(-1).esCupoExtra, true)
})

test('PDF and Excel responses contain valid binary files, corporate schedule matrix and preserve access restrictions', async () => {
  const sampleShifts = [
    {
      id: 't1',
      fecha: new Date('2026-10-16T12:00:00.000Z'),
      tipoTurno: 'DIURNO',
      horario: 'DIURNO_07_19',
      esTurnoExtra: false,
      esCupoExtra: false,
      registradoPor: 'Pablo',
      comentario: 'Cuadrilla regular',
      asignadoNombre: 'Carlos Sierra',
      vehiculoCodigo: 'A-111',
      areaNombre: 'Escuintla',
      asignado: { nombre: 'Carlos Sierra', puesto: 'Liniero' },
      vehiculo: { codigo: 'A-111' },
      area: { nombre: 'Escuintla' },
    },
    {
      id: 't2',
      fecha: new Date('2026-10-16T12:00:00.000Z'),
      tipoTurno: 'NOCTURNO',
      horario: 'NOCTURNO_19_07',
      esTurnoExtra: true,
      esCupoExtra: false,
      registradoPor: 'Pablo',
      comentario: 'Cobertura nocturna extra',
      asignadoNombre: 'Carlos Sierra',
      vehiculoCodigo: 'A-111',
      areaNombre: 'Escuintla',
      asignado: { nombre: 'Carlos Sierra', puesto: 'Liniero' },
      vehiculo: { codigo: 'A-111' },
      area: { nombre: 'Escuintla' },
    },
    {
      id: 't3',
      fecha: new Date('2026-10-17T12:00:00.000Z'),
      tipoTurno: 'NOCTURNO',
      horario: 'NOCTURNO_20_08',
      esTurnoExtra: false,
      esCupoExtra: true,
      registradoPor: 'Pablo',
      comentario: '',
      asignadoNombre: 'Yeyson Perez',
      vehiculoCodigo: 'A-113',
      areaNombre: 'Escuintla Canasta',
      asignado: { nombre: 'Yeyson Perez', puesto: 'Piloto' },
      vehiculo: { codigo: 'A-113' },
      area: { nombre: 'Escuintla Canasta' },
    },
  ]

  const sampleSnapshots = [
    {
      id: 'snap-1',
      fechaGuardado: new Date('2026-10-16T14:30:00.000Z'),
      nombreTrabajador: 'Carlos Sierra',
      areaTrabajo: 'Escuintla',
      vehiculoPlaca: 'A-111',
      tipoTurno: 'NOCTURNO',
      hora: 'NOCTURNO_19_07',
      esTurnoExtra: true,
      comentario: 'Cobertura nocturna extra',
      usuarioResponsable: 'Pablo',
      accion: 'CREACION',
    },
  ]

  for (const format of ['pdf', 'excel']) {
    const file = `src/app/api/historial/${format}/route.ts`
    for (const [options, status] of [[{ user: null }, 401], [{ role: 'TRABAJADOR' }, 403]]) {
      assert.equal((await harness(options).load(file).GET()).status, status)
    }

    // 1. Empty dataset works cleanly
    const emptyRes = await harness({
      models: {
        snapshotTurno: { findMany: async () => [] },
        turnoDiario: { findMany: async () => [] },
      },
    }).load(file).GET()
    assert.equal(emptyRes.status, 200)

    // 2. Full operational fortnight report works with matrix + extras + audit
    const fullReq = { url: 'http://localhost/api/historial?desde=2026-10-16&hasta=2026-10-31&tipo=completo' }
    const response = await harness({
      models: {
        snapshotTurno: { findMany: async () => sampleSnapshots },
        turnoDiario: { findMany: async () => sampleShifts },
      },
    }).load(file).GET(fullReq)
    assert.equal(response.status, 200)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (format === 'pdf') {
      assert.equal(bytes.subarray(0, 5).toString(), '%PDF-')
      assert.ok(bytes.length > 2000)
    } else {
      const ExcelJS = require('exceljs')
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(bytes)
      assert.ok(workbook.getWorksheet('Programación de Turnos'))
      assert.ok(workbook.getWorksheet('Turnos Extras y Consolidado'))
      assert.ok(workbook.getWorksheet('Detalle de Turnos'))
      const histSheet = workbook.getWorksheet('Historial')
      assert.ok(histSheet)
      assert.equal(histSheet.getCell('A6').value, 'Fecha de Registro')

      const progSheet = workbook.getWorksheet('Programación de Turnos')
      assert.equal(progSheet.getCell('A7').value, 'UNIDAD')
      assert.equal(progSheet.getCell('B7').value, 'TRABAJADOR')
      // Row 9 is unit group A-111, Row 10 is Carlos Sierra with 24H on 16/10 (col E) and D on 17/10 (col F)
      assert.equal(progSheet.getCell('B10').value, 'Carlos Sierra')
      assert.equal(progSheet.getCell('E10').value, '24H')
      assert.equal(progSheet.getCell('F10').value, 'D')
    }
  }
})

test('Las sesiones de administrador caducan a la hora en acciones y API', async () => {
  const hace = minutos => new Date(Date.now() - minutos * 60 * 1000).toISOString()

  const vigente = harness({ user: { id: 'admin-test', last_sign_in_at: hace(50) } }).load('src/lib/auth.ts')
  assert.equal((await vigente.verificarAdmin()).ok, true)
  assert.equal((await vigente.verificarAdminApi()).ok, true)

  const vencida = harness({ user: { id: 'admin-test', last_sign_in_at: hace(61) } }).load('src/lib/auth.ts')
  const accion = await vencida.verificarAdmin()
  assert.equal(accion.ok, false)
  assert.match(accion.error, /expirado/)
  const api = await vencida.verificarAdminApi()
  assert.equal(api.ok, false)
  assert.equal(api.respuesta.status, 401)

  // El superadministrador tiene la misma hora; un trabajador sigue dentro de sus 30 días
  const { sesionExpirada, duracionSesionSeg } = vigente
  assert.equal(sesionExpirada(hace(61), 'SUPERADMIN'), true)
  assert.equal(sesionExpirada(hace(59), 'SUPERADMIN'), false)
  assert.equal(duracionSesionSeg('ADMIN'), 3600)
  assert.equal(sesionExpirada(hace(61), 'TRABAJADOR'), false)
  assert.equal(sesionExpirada(hace(31 * 24 * 60), 'TRABAJADOR'), true)
})

test('El superadministrador puede todo lo del admin; solo él administra cuentas', async () => {
  const superadmin = harness({ role: 'SUPERADMIN' }).load('src/lib/auth.ts')
  assert.equal((await superadmin.verificarAdmin()).ok, true)
  assert.equal((await superadmin.verificarSuperadmin()).ok, true)

  const admin = harness({ role: 'ADMIN' }).load('src/lib/auth.ts')
  assert.equal((await admin.verificarAdmin()).ok, true)
  assert.match((await admin.verificarSuperadmin()).error, /No tienes permisos/)

  // Las acciones de cuentas rechazan a anónimos, trabajadores y administradores sin tocar nada
  for (const options of [{ user: null }, { role: 'TRABAJADOR' }, { role: 'ADMIN' }, { role: null }]) {
    const cuentas = harness(options).load('src/app/tableros/cuentas/actions.ts')
    for (const accion of Object.values(cuentas)) {
      assert.match(await accion(null, form({ id: 'x', nombre: 'A', email: 'a@b.co', rol: 'TRABAJADOR' })), /No estás autenticado|No tienes permisos/)
    }
  }

  // Un superadministrador también pasa por las acciones normales del panel
  const { load } = harness({ role: 'SUPERADMIN', models: { area: { create: async () => ({}) } } })
  assert.equal(await load('src/app/tableros/areas/actions.ts').crearArea(null, form({ nombre: 'Zona Norte' })), null)
})

test('Cuentas: crear, editar y eliminar mantienen Supabase Auth y Usuario sincronizados', async () => {
  const llamadas = []
  // Base simulada: el superadmin actual (admin-test), un admin y un trabajador
  const filas = new Map([
    ['admin-test', { id: 'admin-test', nombre: 'Super', email: 'super@fte.com', rol: 'SUPERADMIN' }],
    ['adm-1', { id: 'adm-1', nombre: 'Admin', email: 'admin@fte.com', rol: 'ADMIN' }],
    ['trab-1', { id: 'trab-1', nombre: 'Trabajador', email: 'trab@fte.com', rol: 'TRABAJADOR' }],
  ])
  const usuario = {
    findUnique: async ({ where }) => [...filas.values()].find(u => (where.id && u.id === where.id) || (where.email && u.email === where.email)) ?? null,
    count: async ({ where }) => [...filas.values()].filter(u => u.rol === where.rol).length,
    create: async ({ data }) => { if (data.email === 'falla@fte.com') throw new Error('fallo de base'); llamadas.push(['create', data]); filas.set(data.id, data); return data },
    update: async ({ where, data }) => { llamadas.push(['update', where.id, data]); return data },
    delete: async ({ where }) => { llamadas.push(['delete', where.id]); filas.delete(where.id); return {} },
  }
  const supabaseAdmin = { auth: { admin: {
    createUser: async (datos) => { llamadas.push(['auth.create', datos.email, Boolean(datos.password)]); return { data: { user: { id: 'nuevo-' + datos.email } }, error: null } },
    updateUserById: async (id, cambios) => { llamadas.push(['auth.update', id, Object.keys(cambios).sort().join(',')]); return { data: {}, error: null } },
    deleteUser: async (id) => { llamadas.push(['auth.delete', id]); return { data: {}, error: null } },
    listUsers: async () => ({ data: { users: [] }, error: null }),
  } } }
  const { load, invalidated } = harness({ role: 'SUPERADMIN', models: { usuario }, supabaseAdmin })
  const { crearCuenta, editarCuenta, eliminarCuenta } = load('src/app/tableros/cuentas/actions.ts')

  // Validaciones antes de tocar nada
  assert.match(await crearCuenta(null, form({ nombre: 'X', email: 'no-es-correo', rol: 'TRABAJADOR' })), /correo electrónico válido/)
  assert.match(await crearCuenta(null, form({ nombre: 'X', email: 'x@fte.com', rol: 'JEFE' })), /rol válido/)
  assert.match(await crearCuenta(null, form({ nombre: 'X', email: 'x@fte.com', rol: 'ADMIN' })), /necesitan una contraseña/)
  assert.match(await crearCuenta(null, form({ nombre: 'X', email: 'x@fte.com', rol: 'ADMIN', contrasena: 'corta' })), /al menos 8/)
  assert.match(await crearCuenta(null, form({ nombre: 'X', email: 'TRAB@fte.com', rol: 'TRABAJADOR' })), /Ya existe una cuenta/)
  assert.equal(llamadas.length, 0)

  // Crear: trabajador sin contraseña y admin con contraseña; el correo se guarda en minúsculas
  assert.equal(await crearCuenta(null, form({ nombre: '  Ana   López ', email: 'Ana@FTE.com', rol: 'TRABAJADOR' })), null)
  assert.equal(await crearCuenta(null, form({ nombre: 'Luis', email: 'luis@fte.com', rol: 'ADMIN', contrasena: 'segura123', pedirCambio: 'on' })), null)
  // «Pedir cambio» solo aplica a cuentas con contraseña: en un trabajador se ignora
  assert.equal(await crearCuenta(null, form({ nombre: 'Eva', email: 'eva@fte.com', rol: 'TRABAJADOR', pedirCambio: 'on' })), null)
  assert.equal(JSON.stringify(llamadas.slice(0, 6)), JSON.stringify([
    ['auth.create', 'ana@fte.com', false],
    ['create', { id: 'nuevo-ana@fte.com', nombre: 'Ana López', email: 'ana@fte.com', rol: 'TRABAJADOR', debeCambiarContrasena: false }],
    ['auth.create', 'luis@fte.com', true],
    ['create', { id: 'nuevo-luis@fte.com', nombre: 'Luis', email: 'luis@fte.com', rol: 'ADMIN', debeCambiarContrasena: true }],
    ['auth.create', 'eva@fte.com', false],
    ['create', { id: 'nuevo-eva@fte.com', nombre: 'Eva', email: 'eva@fte.com', rol: 'TRABAJADOR', debeCambiarContrasena: false }],
  ]))
  assert.ok(invalidated.includes('/tableros/cuentas'))

  // Si falla la tabla Usuario, se borra la cuenta recién creada en Supabase Auth
  llamadas.length = 0
  assert.match(await crearCuenta(null, form({ nombre: 'F', email: 'falla@fte.com', rol: 'TRABAJADOR' })), /error inesperado/)
  assert.equal(JSON.stringify(llamadas), JSON.stringify([['auth.create', 'falla@fte.com', false], ['auth.delete', 'nuevo-falla@fte.com']]))

  // Editar: reglas para no quedarse sin acceso
  llamadas.length = 0
  assert.match(await editarCuenta(null, form({ id: 'admin-test', nombre: 'Super', email: 'super@fte.com', rol: 'ADMIN' })), /propio rol/)
  assert.match(await editarCuenta(null, form({ id: 'trab-1', nombre: 'T', email: 'trab@fte.com', rol: 'ADMIN' })), /asigna también una contraseña/)
  assert.match(await editarCuenta(null, form({ id: 'trab-1', nombre: 'T', email: 'admin@fte.com', rol: 'TRABAJADOR' })), /Ya existe otra cuenta/)
  assert.match(await editarCuenta(null, form({ id: 'no-existe', nombre: 'T', email: 't@fte.com', rol: 'TRABAJADOR' })), /ya no existe/)
  assert.equal(llamadas.length, 0)

  // Ascender a admin con contraseña y cambiar el correo: primero Auth, luego Usuario
  assert.equal(await editarCuenta(null, form({ id: 'trab-1', nombre: 'Trabajador', email: 'nuevo@fte.com', rol: 'ADMIN', contrasena: 'segura123' })), null)
  assert.equal(JSON.stringify(llamadas), JSON.stringify([
    ['auth.update', 'trab-1', 'email,email_confirm,password'],
    ['update', 'trab-1', { nombre: 'Trabajador', email: 'nuevo@fte.com', rol: 'ADMIN', debeCambiarContrasena: false }],
  ]))
  // Cambiar solo el nombre no llama a Supabase Auth
  llamadas.length = 0
  assert.equal(await editarCuenta(null, form({ id: 'adm-1', nombre: 'Admin Dos', email: 'admin@fte.com', rol: 'ADMIN' })), null)
  assert.equal(llamadas[0][0], 'update')

  // Restablecer: con solo marcar la casilla (sin contraseña nueva) queda el cambio pendiente,
  // y tampoco se llama a Supabase Auth: la persona puede entrar con código y elegir la nueva
  llamadas.length = 0
  assert.equal(await editarCuenta(null, form({ id: 'adm-1', nombre: 'Admin Dos', email: 'admin@fte.com', rol: 'ADMIN', pedirCambio: 'on' })), null)
  assert.equal(JSON.stringify(llamadas), JSON.stringify([
    ['update', 'adm-1', { nombre: 'Admin Dos', email: 'admin@fte.com', rol: 'ADMIN', debeCambiarContrasena: true }],
  ]))

  // Eliminar: nunca a uno mismo; con otro superadmin, sí se puede eliminar al segundo
  llamadas.length = 0
  assert.match(await eliminarCuenta(null, form({ id: 'admin-test' })), /propia cuenta/)
  filas.set('super-2', { id: 'super-2', nombre: 'Otro', email: 'otro@fte.com', rol: 'SUPERADMIN' })
  assert.equal(await eliminarCuenta(null, form({ id: 'super-2' })), null)
  assert.equal(JSON.stringify(llamadas), JSON.stringify([['auth.delete', 'super-2'], ['delete', 'super-2']]))
  assert.match(await eliminarCuenta(null, form({ id: 'super-2' })), /ya fue eliminada/)
})

test('Cambio de contraseña pendiente: bloquea el panel hasta que la persona elige una nueva', async () => {
  const pendiente = { findUnique: async () => ({ rol: 'ADMIN', nombre: 'Luis', debeCambiarContrasena: true }) }

  // Mientras esté pendiente, ni acciones ni API del panel funcionan
  const auth = harness({ models: { usuario: pendiente } }).load('src/lib/auth.ts')
  assert.match((await auth.verificarAdmin()).error, /cambiar tu contraseña/)
  assert.equal((await auth.verificarAdminApi()).respuesta.status, 403)
  const area = harness({ models: { usuario: pendiente, area: { create: async () => { throw new Error('no debería crear') } } } })
  assert.match(await area.load('src/app/tableros/areas/actions.ts').crearArea(null, form({ nombre: 'Zona' })), /cambiar tu contraseña/)

  // La pantalla de cambio: valida, cambia la contraseña con la sesión de la persona y quita el pendiente
  const llamadas = []
  let respuestaSupabase = { error: null }
  const usuario = {
    ...pendiente,
    update: async ({ where, data }) => { llamadas.push(['update', where.id, data]); return data },
  }
  const supabaseAuth = { updateUser: async (cambios) => { llamadas.push(['auth.updateUser', cambios.password]); return respuestaSupabase } }
  const { cambiarContrasena } = harness({ models: { usuario }, supabaseAuth }).load('src/app/cambiar-contrasena/actions.ts')
  const redireccion = async (promesa) => { try { await promesa; return null } catch (e) { return e.url } }

  assert.match(await cambiarContrasena(null, form({ nueva: 'corta', confirmacion: 'corta' })), /al menos 8/)
  assert.match(await cambiarContrasena(null, form({ nueva: 'segura123', confirmacion: 'segura124' })), /no coinciden/)
  assert.equal(llamadas.length, 0)

  respuestaSupabase = { error: { code: 'same_password', message: 'same' } }
  assert.match(await cambiarContrasena(null, form({ nueva: 'segura123', confirmacion: 'segura123' })), /distinta/)
  assert.equal(llamadas.some(([tipo]) => tipo === 'update'), false) // si Supabase falla, sigue pendiente

  llamadas.length = 0
  respuestaSupabase = { error: null }
  assert.equal(await redireccion(cambiarContrasena(null, form({ nueva: 'MiClave2026', confirmacion: 'MiClave2026' }))), '/tableros')
  assert.equal(JSON.stringify(llamadas), JSON.stringify([
    ['auth.updateUser', 'MiClave2026'],
    ['update', 'admin-test', { debeCambiarContrasena: false }],
  ]))

  // Sin cambio pendiente la acción no toca nada y regresa al panel
  llamadas.length = 0
  const sinPendiente = harness({ supabaseAuth }).load('src/app/cambiar-contrasena/actions.ts')
  assert.equal(await redireccion(sinPendiente.cambiarContrasena(null, form({ nueva: 'MiClave2026', confirmacion: 'MiClave2026' }))), '/tableros')
  assert.equal(llamadas.length, 0)
  // Sin sesión, al login
  const anonimo = harness({ user: null }).load('src/app/cambiar-contrasena/actions.ts')
  assert.equal(await redireccion(anonimo.cambiarContrasena(null, form({}))), '/login')
})

test('Reactivar devuelve áreas, trabajadores y vehículos a su estado activo', async () => {
  const updates = []
  const capturar = model => ({ update: async args => { updates.push([model, args]); return {} } })
  const { load, invalidated } = harness({ models: {
    area: capturar('area'), trabajador: capturar('trabajador'), vehiculo: capturar('vehiculo'),
  } })

  assert.equal(await load('src/app/tableros/areas/actions.ts').reactivarArea(null, form({ id: 'a1' })), null)
  assert.equal(await load('src/app/tableros/usuarios/actions.tsx').reactivarTrabajador(null, form({ id: 't1' })), null)
  assert.equal(await load('src/app/tableros/vehiculos/actions.ts').reactivarVehiculo(null, form({ id: 'v1' })), null)

  assert.deepEqual(JSON.parse(JSON.stringify(updates)), [
    ['area', { where: { id: 'a1' }, data: { estado: 'Activo' } }],
    ['trabajador', { where: { id: 't1' }, data: { disponibilidad: 'Activo' } }],
    ['vehiculo', { where: { id: 'v1' }, data: { estado: 'DISPONIBLE' } }],
  ])
  assert.ok(invalidated.includes('/tableros/asistencias'))

  // Sin id no toca la base de datos; registro inexistente da un mensaje claro
  assert.match(await load('src/app/tableros/areas/actions.ts').reactivarArea(null, form({})), /Falta el identificador/)
  const { load: loadFaltante } = harness({ models: { vehiculo: { update: async () => { throw requestError('P2025') } } } })
  assert.match(await loadFaltante('src/app/tableros/vehiculos/actions.ts').reactivarVehiculo(null, form({ id: 'x' })), /ya no existe/)
})
