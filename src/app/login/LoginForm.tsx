'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  identificarUsuario,
  verificarCodigoOtp,
  reenviarCodigoOtp,
  loginAdmin,
  type IdentificacionResult,
} from './actions'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  LoaderCircle,
  AlertCircle,
  Users,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'

interface LoginFormProps {
  initialError?: string
  error?: string
}

type PasoLogin = 'EMAIL' | 'PASSWORD_STEP' | 'OTP_STEP'

export function LoginForm({ initialError, error }: LoginFormProps) {
  const [paso, setPaso] = useState<PasoLogin>('EMAIL')
  const [email, setEmail] = useState('')
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [codigoOtp, setCodigoOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState(initialError || error || '')
  const [resendSuccess, setResendSuccess] = useState('')
  // Las cuentas de administrador pueden elegir entre contraseña o código por correo
  const [puedeUsarContrasena, setPuedeUsarContrasena] = useState(false)

  const [isPending, startTransition] = useTransition()

  // Temporizador para reenvío de OTP (60 segundos)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // Limpiar mensajes al cambiar de paso
  const cambiarPaso = (nuevoPaso: PasoLogin) => {
    setErrorMsg('')
    setResendSuccess('')
    setPaso(nuevoPaso)
  }

  // PASO 1: Identificar usuario por correo (sin divulgar roles)
  const handleIdentificar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    setResendSuccess('')

    startTransition(async () => {
      const res: IdentificacionResult = await identificarUsuario(email)

      if (!res.ok) {
        setErrorMsg(res.error)
        return
      }

      setNombreUsuario(res.nombre || '')

      if (res.tipo === 'PASSWORD') {
        setPuedeUsarContrasena(true)
        cambiarPaso('PASSWORD_STEP')
      } else {
        setPuedeUsarContrasena(false)
        cambiarPaso('OTP_STEP')
        setCountdown(60) // Iniciar cuenta regresiva de 60 segundos
      }
    })
  }

  // PASO 2A: Envío de contraseña
  const handleLoginSubmit = () => {
    setErrorMsg('')
  }

  // PASO 2B: Validar código de acceso
  const handleVerificarOtp = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    setResendSuccess('')

    if (codigoOtp.length < 6) {
      setErrorMsg('Por favor ingresa el código completo de acceso.')
      return
    }

    startTransition(async () => {
      const res = await verificarCodigoOtp(email, codigoOtp)
      if (!res.ok && res.error) {
        setErrorMsg(res.error)
      }
    })
  }

  // Administradores: en lugar de la contraseña, pedir un código al correo
  const handleUsarCodigo = () => {
    setErrorMsg('')
    setResendSuccess('')
    startTransition(async () => {
      const res = await reenviarCodigoOtp(email)
      if (res.ok) {
        setCodigoOtp('')
        cambiarPaso('OTP_STEP')
        setCountdown(60)
      } else if (res.error) {
        setErrorMsg(res.error)
      }
    })
  }

  // Reenviar código
  const handleReenviarOtp = () => {
    if (countdown > 0 || isPending) return
    setErrorMsg('')
    setResendSuccess('')

    startTransition(async () => {
      const res = await reenviarCodigoOtp(email)
      if (res.ok) {
        setResendSuccess('¡Nuevo código enviado! Revisa tu bandeja de entrada.')
        setCountdown(60)
      } else if (res.error) {
        setErrorMsg(res.error)
      }
    })
  }

  return (
    <div className="w-full">
      {errorMsg && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-5 flex items-start gap-3 rounded-xl border border-red-200/80 bg-red-50/90 p-3.5 text-xs sm:text-sm font-medium text-red-800 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200 text-left"
        >
          <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Atención</span>
            <span className="text-red-700/90 text-xs leading-relaxed">{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Aviso de que se envió un código nuevo */}
      {resendSuccess && (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs sm:text-sm font-medium text-emerald-800 shadow-xs animate-in fade-in duration-200 text-left"
        >
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1 text-xs">{resendSuccess}</div>
        </div>
      )}

      {/* =========================================================================
          ESTADO 1: INGRESO DE CORREO ELECTRÓNICO (TOTALMENTE NEUTRO)
      ========================================================================= */}
      {paso === 'EMAIL' && (
        <form onSubmit={handleIdentificar} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="email-input"
              className="block text-xs sm:text-sm font-semibold text-slate-700"
            >
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                id="email-input"
                name="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="personal@fuentelectric.com"
                disabled={isPending}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#004884] focus:outline-none focus:ring-4 focus:ring-sky-100/70 transition-all shadow-xs disabled:opacity-60"
              />
            </div>
            <p className="text-[11px] text-slate-400 pt-0.5">
              Ingresa tu correo registrado para continuar con la verificación.
            </p>
          </div>

          <button
            type="submit"
            disabled={isPending || !email.trim()}
            className="group relative mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#004884] px-4 text-sm font-semibold text-white shadow-md shadow-[#004884]/25 hover:bg-[#00386c] hover:shadow-lg hover:shadow-[#004884]/35 active:bg-[#002d4f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin text-white" />
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <span>Continuar</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>
      )}

      {/* =========================================================================
          ESTADO 2A: PASO DE CONTRASEÑA (NEUTRO, SIN ETIQUETAS DE ROL)
      ========================================================================= */}
      {paso === 'PASSWORD_STEP' && (
        <form action={loginAdmin} onSubmit={handleLoginSubmit} className="space-y-4">
          <input type="hidden" name="email" value={email} />

          {/* Muestra el correo, pero nunca el rol de la cuenta */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                <ShieldCheck className="size-3 text-slate-600" />
                Autenticación segura
              </span>
              <button
                type="button"
                onClick={() => cambiarPaso('EMAIL')}
                className="text-[11px] font-medium text-slate-500 hover:text-[#004884] hover:underline"
              >
                Cambiar correo
              </button>
            </div>
            <p className="mt-1.5 text-xs font-semibold text-slate-800">
              {nombreUsuario ? `Hola, ${nombreUsuario}` : 'Usuario registrado'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{email}</p>
          </div>

          <div className="space-y-1.5 text-left">
            <label
              htmlFor="password-input"
              className="block text-xs sm:text-sm font-semibold text-slate-700"
            >
              Contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                id="password-input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#004884] focus:outline-none focus:ring-4 focus:ring-sky-100/70 transition-all shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none rounded-md transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="size-4 text-slate-600" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="group relative mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#004884] px-4 text-sm font-semibold text-white shadow-md shadow-[#004884]/25 hover:bg-[#00386c] hover:shadow-lg hover:shadow-[#004884]/35 active:bg-[#002d4f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 transition-all duration-200"
          >
            <span>Iniciar sesión</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          <div className="flex items-center gap-3 text-[11px] text-slate-400" aria-hidden="true">
            <span className="h-px flex-1 bg-slate-200" />o<span className="h-px flex-1 bg-slate-200" />
          </div>
          <button type="button" onClick={handleUsarCodigo} disabled={isPending} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#004884] hover:bg-slate-50 hover:border-[#004884]/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Mail className="size-4" />}
            <span>{isPending ? 'Enviando código…' : 'Recibir un código por correo'}</span>
          </button>
        </form>
      )}

      {/* =========================================================================
          ESTADO 2B: PASO DE CÓDIGO (NEUTRO, SIN ETIQUETAS DE ROL)
      ========================================================================= */}
      {paso === 'OTP_STEP' && (
        <form onSubmit={handleVerificarOtp} className="space-y-4">
          {/* Recordatorio del correo al que se envió el código */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                <Mail className="size-3 text-sky-700" />
                Código de verificación
              </span>
              <button
                type="button"
                onClick={() => cambiarPaso('EMAIL')}
                className="text-[11px] font-medium text-slate-500 hover:text-[#004884] hover:underline"
              >
                Cambiar correo
              </button>
            </div>
            <p className="mt-1.5 text-xs font-semibold text-slate-800">
              {nombreUsuario ? `Hola, ${nombreUsuario}` : 'Usuario registrado'}
            </p>
            <p className="text-[11px] text-slate-600">
              Enviamos un código de acceso a <span className="font-semibold text-slate-800">{email}</span>
            </p>
          </div>

          <div className="space-y-1.5 text-center">
            <label
              htmlFor="otp-input"
              className="block text-xs sm:text-sm font-semibold text-slate-700 text-left"
            >
              Código de acceso
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                id="otp-input"
                name="token"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                required
                autoFocus
                value={codigoOtp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '')
                  setCodigoOtp(val)
                }}
                placeholder="• • • • • • • •"
                disabled={isPending}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-center font-mono text-xl font-bold tracking-[0.35em] text-slate-900 placeholder:text-slate-300 focus:border-[#004884] focus:outline-none focus:ring-4 focus:ring-sky-100/70 transition-all shadow-xs disabled:opacity-60"
              />
            </div>
            <p className="text-[11px] text-slate-400 text-left pt-0.5">
              Revisa tu bandeja de entrada o spam. El código expira en 10 minutos.
            </p>
          </div>

          {/* Temporizador y Reenvío de Código */}
          <div className="flex items-center justify-between pt-1 text-xs">
            {countdown > 0 ? (
              <span className="text-slate-400">
                Reenviar código en{' '}
                <span className="font-semibold text-slate-600">
                  {`00:${countdown.toString().padStart(2, '0')}`}
                </span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleReenviarOtp}
                disabled={isPending}
                className="inline-flex items-center gap-1 font-semibold text-[#004884] hover:underline disabled:opacity-50"
              >
                <RotateCcw className="size-3" />
                Reenviar nuevo código
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending || codigoOtp.length < 6}
            className="group relative mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#004884] px-4 text-sm font-semibold text-white shadow-md shadow-[#004884]/25 hover:bg-[#00386c] hover:shadow-lg hover:shadow-[#004884]/35 active:bg-[#002d4f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin text-white" />
                <span>Verificando código...</span>
              </>
            ) : (
              <>
                <span>Verificar e ingresar</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          {puedeUsarContrasena && (
            <button type="button" onClick={() => cambiarPaso('PASSWORD_STEP')} disabled={isPending} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#004884] hover:bg-slate-50 hover:border-[#004884]/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
              <Lock className="size-4" />
              <span>Usar mi contraseña</span>
            </button>
          )}
        </form>
      )}

      <div className="mt-7 pt-5 border-t border-slate-100/90 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
        <Users className="size-3.5 text-slate-400 shrink-0" />
        <span className="leading-tight">Acceso exclusivo para personal autorizado de Fuentelectric.</span>
      </div>
    </div>
  )
}