'use client'

// Diálogos de edición y eliminación de una asistencia (separados de AsistenciasClient).
import { useDashboardAction } from '@/components/dashboard/feedback'
import { LoaderCircle, Save } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { actualizarAsistencia, eliminarAsistencia } from './actions'
import { HORARIO_LABELS, HORARIOS_DIURNOS, HORARIOS_NOCTURNOS } from '@/lib/horarios-turno'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  DialogHeader,
  DialogTitle,
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/dashboard/ui'
import { Trash2 } from 'lucide-react'
import { todayIsoDate } from '@/lib/form-validation'
import { TrabajadorCombobox } from './TrabajadorCombobox'

import type { Trabajador, Vehiculo, Area } from '@prisma/client'

import type { TurnoLista as Turno } from '@/lib/turnos-consulta'

type TurnoDialogProps = { turno: Turno | null; open: boolean; onOpenChange: (open: boolean) => void }

export function EditarAsistenciaDialog({
  turno,
  trabajadores,
  vehiculos,
  areas,
  open,
  onOpenChange,
}: TurnoDialogProps & { trabajadores: Trabajador[]; vehiculos: Vehiculo[]; areas: Area[] }) {
  const [error, action, isPending] = useDashboardAction(actualizarAsistencia, 'Asistencia actualizada correctamente.')
  const [tipoTurno, setTipoTurno] = useState<string>(turno?.tipoTurno ?? '')
  const [asignadoIdEdit, setAsignadoIdEdit] = useState<string>(turno?.asignadoId ?? turno?.asignado?.id ?? '')
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !isPending && !error) {
      onOpenChange(false)
    }
    wasPending.current = isPending
  }, [isPending, error, onOpenChange])

  if (!turno) return null

  const fechaDefault = format(new Date(turno.fecha), 'yyyy-MM-dd')
  const asignadoIdDefault = turno.asignadoId ?? turno.asignado?.id
  const areaIdDefault = turno.areaId ?? turno.area?.id
  const vehiculoIdDefault = turno.vehiculoId ?? turno.vehiculo?.id

  const horariosDisponibles = tipoTurno === 'DIURNO'
    ? HORARIOS_DIURNOS
    : tipoTurno === 'NOCTURNO'
      ? HORARIOS_NOCTURNOS
      : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Asistencia</DialogTitle>
          <DialogDescription>
            Modifica los datos del turno de {turno.asignadoNombre ?? turno.asignado?.nombre ?? 'este trabajador'}.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input type="hidden" name="id" value={turno.id} />

          <div className="space-y-1.5">
            <Label htmlFor="edit-asignadoId">Trabajador</Label>
            <TrabajadorCombobox
              id="edit-asignadoId"
              name="asignadoId"
              trabajadores={trabajadores}
              value={asignadoIdEdit}
              onChange={setAsignadoIdEdit}
              placeholder="Escribe el nombre o elige..."
              required
              opcionActualNoActiva={
                asignadoIdDefault
                  ? {
                      id: asignadoIdDefault,
                      nombre: turno.asignadoNombre ?? turno.asignado?.nombre ?? 'Trabajador actual',
                    }
                  : null
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-fecha">Fecha</Label>
            <Input id="edit-fecha" name="fecha" type="date" min={todayIsoDate()} required defaultValue={fechaDefault} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-tipoTurno">Tipo de Turno</Label>
            <Select name="tipoTurno" required defaultValue={turno.tipoTurno} onValueChange={(val) => setTipoTurno(val)}>
              <SelectTrigger id="edit-tipoTurno"><SelectValue placeholder="Selecciona tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DIURNO">Diurno</SelectItem>
                <SelectItem value="NOCTURNO">Nocturno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-horario">Horario Base</Label>
            <Select name="horario" required defaultValue={turno.horario} disabled={!tipoTurno}>
              <SelectTrigger id="edit-horario">
                <SelectValue placeholder={!tipoTurno ? 'Elige tipo primero' : 'Selecciona horario'} />
              </SelectTrigger>
              <SelectContent>
                {horariosDisponibles.map((hKey) => (
                  <SelectItem key={hKey} value={hKey}>
                    {HORARIO_LABELS[hKey]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-areaId">Área Operativa</Label>
            <Select name="areaId" required defaultValue={areaIdDefault}>
              <SelectTrigger id="edit-areaId"><SelectValue placeholder="Selecciona área" /></SelectTrigger>
              <SelectContent>
                {areaIdDefault && !areas.some((a) => a.id === areaIdDefault) && (
                  <SelectItem value={areaIdDefault}>
                    {turno.areaNombre ?? turno.area?.nombre ?? 'Área actual'} (Inactiva)
                  </SelectItem>
                )}
                {areas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-vehiculoId">Vehículo Asignado</Label>
            <Select name="vehiculoId" required defaultValue={vehiculoIdDefault}>
              <SelectTrigger id="edit-vehiculoId"><SelectValue placeholder="Selecciona vehículo" /></SelectTrigger>
              <SelectContent>
                {vehiculoIdDefault && !vehiculos.some((v) => v.id === vehiculoIdDefault) && (
                  <SelectItem value={vehiculoIdDefault}>
                    {turno.vehiculoCodigo ?? turno.vehiculo?.codigo ?? 'Unidad actual'} (No disponible)
                  </SelectItem>
                )}
                {vehiculos.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.codigo} ({v.tipo})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="edit-comentario">Comentarios (Opcional)</Label>
            <Input id="edit-comentario" name="comentario" placeholder="Ej. Cubriendo falta" defaultValue={turno.comentario ?? ''} />
          </div>

          <div className="sm:col-span-2 flex flex-col sm:flex-row flex-wrap gap-4 rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <Checkbox id="edit-esTurnoExtra" name="esTurnoExtra" defaultChecked={turno.esTurnoExtra} />
              <Label htmlFor="edit-esTurnoExtra" className="font-normal cursor-pointer">
                ¿Es turno extra?
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="edit-esCupoExtra" name="esCupoExtra" defaultChecked={turno.esCupoExtra} />
              <Label htmlFor="edit-esCupoExtra" className="font-normal cursor-pointer">
                Permitir más de 3 personas en vehículo (Cupo extra)
              </Label>
            </div>
          </div>

          {error && (
            <div className="sm:col-span-2">
              <p role="alert" className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                {error}
              </p>
            </div>
          )}

          <div className="dashboard-form-footer sm:col-span-2 flex flex-col-reverse sm:flex-row justify-end gap-2 mt-2">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
              {isPending ? 'Guardando cambios…' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EliminarAsistenciaDialog({ turno, open, onOpenChange }: TurnoDialogProps) {
  const [error, action, isPending] = useDashboardAction(eliminarAsistencia, 'Asistencia eliminada. Se conservó el registro en el historial.')
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !isPending && !error) {
      onOpenChange(false)
    }
    wasPending.current = isPending
  }, [isPending, error, onOpenChange])

  if (!turno) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar esta asistencia?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará el turno de {turno.asignadoNombre ?? turno.asignado?.nombre ?? 'este trabajador'} del{' '}
            {format(new Date(turno.fecha), 'dd MMM yyyy', { locale: es })}. Esta acción no se puede deshacer, pero
            quedará un registro en el historial.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p role="alert" className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
          <form action={action}>
            <input type="hidden" name="id" value={turno.id} />
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
              {isPending ? 'Eliminando…' : 'Sí, eliminar'}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
