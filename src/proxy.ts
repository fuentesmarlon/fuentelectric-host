import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

// En Next.js 16 el antiguo "middleware" se llama "proxy": corre antes de cada página.
// Aquí solo se renueva la sesión de Supabase y se decide a dónde redirigir;
// las reglas están en src/utils/supabase/middleware.ts.
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

// No pasan por el proxy: archivos internos de Next, el favicon, las imágenes y /monitoring
// (por donde los errores del navegador llegan a Sentry, ver next.config.ts; si pasara por
// aquí, a quien no ha iniciado sesión se le redirigiría al login y sus errores se perderían).
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|monitoring|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
