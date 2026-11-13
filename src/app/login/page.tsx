import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LoginForm } from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4 sm:p-6">
      {/* Fondo: foto con capas de color encima para que la tarjeta resalte.
          La página 404 (src/app/not-found.tsx) usa el mismo fondo; si cambias uno, cambia el otro. */}
      <div className="absolute inset-0 -z-30">
        <Image
          src="/images/login.jpeg"
          alt="Personal técnico y red de distribución eléctrica de Fuentelectric"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center scale-[1.02] filter brightness-[1.03] contrast-[0.98]"
        />
      </div>

      <div
        className="absolute inset-0 -z-20 bg-gradient-to-tr from-[#b8d5f2]/85 via-[#e2eef9]/75 to-[#c4def5]/85 backdrop-blur-[1px]"
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.45)_0%,rgba(180,210,240,0.3)_60%,rgba(15,45,80,0.25)_100%)]"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300/30 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-72 w-72 -translate-x-1/3 -translate-y-2/3 rounded-full bg-amber-200/25 blur-3xl"
        aria-hidden="true"
      />

      {/* Enlace discreto para volver a la landing page pública */}
      <Link
        href="/"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-[#004884] hover:shadow-md"
      >
        <ArrowLeft className="size-3.5" />
        <span>Volver al inicio</span>
      </Link>

      {/* Tarjeta de inicio de sesión */}
      <div className="relative z-10 w-full max-w-[420px] rounded-3xl bg-white p-7 sm:p-9 shadow-[0_24px_65px_-12px_rgba(10,38,70,0.28)] border border-white/95 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex justify-center mb-3">
          <Image
            src="/images/fte-logo.png"
            alt="FTE · Fuentelectric · Trabajando para EEGSA"
            width={172}
            height={80}
            className="h-16 w-auto object-contain drop-shadow-xs"
            priority
          />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#00274c]">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
            Ingresa tus credenciales para acceder al panel de control
          </p>
        </div>

        {/* Los pasos del login (correo → contraseña o código) están en LoginForm.tsx */}
        <LoginForm error={params?.error} />
      </div>
    </main>
  )
}
