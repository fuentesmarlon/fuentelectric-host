import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient(optionsOverride?: { maxAge?: number }) {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const secureOptions = {
                ...options,
                httpOnly: true,
                sameSite: 'lax' as const,
                secure: process.env.NODE_ENV === 'production',
                ...(optionsOverride?.maxAge !== undefined ? { maxAge: optionsOverride.maxAge } : {}),
              }
              cookieStore.set(name, value, secureOptions)
            })
          } catch {
            // Contextos de solo lectura donde setAll no está disponible
          }
        },
      },
    }
  )
}
