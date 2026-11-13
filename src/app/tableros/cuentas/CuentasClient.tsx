'use client'

import { useEffect, useRef, useState } from 'react'
import { useDashboardAction } from '@/components/dashboard/feedback'
import { PageHeading, SectionHeading, StatCard, EmptyState } from '@/components/dashboard/presentation'
import { formatearFechaHoraOperativa } from '@/lib/form-validation'
import { ETIQUETA_ROL, esAdministrador, LARGO_MINIMO_CONTRASENA, type Rol } from '@/lib/roles'
import { crearCuenta, editarCuenta, eliminarCuenta } from './actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputContrasena } from '@/components/dashboard/input-contrasena'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/dashboard/ui'
import { KeyRound, List, LoaderCircle, Pencil, RotateCcw, Save, Search, ShieldCheck, Trash2, UserPlus, UserRound, Users } from 'lucide-react'

export type Cuenta = {
  id: string
  nombre: string
  email: string
  rol: Rol
  debeCambiarContrasena: boolean
  ultimoAcceso: string | null
  esPropia: boolean
}

// Lo que se explica al elegir un rol (los permisos reales están en lib/roles.ts)
const DESCRIPCION_ROL: Record<Rol, string> = {
  TRABAJADOR: 'Solo consulta los turnos. Entra con un código que le llega al correo.',
  ADMIN: 'Asigna turnos y administra trabajadores, áreas, vehículos y reportes. Entra con contraseña o con código.',
  SUPERADMIN: 'Todo lo del administrador y además crea, edita y elimina cuentas de acceso.',
}
const ESTILO_ROL: Record<Rol, string> = {
  TRABAJADOR: 'status-neutral',
  ADMIN: 'status-info',
  SUPERADMIN: 'status-warning',
}
const ORDEN_ROLES: Rol[] = ['TRABAJADOR', 'ADMIN', 'SUPERADMIN']

function MensajeError({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p role="alert" className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
      {error}
    </p>
  )
}

/** Cierra el diálogo cuando la acción termina sin error. */
function useCerrarAlTerminar(isPending: boolean, error: string | null, cerrar: () => void) {
  const estabaPendiente = useRef(false)
  useEffect(() => {
    if (estabaPendiente.current && !isPending && !error) cerrar()
    estabaPendiente.current = isPending
  }, [isPending, error, cerrar])
}

/** Selector de rol con su explicación debajo. */
function CampoRol({ id, rol, onChange, disabled }: { id: string; rol: Rol; onChange: (r: Rol) => void; disabled?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Rol</Label>
      <Select name="rol" value={rol} onValueChange={(v) => onChange(v as Rol)} disabled={disabled}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent>
          {ORDEN_ROLES.map((r) => <SelectItem key={r} value={r}>{ETIQUETA_ROL[r]}</SelectItem>)}
        </SelectContent>
      </Select>
      {/* Un Select deshabilitado no se envía con el formulario */}
      {disabled && <input type="hidden" name="rol" value={rol} />}
      <p className="text-xs text-muted-foreground">{DESCRIPCION_ROL[rol]}</p>
    </div>
  )
}

/**
 * Casilla «Pedir cambio de contraseña»: la próxima vez que la persona entre, tendrá que
 * elegir una contraseña nueva antes de usar el panel (ver src/app/cambiar-contrasena).
 */
function CampoPedirCambio({ id, checked, onChange, children }: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
      <Checkbox id={id} name="pedirCambio" checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <div className="space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer font-medium">Pedir cambio de contraseña al iniciar sesión</Label>
        <p className="text-xs text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}

function EditarCuentaDialog({ cuenta }: { cuenta: Cuenta }) {
  const [open, setOpen] = useState(false)
  const [rol, setRol] = useState<Rol>(cuenta.rol)
  const [pedirCambio, setPedirCambio] = useState(cuenta.debeCambiarContrasena)
  const [error, action, isPending] = useDashboardAction(editarCuenta, 'Cuenta actualizada correctamente.')
  useCerrarAlTerminar(isPending, error, () => setOpen(false))

  const pideContrasena = esAdministrador(rol)
  const contrasenaObligatoria = pideContrasena && !esAdministrador(cuenta.rol)

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) { setRol(cuenta.rol); setPedirCambio(cuenta.debeCambiarContrasena) } }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Editar cuenta" aria-label={`Editar cuenta de ${cuenta.nombre}`}>
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar cuenta</DialogTitle>
          <DialogDescription>Cambia los datos de acceso de «{cuenta.nombre}».</DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={cuenta.id} />
          <div className="space-y-1.5">
            <Label htmlFor={`nombre-cuenta-${cuenta.id}`}>Nombre completo</Label>
            <Input id={`nombre-cuenta-${cuenta.id}`} name="nombre" defaultValue={cuenta.nombre} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`email-cuenta-${cuenta.id}`}>Correo electrónico</Label>
            <Input id={`email-cuenta-${cuenta.id}`} name="email" type="email" defaultValue={cuenta.email} required />
            <p className="text-xs text-muted-foreground">Si lo cambias, la persona deberá entrar con el correo nuevo.</p>
          </div>
          <CampoRol id={`rol-cuenta-${cuenta.id}`} rol={rol} onChange={setRol} disabled={cuenta.esPropia} />
          {cuenta.esPropia && (
            <p className="text-xs text-muted-foreground">No puedes cambiar tu propio rol; pídeselo a otro superadministrador.</p>
          )}
          {pideContrasena && (
            <div className="space-y-1.5">
              <Label htmlFor={`clave-cuenta-${cuenta.id}`}>
                {contrasenaObligatoria ? 'Contraseña' : 'Nueva contraseña (opcional)'}
              </Label>
              <InputContrasena
                id={`clave-cuenta-${cuenta.id}`}
                name="contrasena"
                autoComplete="new-password"
                minLength={LARGO_MINIMO_CONTRASENA}
                required={contrasenaObligatoria}
                placeholder={contrasenaObligatoria ? `Mínimo ${LARGO_MINIMO_CONTRASENA} caracteres` : 'Déjala vacía para no cambiarla'}
                // Una contraseña puesta por otra persona es temporal: se sugiere pedir el cambio
                onChange={(e) => { if (e.target.value) setPedirCambio(true) }}
              />
            </div>
          )}
          {pideContrasena && (
            <CampoPedirCambio id={`pedir-cambio-${cuenta.id}`} checked={pedirCambio} onChange={setPedirCambio}>
              Para restablecer una contraseña olvidada basta con marcar esta casilla: la persona entra
              con un código por correo y ahí elige su contraseña nueva. También puedes escribirle una temporal arriba.
            </CampoPedirCambio>
          )}

          <MensajeError error={error} />

          <DialogFooter className="dashboard-form-footer">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
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

function EliminarCuentaDialog({ cuenta }: { cuenta: Cuenta }) {
  const [open, setOpen] = useState(false)
  const [error, action, isPending] = useDashboardAction(eliminarCuenta, `Cuenta de ${cuenta.nombre} eliminada.`)
  useCerrarAlTerminar(isPending, error, () => setOpen(false))

  if (cuenta.esPropia) {
    return (
      <Button variant="destructive" size="icon" disabled title="No puedes eliminar tu propia cuenta" aria-label="No puedes eliminar tu propia cuenta">
        <Trash2 className="w-4 h-4" />
      </Button>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="icon" title="Eliminar cuenta" aria-label={`Eliminar cuenta de ${cuenta.nombre}`}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar la cuenta de «{cuenta.nombre}»?</AlertDialogTitle>
          <AlertDialogDescription>
            La persona <strong>ya no podrá iniciar sesión</strong> y se cerrarán sus sesiones abiertas.
            Los turnos y el historial que registró se conservan. Si después necesita entrar otra vez,
            habrá que crearle una cuenta nueva.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <MensajeError error={error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <form action={action}>
            <input type="hidden" name="id" value={cuenta.id} />
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
              {isPending ? 'Eliminando…' : 'Sí, eliminar cuenta'}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function FormularioNuevaCuenta() {
  const [rol, setRol] = useState<Rol>('TRABAJADOR')
  // Marcado por defecto: la contraseña inicial la conoce quien creó la cuenta
  const [pedirCambio, setPedirCambio] = useState(true)
  const formulario = useRef<HTMLFormElement>(null)
  const [error, action, isPending] = useDashboardAction(crearCuenta, 'Cuenta creada. La persona ya puede iniciar sesión.')

  // Al crear sin errores, el formulario queda limpio para la siguiente cuenta
  useCerrarAlTerminar(isPending, error, () => {
    formulario.current?.reset()
    setRol('TRABAJADOR')
    setPedirCambio(true)
  })

  return (
    <form id="nueva-cuenta" ref={formulario} action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="nombre-nueva">Nombre completo</Label>
        <Input id="nombre-nueva" name="nombre" placeholder="Ej. Juan Pérez" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email-nueva">Correo electrónico</Label>
        <Input id="email-nueva" name="email" type="email" placeholder="persona@fuentelectric.com" required />
      </div>
      <CampoRol id="rol-nueva" rol={rol} onChange={setRol} />
      {esAdministrador(rol) ? (
        <div className="space-y-1.5">
          <Label htmlFor="clave-nueva">Contraseña inicial</Label>
          <InputContrasena id="clave-nueva" name="contrasena" autoComplete="new-password" minLength={LARGO_MINIMO_CONTRASENA} placeholder={`Mínimo ${LARGO_MINIMO_CONTRASENA} caracteres`} required />
          <p className="text-xs text-muted-foreground">Compártela con la persona por un medio seguro. También podrá entrar con código por correo.</p>
        </div>
      ) : (
        <p className="self-center rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Los trabajadores no usan contraseña: al entrar reciben un código en su correo.
        </p>
      )}

      {esAdministrador(rol) && (
        <div className="sm:col-span-2">
          <CampoPedirCambio id="pedir-cambio-nueva" checked={pedirCambio} onChange={setPedirCambio}>
            Recomendado: en su primer inicio de sesión elegirá una contraseña que solo ella conozca.
          </CampoPedirCambio>
        </div>
      )}

      <div className="sm:col-span-2 flex flex-col gap-3">
        <MensajeError error={error} />
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto sm:self-start">
          {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <UserPlus className="size-4" aria-hidden="true" />}
          {isPending ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </div>
    </form>
  )
}

export default function CuentasClient({ cuentas }: { cuentas: Cuenta[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState<'TODOS' | Rol>('TODOS')

  const contar = (rol: Rol) => cuentas.filter((c) => c.rol === rol).length
  const texto = busqueda.trim().toLowerCase()
  const filtradas = cuentas.filter((c) =>
    (filtroRol === 'TODOS' || c.rol === filtroRol) &&
    (!texto || c.nombre.toLowerCase().includes(texto) || c.email.includes(texto)),
  )

  return (
    <div className="space-y-5">
      <PageHeading
        icon={KeyRound}
        title="Cuentas de acceso"
        description="Quién puede iniciar sesión en el sistema y con qué permisos"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={ShieldCheck} label="Superadministradores" value={contar('SUPERADMIN')} />
        <StatCard icon={KeyRound} label="Administradores" value={contar('ADMIN')} />
        <StatCard icon={Users} label="Trabajadores" value={contar('TRABAJADOR')} />
      </div>

      <Card>
        <SectionHeading
          icon={UserPlus}
          title="Nueva cuenta"
          description="La persona podrá iniciar sesión en cuanto se cree la cuenta."
        />
        <CardContent>
          <FormularioNuevaCuenta />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="size-5 text-primary" />
            Cuentas registradas
          </CardTitle>
          <CardDescription>
            Una cuenta sirve para iniciar sesión; es distinta del registro de trabajador al que se le asignan turnos.
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-3 pt-2 sm:items-end">
            <div className="space-y-1.5 flex-1 max-w-sm">
              <Label htmlFor="buscar-cuenta">Buscar cuenta</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="buscar-cuenta" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre o correo..." className="pl-9" />
              </div>
            </div>
            <div className="space-y-1.5 w-full sm:w-56">
              <Label htmlFor="filtro-rol">Filtrar por rol</Label>
              <Select value={filtroRol} onValueChange={(v) => setFiltroRol(v as 'TODOS' | Rol)}>
                <SelectTrigger id="filtro-rol"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los roles</SelectItem>
                  {ORDEN_ROLES.map((r) => <SelectItem key={r} value={r}>{ETIQUETA_ROL[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtradas.length === 0 ? (
            <EmptyState
              title="No encontramos cuentas"
              description="Prueba con otro nombre o correo, o cambia el filtro de rol."
              action={<Button variant="outline" onClick={() => { setBusqueda(''); setFiltroRol('TODOS') }}>Limpiar filtros</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Último acceso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((cuenta) => (
                    <TableRow key={cuenta.id}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
                          {cuenta.nombre}
                          {cuenta.esPropia && <Badge variant="outline" className="status-success">Tú</Badge>}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{cuenta.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className={ESTILO_ROL[cuenta.rol]}>{ETIQUETA_ROL[cuenta.rol]}</Badge>
                          {cuenta.debeCambiarContrasena && (
                            <Badge variant="outline" className="status-neutral" title="Elegirá una contraseña nueva la próxima vez que entre">
                              <RotateCcw className="size-3" aria-hidden="true" />
                              Cambio de contraseña pendiente
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {cuenta.ultimoAcceso ? formatearFechaHoraOperativa(new Date(cuenta.ultimoAcceso)) : 'Nunca'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <EditarCuentaDialog cuenta={cuenta} />
                          <EliminarCuentaDialog cuenta={cuenta} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
