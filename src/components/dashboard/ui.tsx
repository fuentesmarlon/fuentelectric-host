'use client'

import type { ComponentProps } from 'react'
import { DialogContent as BaseDialogContent } from '@/components/ui/dialog'
import { AlertDialogContent as BaseAlertDialogContent } from '@/components/ui/alert-dialog'
import { SelectContent as BaseSelectContent } from '@/components/ui/select'
import { SheetContent as BaseSheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useDashboardTheme } from './theme'

// Los diálogos, menús y paneles laterales se dibujan fuera del panel (en un "portal" al
// final de la página), así que no heredan sus colores ni su letra. Estas versiones se los
// pasan. Hoy solo las usa el menú del panel (shell.tsx); los diálogos de las páginas de
// /tableros salen directo de components/ui con los colores generales de globals.css.
export * from '@/components/ui/dialog'
export * from '@/components/ui/alert-dialog'
export * from '@/components/ui/select'
export * from '@/components/ui/sheet'

export function DialogContent({ className, ...props }: ComponentProps<typeof BaseDialogContent>) {
  return <BaseDialogContent className={cn(useDashboardTheme(), 'dashboard-dialog', className)} {...props} />
}

export function AlertDialogContent({ className, ...props }: ComponentProps<typeof BaseAlertDialogContent>) {
  return <BaseAlertDialogContent className={cn(useDashboardTheme(), 'dashboard-alert', className)} {...props} />
}

export function SelectContent({ className, ...props }: ComponentProps<typeof BaseSelectContent>) {
  return <BaseSelectContent className={cn(useDashboardTheme(), className)} {...props} />
}

export function SheetContent({ className, ...props }: ComponentProps<typeof BaseSheetContent>) {
  return <BaseSheetContent className={cn(useDashboardTheme(), className)} {...props} />
}
