import Link from 'next/link'
import { PageHeading, SectionHeading, StatCard, EmptyState } from '@/components/dashboard/presentation'
import { LayoutDashboard, Users, Truck, MapPin, CalendarDays, List, Sun, Moon, ChevronLeft, ChevronRight } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { rangoFechaTurno, todayIsoDate } from '@/lib/form-validation'
import { requerirSesion } from '@/lib/sesion'
import { esAdministrador } from '@/lib/roles'
import { INCLUDE_TURNO_LISTA } from '@/lib/turnos-consulta'
import { OPCIONES_PERIODO, calcularPeriodoDashboard, describirRango, nombreDia } from '@/lib/periodos-dashboard'
import { HORARIO_LABELS } from '@/lib/horarios-turno'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const TURNOS_POR_PAGINA = 50

type SearchParams = { periodo?: string; dia?: string; pagina?: string }

export default async function TableroPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sesion = await requerirSesion()
  const esAdmin = esAdministrador(sesion.rol)
  const params = await searchParams

  // Por defecto, los turnos de HOY (hora de Guatemala); se puede elegir otro periodo
  const hoy = todayIsoDate()
  const rango = calcularPeriodoDashboard(params, hoy)
  const where = { fecha: { gte: rangoFechaTurno(rango.desde).gte, lte: rangoFechaTurno(rango.hasta).lte } }

  const totalPeriodo = await prisma.turnoDiario.count({ where })
  const totalPaginas = Math.max(1, Math.ceil(totalPeriodo / TURNOS_POR_PAGINA))
  const pagina = Math.min(Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1), totalPaginas)

  // Orden para revisar fácil: por día, luego diurnos antes que nocturnos, por hora de entrada,
  // por unidad (las cuadrillas quedan juntas) y por nombre.
  const turnos = await prisma.turnoDiario.findMany({
    where,
    orderBy: [{ fecha: 'asc' }, { tipoTurno: 'asc' }, { horario: 'asc' }, { vehiculoCodigo: 'asc' }, { asignadoNombre: 'asc' }],
    skip: (pagina - 1) * TURNOS_POR_PAGINA,
    take: TURNOS_POR_PAGINA,
    include: INCLUDE_TURNO_LISTA,
  })

  // Tarjetas de resumen (solo administradores)
  let totalTrabajadores = 0, totalVehiculos = 0, turnosHoy = 0, totalAreas = 0
  if (esAdmin) {
    ;[totalTrabajadores, totalVehiculos, turnosHoy, totalAreas] = await Promise.all([
      prisma.trabajador.count({ where: { NOT: { disponibilidad: 'Inactivo' } } }),
      prisma.vehiculo.count({ where: { NOT: { estado: { in: ['DADO_DE_BAJA', 'VENDIDO'] } } } }),
      prisma.turnoDiario.count({ where: { fecha: rangoFechaTurno(hoy) } }),
      prisma.area.count({ where: { NOT: { estado: 'Inactivo' } } }),
    ])
  }

  const variosDias = rango.desde !== rango.hasta
  const enlace = (p: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '') sp.set(k, String(v))
    const q = sp.toString()
    return q ? `/tableros?${q}` : '/tableros'
  }
  const paramsActuales = rango.periodo === 'dia' ? { dia: rango.desde } : { periodo: rango.periodo === 'hoy' ? undefined : rango.periodo }

  return (
    <div className="space-y-5">
      <PageHeading icon={LayoutDashboard} title={esAdmin ? 'Tablero general' : 'Turnos'} description={esAdmin ? 'Resumen de personal, unidades y actividad operativa' : 'Consulta los turnos y horarios programados'} />

      {esAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Trabajadores registrados" value={totalTrabajadores} />
          <StatCard icon={Truck} label="Vehículos registrados" value={totalVehiculos} />
          <StatCard icon={MapPin} label="Áreas operativas" value={totalAreas} />
          <StatCard icon={CalendarDays} label="Turnos registrados hoy" value={turnosHoy} />
        </div>
      )}

      <Card>
        <SectionHeading
          icon={List}
          title={rango.titulo}
          description={`${describirRango(rango)} · ${totalPeriodo} ${totalPeriodo === 1 ? 'turno' : 'turnos'}`}
        />
        <CardContent className="space-y-4">
          {/* Selector de periodo: enlaces simples (funciona sin JavaScript) */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <nav aria-label="Periodo de turnos" className="flex flex-wrap gap-2">
              {OPCIONES_PERIODO.map((op) => {
                const activo = rango.periodo === op.id
                return (
                  <Button key={op.id} asChild size="sm" variant={activo ? 'default' : 'outline'}>
                    <Link href={enlace({ periodo: op.id === 'hoy' ? undefined : op.id })} aria-current={activo ? 'page' : undefined}>
                      {op.etiqueta}
                    </Link>
                  </Button>
                )
              })}
            </nav>
            <form method="get" action="/tableros" className="flex items-end gap-2">
              <label className="grid gap-1 text-xs text-muted-foreground" htmlFor="dashboard-dia">
                Ver un día
                <input
                  id="dashboard-dia"
                  name="dia"
                  type="date"
                  defaultValue={rango.periodo === 'dia' ? rango.desde : ''}
                  required
                  className="h-8 rounded-md border border-border bg-white px-2 text-sm text-foreground"
                />
              </label>
              <Button type="submit" size="sm" variant={rango.periodo === 'dia' ? 'default' : 'outline'}>
                Ver
              </Button>
            </form>
          </div>

          {turnos.length === 0 ? (
            <EmptyState
              title={`No hay turnos ${rango.periodo === 'hoy' ? 'para hoy' : 'en este periodo'}`}
              description={esAdmin ? 'Registra turnos desde Asignación de turnos o elige otro periodo.' : 'Elige otro periodo o consulta más tarde.'}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {variosDias && <TableHead>Fecha</TableHead>}
                      <TableHead>Jornada y horario</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Trabajador</TableHead>
                      <TableHead>Área</TableHead>
                      {esAdmin && <TableHead>Registrado por</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {turnos.map((turno) => {
                      const fechaIso = new Date(turno.fecha).toISOString().slice(0, 10)
                      return (
                        <TableRow key={turno.id}>
                          {variosDias && (
                            <TableCell className="whitespace-nowrap text-sm font-medium first-letter:uppercase">
                              {nombreDia(fechaIso)}
                            </TableCell>
                          )}
                          <TableCell className="text-sm whitespace-nowrap">
                            <span className="inline-flex items-center gap-2">
                              {turno.tipoTurno === 'NOCTURNO' ? (
                                <Moon className="size-3.5 text-primary" aria-label="Nocturno" />
                              ) : (
                                <Sun className="size-3.5 text-[#ED8B00]" aria-label="Diurno" />
                              )}
                              {HORARIO_LABELS[turno.horario] ?? turno.horario}
                              {turno.esTurnoExtra && <Badge variant="outline" className="status-warning">Extra</Badge>}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {turno.vehiculoCodigo ?? turno.vehiculo?.codigo ?? '—'}
                          </TableCell>
                          <TableCell className="font-medium">{turno.asignadoNombre ?? turno.asignado?.nombre ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{turno.areaNombre ?? turno.area?.nombre ?? '—'}</TableCell>
                          {esAdmin && <TableCell className="text-muted-foreground text-sm">{turno.registradoPor ?? '—'}</TableCell>}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPaginas > 1 && (
                <nav aria-label="Paginación de turnos" className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
                  <span>
                    Turnos {(pagina - 1) * TURNOS_POR_PAGINA + 1}–{(pagina - 1) * TURNOS_POR_PAGINA + turnos.length} de {totalPeriodo}
                  </span>
                  <div className="flex items-center gap-2">
                    {pagina > 1 ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={enlace({ ...paramsActuales, pagina: pagina - 1 })}><ChevronLeft className="size-4" aria-hidden="true" />Anterior</Link>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled><ChevronLeft className="size-4" aria-hidden="true" />Anterior</Button>
                    )}
                    <span>Página {pagina} de {totalPaginas}</span>
                    {pagina < totalPaginas ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={enlace({ ...paramsActuales, pagina: pagina + 1 })}>Siguiente<ChevronRight className="size-4" aria-hidden="true" /></Link>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>Siguiente<ChevronRight className="size-4" aria-hidden="true" /></Button>
                    )}
                  </div>
                </nav>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
