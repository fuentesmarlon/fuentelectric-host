// Herramienta para probar en la base real ANTES de la entrega y dejarla limpia después.
//
//   pnpm entrega respaldar              Copia Áreas, Vehículos, Trabajadores y Usuarios a respaldos/*.json
//   pnpm entrega revisar                Compara los catálogos actuales con el último respaldo
//   pnpm entrega restaurar [--confirmar]  Devuelve los catálogos al estado del respaldo
//   pnpm entrega limpiar   [--confirmar]  Borra TODAS las asistencias (TurnoDiario) y el historial (SnapshotTurno)
//
// Sin --confirmar, "restaurar" y "limpiar" solo muestran lo que harían. Todo cambio va en una
// transacción: o se aplica completo o no se aplica nada. Las cuentas de Supabase Auth no se tocan.

import { createRequire } from 'node:module'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
require('dotenv').config({ quiet: true })
const { Client } = require('pg')

const DIR_RESPALDOS = join(process.cwd(), 'respaldos')
const CATALOGOS = {
  Area: { columnas: ['id', 'nombre', 'estado'], enums: { estado: 'EstadoArea' } },
  Vehiculo: { columnas: ['id', 'codigo', 'tipo', 'noPersonas', 'estado'], enums: { tipo: 'TipoVehiculo', estado: 'EstadoVehiculo' } },
  Trabajador: {
    columnas: ['id', 'nombre', 'puesto', 'disponibilidad', 'horarioEstablecido', 'vehiculoId'],
    enums: { disponibilidad: 'EstadoTrabajador', horarioEstablecido: 'HorarioBase' },
  },
  Usuario: { columnas: ['id', 'nombre', 'email', 'rol'], enums: { rol: 'RolUsuario' } },
}
// Orden para insertar/borrar respetando la relación Trabajador -> Vehiculo
const ORDEN_INSERTAR = ['Area', 'Vehiculo', 'Trabajador', 'Usuario']

const [modo, ...resto] = process.argv.slice(2)
const confirmar = resto.includes('--confirmar')

function salir(msg) {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!url) salir('Falta DATABASE_URL en el .env')
const destino = (() => {
  const u = new URL(url)
  return `${u.hostname}:${u.port} (${u.username.split('.')[1] ?? u.username})`
})()

const q = (id) => `"${id}"`

async function leerCatalogos(db) {
  const datos = {}
  for (const [tabla, { columnas, enums }] of Object.entries(CATALOGOS)) {
    const sel = columnas.map((c) => (enums[c] ? `${q(c)}::text AS ${q(c)}` : q(c))).join(', ')
    datos[tabla] = (await db.query(`SELECT ${sel} FROM ${q(tabla)} ORDER BY ${q('id')}`)).rows
  }
  return datos
}

async function contarOperacion(db) {
  const r = await db.query(`SELECT (SELECT count(*) FROM "TurnoDiario")::int AS turnos, (SELECT count(*) FROM "SnapshotTurno")::int AS historial`)
  return r.rows[0]
}

function ultimoRespaldo() {
  let archivos = []
  try {
    archivos = readdirSync(DIR_RESPALDOS).filter((f) => /^catalogos-.*\.json$/.test(f)).sort()
  } catch {
    /* sin carpeta */
  }
  if (!archivos.length) salir('No hay respaldos. Ejecuta primero: pnpm entrega respaldar')
  const archivo = join(DIR_RESPALDOS, archivos[archivos.length - 1])
  return { archivo, datos: JSON.parse(readFileSync(archivo, 'utf8')).catalogos }
}

function diferencias(respaldo, actual) {
  const res = {}
  for (const tabla of Object.keys(CATALOGOS)) {
    const antes = new Map(respaldo[tabla].map((r) => [r.id, r]))
    const ahora = new Map(actual[tabla].map((r) => [r.id, r]))
    const cambiados = []
    for (const [id, r] of antes) {
      const n = ahora.get(id)
      if (!n) continue
      const campos = CATALOGOS[tabla].columnas.filter((c) => (r[c] ?? null) !== (n[c] ?? null))
      if (campos.length) cambiados.push({ id, etiqueta: r.nombre ?? r.codigo ?? r.email, campos: campos.map((c) => `${c}: ${n[c]} → ${r[c]}`) })
    }
    res[tabla] = {
      nuevos: [...ahora.values()].filter((r) => !antes.has(r.id)),
      faltantes: [...antes.values()].filter((r) => !ahora.has(r.id)),
      cambiados,
    }
  }
  return res
}

function imprimirDiferencias(dif) {
  let total = 0
  for (const [tabla, d] of Object.entries(dif)) {
    const n = d.nuevos.length + d.faltantes.length + d.cambiados.length
    total += n
    console.log(`  ${tabla}: ${n === 0 ? 'sin cambios' : `${d.cambiados.length} modificados, ${d.nuevos.length} nuevos, ${d.faltantes.length} faltantes`}`)
    for (const c of d.cambiados) console.log(`     ~ ${c.etiqueta}: ${c.campos.join(' · ')}  (se restauraría)`)
    for (const r of d.nuevos) console.log(`     + ${r.nombre ?? r.codigo ?? r.email}  (creado durante las pruebas; se eliminaría)`)
    for (const r of d.faltantes) console.log(`     - ${r.nombre ?? r.codigo ?? r.email}  (ya no existe; se volvería a crear)`)
  }
  return total
}

const db = new Client({ connectionString: url })
await db.connect()
console.log(`Base de datos: ${destino}`)

try {
  if (modo === 'respaldar') {
    await db.query('BEGIN READ ONLY')
    const catalogos = await leerCatalogos(db)
    const operacion = await contarOperacion(db)
    await db.query('COMMIT')
    mkdirSync(DIR_RESPALDOS, { recursive: true })
    const marca = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const archivo = join(DIR_RESPALDOS, `catalogos-${marca}.json`)
    writeFileSync(archivo, JSON.stringify({ creado: new Date().toISOString(), destino, catalogos, operacion }, null, 2))
    console.log(`✔ Respaldo guardado en ${archivo}`)
    for (const [t, filas] of Object.entries(catalogos)) console.log(`  ${t}: ${filas.length}`)
    console.log(`  (en ese momento: ${operacion.turnos} asistencias, ${operacion.historial} registros de historial — no se respaldan)`)
  } else if (modo === 'revisar') {
    const { archivo, datos } = ultimoRespaldo()
    await db.query('BEGIN READ ONLY')
    const actual = await leerCatalogos(db)
    const operacion = await contarOperacion(db)
    await db.query('COMMIT')
    console.log(`Comparando con ${archivo}:`)
    const total = imprimirDiferencias(diferencias(datos, actual))
    console.log(`  Asistencias: ${operacion.turnos} · Historial: ${operacion.historial}`)
    console.log(total === 0 ? '✔ Los catálogos coinciden con el respaldo.' : '→ Para volver al respaldo: pnpm entrega restaurar --confirmar')
  } else if (modo === 'restaurar') {
    const { archivo, datos } = ultimoRespaldo()
    await db.query('BEGIN')
    const dif = diferencias(datos, await leerCatalogos(db))
    console.log(`Restaurando desde ${archivo}:`)
    const total = imprimirDiferencias(dif)
    if (total === 0) {
      await db.query('ROLLBACK')
      console.log('✔ Nada que restaurar.')
    } else if (!confirmar) {
      await db.query('ROLLBACK')
      console.log('\n(Simulación) No se cambió nada. Para aplicarlo: pnpm entrega restaurar --confirmar')
    } else {
      // Borrar los creados durante las pruebas (en orden inverso por la relación Trabajador -> Vehiculo)
      for (const tabla of [...ORDEN_INSERTAR].reverse()) {
        const ids = dif[tabla].nuevos.map((r) => r.id)
        if (ids.length) await db.query(`DELETE FROM ${q(tabla)} WHERE id = ANY($1)`, [ids])
      }
      for (const tabla of ORDEN_INSERTAR) {
        const { columnas, enums } = CATALOGOS[tabla]
        const valor = (c, i) => (enums[c] ? `$${i}::${q(enums[c])}` : `$${i}`)
        for (const r of dif[tabla].faltantes) {
          await db.query(
            `INSERT INTO ${q(tabla)} (${columnas.map(q).join(', ')}) VALUES (${columnas.map((c, i) => valor(c, i + 1)).join(', ')})`,
            columnas.map((c) => r[c]),
          )
        }
        const respaldoPorId = new Map(datos[tabla].map((r) => [r.id, r]))
        for (const c of dif[tabla].cambiados) {
          const r = respaldoPorId.get(c.id)
          const set = columnas.filter((x) => x !== 'id')
          await db.query(
            `UPDATE ${q(tabla)} SET ${set.map((x, i) => `${q(x)} = ${valor(x, i + 2)}`).join(', ')} WHERE id = $1`,
            [c.id, ...set.map((x) => r[x])],
          )
        }
      }
      await db.query('COMMIT')
      console.log('✔ Catálogos restaurados.')
    }
  } else if (modo === 'limpiar') {
    await db.query('BEGIN')
    const antes = await contarOperacion(db)
    console.log(`Se borrarían ${antes.turnos} asistencias y ${antes.historial} registros de historial.`)
    console.log('Áreas, vehículos, trabajadores y usuarios NO se tocan.')
    if (!confirmar) {
      await db.query('ROLLBACK')
      console.log('\n(Simulación) No se borró nada. Para borrarlos: pnpm entrega limpiar --confirmar')
    } else {
      const t = await db.query('DELETE FROM "TurnoDiario"')
      const h = await db.query('DELETE FROM "SnapshotTurno"')
      await db.query('COMMIT')
      console.log(`✔ Borradas ${t.rowCount} asistencias y ${h.rowCount} registros de historial.`)
    }
  } else {
    salir('Modo no válido. Usa: respaldar | revisar | restaurar [--confirmar] | limpiar [--confirmar]')
  }
} catch (e) {
  await db.query('ROLLBACK').catch(() => {})
  salir(e.message)
} finally {
  await db.end()
}
