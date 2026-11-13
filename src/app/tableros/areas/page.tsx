import { prisma } from '@/lib/prisma'
import { requerirAdminPagina } from '@/lib/sesion'
import AreasClient from './AreasClient'

export default async function AreasPage() {
  await requerirAdminPagina()

  const areas = await prisma.area.findMany({
    orderBy: { nombre: 'asc' },
  })

  return <AreasClient areas={areas} />
}