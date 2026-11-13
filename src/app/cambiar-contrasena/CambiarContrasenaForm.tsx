'use client'

import { useActionState, useState } from 'react'
import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle, Lock, LogOut } from 'lucide-react'
import { logout } from '@/app/tableros/actions'
import { LARGO_MINIMO_CONTRASENA } from '@/lib/roles'
import { cambiarContrasena } from './actions'

const ESTILO_CAMPO =
  'h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#004884] focus:outline-none focus:ring-4 focus:ring-sky-100/70 transition-all shadow-xs disabled:opacity-60'

// Cada campo tiene su propio ojo, igual que en la pantalla de inicio de sesión
function CampoContrasena({
  id, label, autoFocus, disabled,
}: { id: string; label: string; autoFocus?: boolean; disabled: boolean }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="space-y-1.5 text-left">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700 sm:text-sm">{label}</label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          required
          minLength={LARGO_MINIMO_CONTRASENA}
          autoFocus={autoFocus}
          autoComplete="new-password"
          placeholder="••••••••"
          disabled={disabled}
          className={ESTILO_CAMPO}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? 'Ocultar contraseña' : 'Ver contraseña'}
          aria-pressed={visible}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
        >
          {visible ? <EyeOff className="size-4 text-slate-600" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  )
}

export function CambiarContrasenaForm({ email }: { email: string }) {
  const [error, action, isPending] = useActionState(cambiarContrasena, null)

  return (
    <div className="w-full space-y-4">
      {error && (
        <div role="alert" aria-live="polite" className="flex items-start gap-3 rounded-xl border border-red-200/80 bg-red-50/90 p-3.5 text-left text-xs font-medium text-red-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
          <span className="leading-relaxed text-red-700/90">{error}</span>
        </div>
      )}

      <form action={action} className="space-y-4">
        {/* Para que el gestor de contraseñas del navegador la guarde con el correo correcto */}
        <input type="text" name="username" value={email} autoComplete="username" readOnly hidden />

        <CampoContrasena id="nueva" label="Contraseña nueva" autoFocus disabled={isPending} />
        <CampoContrasena id="confirmacion" label="Repite la contraseña" disabled={isPending} />
        <p className="text-[11px] text-slate-500">Mínimo {LARGO_MINIMO_CONTRASENA} caracteres.</p>

        <button
          type="submit"
          disabled={isPending}
          className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#004884] px-4 text-sm font-semibold text-white shadow-md shadow-[#004884]/25 transition-all hover:bg-[#00386c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 disabled:opacity-70"
        >
          {isPending && <LoaderCircle className="size-4 animate-spin" />}
          <span>{isPending ? 'Guardando…' : 'Guardar y entrar al panel'}</span>
          {!isPending && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </form>

      {/* Salida por si no quiere hacerlo ahora: la próxima vez que entre se le volverá a pedir */}
      <form action={logout}>
        <button type="submit" className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50">
          <LogOut className="size-4" />
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}
