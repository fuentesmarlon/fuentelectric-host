'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Campo de contraseña del panel con el botón del ojo para mostrarla u ocultarla.
 * Recibe las mismas props que <Input> (name, required, minLength, onChange…).
 * La pantalla de login y la de «Crea tu contraseña» tienen su propio estilo y no lo usan.
 */
export function InputContrasena({ className, disabled, ...props }: Omit<React.ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input {...props} disabled={disabled} type={visible ? 'text' : 'password'} className={cn('pr-9', className)} />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        disabled={disabled}
        aria-label={visible ? 'Ocultar contraseña' : 'Ver contraseña'}
        aria-pressed={visible}
        title={visible ? 'Ocultar contraseña' : 'Ver contraseña'}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  )
}
