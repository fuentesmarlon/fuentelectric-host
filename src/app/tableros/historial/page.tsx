import { format, subMonths } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { requerirAdminPagina } from '@/lib/sesion'
import { finDiaOperativo, inicioDiaOperativo, shiftDate, todayIsoDate } from '@/lib/form-validation'
import HistorialClient from './HistorialClient'

const REGISTROS_POR_PAGINA = 100

type SearchParams = { desde?: string; hasta?: string; todo?: string; pagina?: string }

export default async function HistorialPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requerirAdminPagina()

  const params = await searchParams
  const todo = params.todo === '1'

  // Por defecto: el último mes (en hora de Guatemala)
  const hoy = todayIsoDate()
  const mesAtras = format(subMonths(new Date(`${hoy}T12:00:00Z`), 1), 'yyyy-MM-dd')
  const desde = todo ? '' : params.desde && shiftDate(params.desde) ? params.desde : params.hasta ? '' : mesAtras
  const hasta = todo ? '' : params.hasta && shiftDate(params.hasta) ? params.hasta : params.desde ? '' : hoy

  const where = todo
    ? {}
    : {
        fechaGuardado: {
          ...(desde ? { gte: inicioDiaOperativo(desde) } : {}),
          ...(hasta ? { lte: finDiaOperativo(hasta) } : {}),
        },
      }

  // Filtro, conteos y paginación se resuelven en la base de datos:
  // el navegador solo recibe los registros de la página que muestra.
  const [total, creaciones, extras] = await Promise.all([
    prisma.snapshotTurno.count({ where }),
    prisma.snapshotTurno.count({ where: { ...where, accion: 'CREACION' } }),
    prisma.snapshotTurno.count({ where: { ...where, esTurnoExtra: true } }),
  ])

  const totalPaginas = Math.max(1, Math.ceil(total / REGISTROS_POR_PAGINA))
  const pagina = Math.min(Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1), totalPaginas)

  const snapshots = await prisma.snapshotTurno.findMany({
    where,
    orderBy: { fechaGuardado: 'desc' },
    skip: (pagina - 1) * REGISTROS_POR_PAGINA,
    take: REGISTROS_POR_PAGINA,
  })

  return (
    <HistorialClient
      snapshots={snapshots}
      resumen={{ total, creaciones, extras }}
      filtro={{ desde, hasta, todo }}
      paginacion={{ pagina, totalPaginas, porPagina: REGISTROS_POR_PAGINA }}
    />
  )
}
