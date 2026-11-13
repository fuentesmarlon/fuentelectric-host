'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/dashboard/ui'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  XCircle,
  FileText,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ResultadoCargaMasiva } from '@/lib/carga-masiva'

interface CargaMasivaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CargaMasivaDialog({ open, onOpenChange }: CargaMasivaDialogProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [archivo, setArchivo] = useState<File | null>(null)
  const [modoDuplicados, setModoDuplicados] = useState<'omitir' | 'sobrescribir'>('omitir')
  const [permitirCupoExtra, setPermitirCupoExtra] = useState<boolean>(false)
  const [isPending, setIsPending] = useState(false)
  const [resultado, setResultado] = useState<ResultadoCargaMasiva | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const resetState = () => {
    setArchivo(null)
    setResultado(null)
    setErrorGeneral(null)
    setIsPending(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setArchivo(file)
      setResultado(null)
      setErrorGeneral(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!archivo) {
      setErrorGeneral('Por favor selecciona un archivo Excel (.xlsx o .xls).')
      return
    }

    setIsPending(true)
    setErrorGeneral(null)
    setResultado(null)

    try {
      const formData = new FormData()
      formData.append('archivo', archivo)
      formData.append('modoDuplicados', modoDuplicados)
      if (permitirCupoExtra) {
        formData.append('permitirCupoExtra', 'true')
      }

      const response = await fetch('/api/asistencias/carga-masiva', {
        method: 'POST',
        body: formData,
      })

      const data: ResultadoCargaMasiva & { error?: string } = await response.json()

      if (!response.ok && data.error) {
        setErrorGeneral(data.error)
      } else {
        setResultado(data)
        if (data.ok && (data.creados > 0 || data.actualizados > 0)) {
          router.refresh()
        }
      }
    } catch {
      setErrorGeneral('Error de conexión al subir el archivo. Intenta de nuevo.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetState()
        onOpenChange(val)
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <FileSpreadsheet className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold text-[#002b49]">
                Carga Masiva de Turnos desde Excel
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                Importa decenas o cientos de asistencias de forma simultánea usando una plantilla estructurada.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Paso 1: Descargar plantilla */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#002b49] flex items-center gap-1.5">
                  <Download className="size-4 text-[#004884]" />
                  Paso 1: Descarga la plantilla oficial
                </p>
                <p className="text-xs text-muted-foreground">
                  Incluye las columnas obligatorias y la hoja con todos los trabajadores, vehículos y horarios registrados.
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="shrink-0 bg-white hover:bg-sky-100/50 border-sky-300 text-[#004884] font-semibold"
              >
                <a href="/api/asistencias/plantilla" download="plantilla_carga_turnos_fuentelectric.xlsx">
                  <Download className="size-4 mr-1.5" />
                  Descargar Plantilla (.xlsx)
                </a>
              </Button>
            </div>
          </div>

          {/* Formulario de Carga */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="excel-file" className="text-sm font-semibold text-[#002b49]">
                Paso 2: Selecciona el archivo completado
              </Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  archivo
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-slate-300 hover:border-[#004884] bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  id="excel-file"
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {archivo ? (
                  <div className="flex flex-col items-center text-center gap-1.5">
                    <FileText className="size-8 text-emerald-600" />
                    <p className="text-sm font-semibold text-slate-800">{archivo.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(archivo.size / 1024).toFixed(1)} KB · Clic para cambiar archivo
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center gap-2">
                    <Upload className="size-8 text-slate-400" />
                    <p className="text-sm font-medium text-slate-700">
                      Haz clic para seleccionar tu archivo Excel o arrástralo aquí
                    </p>
                    <p className="text-xs text-muted-foreground">Formatos soportados: .xlsx, .xls</p>
                  </div>
                )}
              </div>
            </div>

            {/* Opciones de Duplicados */}
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Regla para turnos existentes en las mismas fechas:
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label
                  className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    modoDuplicados === 'omitir'
                      ? 'border-[#004884] bg-sky-50 text-[#002b49] font-medium'
                      : 'border-border bg-white text-muted-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="modoDuplicados"
                    value="omitir"
                    checked={modoDuplicados === 'omitir'}
                    onChange={() => setModoDuplicados('omitir')}
                    className="mt-0.5 text-[#004884]"
                  />
                  <div>
                    <span className="block font-semibold">Omitir duplicados (Recomendado)</span>
                    <span className="text-[11px] text-muted-foreground">
                      Si el trabajador ya tiene turno esa fecha, se conserva el actual.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    modoDuplicados === 'sobrescribir'
                      ? 'border-[#004884] bg-sky-50 text-[#002b49] font-medium'
                      : 'border-border bg-white text-muted-foreground'
                  }`}
                >
                  <input
                    type="radio"
                    name="modoDuplicados"
                    value="sobrescribir"
                    checked={modoDuplicados === 'sobrescribir'}
                    onChange={() => setModoDuplicados('sobrescribir')}
                    className="mt-0.5 text-[#004884]"
                  />
                  <div>
                    <span className="block font-semibold">Sobrescribir existentes</span>
                    <span className="text-[11px] text-muted-foreground">
                      Actualiza los datos del turno existente con los del Excel.
                    </span>
                  </div>
                </label>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={permitirCupoExtra}
                    onChange={(e) => setPermitirCupoExtra(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#004884]"
                  />
                  <span>
                    <strong className="font-semibold text-[#002b49]">
                      Permitir más de 3 personas por vehículo (Cupo extra)
                    </strong>
                    <span className="block text-[11px] text-muted-foreground">
                      Actívalo si en este archivo hay unidades que deben llevar personal adicional por encima de su cupo base.
                    </span>
                  </span>
                </label>
              </div>
            </div>
            {errorGeneral && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <XCircle className="size-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Error al procesar el archivo</p>
                  <p className="text-xs">{errorGeneral}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetState()
                  onOpenChange(false)
                }}
                disabled={isPending}
              >
                Cerrar
              </Button>
              <Button
                type="submit"
                disabled={!archivo || isPending}
                className="bg-[#002b49] hover:bg-[#001d32] text-white min-w-[140px]"
              >
                {isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin mr-2" />
                    Procesando…
                  </>
                ) : (
                  <>
                    <Upload className="size-4 mr-2" />
                    Importar Turnos
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Resultado Detallado de la Carga */}
          {resultado && (
            <div className="space-y-3 pt-3 border-t border-border">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  resultado.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                    : 'border-amber-200 bg-amber-50 text-amber-950'
                }`}
              >
                {resultado.ok ? (
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 text-sm flex-1">
                  <p className="font-bold text-base">
                    {resultado.ok ? '¡Procesamiento Completado!' : 'Atención al procesar archivo'}
                  </p>
                  <p className="text-xs">{resultado.mensaje}</p>

                  {/* Resumen numérico */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="outline" className="bg-white/80 border-emerald-300 text-emerald-800 font-semibold">
                      ✓ {resultado.creados} Creados
                    </Badge>
                    {resultado.actualizados > 0 && (
                      <Badge variant="outline" className="bg-white/80 border-blue-300 text-blue-800 font-semibold">
                        ↻ {resultado.actualizados} Actualizados
                      </Badge>
                    )}
                    {resultado.omitidos > 0 && (
                      <Badge variant="outline" className="bg-white/80 border-slate-300 text-slate-700 font-semibold">
                        ⊘ {resultado.omitidos} Omitidos (duplicados)
                      </Badge>
                    )}
                    {resultado.errores.length > 0 && (
                      <Badge variant="outline" className="bg-white/80 border-rose-300 text-rose-800 font-semibold">
                        ✗ {resultado.errores.length} Filas con error
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de Errores por fila */}
              {resultado.errores.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-white p-3.5 space-y-2 max-h-56 overflow-y-auto">
                  <p className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="size-3.5" />
                    Detalle de filas no importadas ({resultado.errores.length}):
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {resultado.errores.map((err, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-rose-50/70 p-2 rounded-lg border border-rose-100">
                        <span className="font-bold text-rose-700 shrink-0 min-w-[50px]">Fila {err.fila}:</span>
                        <span>{err.motivo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

