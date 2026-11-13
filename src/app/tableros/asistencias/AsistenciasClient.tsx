'use client'
import { useDashboardAction } from '@/components/dashboard/feedback'
import { PageHeading, SectionHeading } from '@/components/dashboard/presentation'
import { LoaderCircle, Save, List, FileSpreadsheet, FileDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { crearAsistencia } from './actions'
import {
  HORARIO_LABELS,
  HORARIOS_DIURNOS,
  HORARIOS_NOCTURNOS,
  horariosCompatiblesEnMismoDia,
} from '@/lib/horarios-turno'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
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
} from '@/components/dashboard/ui'
import { CalendarDays, ClipboardList, Users } from 'lucide-react'
import { isPastShiftDate } from '@/lib/form-validation'
import { CalendarView } from './CalendarView'
import { FiltrosAvanzados, FILTROS_INICIALES, type FiltrosState } from './FiltrosAvanzados'
import { CargaMasivaDialog } from './CargaMasivaDialog'
import { TrabajadorCombobox } from './TrabajadorCombobox'

import { TablaAsistencias } from './TablaAsistencias'
import { EditarAsistenciaDialog, EliminarAsistenciaDialog } from './DialogosAsistencia'
import { obtenerTurnosDeFecha } from './consultas'
import type { TurnoDelDia } from '@/lib/reglas-turno'
import type { TurnoLista as Turno, VentanaTurnos } from '@/lib/turnos-consulta'
import type { Trabajador, Vehiculo, Area } from '@prisma/client'

type AsistenciasClientProps = {
  turnos: Turno[]
  trabajadores: Trabajador[]
  vehiculos: Vehiculo[]
  areas: Area[]
  esAdmin: boolean
  /** Rango de fechas cargado desde el servidor (mes visible o filtro de fechas) */
  ventana: VentanaTurnos
}

const formatoPeriodo = (iso: string) => format(new Date(`${iso}T12:00:00`), 'dd MMM yyyy', { locale: es })

export default function AsistenciasClient({ turnos, trabajadores, vehiculos, areas, esAdmin, ventana }: AsistenciasClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [cargandoPeriodo, startTransition] = useTransition()

  // Pide al servidor otro rango de turnos cambiando la URL (?mes= o ?desde=&hasta=)
  const cargarPeriodo = (params: { mes?: string; desde?: string; hasta?: string }) => {
    const sp = new URLSearchParams()
    for (const [clave, valor] of Object.entries(params)) if (valor) sp.set(clave, valor)
    startTransition(() => router.replace(`${pathname}?${sp.toString()}`, { scroll: false }))
  }

  const [error, action, isPending] = useDashboardAction(crearAsistencia, 'Asistencia registrada correctamente.')

  // Valores del formulario de nuevo turno. Se guardan en estado para mostrar las ayudas
  // (horarios compatibles, cupo de la unidad) mientras se llena.
  const [asignadoIdForm, setAsignadoIdForm] = useState<string>('')
  const [fechaForm, setFechaForm] = useState<string>('')
  const [tipoTurno, setTipoTurno] = useState<string>('')
  const [horarioForm, setHorarioForm] = useState<string>('')
  const [areaIdForm, setAreaIdForm] = useState<string>('')
  const [vehiculoIdForm, setVehiculoIdForm] = useState<string>('')
  const [comentarioForm, setComentarioForm] = useState<string>('')
  const [esTurnoExtraForm, setEsTurnoExtraForm] = useState<boolean>(false)
  const [esCupoExtraForm, setEsCupoExtraForm] = useState<boolean>(false)
  const [formResetKey, setFormResetKey] = useState<number>(0)
  const wasCreating = useRef(false)

  // Al guardar sin errores se vacía el formulario para registrar el siguiente turno
  useEffect(() => {
    if (wasCreating.current && !isPending && !error) {
      setAsignadoIdForm('')
      setFechaForm('')
      setTipoTurno('')
      setHorarioForm('')
      setAreaIdForm('')
      setVehiculoIdForm('')
      setComentarioForm('')
      setEsTurnoExtraForm(false)
      setEsCupoExtraForm(false)
      setFormResetKey((prev) => prev + 1)
    }
    wasCreating.current = isPending
  }, [isPending, error])

  // Turno seleccionado para editar / eliminar
  const [turnoEditando, setTurnoEditando] = useState<Turno | null>(null)
  const [turnoEliminando, setTurnoEliminando] = useState<Turno | null>(null)

  // Selector de vista: Calendario vs Tabla
  const [vista, setVista] = useState<'CALENDARIO' | 'TABLA'>('CALENDARIO')

  // Modal de Carga Masiva (Excel)
  const [cargaMasivaAbierta, setCargaMasivaAbierta] = useState(false)

  // Filtros avanzados
  const [filtros, setFiltrosState] = useState<FiltrosState>(() => ({
    ...FILTROS_INICIALES,
    desde: ventana.filtroDesde,
    hasta: ventana.filtroHasta,
  }))

  // Mes visible en el calendario
  const [mesCalendario, setMesCalendario] = useState<Date>(() => new Date(`${ventana.mes}-01T12:00:00`))

  // Los filtros de texto/trabajador/etc. se aplican en memoria; si cambian las FECHAS
  // se pide ese rango al servidor.
  const setFiltros = (nuevos: FiltrosState) => {
    setFiltrosState(nuevos)
    if (nuevos.desde === filtros.desde && nuevos.hasta === filtros.hasta) return
    if (nuevos.desde || nuevos.hasta) cargarPeriodo({ desde: nuevos.desde, hasta: nuevos.hasta })
    else cargarPeriodo({ mes: format(mesCalendario, 'yyyy-MM') })
  }

  // Sin filtro de fechas, cambiar de mes en el calendario carga ese mes
  const cambiarMesCalendario = (mes: Date) => {
    setMesCalendario(mes)
    if (!filtros.desde && !filtros.hasta) cargarPeriodo({ mes: format(mes, 'yyyy-MM') })
  }

  // Turnos ya registrados en la fecha seleccionada del formulario (para las ayudas de cupo
  // y horarios). Si la fecha está dentro del rango cargado se usan los datos locales;
  // si no, se consultan al servidor.
  const fechaFormEnVentana = Boolean(fechaForm) && fechaForm >= ventana.desde && fechaForm <= ventana.hasta
  const [turnosConsultados, setTurnosConsultados] = useState<{ fecha: string; turnos: TurnoDelDia[] } | null>(null)

  useEffect(() => {
    if (!fechaForm || fechaFormEnVentana) return
    let vigente = true
    obtenerTurnosDeFecha(fechaForm).then((lista) => {
      if (vigente) setTurnosConsultados({ fecha: fechaForm, turnos: lista })
    })
    return () => { vigente = false }
  }, [fechaForm, fechaFormEnVentana])

  const turnosEnFechaForm = useMemo<TurnoDelDia[]>(() => {
    if (!fechaForm) return []
    if (fechaFormEnVentana) return turnos.filter((t) => format(new Date(t.fecha), 'yyyy-MM-dd') === fechaForm)
    return turnosConsultados?.fecha === fechaForm ? turnosConsultados.turnos : []
  }, [turnos, fechaForm, fechaFormEnVentana, turnosConsultados])

  // Si el trabajador seleccionado ya tiene un turno en la otra zona horaria ese mismo día
  const otroTurnoTrabajadorEnDia = useMemo(() => {
    if (!asignadoIdForm || !fechaForm || !tipoTurno) return null
    return (
      turnosEnFechaForm.find(
        (t) => t.asignadoId === asignadoIdForm && t.tipoTurno !== tipoTurno,
      ) ?? null
    )
  }, [turnosEnFechaForm, asignadoIdForm, fechaForm, tipoTurno])

  const trabajadorYaTieneMismoTurno = useMemo(() => {
    if (!asignadoIdForm || !fechaForm || !tipoTurno) return false
    return turnosEnFechaForm.some(
      (t) => t.asignadoId === asignadoIdForm && t.tipoTurno === tipoTurno,
    )
  }, [turnosEnFechaForm, asignadoIdForm, fechaForm, tipoTurno])

  // Turnos del vehículo seleccionado en la OTRA zona horaria del mismo día (para validar entrega de unidad)
  const turnosVehiculoOtraZona = useMemo(() => {
    if (!vehiculoIdForm || !fechaForm || !tipoTurno) return []
    return turnosEnFechaForm.filter(
      (t) => t.vehiculoId === vehiculoIdForm && t.tipoTurno !== tipoTurno,
    )
  }, [turnosEnFechaForm, vehiculoIdForm, fechaForm, tipoTurno])

  // Ocupación por vehículo en la fecha y zona horaria seleccionada (diurno y nocturno independientes)
  const ocupacionPorVehiculoEnJornada = useMemo(() => {
    const mapa = new Map<string, number>()
    if (!fechaForm || !tipoTurno) return mapa
    for (const t of turnosEnFechaForm) {
      if (t.vehiculoId && t.tipoTurno === tipoTurno) {
        mapa.set(t.vehiculoId, (mapa.get(t.vehiculoId) ?? 0) + 1)
      }
    }
    return mapa
  }, [turnosEnFechaForm, fechaForm, tipoTurno])

  const vehiculoSeleccionadoObj = useMemo(
    () => vehiculos.find((v) => v.id === vehiculoIdForm) ?? null,
    [vehiculos, vehiculoIdForm],
  )

  const ocupantesVehiculoSeleccionado = vehiculoIdForm
    ? ocupacionPorVehiculoEnJornada.get(vehiculoIdForm) ?? 0
    : 0
  const cupoBaseVehiculo = vehiculoSeleccionadoObj?.noPersonas ?? 3
  const vehiculoEnCupoMaximo =
    Boolean(vehiculoSeleccionadoObj && fechaForm && tipoTurno) &&
    ocupantesVehiculoSeleccionado >= cupoBaseVehiculo

  // Verifica si un horario candidato es compatible con el otro turno del trabajador y del vehículo en ese día
  const evaluarDisponibilidadHorario = (horarioCandidato: string) => {
    if (
      otroTurnoTrabajadorEnDia &&
      !horariosCompatiblesEnMismoDia(horarioCandidato, otroTurnoTrabajadorEnDia.horario)
    ) {
      return {
        disponible: false,
        motivo: `Traslapa con salida trabajador (${HORARIO_LABELS[otroTurnoTrabajadorEnDia.horario]})`,
      }
    }
    const conflictoVeh = turnosVehiculoOtraZona.find(
      (tv) => !horariosCompatiblesEnMismoDia(horarioCandidato, tv.horario),
    )
    if (conflictoVeh) {
      return {
        disponible: false,
        motivo: `Unidad ocupada en ${HORARIO_LABELS[conflictoVeh.horario]}`,
      }
    }
    return { disponible: true, motivo: '' }
  }

  // Filtrado reactivo en memoria para la tabla/calendario
  const turnosFiltrados = useMemo(() => {
    return turnos.filter((t) => {
      if (filtros.texto.trim()) {
        const q = filtros.texto.toLowerCase().trim()
        const trabajadorNombre = (t.asignadoNombre ?? t.asignado?.nombre ?? '').toLowerCase()
        const vehiculoCodigo = (t.vehiculoCodigo ?? t.vehiculo?.codigo ?? '').toLowerCase()
        const areaNombre = (t.areaNombre ?? t.area?.nombre ?? '').toLowerCase()
        const comentario = (t.comentario ?? '').toLowerCase()
        const registradoPor = (t.registradoPor ?? '').toLowerCase()

        if (
          !trabajadorNombre.includes(q) &&
          !vehiculoCodigo.includes(q) &&
          !areaNombre.includes(q) &&
          !comentario.includes(q) &&
          !registradoPor.includes(q)
        ) {
          return false
        }
      }

      const fechaTurno = format(new Date(t.fecha), 'yyyy-MM-dd')
      if (filtros.desde && fechaTurno < filtros.desde) return false
      if (filtros.hasta && fechaTurno > filtros.hasta) return false
      if (filtros.trabajadorId !== 'todos' && t.asignadoId !== filtros.trabajadorId) return false
      if (filtros.vehiculoId !== 'todos' && t.vehiculoId !== filtros.vehiculoId) return false
      if (filtros.areaId !== 'todos' && t.areaId !== filtros.areaId) return false
      if (filtros.tipoTurno !== 'todos' && t.tipoTurno !== filtros.tipoTurno) return false
      if (filtros.horario !== 'todos' && t.horario !== filtros.horario) return false
      if (filtros.extra === 'SI' && !t.esTurnoExtra) return false
      if (filtros.extra === 'NO' && t.esTurnoExtra) return false

      return true
    })
  }, [turnos, filtros])

  const handleSelectFecha = (fechaStr: string) => {
    setFechaForm(fechaStr)
    const inputFecha = document.getElementById('fecha') as HTMLInputElement | null
    if (inputFecha) {
      inputFecha.value = fechaStr
      inputFecha.focus()
    }
    const formElement = document.getElementById('new-shift')
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const listaHorariosActual = tipoTurno === 'DIURNO'
    ? HORARIOS_DIURNOS
    : tipoTurno === 'NOCTURNO'
      ? HORARIOS_NOCTURNOS
      : []

  const exportProgramacionQuery = useMemo(() => {
    const params = new URLSearchParams()
    params.set('tipo', 'programacion')
    const ahora = new Date()
    params.set('desde', filtros.desde || format(startOfMonth(ahora), 'yyyy-MM-dd'))
    params.set('hasta', filtros.hasta || format(endOfMonth(ahora), 'yyyy-MM-dd'))
    if (filtros.areaId !== 'todos') params.set('areaId', filtros.areaId)
    if (filtros.vehiculoId !== 'todos') params.set('vehiculoId', filtros.vehiculoId)
    if (filtros.trabajadorId !== 'todos') params.set('trabajadorId', filtros.trabajadorId)
    if (filtros.tipoTurno !== 'todos') params.set('tipoTurno', filtros.tipoTurno)
    if (filtros.extra !== 'todos') params.set('extra', filtros.extra)
    return `?${params.toString()}`
  }, [filtros])

  return (
    <div className="space-y-5">
      <PageHeading
        icon={CalendarDays}
        title="Asistencias y turnos"
        description={esAdmin ? 'Asignación de personal a cuadrillas y unidades' : 'Consulta de los turnos programados'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {esAdmin && (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setCargaMasivaAbierta(true)}
                  className="h-8 gap-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                >
                  <FileSpreadsheet className="size-3.5" />
                  Carga Masiva (Excel)
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs font-semibold"
                >
                  <a href={`/api/historial/excel${exportProgramacionQuery}`}>
                    <FileSpreadsheet className="size-3.5 text-emerald-700" />
                    Exportar Excel
                  </a>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs font-semibold"
                >
                  <a href={`/api/historial/pdf${exportProgramacionQuery}`}>
                    <FileDown className="size-3.5 text-[#004884]" />
                    Exportar PDF
                  </a>
                </Button>
              </>
            )}

            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border shadow-xs">
              <Button
                type="button"
                size="sm"
                variant={vista === 'CALENDARIO' ? 'default' : 'ghost'}
                onClick={() => setVista('CALENDARIO')}
                className={`h-8 gap-1.5 text-xs font-semibold ${vista === 'CALENDARIO' ? 'bg-[#002b49] text-white hover:bg-[#001d32]' : 'text-muted-foreground'}`}
              >
                <CalendarDays className="size-3.5" />
                Vista Calendario
              </Button>
              <Button
                type="button"
                size="sm"
                variant={vista === 'TABLA' ? 'default' : 'ghost'}
                onClick={() => setVista('TABLA')}
                className={`h-8 gap-1.5 text-xs font-semibold ${vista === 'TABLA' ? 'bg-[#002b49] text-white hover:bg-[#001d32]' : 'text-muted-foreground'}`}
              >
                <List className="size-3.5" />
                Vista Tabla
              </Button>
            </div>
          </div>
        }
      />

      {/* Solo se muestra el formulario si el usuario es ADMIN */}
      {esAdmin && (
        <Card>
          <SectionHeading
            icon={ClipboardList}
            title="Nuevo turno"
            description="Asigna personal a un vehículo por jornada (diurna o nocturna). Las unidades pueden usarse en mañana y noche en horarios compatibles."
          />
          <CardContent>
            <form id="new-shift" action={action} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="asignadoId">Trabajador</Label>
                <TrabajadorCombobox
                  key={`worker-${formResetKey}`}
                  id="asignadoId"
                  name="asignadoId"
                  trabajadores={trabajadores}
                  value={asignadoIdForm}
                  onChange={setAsignadoIdForm}
                  placeholder="Escribe el nombre o elige..."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  name="fecha"
                  type="date"
                  value={fechaForm}
                  onChange={(e) => setFechaForm(e.target.value)}
                  required
                />
              </div>

              {/* Seleccionar Tipo de Turno */}
              <div className="space-y-1.5">
                <Label htmlFor="tipoTurno">Tipo de Turno</Label>
                <Select
                  key={`tipo-${formResetKey}`}
                  name="tipoTurno"
                  required
                  value={tipoTurno || undefined}
                  onValueChange={(val) => {
                    setTipoTurno(val)
                    setHorarioForm('')
                  }}
                >
                  <SelectTrigger id="tipoTurno">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIURNO">Diurno</SelectItem>
                    <SelectItem value="NOCTURNO">Nocturno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Seleccionar Horario */}
              <div className="space-y-1.5">
                <Label htmlFor="horario">Horario Base</Label>
                <Select
                  key={`horario-${formResetKey}-${tipoTurno}`}
                  name="horario"
                  required
                  disabled={!tipoTurno}
                  value={horarioForm || undefined}
                  onValueChange={setHorarioForm}
                >
                  <SelectTrigger id="horario">
                    <SelectValue placeholder={!tipoTurno ? 'Elige tipo primero' : 'Selecciona horario'} />
                  </SelectTrigger>
                  <SelectContent>
                    {listaHorariosActual.map((hKey) => {
                      const check = evaluarDisponibilidadHorario(hKey)
                      return (
                        <SelectItem key={hKey} value={hKey} disabled={!check.disponible}>
                          {HORARIO_LABELS[hKey]}
                          {!check.disponible ? ` — (${check.motivo})` : ''}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="areaId">Área Operativa</Label>
                <Select
                  key={`area-${formResetKey}`}
                  name="areaId"
                  required
                  value={areaIdForm || undefined}
                  onValueChange={setAreaIdForm}
                >
                  <SelectTrigger id="areaId">
                    <SelectValue placeholder="Selecciona área" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vehiculoId">Vehículo Asignado</Label>
                <Select
                  key={`vehiculo-${formResetKey}`}
                  name="vehiculoId"
                  required
                  value={vehiculoIdForm || undefined}
                  onValueChange={setVehiculoIdForm}
                >
                  <SelectTrigger id="vehiculoId">
                    <SelectValue placeholder="Selecciona vehículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehiculos.map((v) => {
                      const ocupados = ocupacionPorVehiculoEnJornada.get(v.id) ?? 0
                      const textoOcupacion =
                        fechaForm && tipoTurno ? ` · ${ocupados}/${v.noPersonas} en turno` : ''
                      return (
                        <SelectItem key={v.id} value={v.id}>
                          {v.codigo} ({v.tipo}
                          {textoOcupacion})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="comentario">Comentarios (Opcional)</Label>
                <Input
                  id="comentario"
                  name="comentario"
                  value={comentarioForm}
                  onChange={(e) => setComentarioForm(e.target.value)}
                  placeholder="Ej. Cubriendo falta o apoyo nocturno"
                />
              </div>

              {/* Opciones especiales: Turno Extra y Cupo Extra (+3 personas en vehículo) */}
              <div className="sm:col-span-2 xl:col-span-4 flex flex-col sm:flex-row flex-wrap gap-4 rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="esTurnoExtra"
                    name="esTurnoExtra"
                    checked={esTurnoExtraForm}
                    onCheckedChange={(val) => setEsTurnoExtraForm(Boolean(val))}
                  />
                  <Label htmlFor="esTurnoExtra" className="font-normal cursor-pointer">
                    ¿Es turno extra?{' '}
                    <span className="text-xs text-muted-foreground">
                      (Obligatorio si el trabajador cubre doble jornada el mismo día)
                    </span>
                  </Label>
                </div>

                <div
                  className={`flex items-center gap-2 rounded-md px-2 py-0.5 transition-colors ${
                    vehiculoEnCupoMaximo ? 'bg-amber-100/80 border border-amber-300' : ''
                  }`}
                >
                  <Checkbox
                    id="esCupoExtra"
                    name="esCupoExtra"
                    checked={esCupoExtraForm}
                    onCheckedChange={(val) => setEsCupoExtraForm(Boolean(val))}
                  />
                  <Label htmlFor="esCupoExtra" className="font-normal cursor-pointer flex items-center gap-1.5">
                    <Users className="size-3.5 text-muted-foreground" />
                    Agregar más de {cupoBaseVehiculo} personas al vehículo (Cupo extra)
                  </Label>
                </div>
              </div>

              {/* Avisos según lo elegido (cupo lleno, doble jornada, entrega de unidad…).
                  Son solo ayuda: la validación que cuenta es la del servidor (lib/reglas-turno.ts). */}
              {trabajadorYaTieneMismoTurno && (
                <div className="sm:col-span-2 xl:col-span-4">
                  <p className="text-xs text-amber-800 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
                    Este trabajador ya tiene un turno <strong>{tipoTurno === 'DIURNO' ? 'diurno' : 'nocturno'}</strong> en esa fecha. Solo puede asignarse otro turno si es en distinta zona horaria y marcado como turno extra.
                  </p>
                </div>
              )}

              {otroTurnoTrabajadorEnDia && !esTurnoExtraForm && (
                <div className="sm:col-span-2 xl:col-span-4">
                  <p className="text-xs text-sky-900 rounded-md border border-sky-200 bg-sky-50 px-3 py-2">
                    El trabajador ya cuenta con turno <strong>{otroTurnoTrabajadorEnDia.tipoTurno === 'DIURNO' ? 'diurno' : 'nocturno'}</strong> ({HORARIO_LABELS[otroTurnoTrabajadorEnDia.horario]}) en este día. Marca la casilla <strong>«¿Es turno extra?»</strong> para habilitar su segundo turno.
                  </p>
                </div>
              )}

              {vehiculoEnCupoMaximo && !esCupoExtraForm && (
                <div className="sm:col-span-2 xl:col-span-4">
                  <p className="text-xs text-amber-900 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
                    La unidad <strong>{vehiculoSeleccionadoObj?.codigo}</strong> ya tiene <strong>{ocupantesVehiculoSeleccionado} de {cupoBaseVehiculo}</strong> personas en este turno. Marca <strong>«Agregar más de {cupoBaseVehiculo} personas al vehículo (Cupo extra)»</strong> para asignar una persona adicional.
                  </p>
                </div>
              )}

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
                  {isPending ? 'Guardando turno…' : 'Registrar Asistencia'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Filtros Avanzados (aplican tanto para Calendario como para Tabla) ── */}
      <FiltrosAvanzados
        filtros={filtros}
        onFiltrosChange={setFiltros}
        trabajadores={trabajadores}
        vehiculos={vehiculos}
        areas={areas}
        totalFiltrados={turnosFiltrados.length}
        totalOriginal={turnos.length}
      />

      {/* ── Aviso del periodo cargado ── */}
      {ventana.recortado && (
        <p role="status" className="text-xs text-amber-900 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
          El rango elegido supera los 93 días: se muestran del {formatoPeriodo(ventana.desde)} al {formatoPeriodo(ventana.hasta)}.
          Para periodos más largos usa <strong>Exportar Excel</strong> o <strong>PDF</strong>.
        </p>
      )}

      {/* ── Vista de Asistencias (Calendario o Tabla) ── */}
      <div aria-busy={cargandoPeriodo} className={cargandoPeriodo ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {vista === 'CALENDARIO' ? (
          <CalendarView
            turnos={turnosFiltrados}
            trabajadores={trabajadores}
            vehiculos={vehiculos}
            areas={areas}
            esAdmin={esAdmin}
            mes={mesCalendario}
            onMesChange={cambiarMesCalendario}
            onSelectTurno={(turno) => {
              if (esAdmin && !isPastShiftDate(turno.fecha)) setTurnoEditando(turno)
            }}
            onSelectFecha={esAdmin ? handleSelectFecha : undefined}
          />
        ) : (
          <TablaAsistencias
            turnos={turnosFiltrados}
            totalPeriodo={turnos.length}
            descripcionPeriodo={`del ${formatoPeriodo(ventana.desde)} al ${formatoPeriodo(ventana.hasta)}`}
            esAdmin={esAdmin}
            onEditar={setTurnoEditando}
            onEliminar={setTurnoEliminando}
            onRestablecerFiltros={() => setFiltros(FILTROS_INICIALES)}
          />
        )}
      </div>

      {esAdmin && (
        <EditarAsistenciaDialog
          key={turnoEditando?.id ?? 'sin-edicion'}
          turno={turnoEditando}
          trabajadores={trabajadores}
          vehiculos={vehiculos}
          areas={areas}
          open={Boolean(turnoEditando)}
          onOpenChange={(open: boolean) => { if (!open) setTurnoEditando(null) }}
        />
      )}

      {esAdmin && (
        <EliminarAsistenciaDialog
          key={turnoEliminando?.id ?? 'sin-eliminacion'}
          turno={turnoEliminando}
          open={Boolean(turnoEliminando)}
          onOpenChange={(open: boolean) => { if (!open) setTurnoEliminando(null) }}
        />
      )}

      {esAdmin && (
        <CargaMasivaDialog
          open={cargaMasivaAbierta}
          onOpenChange={setCargaMasivaAbierta}
        />
      )}
    </div>
  )
}
