'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Search, X, ChevronDown, Check, User } from 'lucide-react'

type TrabajadorItem = {
  id: string
  nombre: string
  puesto?: string | null
}

interface TrabajadorComboboxProps {
  id?: string
  name: string
  trabajadores: TrabajadorItem[]
  value: string
  onChange: (trabajadorId: string) => void
  placeholder?: string
  required?: boolean
  opcionActualNoActiva?: { id: string; nombre: string } | null
}

function normalizarBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function TrabajadorCombobox({
  id,
  name,
  trabajadores,
  value,
  onChange,
  placeholder = 'Escribe o selecciona trabajador...',
  required = false,
  opcionActualNoActiva = null,
}: TrabajadorComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const opcionesCompletas = useMemo(() => {
    if (
      opcionActualNoActiva &&
      !trabajadores.some((t) => t.id === opcionActualNoActiva.id)
    ) {
      return [
        {
          id: opcionActualNoActiva.id,
          nombre: `${opcionActualNoActiva.nombre} (No activo)`,
          puesto: null,
        },
        ...trabajadores,
      ]
    }
    return trabajadores
  }, [trabajadores, opcionActualNoActiva])

  const trabajadorSeleccionado = useMemo(
    () => opcionesCompletas.find((t) => t.id === value) ?? null,
    [opcionesCompletas, value],
  )

  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState<string>(trabajadorSeleccionado?.nombre ?? '')
  const [indiceActivo, setIndiceActivo] = useState<number>(0)

  // Sincroniza el texto visible cuando cambia el valor externo (por ejemplo, al limpiar el formulario).
  // Se ajusta durante el render en lugar de en un efecto para evitar un render extra
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const textoSincronizado = !value ? '' : (trabajadorSeleccionado?.nombre ?? null)
  const [textoSincronizadoPrevio, setTextoSincronizadoPrevio] = useState(textoSincronizado)
  if (textoSincronizado !== textoSincronizadoPrevio) {
    setTextoSincronizadoPrevio(textoSincronizado)
    if (textoSincronizado !== null) setBusqueda(textoSincronizado)
  }

  // Validación nativa del navegador para impedir enviar sin seleccionar trabajador válido
  useEffect(() => {
    if (!inputRef.current) return
    if (required && !value) {
      inputRef.current.setCustomValidity('Selecciona un trabajador de la lista.')
    } else {
      inputRef.current.setCustomValidity('')
    }
  }, [required, value, busqueda])

  // Cerrar lista al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAbierto(false)
        if (trabajadorSeleccionado) {
          setBusqueda(trabajadorSeleccionado.nombre)
        } else {
          setBusqueda('')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [trabajadorSeleccionado])

  const filtrados = useMemo(() => {
    const q = normalizarBusqueda(busqueda)
    // Si está abierto y el texto coincide exactamente con el trabajador ya seleccionado, mostramos todos para poder cambiar rápido
    if (!q || (trabajadorSeleccionado && normalizarBusqueda(trabajadorSeleccionado.nombre) === q)) {
      return opcionesCompletas
    }
    return opcionesCompletas.filter((t) => {
      const nombreNorm = normalizarBusqueda(t.nombre)
      const puestoNorm = t.puesto ? normalizarBusqueda(t.puesto) : ''
      return nombreNorm.includes(q) || puestoNorm.includes(q)
    })
  }, [opcionesCompletas, busqueda, trabajadorSeleccionado])

  const seleccionar = (trabajador: TrabajadorItem) => {
    onChange(trabajador.id)
    setBusqueda(trabajador.nombre)
    setAbierto(false)
  }

  const limpiar = () => {
    onChange('')
    setBusqueda('')
    setIndiceActivo(0)
    setAbierto(true)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!abierto && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      setAbierto(true)
      return
    }

    if (!abierto) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceActivo((prev) => (filtrados.length > 0 ? (prev + 1) % filtrados.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceActivo((prev) =>
        filtrados.length > 0 ? (prev - 1 + filtrados.length) % filtrados.length : 0,
      )
    } else if (e.key === 'Enter') {
      if (filtrados.length > 0) {
        e.preventDefault()
        const elegido = filtrados[indiceActivo] ?? filtrados[0]
        if (elegido) seleccionar(elegido)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setAbierto(false)
      setBusqueda(trabajadorSeleccionado?.nombre ?? '')
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          value={busqueda}
          placeholder={placeholder}
          required={required}
          onFocus={() => {
            setAbierto(true)
            setIndiceActivo(0)
          }}
          onChange={(e) => {
            const nuevoTexto = e.target.value
            setBusqueda(nuevoTexto)
            setAbierto(true)
            setIndiceActivo(0)

            if (!nuevoTexto.trim()) {
              onChange('')
              return
            }

            // Si borró o modificó el nombre respecto al trabajador seleccionado, limpiamos el ID hasta que elija uno
            if (trabajadorSeleccionado && nuevoTexto !== trabajadorSeleccionado.nombre) {
              const coincidenciaExacta = opcionesCompletas.find(
                (t) => normalizarBusqueda(t.nombre) === normalizarBusqueda(nuevoTexto),
              )
              onChange(coincidenciaExacta ? coincidenciaExacta.id : '')
            } else if (!trabajadorSeleccionado) {
              const coincidenciaExacta = opcionesCompletas.find(
                (t) => normalizarBusqueda(t.nombre) === normalizarBusqueda(nuevoTexto),
              )
              if (coincidenciaExacta) {
                onChange(coincidenciaExacta.id)
              }
            }
          }}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-14"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {(busqueda || value) && (
            <button
              type="button"
              onClick={limpiar}
              tabIndex={-1}
              aria-label="Limpiar trabajador seleccionado"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Mostrar lista de trabajadores"
            onClick={() => {
              setAbierto((prev) => !prev)
              if (!abierto) inputRef.current?.focus()
            }}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronDown className={`size-4 transition-transform ${abierto ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {abierto && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-white p-1 shadow-lg"
        >
          {filtrados.length === 0 ? (
            <div className="px-3 py-3 text-center text-xs text-muted-foreground">
              No se encontraron trabajadores para «{busqueda}»
            </div>
          ) : (
            filtrados.map((t, idx) => {
              const seleccionado = t.id === value
              const resaltado = idx === indiceActivo
              return (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={seleccionado}
                  onMouseEnter={() => setIndiceActivo(idx)}
                  onMouseDown={(e) => {
                    // Evita que el input pierda foco antes de seleccionar
                    e.preventDefault()
                    seleccionar(t)
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
                    seleccionado
                      ? 'bg-[#EAF2FA] font-semibold text-[#0B213D]'
                      : resaltado
                        ? 'bg-muted/70 text-foreground'
                        : 'text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <User className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{t.nombre}</span>
                  </span>

                  <span className="flex items-center gap-1.5 shrink-0">
                    {t.puesto && (
                      <span className="text-[11px] text-muted-foreground">{t.puesto}</span>
                    )}
                    {seleccionado && <Check className="size-3.5 text-[#004884]" />}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

