'use client'

import { useState, useEffect, useRef } from 'react'
import { useDashboardAction } from '@/components/dashboard/feedback'
import { PageHeading, SectionHeading, StatCard, EmptyState } from '@/components/dashboard/presentation'
import { crearArea, actualizarArea, eliminarArea, reactivarArea } from './actions'
import { BotonReactivar } from '@/components/dashboard/reactivar'
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
  MapPin,
  Map,
  MapPinOff,
  PlusCircle,
  Pencil,
  Trash2,
  Search,
} from 'lucide-react'

type Area = {
  id: string
  nombre: string
  estado: string
}

function EditarAreaDialog({ area }: { area: Area }) {
  const [open, setOpen] = useState(false)
  const [error, action, isPending] = useDashboardAction(actualizarArea, 'Área actualizada correctamente.')
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !isPending && !error) {
      setOpen(false)
    }
    wasPending.current = isPending
  }, [isPending, error])

  const estadoInicial = area.estado === 'Inactivo' ? 'Inactivo' : 'Activo'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Editar área y estado" aria-label="Editar área">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar área operativa</DialogTitle>
          <DialogDescription>
            Modifica el nombre o cambia el estado operativo de «{area.nombre}».
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={area.id} />

          <div className="space-y-1.5">
            <Label htmlFor={`nombre-area-${area.id}`}>Nombre del Área</Label>
            <Input
              id={`nombre-area-${area.id}`}
              name="nombre"
              defaultValue={area.nombre}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`estado-area-${area.id}`}>Estado del área</Label>
            <Select name="estado" defaultValue={estadoInicial}>
              <SelectTrigger id={`estado-area-${area.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Activo">Activa (Disponible para turnos)</SelectItem>
                <SelectItem value="Inactivo">Inactiva (Baja)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Solo las áreas en estado <strong>Activa</strong> aparecerán disponibles al asignar turnos.
            </p>
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

function EliminarAreaDialog({ area }: { area: Area }) {
  const [open, setOpen] = useState(false)
  const [error, action, isPending] = useDashboardAction(eliminarArea, 'Área pasada a estado Inactivo.')
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
          aria-label="Pasar área a inactivo"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar el área «{area.nombre}» de la lista activa?</AlertDialogTitle>
          <AlertDialogDescription>
            El registro <strong>no se borrará de la base de datos</strong>. Su estado cambiará a{' '}
            <strong>Inactivo</strong>, conservará todos sus turnos históricos vinculados y dejará de
            aparecer a la hora de asignar nuevos turnos.
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
            <input type="hidden" name="id" value={area.id} />
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

export default function AreasClient({ areas = [] }: { areas?: Area[] }) {
  const [error, action, isPending] = useDashboardAction(crearArea, 'Área guardada correctamente.')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS')

  const totalActivas = areas.filter((a) => a.estado !== 'Inactivo').length
  const totalInactivas = areas.filter((a) => a.estado === 'Inactivo').length

  const areasFiltradas = areas.filter((a) => {
    const coincideNombre = a.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
    if (!coincideNombre) return false

    const estadoNorm = a.estado === 'Inactivo' ? 'Inactivo' : 'Activo'
    if (filtroEstado === 'TODOS') return true
    return estadoNorm === filtroEstado
  })

  return (
    <div className="space-y-5">
      {/* ── Encabezado ── */}
      <PageHeading
        icon={MapPin}
        title="Áreas operativas"
        description="Gestión de zonas y clasificaciones de trabajo para las cuadrillas"
      />

      {/* ── Tarjetas de resumen ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={MapPin} label="Áreas activas" value={totalActivas} />
        <StatCard icon={MapPinOff} label="Inactivas (Dadas de baja)" value={totalInactivas} />
        <StatCard icon={Map} label="Total registradas" value={areas.length} />
      </div>

      {/* ── Formulario de creación ── */}
      <Card>
        <SectionHeading
          icon={PlusCircle}
          title="Nueva área"
          description="Registra una nueva zona operativa."
        />
        <CardContent>
          <form id="new-area" action={action} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre del Área</Label>
              <Input
                id="nombre"
                name="nombre"
                placeholder="Ej. Escuintla canasta frío"
                required
              />
            </div>

            <Button type="submit" disabled={isPending} className="w-full sm:w-auto mb-[2px]">
              {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
              {isPending ? 'Guardando…' : 'Guardar área'}
            </Button>

            {error && (
              <div className="sm:col-span-2">
                <p role="alert" className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                  {error}
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* ── Tabla de Áreas ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="size-5 text-primary" />
            Áreas registradas
          </CardTitle>
          <CardDescription>
            Zonas operativas registradas en el sistema. Las áreas inactivas conservan su historial pero no aparecen al programar turnos.
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-3 pt-2 sm:items-end">
            <div className="space-y-1.5 flex-1 max-w-sm">
              <Label htmlFor="area-search">Buscar área</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="area-search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5 w-full sm:w-56">
              <Label htmlFor="area-status-filter">Filtrar por estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger id="area-status-filter">
                  <SelectValue placeholder="Filtrar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas las áreas</SelectItem>
                  <SelectItem value="Activo">Solo áreas activas</SelectItem>
                  <SelectItem value="Inactivo">Inactivas (Bajas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {areasFiltradas.length === 0 ? (
            <EmptyState
              title={areas.length === 0 ? 'Aún no hay áreas registradas' : 'No encontramos coincidencias'}
              description={
                areas.length === 0
                  ? 'Registra la primera zona operativa para asignar turnos a tu equipo.'
                  : 'Prueba con otro nombre o cambia el filtro de estado.'
              }
              action={
                areas.length === 0 ? (
                  <Button asChild variant="outline">
                    <a href="#new-area">Registrar un área</a>
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
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Nombre del Área</TableHead>
                    <TableHead>Estado operativo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {areasFiltradas.map((area) => {
                    const esInactiva = area.estado === 'Inactivo'
                    return (
                      <TableRow key={area.id} className={esInactiva ? 'opacity-65' : ''}>
                        <TableCell>
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell className="font-medium">{area.nombre}</TableCell>
                        <TableCell>
                          {esInactiva ? (
                            <Badge variant="secondary" className="opacity-75">
                              Inactiva (Baja)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="status-success">
                              Activa
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <EditarAreaDialog area={area} />
                            {esInactiva ? (
                              <BotonReactivar
                                id={area.id}
                                accion={reactivarArea}
                                etiqueta={`Reactivar área ${area.nombre}`}
                                mensajeExito={`Área «${area.nombre}» reactivada.`}
                              />
                            ) : (
                              <EliminarAreaDialog area={area} />
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
