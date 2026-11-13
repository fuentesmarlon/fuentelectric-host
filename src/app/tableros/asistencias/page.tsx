import { prisma } from '@/lib/prisma'
import { requerirAdminPagina } from '@/lib/sesion'
import { rangoFechaTurno, todayIsoDate } from '@/lib/form-validation'
import { INCLUDE_TURNO_LISTA, calcularVentanaTurnos } from '@/lib/turnos-consulta'
import { soloPersonalAsignable } from '@/lib/puestos-no-asignables'
import AsistenciasClient from './AsistenciasClient'

type SearchParams = { mes?: string; desde?: string; hasta?: string }

export default async function AsistenciasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requerirAdminPagina()

  // Solo se cargan los turnos del mes visible (o del rango filtrado, máx. 93 días),
  // en lugar de todo el historial: la página se mantiene rápida aunque crezcan los datos.
  const ventana = calcularVentanaTurnos(await searchParams, todayIsoDate())

  const [turnos, todosLosTrabajadores, vehiculos, areas] = await Promise.all([
    prisma.turnoDiario.findMany({
      where: {
        fecha: { gte: rangoFechaTurno(ventana.desde).gte, lte: rangoFechaTurno(ventana.hasta).lte },
      },
      orderBy: [{ fecha: 'desc' }, { tipoTurno: 'asc' }],
      include: INCLUDE_TURNO_LISTA,
    }),
    prisma.trabajador.findMany({
      where: { disponibilidad: 'Activo' },
      orderBy: { nombre: 'asc' },
    }),
    prisma.vehiculo.findMany({
      where: { estado: 'DISPONIBLE' },
      orderBy: { codigo: 'asc' },
    }),
    prisma.area.findMany({
      where: { estado: 'Activo' },
      orderBy: { nombre: 'asc' },
    }),
  ])

  // Gerencia y personal administrativo nunca aparecen para asignar turnos
  const trabajadores = soloPersonalAsignable(todosLosTrabajadores)

  return (
    <AsistenciasClient
      turnos={turnos}
      trabajadores={trabajadores}
      vehiculos={vehiculos}
      areas={areas}
      esAdmin
      ventana={ventana}
    />
  )
}
