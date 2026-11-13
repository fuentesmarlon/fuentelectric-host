import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Instancia única de Prisma. En desarrollo se guarda en `globalThis` para que el
// recargado en caliente (HMR) de `next dev` no abra una conexión nueva en cada cambio.
//
// Si cambias el esquema y ejecutas `prisma generate` con `next dev` abierto,
// reinicia el servidor de desarrollo para que cargue el cliente nuevo.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function crearInstanciaPrisma(): PrismaClient {
  // Si falta DATABASE_URL, el error aparecerá en la primera consulta (no al importar,
  // para no romper `next build` en entornos sin acceso a la base de datos).
  const connectionString = process.env.DATABASE_URL ?? ''

  // En serverless (Vercel) cada instancia tiene su propio pool: se mantiene pequeño para
  // no agotar las conexiones de Supabase. Usa el pooler en modo "transaction" (puerto 6543)
  // en DATABASE_URL; las migraciones usan DIRECT_URL (ver prisma.config.ts).
  const max = Number(process.env.DATABASE_POOL_MAX) || 5

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      max,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    }),
  })
}

export const prisma = globalForPrisma.prisma ?? crearInstanciaPrisma()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
