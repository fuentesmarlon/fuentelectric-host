// Datos de prueba para STAGING o DESARROLLO.  Uso:  pnpm db:seed
//
// Crea (sin duplicar si se ejecuta varias veces):
//   - las áreas y unidades del README
//   - 18 trabajadores "Prueba · …" repartidos en cuadrillas de 3
//   - turnos de ejemplo para hoy y los 2 días siguientes
//   - cuentas de acceso de prueba, si se definen SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
//     y/o SEED_TRABAJADOR_EMAIL (requiere SUPABASE_SERVICE_ROLE_KEY del proyecto de staging)
//
// PROTECCIONES: se niega a correr si NEXT_PUBLIC_ENTORNO no es "staging" o "desarrollo",
// o si la base ya contiene trabajadores que no son de prueba (por ejemplo, producción).

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('dotenv').config({ quiet: true })
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const PREFIJO = 'Prueba · '
const REGISTRADO_POR = 'Datos de prueba (seed)'

function salir(mensaje) {
  console.error(`\n✖ ${mensaje}\n`)
  process.exit(1)
}

// ── Protección 1: entorno explícito ─────────────────────────────────────────
const entorno = (process.env.NEXT_PUBLIC_ENTORNO ?? '').trim().toLowerCase()
if (!['staging', 'desarrollo'].includes(entorno)) {
  salir(
    `NEXT_PUBLIC_ENTORNO es "${entorno || '(vacío)'}". Este script solo se ejecuta con ` +
      'NEXT_PUBLIC_ENTORNO=staging o NEXT_PUBLIC_ENTORNO=desarrollo, para no tocar producción por error.',
  )
}
if (!process.env.DATABASE_URL) salir('Falta DATABASE_URL.')

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL, max: 2 }),
})

const AREAS = ['Escuintla', 'Escuintla canasta frío', 'Escuintla liniero frío', 'Escuintla camión canasta']
const VEHICULOS = [
  ...Array.from({ length: 10 }, (_, i) => ({ codigo: `A-${111 + i}`, tipo: 'CARRO' })),
  ...['A-141', 'A-142', 'A-150', 'A-151'].map((codigo) => ({ codigo, tipo: 'CAMION' })),
]
const NOMBRES = [
  'Ana López', 'Bruno Pérez', 'Carla Méndez', 'Diego Ruiz', 'Elena Castro', 'Fabio Morales',
  'Gabriela Soto', 'Hugo Ramírez', 'Inés Herrera', 'Jorge Aguilar', 'Karla Ortiz', 'Luis Barrios',
  'María Cifuentes', 'Néstor Gómez', 'Olga Juárez', 'Pablo Estrada', 'Rosa Cabrera', 'Samuel Díaz',
]
const HORARIOS = ['DIURNO_07_19', 'DIURNO_08_20', 'NOCTURNO_19_07', 'NOCTURNO_20_08']

function hoyGuatemala() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala' }).format(new Date())
}
const fechaTurno = (iso, dias) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + dias * 86_400_000)

async function main() {
  // ── Protección 2: la base no debe tener datos reales ──────────────────────
  const reales = await prisma.trabajador.count({ where: { NOT: { nombre: { startsWith: PREFIJO } } } })
  if (reales > 0 && !process.argv.includes('--forzar')) {
    salir(
      `La base ya tiene ${reales} trabajador(es) que no son de prueba. ¿Es producción? ` +
        'Revisa DATABASE_URL. (Si es una base de pruebas con datos propios, usa: pnpm db:seed -- --forzar)',
    )
  }

  console.log(`Entorno: ${entorno} · cargando datos de prueba…`)

  for (const nombre of AREAS) {
    await prisma.area.upsert({ where: { nombre }, update: {}, create: { nombre } })
  }
  for (const v of VEHICULOS) {
    await prisma.vehiculo.upsert({ where: { codigo: v.codigo }, update: {}, create: { ...v, noPersonas: 3 } })
  }
  const vehiculos = await prisma.vehiculo.findMany({ where: { codigo: { in: VEHICULOS.map((v) => v.codigo) } }, orderBy: { codigo: 'asc' } })
  const areas = await prisma.area.findMany({ where: { nombre: { in: AREAS } }, orderBy: { nombre: 'asc' } })

  // Trabajadores: cuadrillas de 3 por unidad, en las primeras 6 unidades
  const trabajadores = []
  for (const [i, nombreBase] of NOMBRES.entries()) {
    const nombre = PREFIJO + nombreBase
    const vehiculo = vehiculos[Math.floor(i / 3)]
    const horario = HORARIOS[Math.floor(i / 3) % HORARIOS.length]
    const existente = await prisma.trabajador.findFirst({ where: { nombre } })
    trabajadores.push(
      existente ??
        (await prisma.trabajador.create({
          data: { nombre, puesto: i % 3 === 0 ? 'Jefe de cuadrilla' : 'Liniero', horarioEstablecido: horario, vehiculoId: vehiculo.id },
        })),
    )
  }

  // Turnos de ejemplo: hoy y los 2 días siguientes, cada cuadrilla en su unidad y horario
  const hoy = hoyGuatemala()
  const turnos = []
  for (let dia = 0; dia < 3; dia++) {
    for (const [i, t] of trabajadores.entries()) {
      const vehiculo = vehiculos[Math.floor(i / 3)]
      const area = areas[Math.floor(i / 3) % areas.length]
      turnos.push({
        asignadoId: t.id,
        asignadoNombre: t.nombre,
        registradoPor: REGISTRADO_POR,
        fecha: fechaTurno(hoy, dia),
        estado: 'TRABAJO_12',
        tipoTurno: t.horarioEstablecido.startsWith('NOCTURNO') ? 'NOCTURNO' : 'DIURNO',
        horario: t.horarioEstablecido,
        areaId: area.id,
        areaNombre: area.nombre,
        vehiculoId: vehiculo.id,
        vehiculoCodigo: vehiculo.codigo,
      })
    }
  }
  const { count: turnosCreados } = await prisma.turnoDiario.createMany({ data: turnos, skipDuplicates: true })

  const cuentas = await crearCuentasDePrueba()

  console.log(
    `✔ Listo: ${areas.length} áreas, ${vehiculos.length} unidades, ${trabajadores.length} trabajadores, ` +
      `${turnosCreados} turnos nuevos${cuentas.length ? `, cuentas: ${cuentas.join(', ')}` : ''}.`,
  )
}

// Cuentas de acceso (Supabase Auth + tabla Usuario) solo si se configuran las variables SEED_*
async function crearCuentasDePrueba() {
  const pedidas = [
    process.env.SEED_ADMIN_EMAIL && { email: process.env.SEED_ADMIN_EMAIL, rol: 'ADMIN', password: process.env.SEED_ADMIN_PASSWORD, nombre: 'Admin de prueba' },
    process.env.SEED_TRABAJADOR_EMAIL && { email: process.env.SEED_TRABAJADOR_EMAIL, rol: 'TRABAJADOR', nombre: 'Trabajador de prueba' },
  ].filter(Boolean)
  if (!pedidas.length) return []

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !clave) salir('Para crear cuentas de prueba faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(url, clave, { auth: { autoRefreshToken: false, persistSession: false } })

  const creadas = []
  for (const c of pedidas) {
    if (c.rol === 'ADMIN' && !c.password) salir('SEED_ADMIN_EMAIL requiere también SEED_ADMIN_PASSWORD.')
    const email = c.email.trim().toLowerCase()

    let id = (await prisma.usuario.findUnique({ where: { email } }))?.id
    if (!id) {
      const { data, error } = await supabase.auth.admin.createUser({ email, password: c.password, email_confirm: true })
      if (error && !/already/i.test(error.message)) salir(`No se pudo crear la cuenta ${email}: ${error.message}`)
      id = data?.user?.id ?? (await buscarIdPorEmail(supabase, email))
      if (!id) salir(`La cuenta ${email} ya existe en Supabase Auth pero no se encontró su id.`)
    }
    await prisma.usuario.upsert({ where: { email }, update: { rol: c.rol }, create: { id, email, nombre: c.nombre, rol: c.rol } })
    creadas.push(`${email} (${c.rol})`)
  }
  return creadas
}

async function buscarIdPorEmail(supabase, email) {
  for (let page = 1; page <= 10; page++) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    const u = data?.users?.find((x) => x.email?.toLowerCase() === email)
    if (u) return u.id
    if (!data?.users?.length) return null
  }
  return null
}

main()
  .catch((e) => salir(e.message))
  .finally(() => prisma.$disconnect())
