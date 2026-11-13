import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { requerirSesionVigente } from '@/lib/sesion'
import { CambiarContrasenaForm } from './CambiarContrasenaForm'

export const metadata: Metadata = {
  title: 'Cambiar contraseña · Fuentelectric',
  robots: { index: false },
}

// Pantalla obligatoria cuando la cuenta tiene un cambio de contraseña pendiente
// (cuenta nueva o contraseña restablecida). Sin el cambio pendiente, vuelve al panel.
// Usa el mismo fondo que el login (src/app/login/page.tsx).
export default async function CambiarContrasenaPage() {
  const sesion = await requerirSesionVigente()
  if (!sesion.debeCambiarContrasena) redirect('/tableros')

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4 sm:p-6">
      <div className="absolute inset-0 -z-30">
        <Image src="/images/login.jpeg" alt="" fill priority sizes="100vw" className="object-cover object-center scale-[1.02]" />
      </div>
      <div
        className="absolute inset-0 -z-20 bg-gradient-to-tr from-[#b8d5f2]/85 via-[#e2eef9]/75 to-[#c4def5]/85 backdrop-blur-[1px]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.45)_0%,rgba(180,210,240,0.3)_60%,rgba(15,45,80,0.25)_100%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-[420px] rounded-3xl border border-white/95 bg-white p-7 shadow-[0_24px_65px_-12px_rgba(10,38,70,0.28)] sm:p-9">
        <div className="mb-3 flex justify-center">
          <Image
            src="/images/fte-logo.png"
            alt="FTE · Fuentelectric · Trabajando para EEGSA"
            width={172}
            height={80}
            className="h-16 w-auto object-contain"
            priority
          />
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#00274c] sm:text-[26px]">Crea tu contraseña</h1>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
            Hola, <strong className="text-slate-700">{sesion.nombre}</strong>. Antes de entrar al panel,
            elige una contraseña que solo tú conozcas.
          </p>
        </div>

        <CambiarContrasenaForm email={sesion.email} />
      </div>
    </main>
  )
}
