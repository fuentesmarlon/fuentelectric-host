'use client'

import { useDashboardAction } from '@/components/dashboard/feedback'
import { PageHeading, SectionHeading, StatCard, EmptyState } from '@/components/dashboard/presentation'
import { LoaderCircle, Save, List } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { crearTrabajador, actualizarTrabajador, eliminarTrabajador, reactivarTrabajador } from './actions'
import { BotonReactivar } from '@/components/dashboard/reactivar'
import { HorarioBase } from '@prisma/client'
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/dashboard/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/dashboard/ui'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/dashboard/ui'
import { UserPlus, Users, Clock, Truck, Pencil, Trash2, Search, UserX } from 'lucide-react'

// Sentinela para "sin unidad asignada" en los <Select>, ya que Radix no
// permite un SelectItem con value="".
const SIN_UNIDAD = '__sin_unidad__'

type Vehiculo = {
  id: string
  codigo: string
  tipo: string
}

type Trabajador = {
  id: string
  nombre: string
  puesto: string | null
  disponibilidad: string
  horarioEstablecido: HorarioBase
  vehiculoId: string | null
  vehiculo: { id: string; codigo: string } | null
}

const horarioConfig: Record<HorarioBase, string> = {
  [HorarioBase.DIURNO_06_18]: '06:00 – 18:00',
  [HorarioBase.DIURNO_07_19]: '07:00 – 19:00',
  [HorarioBase.DIURNO_08_20]: '08:00 – 20:00',
  [HorarioBase.DIURNO_09_21]: '09:00 – 21:00',
  [HorarioBase.NOCTURNO_19_07]: '19:00 – 07:00',
  [HorarioBase.NOCTURNO_20_08]: '20:00 – 08:00',
  [HorarioBase.NOCTURNO_21_09]: '21:00 – 09:00',
}

const estadoTrabajadorConfig: Record<
  string,
  { label: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }
> = {
  Activo: {
    label: 'Personal (Activo)',
    badgeVariant: 'outline',
    className: 'status-success',
  },
  Incapacidad: {
    label: 'Incapacidad',
    badgeVariant: 'destructive',
    className: 'status-error',
  },
  Vacaciones: {
    label: 'Vacaciones',
    badgeVariant: 'outline',
    className: 'status-info',
  },
  Inactivo: {
    label: 'Inactivo (Baja)',
    badgeVariant: 'secondary',
    className: 'opacity-75',
  },
}

// ── Diálogo de edición (incluye Estado únicamente para trabajadores ya creados) ──
function EditarTrabajadorDialog({
  trabajador,
  vehiculos,
}: {
  trabajador: Trabajador
  vehiculos: Vehiculo[]
}) {
  const [open, setOpen] = useState(false)
  const [error, action, isPending] = useDashboardAction(actualizarTrabajador, 'Datos del trabajador actualizados.')
  const wasPending = useRef(false)

  // Cierra el modal solo cuando el submit terminó SIN error
  useEffect(() => {
    if (wasPending.current && !isPending && !error) {
      setOpen(false)
    }
    wasPending.current = isPending
  }, [isPending, error])

  const estadoInicial = estadoTrabajadorConfig[trabajador.disponibilidad]
    ? trabajador.disponibilidad
    : 'Activo'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Editar trabajador y estado" aria-label="Editar trabajador">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar trabajador</DialogTitle>
          <DialogDescription>
            Actualiza los datos y el estado operativo de {trabajador.nombre}.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={trabajador.id} />

          <div className="space-y-1.5">
            <Label htmlFor={`nombre-${trabajador.id}`}>Nombre completo</Label>
            <Input
              id={`nombre-${trabajador.id}`}
              name="nombre"
              defaultValue={trabajador.nombre}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`puesto-${trabajador.id}`}>Puesto</Label>
            <Input
              id={`puesto-${trabajador.id}`}
              name="puesto"
              defaultValue={trabajador.puesto ?? ''}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`estado-${trabajador.id}`}>Estado del trabajador</Label>
            <Select name="disponibilidad" defaultValue={estadoInicial}>
              <SelectTrigger id={`estado-${trabajador.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Activo">Personal (Activo)</SelectItem>
                <SelectItem value="Incapacidad">Incapacidad</SelectItem>
                <SelectItem value="Vacaciones">Vacaciones</SelectItem>
                {trabajador.disponibilidad === 'Inactivo' && (
                  <SelectItem value="Inactivo">Inactivo (Baja)</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Solo los trabajadores en <strong>Personal (Activo)</strong> aparecerán disponibles al asignar turnos.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`horario-${trabajador.id}`}>Horario establecido</Label>
            <Select name="horarioEstablecido" defaultValue={trabajador.horarioEstablecido}>
              <SelectTrigger id={`horario-${trabajador.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(horarioConfig).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`vehiculo-${trabajador.id}`}>Unidad asignada</Label>
            <Select name="vehiculoId" defaultValue={trabajador.vehiculoId ?? SIN_UNIDAD}>
              <SelectTrigger id={`vehiculo-${trabajador.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_UNIDAD}>Sin unidad asignada</SelectItem>
                {trabajador.vehiculo && !vehiculos.some((v) => v.id === trabajador.vehiculo?.id) && (
                  <SelectItem value={trabajador.vehiculo.id}>
                    {trabajador.vehiculo.codigo} (No disponible actualmente)
                  </SelectItem>
                )}
                {vehiculos.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.codigo} ({v.tipo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

// ── Confirmación de baja lógica (pasa a estado Inactivo sin borrar de BD) ──
function EliminarTrabajadorDialog({ trabajador }: { trabajador: Trabajador }) {
  const [open, setOpen] = useState(false)
  const [error, action, isPending] = useDashboardAction(
    eliminarTrabajador,
    'Trabajador pasado a estado Inactivo.',
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
          title="Eliminar (pasar a inactivo)"
          aria-label="Pasar trabajador a inactivo"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar a {trabajador.nombre} de la lista activa?</AlertDialogTitle>
          <AlertDialogDescription>
            El registro <strong>no se borrará de la base de datos</strong>. Su estado cambiará a{' '}
            <strong>Inactivo</strong>, conservará todos sus turnos históricos y dejará de aparecer
            a la hora de asignar nuevos turnos.
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
            <input type="hidden" name="id" value={trabajador.id} />
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
              {isPending ? 'Procesando…' : 'Sí, pasar a inactivo'}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ── Componente principal ────────────────────────────────────────────
export default function UsuariosClient({
  trabajadores = [],
  vehiculos = [],
}: {
  trabajadores?: Trabajador[]
  vehiculos?: Vehiculo[]
}) {
  const [error, action, isPending] = useDashboardAction(crearTrabajador, 'Trabajador creado correctamente.')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS')

  const totalActivos = trabajadores.filter((t) => t.disponibilidad === 'Activo').length
  const totalAusentes = trabajadores.filter((t) =>
    ['Incapacidad', 'Vacaciones'].includes(t.disponibilidad),
  ).length
  const totalInactivos = trabajadores.filter((t) => t.disponibilidad === 'Inactivo').length

  const trabajadoresFiltrados = trabajadores.filter((t) => {
    const coincideNombre = t.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
    if (!coincideNombre) return false

    if (filtroEstado === 'TODOS') return true
    if (filtroEstado === 'PLANTILLA') return t.disponibilidad !== 'Inactivo'
    return t.disponibilidad === filtroEstado
  })

  return (
    <div className="space-y-5">
      <PageHeading
        icon={Users}
        title="Trabajadores"
        description="Personal de campo, estados operativos y unidades asignadas"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Personal activo" value={totalActivos} />
        <StatCard icon={Clock} label="Vacaciones / Incapacidad" value={totalAusentes} />
        <StatCard icon={UserX} label="Inactivos (Dados de baja)" value={totalInactivos} />
      </div>

      {/* Al crear no se elige estado: todo trabajador nuevo entra como Activo */}
      <Card>
        <SectionHeading
          icon={UserPlus}
          title="Nuevo trabajador"
          description="Registra personal operativo."
        />
        <CardContent>
          <form id="new-worker" action={action} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input id="nombre" name="nombre" placeholder="Ej. Ana García" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="puesto">Puesto</Label>
              <Input id="puesto" name="puesto" placeholder="Ej. Piloto, Liniero..." required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="horarioEstablecido">Horario establecido</Label>
              <Select name="horarioEstablecido" defaultValue={HorarioBase.DIURNO_06_18}>
                <SelectTrigger id="horarioEstablecido">
                  <SelectValue placeholder="Selecciona un horario" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(horarioConfig).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vehiculoId">Unidad asignada</Label>
              <Select name="vehiculoId">
                <SelectTrigger id="vehiculoId">
                  <SelectValue placeholder="Sin unidad asignada" />
                </SelectTrigger>
                <SelectContent>
                  {vehiculos.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.codigo} ({v.tipo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="sm:col-span-2 xl:col-span-4">
                <p role="alert" className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                  {error}
                </p>
              </div>
            )}

            <div className="sm:col-span-2 xl:col-span-4 flex justify-end">
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
                {isPending ? 'Creando trabajador…' : 'Crear trabajador'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Tabla de Trabajadores ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="size-5 text-primary" />
            Trabajadores registrados
          </CardTitle>
          <CardDescription>
            Gestiona el estado operativo (Disponible, Incapacidad o Vacaciones) de los trabajadores creados.
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-3 pt-2 sm:items-end">
            <div className="space-y-1.5 flex-1 max-w-sm">
              <Label htmlFor="worker-search">Buscar trabajador</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="worker-search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5 w-full sm:w-56">
              <Label htmlFor="worker-status-filter">Filtrar por estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger id="worker-status-filter">
                  <SelectValue placeholder="Filtrar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los registros</SelectItem>
                  <SelectItem value="PLANTILLA">Solo personal activo / permisos</SelectItem>
                  <SelectItem value="Incapacidad">En Incapacidad</SelectItem>
                  <SelectItem value="Vacaciones">En Vacaciones</SelectItem>
                  <SelectItem value="Inactivo">Inactivos (Bajas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {trabajadoresFiltrados.length === 0 ? (
            <EmptyState
              title={trabajadores.length === 0 ? 'Aún no hay trabajadores registrados' : 'No encontramos coincidencias'}
              description={
                trabajadores.length === 0
                  ? 'Añade personal de campo para comenzar a programar turnos.'
                  : 'Prueba con otro nombre o cambia el filtro de estado.'
              }
              action={
                trabajadores.length === 0 ? (
                  <Button asChild variant="outline">
                    <a href="#new-worker">Registrar un trabajador</a>
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
                    <TableHead>Nombre</TableHead>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Horario establecido</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Estado operativo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trabajadoresFiltrados.map((trabajador) => {
                    const config = estadoTrabajadorConfig[trabajador.disponibilidad] ?? {
                      label: trabajador.disponibilidad,
                      badgeVariant: 'outline' as const,
                      className: '',
                    }
                    const esInactivo = trabajador.disponibilidad === 'Inactivo'

                    return (
                      <TableRow key={trabajador.id} className={esInactivo ? 'opacity-65' : ''}>
                        <TableCell className="font-medium">{trabajador.nombre}</TableCell>
                        <TableCell className="text-sm">{trabajador.puesto || '---'}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {horarioConfig[trabajador.horarioEstablecido]}
                        </TableCell>
                        <TableCell className="text-sm">
                          {trabajador.vehiculo ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                              {trabajador.vehiculo.codigo}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.badgeVariant} className={config.className}>
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <EditarTrabajadorDialog trabajador={trabajador} vehiculos={vehiculos} />
                            {esInactivo ? (
                              <BotonReactivar
                                id={trabajador.id}
                                accion={reactivarTrabajador}
                                etiqueta={`Reactivar a ${trabajador.nombre}`}
                                mensajeExito={`${trabajador.nombre} vuelve a estar activo.`}
                              />
                            ) : (
                              <EliminarTrabajadorDialog trabajador={trabajador} />
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
