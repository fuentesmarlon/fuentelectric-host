'use client'

import { useState } from 'react'
import {
  Search,
  Filter,
  X,
  Calendar,
  Users,
  Truck,
  MapPin,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/dashboard/ui'
import type { Trabajador, Vehiculo, Area } from '@prisma/client'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export interface FiltrosState {
  texto: string
  desde: string
  hasta: string
  trabajadorId: string
  vehiculoId: string
  areaId: string
  tipoTurno: string
  horario: string
  extra: string // 'todos' | 'SI' | 'NO'
}

export const FILTROS_INICIALES: FiltrosState = {
  texto: '',
  desde: '',
  hasta: '',
  trabajadorId: 'todos',
  vehiculoId: 'todos',
  areaId: 'todos',
  tipoTurno: 'todos',
  horario: 'todos',
  extra: 'todos',
}

interface FiltrosAvanzadosProps {
  filtros: FiltrosState
  onFiltrosChange: (nuevosFiltros: FiltrosState) => void
  trabajadores: Trabajador[]
  vehiculos: Vehiculo[]
  areas: Area[]
  totalFiltrados: number
  totalOriginal: number
}

const horarioLabels: Record<string, string> = {
  DIURNO_06_18: '06:00 – 18:00',
  DIURNO_07_19: '07:00 – 19:00',
  DIURNO_08_20: '08:00 – 20:00',
  DIURNO_09_21: '09:00 – 21:00',
  NOCTURNO_19_07: '19:00 – 07:00',
  NOCTURNO_20_08: '20:00 – 08:00',
  NOCTURNO_21_09: '21:00 – 09:00',
}

export function FiltrosAvanzados({
  filtros,
  onFiltrosChange,
  trabajadores,
  vehiculos,
  areas,
  totalFiltrados,
  totalOriginal,
}: FiltrosAvanzadosProps) {
  const [expandido, setExpandido] = useState(false)

  // Contar cuántos filtros están activos (excluyendo 'todos' y vacíos)
  const filtrosActivosCount = Object.entries(filtros).filter(([key, val]) => {
    if (key === 'texto') return Boolean(val.trim())
    if (key === 'desde' || key === 'hasta') return Boolean(val)
    return val !== 'todos'
  }).length

  const hayFiltrosActivos = filtrosActivosCount > 0

  const handleUpdate = (campo: keyof FiltrosState, valor: string) => {
    onFiltrosChange({
      ...filtros,
      [campo]: valor,
    })
  }

  const handleLimpiarFiltros = () => {
    onFiltrosChange(FILTROS_INICIALES)
  }

  // Atajos rápidos para rangos de fechas
  const setRangoHoy = () => {
    const hoy = format(new Date(), 'yyyy-MM-dd')
    onFiltrosChange({ ...filtros, desde: hoy, hasta: hoy })
  }

  const setRangoEstaSemana = () => {
    const ahora = new Date()
    const ini = format(startOfWeek(ahora, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const fin = format(endOfWeek(ahora, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    onFiltrosChange({ ...filtros, desde: ini, hasta: fin })
  }

  const setRangoEsteMes = () => {
    const ahora = new Date()
    const ini = format(startOfMonth(ahora), 'yyyy-MM-dd')
    const fin = format(endOfMonth(ahora), 'yyyy-MM-dd')
    onFiltrosChange({ ...filtros, desde: ini, hasta: fin })
  }

  return (
    <div className="rounded-xl border border-border bg-white p-3.5 shadow-xs space-y-3">
      {/* Barra principal de búsqueda rápida y botón de expandir */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por trabajador, vehículo, área o comentario…"
            value={filtros.texto}
            onChange={(e) => handleUpdate('texto', e.target.value)}
            className="pl-9 pr-8 text-sm h-9 bg-slate-50/50"
          />
          {filtros.texto && (
            <button
              type="button"
              onClick={() => handleUpdate('texto', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-800"
              aria-label="Limpiar búsqueda"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant={expandido ? 'default' : 'outline'}
            size="sm"
            onClick={() => setExpandido(!expandido)}
            className={`h-9 gap-1.5 text-xs font-semibold ${
              expandido ? 'bg-[#002b49] text-white' : ''
            }`}
          >
            <Filter className="size-3.5" />
            Filtros Avanzados
            {filtrosActivosCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ED8B00] text-slate-950">
                {filtrosActivosCount}
              </span>
            )}
            {expandido ? <ChevronUp className="size-3.5 ml-0.5" /> : <ChevronDown className="size-3.5 ml-0.5" />}
          </Button>

          {hayFiltrosActivos && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLimpiarFiltros}
              className="h-9 gap-1 text-xs text-muted-foreground hover:text-rose-600"
            >
              <RotateCcw className="size-3.5" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Panel Expandible de Filtros Detallados */}
      {expandido && (
        <div className="pt-3 border-t border-border/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Rango de Fechas */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3 text-[#004884]" />
                Rango de Fechas
              </span>
              <span className="flex items-center gap-1 text-[11px] font-normal">
                <button
                  type="button"
                  onClick={setRangoHoy}
                  className="text-sky-700 hover:underline px-1 py-0.5"
                >
                  Hoy
                </button>
                ·
                <button
                  type="button"
                  onClick={setRangoEstaSemana}
                  className="text-sky-700 hover:underline px-1 py-0.5"
                >
                  Semana
                </button>
                ·
                <button
                  type="button"
                  onClick={setRangoEsteMes}
                  className="text-sky-700 hover:underline px-1 py-0.5"
                >
                  Mes
                </button>
              </span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={filtros.desde}
                onChange={(e) => handleUpdate('desde', e.target.value)}
                className="h-8 text-xs"
                placeholder="Desde"
              />
              <Input
                type="date"
                value={filtros.hasta}
                onChange={(e) => handleUpdate('hasta', e.target.value)}
                className="h-8 text-xs"
                placeholder="Hasta"
              />
            </div>
          </div>

          {/* Filtro Trabajador */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Users className="size-3 text-[#004884]" />
              Trabajador
            </Label>
            <Select
              value={filtros.trabajadorId}
              onValueChange={(val) => handleUpdate('trabajadorId', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos los trabajadores" />
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
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Truck className="size-3 text-[#004884]" />
              Vehículo
            </Label>
            <Select
              value={filtros.vehiculoId}
              onValueChange={(val) => handleUpdate('vehiculoId', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos los vehículos" />
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

          {/* Filtro Área */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <MapPin className="size-3 text-[#004884]" />
              Área Operativa
            </Label>
            <Select
              value={filtros.areaId}
              onValueChange={(val) => handleUpdate('areaId', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas las áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las áreas</SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Tipo Turno */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tipo de Turno</Label>
            <Select
              value={filtros.tipoTurno}
              onValueChange={(val) => handleUpdate('tipoTurno', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="DIURNO">Diurno</SelectItem>
                <SelectItem value="NOCTURNO">Nocturno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Horario Base */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Clock className="size-3 text-[#004884]" />
              Horario Base
            </Label>
            <Select
              value={filtros.horario}
              onValueChange={(val) => handleUpdate('horario', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos los horarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los horarios</SelectItem>
                <SelectItem value="DIURNO_06_18">06:00 – 18:00</SelectItem>
                <SelectItem value="DIURNO_07_19">07:00 – 19:00</SelectItem>
                <SelectItem value="DIURNO_08_20">08:00 – 20:00</SelectItem>
                <SelectItem value="DIURNO_09_21">09:00 – 21:00</SelectItem>
                <SelectItem value="NOCTURNO_19_07">19:00 – 07:00</SelectItem>
                <SelectItem value="NOCTURNO_20_08">20:00 – 08:00</SelectItem>
                <SelectItem value="NOCTURNO_21_09">21:00 – 09:00</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Turno Extra */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="size-3 text-[#ED8B00]" />
              Turno Extra
            </Label>
            <Select
              value={filtros.extra}
              onValueChange={(val) => handleUpdate('extra', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los turnos</SelectItem>
                <SelectItem value="SI">Solo horas extras</SelectItem>
                <SelectItem value="NO">Solo turnos regulares</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Barra de Etiquetas (Chips) de Filtros Activos y Conteo */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-slate-700">
            Mostrando <strong className="text-[#002b49] font-bold">{totalFiltrados}</strong> de {totalOriginal} turnos
          </span>

          {/* Chips individuales que se pueden remover */}
          {filtros.desde && (
            <Badge variant="secondary" className="gap-1 text-[11px] font-normal py-0">
              Desde: {filtros.desde}
              <button
                type="button"
                onClick={() => handleUpdate('desde', '')}
                className="hover:text-rose-600"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {filtros.hasta && (
            <Badge variant="secondary" className="gap-1 text-[11px] font-normal py-0">
              Hasta: {filtros.hasta}
              <button
                type="button"
                onClick={() => handleUpdate('hasta', '')}
                className="hover:text-rose-600"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {filtros.trabajadorId !== 'todos' && (
            <Badge variant="secondary" className="gap-1 text-[11px] font-normal py-0">
              {trabajadores.find((t) => t.id === filtros.trabajadorId)?.nombre || 'Trabajador'}
              <button
                type="button"
                onClick={() => handleUpdate('trabajadorId', 'todos')}
                className="hover:text-rose-600"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {filtros.vehiculoId !== 'todos' && (
            <Badge variant="secondary" className="gap-1 text-[11px] font-normal py-0">
              Vehículo: {vehiculos.find((v) => v.id === filtros.vehiculoId)?.codigo || 'Vehículo'}
              <button
                type="button"
                onClick={() => handleUpdate('vehiculoId', 'todos')}
                className="hover:text-rose-600"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {filtros.areaId !== 'todos' && (
            <Badge variant="secondary" className="gap-1 text-[11px] font-normal py-0">
              Área: {areas.find((a) => a.id === filtros.areaId)?.nombre || 'Área'}
              <button
                type="button"
                onClick={() => handleUpdate('areaId', 'todos')}
                className="hover:text-rose-600"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {filtros.tipoTurno !== 'todos' && (
            <Badge variant="secondary" className="gap-1 text-[11px] font-normal py-0">
              Tipo: {filtros.tipoTurno}
              <button
                type="button"
                onClick={() => handleUpdate('tipoTurno', 'todos')}
                className="hover:text-rose-600"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {filtros.horario !== 'todos' && (
            <Badge variant="secondary" className="gap-1 text-[11px] font-normal py-0">
              Horario: {horarioLabels[filtros.horario] || filtros.horario}
              <button
                type="button"
                onClick={() => handleUpdate('horario', 'todos')}
                className="hover:text-rose-600"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {filtros.extra !== 'todos' && (
            <Badge variant="secondary" className="gap-1 text-[11px] font-normal py-0">
              {filtros.extra === 'SI' ? 'Solo Extras' : 'Solo Regulares'}
              <button
                type="button"
                onClick={() => handleUpdate('extra', 'todos')}
                className="hover:text-rose-600"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

