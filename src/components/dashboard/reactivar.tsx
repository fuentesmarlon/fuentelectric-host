'use client'

import { LoaderCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDashboardAction } from './feedback'

/**
 * Botón de un clic que reemplaza al de "Eliminar" cuando el registro está desactivado.
 * Reactivar no es destructivo, así que no pide confirmación; muestra un aviso al terminar.
 */
export function BotonReactivar({
  id,
  accion,
  etiqueta,
  mensajeExito,
}: {
  id: string
  accion: (previous: string | null, data: FormData) => Promise<string | null>
  /** Texto accesible y de ayuda, p. ej. "Reactivar área Escuintla" */
  etiqueta: string
  mensajeExito: string
}) {
  const [error, action, isPending] = useDashboardAction(accion, mensajeExito)

  return (
    <form action={action} className="inline-flex items-center">
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={isPending}
        title={error ?? etiqueta}
        aria-label={etiqueta}
        className={
          error
            ? 'text-destructive hover:text-destructive hover:bg-destructive/10'
            : 'text-[#2E7D32] hover:text-[#2E7D32] hover:bg-[#2E7D32]/10'
        }
      >
        {isPending ? (
          <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
        )}
      </Button>
      {error && (
        <span role="alert" className="ml-1 max-w-48 text-left text-xs leading-tight text-destructive">
          {error}
        </span>
      )}
    </form>
  )
}
