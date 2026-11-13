'use client' // Los error boundaries deben ser Client Components

import { useEffect, useTransition } from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, LoaderCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Se muestra dentro del panel (el menú lateral sigue visible) cuando falla
// cualquier página de /tableros, por ejemplo si la base de datos no responde.
export default function ErrorTableros({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const [reintentando, startTransition] = useTransition()

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <Card role="alert" className="mx-auto mt-6 max-w-xl">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <AlertTriangle className="size-9 text-destructive" aria-hidden="true" />
        <h2 className="text-lg font-semibold">No pudimos cargar esta sección</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Puede ser un problema temporal de conexión con el servidor. Intenta de nuevo en unos segundos;
          si el problema continúa, comunícalo al administrador del sistema.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Código de referencia: <code className="font-mono">{error.digest}</code>
          </p>
        )}
        <Button
          className="mt-2"
          disabled={reintentando}
          onClick={() => startTransition(() => unstable_retry())}
        >
          {reintentando ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RotateCcw className="size-4" aria-hidden="true" />
          )}
          {reintentando ? 'Reintentando…' : 'Reintentar'}
        </Button>
      </CardContent>
    </Card>
  )
}
