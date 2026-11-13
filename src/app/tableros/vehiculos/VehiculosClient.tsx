'use client'

import { useState, useEffect, useRef } from 'react'
import { useDashboardAction } from '@/components/dashboard/feedback'
import { PageHeading, SectionHeading, StatCard, EmptyState } from '@/components/dashboard/presentation'
import { crearVehiculo, actualizarVehiculo, eliminarVehiculo, reactivarVehiculo } from './actions'
import { BotonReactivar } from '@/components/dashboard/reactivar'
import {
  ESTADOS_VEHICULO,
  ESTADO_VEHICULO_CONFIG,
  CATEGORIAS_ESTADO_VEHICULO,
  obtenerEstadoVehiculoInfo,
  type EstadoVehiculoKey,
} from '@/lib/estados-vehiculo'
import { TipoVehiculo } from '@prisma/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/dashboard/ui'
import {
  LoaderCircle,
  Save,
  List,
  Truck,
  Wrench,
  Ban,
  CheckCircle2,
  PlusCircle,
  Pencil,
  Trash2,
  Search,
} from 'lucide-react'

type Vehiculo = {
  id: string
  codigo: string
  tipo: TipoVehiculo
  noPersonas: number
  estado: string
}

function EditarVehiculoDialog({ vehiculo }: { vehiculo: Vehiculo }) {
  const [open, setOpen] = useState(false)
  const [error, action, isPending] = useDashboardAction(
    actualizarVehiculo,
    'Datos y estado del vehículo actualizados.',
  )
  const wasPending = useRef(false)

  const estadoInicial = obtenerEstadoVehiculoInfo(vehiculo.estado).key
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoVehiculoKey>(estadoInicial)

  // Al abrir el diálogo, partimos siempre del estado actual guardado del vehículo
  const cambiarApertura = (abrir: boolean) => {
    if (abrir) setEstadoSeleccionado(obtenerEstadoVehiculoInfo(vehiculo.estado).key)
    setOpen(abrir)
  }

  useEffect(() => {
    if (wasPending.current && !isPending && !error) {
      setOpen(false)
    }
    wasPending.current = isPending
  }, [isPending, error])

  const infoActual = ESTADO_VEHICULO_CONFIG[estadoSeleccionado]
  const categoriaActual = CATEGORIAS_ESTADO_VEHICULO[infoActual.categoria]

  return (
    <Dialog open={open} onOpenChange={cambiarApertura}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Editar unidad y estado" aria-label="Editar vehículo">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar unidad {vehiculo.codigo}</DialogTitle>
          <DialogDescription>
            Actualiza las características técnicas y el estado operativo del vehículo.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={vehiculo.id} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor={`codigo-${vehiculo.id}`}>Código de Unidad</Label>
              <Input
                id={`codigo-${vehiculo.id}`}
                name="codigo"
                defaultValue={vehiculo.codigo}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`tipo-${vehiculo.id}`}>Tipo de Vehículo</Label>
              <Select name="tipo" defaultValue={vehiculo.tipo}>
                <SelectTrigger id={`tipo-${vehiculo.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CARRO">Carro</SelectItem>
                  <SelectItem value="CAMION">Camión</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`personas-${vehiculo.id}`}>Capacidad (Personas)</Label>
              <Input
                id={`personas-${vehiculo.id}`}
                name="noPersonas"
                type="number"
                min="1"
                max="10"
                defaultValue={vehiculo.noPersonas}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`estado-vehiculo-${vehiculo.id}`}>Estado de la unidad</Label>
            <Select
              name="estado"
              value={estadoSeleccionado}
              onValueChange={(val) => setEstadoSeleccionado(val as EstadoVehiculoKey)}
            >
              <SelectTrigger id={`estado-vehiculo-${vehiculo.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>🟢 Estados de Disponibilidad Operativa</SelectLabel>
                  <SelectItem value={ESTADOS_VEHICULO.DISPONIBLE}>
                    🟢 Disponible
                  </SelectItem>
                </SelectGroup>

                <SelectSeparator />

                <SelectGroup>
                  <SelectLabel>🟡 Estados de Mantenimiento y Revisión</SelectLabel>
                  <SelectItem value={ESTADOS_VEHICULO.EN_TALLER}>
                    🟡 En Taller / Mantenimiento
                  </SelectItem>
                  <SelectItem value={ESTADOS_VEHICULO.EN_INSPECCION}>
                    🟡 En Inspección
                  </SelectItem>
                </SelectGroup>

                <SelectSeparator />

                <SelectGroup>
                  <SelectLabel>🔴 Estados de Transición Comercial e Inactividad</SelectLabel>
                  <SelectItem value={ESTADOS_VEHICULO.VENDIDO}>
                    🔴 Vendido
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs space-y-1">
              <p className="font-semibold text-foreground">{categoriaActual.titulo}</p>
              <p className="text-muted-foreground leading-relaxed">{infoActual.descripcion}</p>
              <p className="text-[11px] text-muted-foreground pt-0.5">
                Nota: Únicamente los vehículos en estado <strong>Disponible</strong> aparecen habilitados para asignar turnos o cuadrillas.
              </p>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              {error}
            </p>
          )}

          <DialogFooter className="dashboard-form-footer">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
              {isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EliminarVehiculoDialog({ vehiculo }: { vehiculo: Vehiculo }) {
  const [open, setOpen] = useState(false)
  const [error, action, isPending] = useDashboardAction(
    eliminarVehiculo,
    'Unidad pasada a Dado de Baja / Chatarra.',
  )
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !isPending && !error) {
      setOpen(false)
    }
    wasPending.current = isPending
  }, [isPending, error])

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="icon"
          title="Dar de baja / Chatarra"
          aria-label="Dar de baja vehículo"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Dar de baja la unidad {vehiculo.codigo}?</AlertDialogTitle>
          <AlertDialogDescription>
            El vehículo <strong>no se borrará de la base de datos</strong>. Su estado cambiará a{' '}
            <strong>Dado de Baja / Chatarra</strong>, conservará todo su historial de turnos para
            fines de auditoría, liberará a los trabajadores que la tengan asignada y dejará de
            aparecer al programar nuevos turnos.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p role="alert" className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <form action={action}>
            <input type="hidden" name="id" value={vehiculo.id} />
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
              {isPending ? 'Procesando…' : 'Sí, dar de baja'}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function VehiculosClient({ vehiculos = [] }: { vehiculos?: Vehiculo[] }) {
  const [error, action, isPending] = useDashboardAction(crearVehiculo, 'Vehículo guardado correctamente.')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS')

  const totalDisponibles = vehiculos.filter(
    (v) => obtenerEstadoVehiculoInfo(v.estado).categoria === 'OPERATIVA',
  ).length
  const totalMantenimiento = vehiculos.filter(
    (v) => obtenerEstadoVehiculoInfo(v.estado).categoria === 'MANTENIMIENTO',
  ).length
  const totalInactivos = vehiculos.filter(
    (v) => obtenerEstadoVehiculoInfo(v.estado).categoria === 'INACTIVIDAD',
  ).length

  const vehiculosFiltrados = vehiculos.filter((v) => {
    const coincideCodigo = v.codigo.toLowerCase().includes(busqueda.trim().toLowerCase())
    if (!coincideCodigo) return false

    const info = obtenerEstadoVehiculoInfo(v.estado)
    if (filtroEstado === 'TODOS') return true
    if (filtroEstado === 'CAT_OPERATIVA') return info.categoria === 'OPERATIVA'
    if (filtroEstado === 'CAT_MANTENIMIENTO') return info.categoria === 'MANTENIMIENTO'
    if (filtroEstado === 'CAT_INACTIVIDAD') return info.categoria === 'INACTIVIDAD'
    return info.key === filtroEstado
  })

  return (
    <div className="space-y-5">
      {/* ── Encabezado ── */}
      <PageHeading
        icon={Truck}
        title="Vehículos"
        description="Gestión de flota, disponibilidad operativa, mantenimiento y bajas de unidades"
      />

      {/* ── Tarjetas de resumen ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Disponibles (Operativos)" value={totalDisponibles} />
        <StatCard icon={Wrench} label="En mantenimiento / revisión" value={totalMantenimiento} />
        <StatCard icon={Ban} label="Inactivos / Vendidos / Baja" value={totalInactivos} />
        <StatCard icon={Truck} label="Flota total registrada" value={vehiculos.length} />
      </div>

      {/* ── Formulario de creación (sin selector de estado: por defecto Disponible) ── */}
      <Card>
        <SectionHeading
          icon={PlusCircle}
          title="Nuevo vehículo"
          description="Registra una nueva unidad (formato A-XXX). Todo vehículo nuevo ingresa automáticamente en estado Disponible."
        />
        <CardContent>
          <form id="new-vehicle" action={action} className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="codigo">Código de Unidad</Label>
              <Input
                id="codigo"
                name="codigo"
                placeholder="Ej. A-111"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo de Vehículo</Label>
              <Select name="tipo" defaultValue="CARRO">
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CARRO">Carro</SelectItem>
                  <SelectItem value="CAMION">Camión</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="noPersonas">Capacidad (Personas)</Label>
              <Input
                id="noPersonas"
                name="noPersonas"
                type="number"
                min="1"
                max="10"
                defaultValue="3"
                required
              />
            </div>

            {error && (
              <div className="sm:col-span-3">
                <p role="alert" className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                  {error}
                </p>
              </div>
            )}

            <div className="sm:col-span-3 xl:col-span-1 xl:col-start-4 xl:row-start-1 flex justify-end">
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
                {isPending ? 'Guardando unidad…' : 'Guardar vehículo'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Tabla de vehículos ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="size-5 text-primary" />
            Flota registrada
          </CardTitle>
          <CardDescription>
            Gestiona la situación operativa, mantenimientos, revisiones y bajas de las unidades registradas.
          </CardDescription>

          <div className="flex flex-col sm:flex-row gap-3 pt-2 sm:items-end">
            <div className="space-y-1.5 flex-1 max-w-sm">
              <Label htmlFor="vehicle-search">Buscar unidad</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="vehicle-search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por código (ej. A-111)..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5 w-full sm:w-72">
              <Label htmlFor="vehicle-status-filter">Filtrar por estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger id="vehicle-status-filter">
                  <SelectValue placeholder="Filtrar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas las unidades</SelectItem>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Por categoría</SelectLabel>
                    <SelectItem value="CAT_OPERATIVA">🟢 Disponibilidad Operativa</SelectItem>
                    <SelectItem value="CAT_MANTENIMIENTO">🟡 Mantenimiento y Revisión</SelectItem>
                    <SelectItem value="CAT_INACTIVIDAD">🔴 Inactivos</SelectItem>
                  </SelectGroup>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Estado específico</SelectLabel>
                    <SelectItem value={ESTADOS_VEHICULO.DISPONIBLE}>🟢 Disponible</SelectItem>
                    <SelectItem value={ESTADOS_VEHICULO.EN_TALLER}>🟡 En Taller / Mantenimiento</SelectItem>
                    <SelectItem value={ESTADOS_VEHICULO.EN_INSPECCION}>🟡 En Inspección</SelectItem>
                    <SelectItem value={ESTADOS_VEHICULO.VENDIDO}>🔴 Vendido</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {vehiculosFiltrados.length === 0 ? (
            <EmptyState
              title={vehiculos.length === 0 ? 'Aún no hay vehículos registrados' : 'No encontramos coincidencias'}
              description={
                vehiculos.length === 0
                  ? 'Añade una unidad y su capacidad para comenzar a asignar cuadrillas.'
                  : 'Prueba con otro código o cambia el filtro de estado.'
              }
              action={
                vehiculos.length === 0 ? (
                  <Button asChild variant="outline">
                    <a href="#new-vehicle">Registrar un vehículo</a>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setBusqueda('')
                      setFiltroEstado('TODOS')
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cuadrilla (Capacidad)</TableHead>
                    <TableHead>Estado de la unidad</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehiculosFiltrados.map((vehiculo) => {
                    const info = obtenerEstadoVehiculoInfo(vehiculo.estado)
                    const esDadoDeBaja = info.key === ESTADOS_VEHICULO.DADO_DE_BAJA

                    return (
                      <TableRow key={vehiculo.id} className={esDadoDeBaja ? 'opacity-65' : ''}>
                        <TableCell className="font-medium">{vehiculo.codigo}</TableCell>
                        <TableCell>
                          <Badge variant={vehiculo.tipo === 'CAMION' ? 'default' : 'secondary'}>
                            {vehiculo.tipo === 'CAMION' ? 'Camión' : 'Carro'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {vehiculo.noPersonas} personas
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={info.badgeVariant}
                            className={info.badgeClassName}
                            title={info.descripcion}
                          >
                            {info.indicador} {info.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <EditarVehiculoDialog vehiculo={vehiculo} />
                            {esDadoDeBaja ? (
                              <BotonReactivar
                                id={vehiculo.id}
                                accion={reactivarVehiculo}
                                etiqueta={`Reactivar unidad ${vehiculo.codigo}`}
                                mensajeExito={`Unidad ${vehiculo.codigo} disponible de nuevo.`}
                              />
                            ) : (
                              <EliminarVehiculoDialog vehiculo={vehiculo} />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
