'use client'

import { createContext, useActionState, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Toast } from 'radix-ui'
import { CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDashboardTheme } from './theme'

type Notice = { id: number; message: string }
const FeedbackContext = createContext<{ notices: Notice[]; notify: (message: string) => void }>({ notices: [], notify: () => {} })

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([])
  const [toasts, setToasts] = useState<Notice[]>([])
  const nextId = useRef(0)
  const theme = useDashboardTheme()
  const notify = useCallback((message: string) => {
    const notice = { id: ++nextId.current, message }
    setNotices(previous => [notice, ...previous].slice(0, 8))
    setToasts(previous => [...previous, notice].slice(-3))
  }, [])

  return (
    <FeedbackContext.Provider value={{ notices, notify }}>
      <Toast.Provider duration={6000} swipeDirection="right" label="Notificación">
        {children}
        {toasts.map(notice => (
          <Toast.Root key={notice.id} className={`${theme} dashboard-toast`} onOpenChange={open => {
            if (!open) setToasts(previous => previous.filter(item => item.id !== notice.id))
          }}>
            <CheckCircle2 className="size-5 shrink-0 text-[#2E7D32]" />
            <Toast.Title className="flex-1 text-sm font-medium">{notice.message}</Toast.Title>
            <Toast.Close asChild><Button variant="ghost" size="icon" aria-label="Cerrar notificación"><X className="size-4" /></Button></Toast.Close>
          </Toast.Root>
        ))}
        <Toast.Viewport className="fixed right-4 bottom-4 z-[100] flex w-[390px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </Toast.Provider>
    </FeedbackContext.Provider>
  )
}

export const useDashboardFeedback = () => useContext(FeedbackContext)

// Envuelve una acción del servidor para mostrar el aviso verde de "guardado".
// Convención de todas las acciones: devuelven null si salió bien, o el texto del error.
// El aviso se lanza aquí (y no en la fila) porque al eliminar un registro su fila
// desaparece de la pantalla antes de poder mostrar nada.
export function useDashboardAction(
  action: (previous: string | null, data: FormData) => Promise<string | null>,
  successMessage: string,
) {
  const { notify } = useDashboardFeedback()
  return useActionState(async (previous: string | null, data: FormData) => {
    try {
      const result = await action(previous, data)
      if (result === null) notify(successMessage)
      return result
    } catch {
      return 'No pudimos confirmar la operación. Revisa tu conexión y actualiza la página para comprobar los datos antes de intentarlo de nuevo.'
    }
  }, null)
}
