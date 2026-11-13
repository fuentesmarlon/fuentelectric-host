'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, List, Lock, Moon, Pencil, Sun, Trash2 } from 'lucide-react'
import { SectionHeading, EmptyState } from '@/components/dashboard/presentation'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HORARIO_LABELS } from '@/lib/horarios-turno'
import { isPastShiftDate } from '@/lib/form-validation'
import type { TurnoLista as Turno } from '@/lib/turnos-consulta'

export const TURNOS_POR_PAGINA = 50

export function TablaAsistencias({
  turnos,
  totalPeriodo,
  descripcionPeriodo,
  esAdmin,
  onEditar,
  onEliminar,
  onRestablecerFiltros,
}: {
  /** Turnos ya filtrados */
  turnos: Turno[]
  /** Total de turnos cargados en el periodo (antes de filtros) */
  totalPeriodo: number
  descripcionPeriodo: string
  esAdmin: boolean
  onEditar: (turno: Turno) => void
  onEliminar: (turno: Turno) => void
  onRestablecerFiltros: () => void
}) {
  const [pagina, setPagina] = useState(1)

  // Si cambian los filtros y la página actual queda fuera de rango, se ajusta sin efecto extra
  const totalPaginas = Math.max(1, Math.ceil(turnos.length / TURNOS_POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * TURNOS_POR_PAGINA
  const visibles = turnos.slice(inicio, inicio + TURNOS_POR_PAGINA)

  return (
    <Card>
      <SectionHeading
        icon={List}
        title="Registro de asistencias"
        description={`${turnos.length} de ${totalPeriodo} turnos · ${descripcionPeriodo}`}
      />
      <CardContent>
        {turnos.length === 0 ? (
          <EmptyState
            title="No se encontraron turnos con los filtros actuales"
            description="Intenta ajustar o limpiar los filtros avanzados para ver más registros."
            action={
              <Button type="button" variant="outline" onClick={onRestablecerFiltros}>
                Restablecer filtros
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Trabajador</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Turno y Horario</TableHead>
                    <TableHead>Extra</TableHead>
                    {esAdmin && <TableHead>Registrado por</TableHead>}
                    {esAdmin && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibles.map((turno) => {
                    const turnoPasado = isPastShiftDate(turno.fecha)
                    return (
                      <TableRow key={turno.id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          {format(new Date(turno.fecha), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell>{turno.asignadoNombre ?? turno.asignado?.nombre ?? '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{turno.areaNombre ?? turno.area?.nombre ?? '—'}</TableCell>
                        <TableCell className="text-sm">
                          <span className="inline-flex items-center gap-1.5">
                            {turno.vehiculoCodigo ?? turno.vehiculo?.codigo ?? '—'}
                            {turno.esCupoExtra && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Cupo +
                              </Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="inline-flex items-center gap-2 whitespace-nowrap">
                            {turno.tipoTurno === 'NOCTURNO' ? (
                              <Moon className="size-3.5 text-primary" aria-label="Nocturno" />
                            ) : (
                              <Sun className="size-3.5 text-[#ED8B00]" aria-label="Diurno" />
                            )}
                            {HORARIO_LABELS[turno.horario] ?? turno.horario}
                          </span>
                        </TableCell>
                        <TableCell>
                          {turno.esTurnoExtra ? (
                            <Badge variant="outline" className="status-warning">Extra</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        {esAdmin && (
                          <TableCell className="text-muted-foreground text-sm">
                            {turno.registradoPor ?? '—'}
                          </TableCell>
                        )}
                        {esAdmin && (
                          <TableCell className="text-right whitespace-nowrap">
                            {turnoPasado ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-1 text-xs font-medium text-muted-foreground"
                                title="Este turno ya se cumplió y no puede ser modificado ni eliminado."
                              >
                                <Lock className="size-3" />
                                Cerrado
                              </span>
                            ) : (
                              <>
                                <Button variant="ghost" size="icon" aria-label="Editar asistencia" onClick={() => onEditar(turno)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="destructive" size="icon" aria-label="Eliminar asistencia" onClick={() => onEliminar(turno)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPaginas > 1 && (
              <nav
                aria-label="Paginación de asistencias"
                className="mt-4 flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row"
              >
                <span>
                  Mostrando {inicio + 1}–{inicio + visibles.length} de {turnos.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={paginaActual <= 1}
                    onClick={() => setPagina(paginaActual - 1)}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Anterior
                  </Button>
                  <span aria-live="polite">
                    Página {paginaActual} de {totalPaginas}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={paginaActual >= totalPaginas}
                    onClick={() => setPagina(paginaActual + 1)}
                  >
                    Siguiente
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </nav>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
