'use client'

import { useState, useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Calendar as CalendarIcon,
  Plus,
  Users,
  Truck,
  Lock,
} from 'lucide-react'
import { isPastShiftDate } from '@/lib/form-validation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/dashboard/ui'
import type { Trabajador, Vehiculo, Area } from '@prisma/client'
import type { TurnoLista as Turno } from '@/lib/turnos-consulta'

interface CalendarViewProps {
  turnos: Turno[]
  trabajadores: Trabajador[]
  vehiculos: Vehiculo[]
  areas: Area[]
  esAdmin: boolean
  /** Mes visible (lo controla el padre para cargar sus turnos del servidor) */
  mes: Date
  onMesChange: (mes: Date) => void
  onSelectTurno: (turno: Turno) => void
  onSelectFecha?: (fechaStr: string) => void
}

const horarioCorto: Record<string, string> = {
  DIURNO_06_18: '06-18h',
  DIURNO_07_19: '07-19h',
  DIURNO_08_20: '08-20h',
  DIURNO_09_21: '09-21h',
  NOCTURNO_19_07: '19-07h',
  NOCTURNO_20_08: '20-08h',
  NOCTURNO_21_09: '21-09h',
}

const DIAS_SEMANA = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

export function CalendarView({
  turnos,
  trabajadores,
  vehiculos,
  esAdmin,
  onSelectTurno,
  onSelectFecha,
  mes,
  onMesChange,
}: CalendarViewProps) {
  const currentMonth = mes
  const [filtroTrabajador, setFiltroTrabajador] = useState<string>('todos')
  const [filtroVehiculo, setFiltroVehiculo] = useState<string>('todos')

  // Día seleccionado para ver todos los turnos en modal detallado
  const [diaDetalle, setDiaDetalle] = useState<Date | null>(null)

  // Navegación de mes
  const anteriorMes = () => onMesChange(subMonths(currentMonth, 1))
  const siguienteMes = () => onMesChange(addMonths(currentMonth, 1))
  const irAHoy = () => onMesChange(new Date())

  // Filtrado de turnos
  const turnosFiltrados = useMemo(() => {
    return turnos.filter((t) => {
      if (filtroTrabajador !== 'todos' && t.asignadoId !== filtroTrabajador) return false
      if (filtroVehiculo !== 'todos' && t.vehiculoId !== filtroVehiculo) return false
      return true
    })
  }, [turnos, filtroTrabajador, filtroVehiculo])

  // Días de la cuadrícula
  const daysInGrid = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const start = startOfWeek(monthStart, { weekStartsOn: 1 })
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Turnos agrupados por día
  const turnosPorDia = useMemo(() => {
    const map = new Map<string, Turno[]>()
    for (const t of turnosFiltrados) {
      const fechaKey = format(new Date(t.fecha), 'yyyy-MM-dd')
      const lista = map.get(fechaKey) || []
      lista.push(t)
      map.set(fechaKey, lista)
    }
    return map
  }, [turnosFiltrados])

  // Turnos del día en modal de detalle
  const turnosDiaDetalle = useMemo(() => {
    if (!diaDetalle) return []
    const key = format(diaDetalle, 'yyyy-MM-dd')
    return turnosPorDia.get(key) || []
  }, [diaDetalle, turnosPorDia])

  return (
    <div className="space-y-4">
      {/* Barra de control: Mes actual, Filtros rápidos y Navegación */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-white p-3.5 shadow-xs">
        {/* Controles de Mes */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={anteriorMes}
            aria-label="Mes anterior"
            className="size-8"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <h2 className="text-base sm:text-lg font-bold text-[#002b49] min-w-[160px] text-center capitalize tracking-tight">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h2>

          <Button
            variant="outline"
            size="icon"
            onClick={siguienteMes}
            aria-label="Mes siguiente"
            className="size-8"
          >
            <ChevronRight className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={irAHoy}
            className="text-xs font-semibold text-[#004884] hover:bg-sky-50"
          >
            Hoy
          </Button>
        </div>

        {/* Filtros de Cuadrilla en Calendario */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Trabajador */}
          <div className="w-40 sm:w-44">
            <Select value={filtroTrabajador} onValueChange={setFiltroTrabajador}>
              <SelectTrigger className="h-8 text-xs">
                <Users className="size-3.5 text-muted-foreground mr-1.5 shrink-0" />
                <SelectValue placeholder="Trabajador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los trabajadores</SelectItem>
                {trabajadores.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Vehículo */}
          <div className="w-36 sm:w-40">
            <Select value={filtroVehiculo} onValueChange={setFiltroVehiculo}>
              <SelectTrigger className="h-8 text-xs">
                <Truck className="size-3.5 text-muted-foreground mr-1.5 shrink-0" />
                <SelectValue placeholder="Vehículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los vehículos</SelectItem>
                {vehiculos.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.codigo} ({v.tipo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(filtroTrabajador !== 'todos' || filtroVehiculo !== 'todos') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFiltroTrabajador('todos')
                setFiltroVehiculo('todos')
              }}
              className="text-xs h-8 text-muted-foreground hover:text-foreground"
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Cuadrícula del Calendario */}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-xs">
        {/* Cabecera de días de la semana */}
        <div className="grid grid-cols-7 border-b border-border bg-slate-50/90 text-center text-[11px] font-bold text-slate-600">
          {DIAS_SEMANA.map((dia, i) => (
            <div
              key={dia}
              className={`py-2.5 ${i >= 5 ? 'bg-slate-100/60 text-slate-500' : ''}`}
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Celdas de los días */}
        <div className="grid grid-cols-7 divide-x divide-y divide-border/70">
          {daysInGrid.map((day) => {
            const fechaKey = format(day, 'yyyy-MM-dd')
            const turnosDelDia = turnosPorDia.get(fechaKey) || []
            const esMesActual = isSameMonth(day, currentMonth)
            const esDiaActual = isToday(day)
            const MAX_VISIBLE = 3
            const turnosVisibles = turnosDelDia.slice(0, MAX_VISIBLE)
            const turnosRestantes = turnosDelDia.length - MAX_VISIBLE

            return (
              <div
                key={day.toISOString()}
                className={`group relative min-h-[115px] sm:min-h-[135px] p-1.5 transition-colors flex flex-col justify-between ${
                  !esMesActual ? 'bg-slate-50/50 text-slate-300' : 'bg-white hover:bg-slate-50/60'
                }`}
              >
                {/* Cabecera del día */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-semibold size-6 rounded-full ${
                      esDiaActual
                        ? 'bg-[#003B63] text-white shadow-xs font-bold'
                        : !esMesActual
                        ? 'text-slate-300'
                        : 'text-slate-700'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>

                  {esAdmin && esMesActual && onSelectFecha && !isPastShiftDate(fechaKey) && (
                    <button
                      type="button"
                      onClick={() => onSelectFecha(fechaKey)}
                      title={`Programar turno para ${format(day, 'dd/MM/yyyy')}`}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-[#004884] rounded-md hover:bg-slate-100"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Lista de Turnos / Chips */}
                <div className="flex-1 space-y-1">
                  {turnosVisibles.map((t) => {
                    const esNocturno = t.tipoTurno === 'NOCTURNO'

                    const chipStyle = esNocturno
                      ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700'
                      : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100'

                    const nombreTrabajador = t.asignadoNombre ?? t.asignado?.nombre ?? 'Sin asignar'
                    const primerNombre = nombreTrabajador.split(' ')[0]
                    const vehiculo = t.vehiculoCodigo ?? t.vehiculo?.codigo ?? ''
                    const turnoPasado = isPastShiftDate(t.fecha)

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (turnoPasado) {
                            setDiaDetalle(day)
                          } else {
                            onSelectTurno(t)
                          }
                        }}
                        className={`w-full text-left rounded-md px-1.5 py-0.5 text-[11px] font-medium border transition-all truncate flex items-center justify-between gap-1 shadow-2xs ${chipStyle}`}
                        title={
                          turnoPasado
                            ? `${nombreTrabajador} · ${t.areaNombre ?? ''} · ${t.vehiculoCodigo ?? ''} (Turno cerrado - fecha cumplida)`
                            : `${nombreTrabajador} · ${t.areaNombre ?? ''} · ${t.vehiculoCodigo ?? ''}`
                        }
                      >
                        <span className="truncate flex items-center gap-1">
                          {esNocturno ? (
                            <Moon className="size-2.5 shrink-0 text-sky-300" />
                          ) : (
                            <Sun className="size-2.5 shrink-0 text-amber-500" />
                          )}
                          <span className="truncate">
                            {vehiculo ? `${vehiculo} · ` : ''}{primerNombre}
                          </span>
                        </span>
                        <span className="flex items-center gap-0.5 shrink-0">
                          {t.esTurnoExtra && (
                            <span className="text-[9px] font-bold text-amber-400">★</span>
                          )}
                          {turnoPasado && (
                            <Lock className="size-2.5 opacity-60" />
                          )}
                        </span>
                      </button>
                    )
                  })}

                  {/* Indicador de más turnos */}
                  {turnosRestantes > 0 && (
                    <button
                      type="button"
                      onClick={() => setDiaDetalle(day)}
                      className="w-full text-center rounded-md bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      +{turnosRestantes} más
                    </button>
                  )}
                </div>

                {/* Si hay turnos en el día, botón discreto para ver el resumen completo del día */}
                {turnosDelDia.length > 0 && (
                  <div className="pt-1 text-right">
                    <button
                      type="button"
                      onClick={() => setDiaDetalle(day)}
                      className="text-[10px] font-medium text-slate-400 hover:text-[#004884] transition-colors"
                    >
                      {turnosDelDia.length} {turnosDelDia.length === 1 ? 'turno' : 'turnos'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Leyenda de Referencia de Colores */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-slate-50/70 p-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-700">Leyenda:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-sky-200 border border-sky-400" />
            Diurno
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-slate-800" />
            Nocturno
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="font-bold text-amber-500 text-sm">★</span>
            Turno Extra
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Haz clic en cualquier turno para editarlo o consultar su detalle.
        </div>
      </div>

      {/* Modal Detallado de Turnos por Día */}
      <Dialog open={Boolean(diaDetalle)} onOpenChange={(open) => !open && setDiaDetalle(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-[#002b49]">
              <CalendarIcon className="size-5 text-[#004884]" />
              <span>
                Turnos del {diaDetalle ? format(diaDetalle, "EEEE, dd 'de' MMMM yyyy", { locale: es }) : ''}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {turnosDiaDetalle.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No hay turnos registrados en este día.
              </p>
            ) : (
              turnosDiaDetalle.map((t) => {
                const turnoPasado = isPastShiftDate(t.fecha)
                return (
                <div
                  key={t.id}
                  onClick={() => {
                    if (!turnoPasado) {
                      setDiaDetalle(null)
                      onSelectTurno(t)
                    }
                  }}
                  className={`rounded-xl border border-slate-200/90 bg-white p-3 transition-all flex items-center justify-between gap-3 ${
                    turnoPasado
                      ? 'opacity-90 cursor-default'
                      : 'cursor-pointer hover:border-[#004884] hover:shadow-sm'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800 truncate">
                        {t.asignadoNombre ?? t.asignado?.nombre ?? 'Sin asignar'}
                      </span>
                      {t.esTurnoExtra && (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                          Turno Extra
                        </Badge>
                      )}
                      {turnoPasado && (
                        <Badge variant="outline" className="text-[10px] gap-1 text-slate-500">
                          <Lock className="size-2.5" />
                          Cerrado
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 text-[#004884] font-medium">
                        <Truck className="size-3" />
                        {t.vehiculoCodigo ?? t.vehiculo?.codigo ?? 'Sin vehículo'}
                      </span>
                      <span>·</span>
                      <span>{t.areaNombre ?? t.area?.nombre ?? 'Área general'}</span>
                      <span>·</span>
                      <span>{horarioCorto[t.horario] ?? t.horario}</span>
                    </div>
                    {t.comentario && (
                      <p className="text-xs text-slate-400 italic truncate">
                        «{t.comentario}»
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <Badge variant="default" className="text-xs">
                      {t.tipoTurno === 'NOCTURNO' ? 'Nocturno' : 'Diurno'}
                    </Badge>
                  </div>
                </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

