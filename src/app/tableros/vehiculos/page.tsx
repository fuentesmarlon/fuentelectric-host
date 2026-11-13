import { prisma } from '@/lib/prisma'
import { requerirAdminPagina } from '@/lib/sesion'
import VehiculosClient from './VehiculosClient'

export default async function VehiculosPage() {
  await requerirAdminPagina()

  const vehiculos = await prisma.vehiculo.findMany({
    orderBy: { codigo: 'asc' },
  })

  return <VehiculosClient vehiculos={vehiculos} />
}