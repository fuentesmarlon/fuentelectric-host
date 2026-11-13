import { prisma } from '@/lib/prisma'
import { requerirSuperadminPagina } from '@/lib/sesion'
import { createAdminClient } from '@/utils/supabase/admin'
import CuentasClient, { type Cuenta } from './CuentasClient'

// Cuentas de acceso (solo superadministrador). Los nombres y roles salen de la tabla
// Usuario; el último acceso sale de Supabase Auth, que es quien registra los inicios de sesión.
export default async function CuentasPage() {
  const sesion = await requerirSuperadminPagina()

  const usuarios = await prisma.usuario.findMany({ orderBy: { nombre: 'asc' } })

  const ultimoAcceso = new Map<string, string | null>()
  try {
    const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 })
    for (const u of data?.users ?? []) ultimoAcceso.set(u.id, u.last_sign_in_at ?? null)
  } catch {
    // Sin conexión con Supabase Auth la página igual funciona; solo no muestra el último acceso
  }

  const cuentas: Cuenta[] = usuarios.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    debeCambiarContrasena: u.debeCambiarContrasena,
    ultimoAcceso: ultimoAcceso.get(u.id) ?? null,
    esPropia: u.id === sesion.id,
  }))

  return <CuentasClient cuentas={cuentas} />
}
