'use client'

import { useState, useMemo, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { PageHeading, SectionHeading, StatCard, EmptyState } from '@/components/dashboard/presentation'
import { format, subMonths, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  History,
  FileText,
  FileSpreadsheet,
  FileDown,
  Calendar,
  RotateCcw,
  LayoutGrid,
  ShieldCheck,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

type Snapshot = {
  id: string
  fechaGuardado: Date
  nombreTrabajador: string
  areaTrabajo: string
  vehiculoPlaca: string
  tipoTurno: string
  hora: string
  esTurnoExtra: boolean
  comentario: string | null
  usuarioResponsable: string
  accion: 'CREACION' | 'EDICION' | 'ELIMINACION'
}

type TipoReporteUI = 'completo' | 'programacion' | 'auditoria'

const accionConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  CREACION: { label: 'Creación', variant: 'default' },
  EDICION: { label: 'Edición', variant: 'secondary' },
  ELIMINACION: { label: 'Eliminación', variant: 'destructive' },
}

const horarioConfig: Record<string, string> = {
  DIURNO_06_18: '06:00 – 18:00',
  DIURNO_07_19: '07:00 – 19:00',
  DIURNO_08_20: '08:00 – 20:00',
  DIURNO_09_21: '09:00 – 21:00',
  NOCTURNO_19_07: '19:00 – 07:00',
  NOCTURNO_20_08: '20:00 – 08:00',
  NOCTURNO_21_09: '21:00 – 09:00',
}

const OPCIONES_REPORTE: Array<{
  id: TipoReporteUI
  titulo: string
  subtitulo: string
  icon: typeof Layers
}> = [
  {
    id: 'programacion',
    titulo: 'Programa de Turnos',
    subtitulo: 'Matriz operativa por cuadrilla y resumen de horas/extras',
    icon: LayoutGrid,
  },
  {
    id: 'completo',
    titulo: 'Reporte Completo',
    subtitulo: 'Matriz por unidad + Turnos extras + Auditoría',
    icon: Layers,
  },
  {
    id: 'auditoria',
    titulo: 'Solo Auditoría',
    subtitulo: 'Bitácora de creaciones, ediciones y bajas',
    icon: ShieldCheck,
  },
]

type HistorialClientProps = {
  /** Registros de la página actual (ya filtrados por fecha en el servidor) */
  snapshots: Snapshot[]
  resumen: { total: number; creaciones: number; extras: number }
  filtro: { desde: string; hasta: string; todo: boolean }
  paginacion: { pagina: number; totalPaginas: number; porPagina: number }
}

export default function HistorialClient({ snapshots, resumen, filtro, paginacion }: HistorialClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [cargando, startTransition] = useTransition()

  const [desde, setDesdeState] = useState<string>(filtro.desde)
  const [hasta, setHastaState] = useState<string>(filtro.hasta)
  const [exportarTodo, setExportarTodoState] = useState<boolean>(filtro.todo)

  // Cambiar el rango o la página recarga los datos desde el servidor (?desde&hasta&todo&pagina)
  const navegar = (rango: { desde: string; hasta: string; todo: boolean }, pagina = 1) => {
    const sp = new URLSearchParams()
    if (rango.todo) sp.set('todo', '1')
    else {
      if (rango.desde) sp.set('desde', rango.desde)
      if (rango.hasta) sp.set('hasta', rango.hasta)
    }
    if (pagina > 1) sp.set('pagina', String(pagina))
    startTransition(() => router.replace(`${pathname}?${sp.toString()}`, { scroll: false }))
  }

  const aplicarRango = (nuevoDesde: string, nuevoHasta: string, todo = false) => {
    setDesdeState(nuevoDesde)
    setHastaState(nuevoHasta)
    setExportarTodoState(todo)
    navegar({ desde: nuevoDesde, hasta: nuevoHasta, todo })
  }
  const [tipoReporte, setTipoReporte] = useState<TipoReporteUI>('programacion') // por defecto: solo los turnos

  const obtenerBaseMesSeleccionado = () => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
      const [y, m] = desde.split('-').map(Number)
      return new Date(y, m - 1, 1)
    }
    return new Date()
  }

  const setUltimoMes = () => {
    aplicarRango(format(subMonths(new Date(), 1), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd'))
  }

  const setUltimos7Dias = () => {
    aplicarRango(format(subDays(new Date(), 7), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd'))
  }

  const setEsteMes = () => {
    const ahora = new Date()
    aplicarRango(format(startOfMonth(ahora), 'yyyy-MM-dd'), format(endOfMonth(ahora), 'yyyy-MM-dd'))
  }

  const setPrimeraQuincena = () => {
    const base = obtenerBaseMesSeleccionado()
    const ym = format(base, 'yyyy-MM')
    aplicarRango(`${ym}-01`, `${ym}-15`)
  }

  const setSegundaQuincena = () => {
    const base = obtenerBaseMesSeleccionado()
    const ym = format(base, 'yyyy-MM')
    aplicarRango(`${ym}-16`, format(endOfMonth(base), 'yyyy-MM-dd'))
  }

  const setTodoHistorial = () => {
    aplicarRango('', '', true)
  }

  // Construir query string para exportación de PDF y Excel
  const exportQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (exportarTodo) {
      params.set('todo', '1')
    } else {
      if (desde) params.set('desde', desde)
      if (hasta) params.set('hasta', hasta)
    }
    // Siempre explícito: el enlace exporta exactamente el tipo seleccionado
    params.set('tipo', tipoReporte)
    const str = params.toString()
    return str ? `?${str}` : ''
  }, [desde, hasta, exportarTodo, tipoReporte])

  return (
    <div className="space-y-5">
      <PageHeading
        icon={History}
        title="Historial y centro de reportes"
        description="Exportación ejecutiva de programación de turnos, horas extras y auditoría"
        actions={
          <>
            <Button
              asChild
              className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
            >
              <a href={`/api/historial/excel${exportQuery}`}>
                <FileSpreadsheet className="size-4" />
                Exportar Excel (.xlsx)
              </a>
            </Button>
            <Button
              asChild
              className="bg-[#002b49] hover:bg-[#001d32] text-white shadow-xs"
            >
              <a href={`/api/historial/pdf${exportQuery}`}>
                <FileDown className="size-4" />
                Exportar PDF Oficial
              </a>
            </Button>
          </>
        }
      />

      {/* Panel de Configuración de Reportes (PDF / Excel) y Consulta */}
      <Card>
        <CardContent className="pt-5 space-y-5">
          {/* Selector de Tipo de Reporte */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#002b49]">
              1. Formato de contenido a exportar
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {OPCIONES_REPORTE.map((op) => {
                const Icono = op.icon
                const activo = tipoReporte === op.id
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setTipoReporte(op.id)}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      activo
                        ? 'border-[#004884] bg-[#eff6ff] shadow-xs ring-1 ring-[#004884]/25'
                        : 'border-border bg-background hover:bg-muted/50'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                        activo ? 'bg-[#002b49] text-white' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icono className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">
                        {op.titulo}
                      </span>
                      <span className="block text-xs text-muted-foreground leading-snug mt-0.5">
                        {op.subtitulo}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selector de Rango de Fechas */}
          <div className="space-y-3 border-t border-border/70 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-sm font-semibold text-[#002b49] flex items-center gap-1.5">
                <Calendar className="size-4 text-[#004884]" />
                2. Periodo o quincena a exportar
              </Label>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    !exportarTodo &&
                    desde === format(subMonths(new Date(), 1), 'yyyy-MM-dd') &&
                    hasta === format(new Date(), 'yyyy-MM-dd')
                      ? 'default'
                      : 'outline'
                  }
                  onClick={setUltimoMes}
                  className="h-7 text-xs px-2.5"
                >
                  Último mes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={setPrimeraQuincena}
                  className="h-7 text-xs px-2.5"
                >
                  1ra Quincena (1–15)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={setSegundaQuincena}
                  className="h-7 text-xs px-2.5"
                >
                  2da Quincena (16–Fin)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={setEsteMes}
                  className="h-7 text-xs px-2.5"
                >
                  Este mes completo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={setUltimos7Dias}
                  className="h-7 text-xs px-2.5"
                >
                  Últimos 7 días
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={exportarTodo ? 'default' : 'outline'}
                  onClick={setTodoHistorial}
                  className="h-7 text-xs px-2.5"
                >
                  Todo el historial
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
              <div className="space-y-1">
                <Label htmlFor="export-desde" className="text-xs text-muted-foreground">
                  Desde fecha específica
                </Label>
                <Input
                  id="export-desde"
                  type="date"
                  value={desde}
                  onChange={(e) => aplicarRango(e.target.value, hasta)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="export-hasta" className="text-xs text-muted-foreground">
                  Hasta fecha específica
                </Label>
                <Input
                  id="export-hasta"
                  type="date"
                  value={hasta}
                  onChange={(e) => aplicarRango(desde, e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={setUltimoMes}
                  className="h-9 gap-1.5 text-xs text-muted-foreground"
                >
                  <RotateCcw className="size-3.5" />
                  Restablecer al último mes
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={FileText}
          label={exportarTodo ? 'Movimientos en todo el historial' : 'Movimientos en el rango'}
          value={resumen.total}
        />
        <StatCard
          icon={Layers}
          label="Asignaciones creadas en rango"
          value={resumen.creaciones}
        />
        <StatCard
          icon={History}
          label="Movimientos de turno extra"
          value={resumen.extras}
        />
      </div>

      <Card>
        <SectionHeading
          icon={History}
          title="Registro de auditoría"
          description={
            exportarTodo
              ? 'Mostrando todo el historial disponible.'
              : `Mostrando y exportando registros desde ${desde || 'el inicio'} hasta ${hasta || 'hoy'}.`
          }
        />
        <CardContent>
          {snapshots.length === 0 ? (
            <EmptyState
              title="No hay registros en este rango de fechas"
              description="Selecciona otras fechas o haz clic en 'Todo el historial' para consultar registros anteriores."
              action={
                <Button type="button" variant="outline" onClick={setTodoHistorial}>
                  Ver todo el historial
                </Button>
              }
            />
          ) : (
            <div className={`overflow-x-auto ${cargando ? 'opacity-60' : ''}`} aria-busy={cargando}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha de registro</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Trabajador</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Turno / horario</TableHead>
                    <TableHead>Extra</TableHead>
                    <TableHead>Registrado por</TableHead>
                    <TableHead>Detalle / Fecha Turno</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((snap) => (
                    <TableRow key={snap.id}>
                      <TableCell className="whitespace-nowrap font-medium text-sm">
                        {format(new Date(snap.fechaGuardado), 'dd MMM yyyy, HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={(accionConfig[snap.accion] ?? accionConfig.CREACION).variant}
                          className={
                            snap.accion === 'ELIMINACION'
                              ? 'status-error'
                              : snap.accion === 'EDICION'
                                ? 'status-info'
                                : 'status-success'
                          }
                        >
                          {(accionConfig[snap.accion] ?? accionConfig.CREACION).label}
                        </Badge>
                      </TableCell>
                      <TableCell>{snap.nombreTrabajador}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{snap.areaTrabajo}</TableCell>
                      <TableCell className="text-sm">{snap.vehiculoPlaca}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        <span className="block text-xs text-muted-foreground">
                          {snap.tipoTurno === 'NOCTURNO' ? 'Nocturno' : 'Diurno'}
                        </span>
                        {horarioConfig[snap.hora] ?? snap.hora}
                      </TableCell>
                      <TableCell>
                        {snap.esTurnoExtra ? (
                          <Badge variant="outline" className="status-warning">
                            Extra
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{snap.usuarioResponsable}</TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground min-w-[220px] max-w-[320px] whitespace-normal"
                        title={snap.comentario || ''}
                      >
                        {snap.comentario}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {paginacion.totalPaginas > 1 && (
            <nav
              aria-label="Paginación del historial"
              className="mt-4 flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row"
            >
              <span>
                Registros {(paginacion.pagina - 1) * paginacion.porPagina + 1}–
                {(paginacion.pagina - 1) * paginacion.porPagina + snapshots.length} de {resumen.total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={cargando || paginacion.pagina <= 1}
                  onClick={() => navegar({ desde, hasta, todo: exportarTodo }, paginacion.pagina - 1)}
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Anterior
                </Button>
                <span aria-live="polite">
                  Página {paginacion.pagina} de {paginacion.totalPaginas}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={cargando || paginacion.pagina >= paginacion.totalPaginas}
                  onClick={() => navegar({ desde, hasta, todo: exportarTodo }, paginacion.pagina + 1)}
                >
                  Siguiente
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </nav>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
