// En qué entorno corre la app. Se define con la variable NEXT_PUBLIC_ENTORNO:
//   produccion · staging · desarrollo
// Si no está definida: "produccion" en un build de producción y "desarrollo" con `next dev`.
// (NEXT_PUBLIC_* se fija al compilar, por eso cada entorno de Vercel necesita su valor.)

export type Entorno = 'produccion' | 'staging' | 'desarrollo'

const VALIDOS: readonly Entorno[] = ['produccion', 'staging', 'desarrollo']

export function obtenerEntorno(valor = process.env.NEXT_PUBLIC_ENTORNO, nodeEnv = process.env.NODE_ENV): Entorno {
  const v = (valor ?? '').trim().toLowerCase() as Entorno
  if (VALIDOS.includes(v)) return v
  return nodeEnv === 'production' ? 'produccion' : 'desarrollo'
}

export const ETIQUETA_ENTORNO: Record<Entorno, string> = {
  produccion: 'Producción',
  staging: 'Staging · datos de prueba',
  desarrollo: 'Desarrollo local',
}
