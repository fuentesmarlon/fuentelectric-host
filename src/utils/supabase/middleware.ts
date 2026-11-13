import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Se ejecuta antes de cada página (ver src/proxy.ts). Hace dos cosas:
//  1. Renueva la sesión de Supabase y reescribe sus cookies (por eso se crea aquí un cliente propio).
//  2. Decide a dónde mandar al usuario según si inició sesión o no.
// Que un usuario pueda entrar a /tableros no significa que sea admin: eso lo revisa
// cada página y cada acción con lib/sesion.ts y lib/auth.ts.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            const secureOptions = {
              ...options,
              httpOnly: true,
              sameSite: 'lax' as const,
              secure: process.env.NODE_ENV === 'production',
            }
            supabaseResponse.cookies.set(name, value, secureOptions)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Páginas que se ven sin iniciar sesión: la portada pública y el login
  const isHomePage = request.nextUrl.pathname === '/'
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth')

  // Sin sesión, cualquier otra dirección (exista o no) lleva al login.
  // Así alguien de fuera no puede averiguar qué secciones tiene el sistema.
  if (!user && !isHomePage && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Sesión caducada (la detecta lib/sesion.ts y manda a /login?expirada=1): se cierra aquí, donde sí se
  // pueden borrar las cookies, y se muestra el login con el mensaje de error.
  if (user && isAuthPage && request.nextUrl.searchParams.get('expirada') === '1') {
    await supabase.auth.signOut()
    return supabaseResponse
  }

  // Con sesión iniciada, la portada y el login llevan directo al panel
  if (user && (isAuthPage || isHomePage)) {
    const url = request.nextUrl.clone()
    url.pathname = '/tableros'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
