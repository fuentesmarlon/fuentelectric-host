'use client'

import { createContext, useContext } from 'react'

export const DashboardFontContext = createContext('')

export function useDashboardTheme() {
  return `dashboard-theme ${useContext(DashboardFontContext)}`
}
