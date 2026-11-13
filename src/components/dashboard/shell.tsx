'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Popover, Tooltip } from 'radix-ui'
import { Bell, CalendarDays, CheckCircle2, ChevronDown, ChevronsLeft, ChevronsRight, History, KeyRound, LayoutDashboard, LogOut, MapPin, Menu, Truck, Users } from 'lucide-react'
import { ETIQUETA_ROL, esAdministrador, esSuperadmin, type Rol } from '@/lib/roles'
import { logout } from '@/app/tableros/actions'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui'
import { DashboardFontContext, useDashboardTheme } from './theme'
import { FeedbackProvider, useDashboardFeedback } from './feedback'

// acceso: quién ve cada opción del menú (las páginas además lo vuelven a comprobar en el servidor)
const navItems = [
  { href: '/tableros', label: 'Dashboard', icon: LayoutDashboard, acceso: 'todos' },
  { href: '/tableros/asistencias', label: 'Asignación de turnos', icon: CalendarDays, acceso: 'admin' },
  { href: '/tableros/usuarios', label: 'Trabajadores', icon: Users, acceso: 'admin' },
  { href: '/tableros/areas', label: 'Áreas operativas', icon: MapPin, acceso: 'admin' },
  { href: '/tableros/vehiculos', label: 'Vehículos', icon: Truck, acceso: 'admin' },
  { href: '/tableros/historial', label: 'Historial y reportes', icon: History, acceso: 'admin' },
  { href: '/tableros/cuentas', label: 'Cuentas de acceso', icon: KeyRound, acceso: 'superadmin' },
] as const

type ShellProps = { children: ReactNode; role: Rol; name: string; email: string; fontClass: string }

export function DashboardShell(props: ShellProps) {
  return (
    <DashboardFontContext.Provider value={props.fontClass}>
      <FeedbackProvider><ShellContent {...props} /></FeedbackProvider>
    </DashboardFontContext.Provider>
  )
}

function ShellContent({ children, role, name, email }: ShellProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const theme = useDashboardTheme()
  const { notices } = useDashboardFeedback()
  const [seenNoticeId, setSeenNoticeId] = useState(0)
  const unread = notices.filter(notice => notice.id > seenNoticeId).length
  const roleLabel = ETIQUETA_ROL[role] ?? 'Trabajador'
  const puedeVer = (acceso: (typeof navItems)[number]['acceso']) =>
    acceso === 'todos' || (acceso === 'admin' ? esAdministrador(role) : esSuperadmin(role))
  const current = navItems.find(item => item.href === pathname)
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'FE'

  function navigation(isCollapsed: boolean, mobile = false) {
    return (
      <div className="flex h-full flex-col">
        <Link href="/tableros" aria-label="Fuentelectric · Dashboard" onClick={() => setMobileOpen(false)} className="flex h-[112px] shrink-0 items-center justify-center border-b border-white/15 px-3">
          {isCollapsed ? <span className="border-b-2 border-[#F2E500] pb-1 text-xl font-extrabold tracking-tight">FTE</span> : <Image src="/images/logo-bg.png" alt="Fuentelectric" width={176} height={110} className="h-[88px] w-auto object-contain" priority />}
        </Link>
        <p className={`px-5 pt-6 pb-3 text-[10px] font-semibold tracking-[0.16em] text-white/55 uppercase ${isCollapsed ? 'sr-only' : ''}`}>Gestión operativa</p>
        <nav aria-label={mobile ? 'Navegación móvil' : 'Navegación principal'} className={`flex-1 space-y-1 px-2 ${isCollapsed ? 'pt-5' : ''}`}>
          {navItems.filter(item => puedeVer(item.acceso)).map(({ href, label, icon: Icon }) => (
            <Tooltip.Root key={href}>
              <Tooltip.Trigger asChild>
                <Link href={href} aria-current={pathname === href ? 'page' : undefined} aria-label={isCollapsed ? label : undefined} onClick={() => setMobileOpen(false)} className={`dashboard-nav-link ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'}`}>
                  <Icon className="size-[19px] shrink-0" aria-hidden="true" />
                  {!isCollapsed && <span>{label}</span>}
                </Link>
              </Tooltip.Trigger>
              {isCollapsed && <Tooltip.Portal><Tooltip.Content side="right" sideOffset={12} className={`${theme} dashboard-tooltip z-[80] rounded-md px-3 py-2 text-xs shadow-md`}>{label}<Tooltip.Arrow className="fill-foreground" /></Tooltip.Content></Tooltip.Portal>}
            </Tooltip.Root>
          ))}
        </nav>
        <div className="space-y-2 border-t border-white/15 p-2">
          {!mobile && <button type="button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'} aria-expanded={!collapsed} title={collapsed ? 'Expandir menú' : 'Contraer menú'} className={`dashboard-nav-link w-full ${collapsed ? 'justify-center' : 'gap-3 px-4'}`}>
            {collapsed ? <ChevronsRight className="size-[18px]" /> : <ChevronsLeft className="size-[18px]" />}
            {!collapsed && <span>Contraer menú</span>}
          </button>}
          <form action={logout}><button type="submit" title="Cerrar sesión" aria-label="Cerrar sesión" className={`dashboard-nav-link w-full ${isCollapsed ? 'justify-center' : 'gap-3 px-4'}`}><LogOut className="size-[18px]" />{!isCollapsed && <span>Cerrar sesión</span>}</button></form>
        </div>
      </div>
    )
  }

  return (
    <Tooltip.Provider delayDuration={150}>
      <div lang="es" className={`${theme} dashboard-shell relative flex h-dvh overflow-hidden bg-background text-foreground`}>
        {/* Enlace de accesibilidad: primer elemento con Tab, salta el menú. Estilo en dashboard.css */}
        <a href="#dashboard-content" className="dashboard-skip-link">Ir al contenido</a>
        <aside className={`dashboard-sidebar hidden shrink-0 text-white transition-[width] duration-200 md:block ${collapsed ? 'w-[76px]' : 'w-[248px]'}`}>{navigation(collapsed)}</aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-4 lg:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú"><Menu className="size-5" /></Button></SheetTrigger>
                <SheetContent side="left" className="dashboard-sidebar w-[280px] gap-0 border-0 p-0 text-white">
                  <SheetHeader className="sr-only"><SheetTitle>Menú principal</SheetTitle><SheetDescription>Módulos del portal Fuentelectric</SheetDescription></SheetHeader>
                  {navigation(false, true)}
                </SheetContent>
              </Sheet>
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-primary">{current?.label ?? 'Portal operativo'}</p><p className="hidden text-xs text-muted-foreground sm:block">Fuentelectric · Control de asistencias</p></div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
              <Popover.Root onOpenChange={open => { if (open) setSeenNoticeId(notices[0]?.id ?? 0) }}>
                <Popover.Trigger asChild><Button variant="ghost" size="icon" className="relative" aria-label={`Notificaciones${unread ? `: ${unread} nuevas` : ''}`}><Bell className="size-5 text-muted-foreground" />{unread > 0 && <span className="absolute top-1 right-1 size-2 rounded-full bg-[#F2E500] ring-2 ring-white" />}</Button></Popover.Trigger>
                <Popover.Portal><Popover.Content align="end" sideOffset={12} className={`${theme} dashboard-popover w-80`}>
                  <p className="border-b border-border px-4 py-3 text-sm font-semibold">Actividad de esta sesión</p>
                  {notices.length ? <ul className="max-h-72 overflow-y-auto">{notices.map(notice => <li key={notice.id} className="flex gap-2.5 border-b border-border/60 p-4 text-sm last:border-0"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#2E7D32]" />{notice.message}</li>)}</ul> : <div className="px-4 py-6 text-center"><Bell className="mx-auto mb-2 size-6 text-muted-foreground/60" /><p className="text-sm font-medium">Sin actividad reciente</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Aquí aparecerán las confirmaciones de los cambios que realices durante esta sesión.</p></div>}
                </Popover.Content></Popover.Portal>
              </Popover.Root>
              <span className="h-8 border-l border-border" />
              <Popover.Root>
                <Popover.Trigger asChild><button type="button" className="flex items-center gap-2.5 rounded-lg py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Perfil de ${name}`}>
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initials}</span>
                  <span className="hidden max-w-40 sm:block"><span className="block truncate text-sm font-semibold">{name}</span><span className="block text-xs text-muted-foreground">{roleLabel}</span></span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button></Popover.Trigger>
                <Popover.Portal><Popover.Content align="end" sideOffset={12} className={`${theme} dashboard-popover w-64 p-4`}>
                  <p className="truncate text-sm font-semibold">{name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{email}</p><p className="mt-2 text-xs font-medium text-primary">{roleLabel}</p>
                  <form action={logout} className="mt-4 border-t border-border pt-3"><Button type="submit" variant="outline" className="w-full"><LogOut className="size-4" />Cerrar sesión</Button></form>
                </Popover.Content></Popover.Portal>
              </Popover.Root>
            </div>
          </header>
          <main id="dashboard-content" tabIndex={-1} className="dashboard-main min-w-0 flex-1 overflow-y-auto p-4 outline-none lg:p-6 xl:px-7">{children}</main>
        </div>
      </div>
    </Tooltip.Provider>
  )
}
