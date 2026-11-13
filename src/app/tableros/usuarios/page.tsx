import { prisma } from '@/lib/prisma'
import { requerirAdminPagina } from '@/lib/sesion'
import UsuariosClient from './UsuariosClient'

export default async function TrabajadoresPage() {
  await requerirAdminPagina()

  const [trabajadores, vehiculos] = await Promise.all([
    prisma.trabajador.findMany({
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        puesto: true,
        disponibilidad: true,
        horarioEstablecido: true,
        vehiculoId: true,
        vehiculo: {
          select: { id: true, codigo: true },
        },
      },
    }),
    prisma.vehiculo.findMany({
      where: { estado: 'DISPONIBLE' },
      orderBy: { codigo: 'asc' },
      select: { id: true, codigo: true, tipo: true },
    }),
  ])

  return <UsuariosClient trabajadores={trabajadores} vehiculos={vehiculos} />
}