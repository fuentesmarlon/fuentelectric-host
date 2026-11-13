import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, LayoutDashboard } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Página no encontrada · Fuentelectric',
  robots: { index: false },
}

// Página 404 de todo el sitio: se muestra para cualquier dirección que no exista
// (y cuando una página llama a notFound()). Mismo estilo que la pantalla de inicio de sesión.
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4 sm:p-6">
      <div className="absolute inset-0 -z-30">
        <Image
          src="/images/login.jpeg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center scale-[1.02]"
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

      <div className="relative z-10 w-full max-w-[460px] rounded-3xl border border-white/95 bg-white p-7 text-center shadow-[0_24px_65px_-12px_rgba(10,38,70,0.28)] sm:p-9">
        <div className="mb-4 flex justify-center">
          <Image
            src="/images/fte-logo.png"
            alt="FTE · Fuentelectric"
            width={172}
            height={80}
            className="h-14 w-auto object-contain"
            priority
          />
        </div>

        <p className="text-6xl font-extrabold tracking-tight text-[#102D50] sm:text-7xl" aria-hidden="true">
          4<span className="text-[#F2C500]">0</span>4
        </p>
        <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-[#F2E500]" aria-hidden="true" />

        <h1 className="mt-5 text-xl font-bold tracking-tight text-[#00274c] sm:text-2xl">
          Página no encontrada
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          La dirección que buscas no existe o fue movida. Revisa que esté bien escrita
          o vuelve al panel para seguir trabajando.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/tableros"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#102D50] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0B213D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#102D50]"
          >
            <LayoutDashboard className="size-4" aria-hidden="true" />
            Ir al panel
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-[#102D50]/30 hover:text-[#004884] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#102D50]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  )
}
