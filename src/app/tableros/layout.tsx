import { requerirSesion } from '@/lib/sesion'
import { Inter } from 'next/font/google'
import { DashboardShell } from '@/components/dashboard/shell'
import './dashboard.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-dashboard-inter', display: 'swap' })

export default async function TableroLayout({ children }: { children: React.ReactNode }) {
  // Sesión compartida (cacheada) con la página; incluye el control de caducidad
  const sesion = await requerirSesion()

  return (
    <DashboardShell
      role={sesion.rol}
      name={sesion.nombre}
      email={sesion.email}
      fontClass={inter.variable}
    >
      {children}
    </DashboardShell>
  )
}
