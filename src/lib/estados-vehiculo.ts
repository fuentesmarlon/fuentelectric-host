import type { EstadoVehiculo as EstadoVehiculoPrisma } from '@prisma/client'

export const ESTADOS_VEHICULO = {
  DISPONIBLE: 'DISPONIBLE',
  EN_TALLER: 'EN_TALLER',
  EN_INSPECCION: 'EN_INSPECCION',
  VENDIDO: 'VENDIDO',
  DADO_DE_BAJA: 'DADO_DE_BAJA',
} as const

export type EstadoVehiculoKey = (typeof ESTADOS_VEHICULO)[keyof typeof ESTADOS_VEHICULO]

export type CategoriaEstadoVehiculo = 'OPERATIVA' | 'MANTENIMIENTO' | 'INACTIVIDAD'

export type EstadoVehiculoInfo = {
  key: EstadoVehiculoKey
  label: string
  shortLabel: string
  descripcion: string
  categoria: CategoriaEstadoVehiculo
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
  badgeClassName: string
  indicador: string
}

export const CATEGORIAS_ESTADO_VEHICULO: Record<
  CategoriaEstadoVehiculo,
  { titulo: string; subtitulo: string; indicador: string }
> = {
  OPERATIVA: {
    titulo: '🟢 Estados de Disponibilidad Operativa',
    subtitulo: 'Representan la situación del vehículo respecto al uso diario o comercial del negocio.',
    indicador: '🟢',
  },
  MANTENIMIENTO: {
    titulo: '🟡 Estados de Mantenimiento y Revisión',
    subtitulo: 'Indican que el vehículo requiere atención técnica y restringen su uso de forma temporal.',
    indicador: '🟡',
  },
  INACTIVIDAD: {
    titulo: '🔴 Estados de Transición Comercial e Inactividad',
    subtitulo: 'Vehículos que salieron definitivamente de la flota.',
    indicador: '🔴',
  },
}

export const ESTADO_VEHICULO_CONFIG: Record<EstadoVehiculoKey, EstadoVehiculoInfo> = {
  DISPONIBLE: {
    key: 'DISPONIBLE',
    label: 'Disponible',
    shortLabel: 'Disponible',
    descripcion: 'El vehículo está libre, completamente operativo y listo para ser asignado, rentado o vendido.',
    categoria: 'OPERATIVA',
    badgeVariant: 'outline',
    badgeClassName: 'status-success',
    indicador: '🟢',
  },
  EN_TALLER: {
    key: 'EN_TALLER',
    label: 'En Taller / Mantenimiento',
    shortLabel: 'En Taller / Mant.',
    descripcion: 'El vehículo está bajo reparación, servicio preventivo o correctivo.',
    categoria: 'MANTENIMIENTO',
    badgeVariant: 'outline',
    badgeClassName: 'status-warning',
    indicador: '🟡',
  },
  EN_INSPECCION: {
    key: 'EN_INSPECCION',
    label: 'En Inspección',
    shortLabel: 'En Inspección',
    descripcion: 'En proceso de revisión técnica, legal o de entrega, antes de cambiar a otro estado.',
    categoria: 'MANTENIMIENTO',
    badgeVariant: 'outline',
    badgeClassName: 'status-warning',
    indicador: '🟡',
  },
  VENDIDO: {
    key: 'VENDIDO',
    label: 'Vendido',
    shortLabel: 'Vendido',
    descripcion: 'El vehículo ya no pertenece a la empresa, pero su historial se conserva en el sistema con fines contables o de auditoría.',
    categoria: 'INACTIVIDAD',
    badgeVariant: 'outline',
    badgeClassName: 'status-error',
    indicador: '🔴',
  },
  DADO_DE_BAJA: {
    key: 'DADO_DE_BAJA',
    label: 'Dado de Baja / Chatarra',
    shortLabel: 'Dado de Baja / Chatarra',
    descripcion: 'Retirado definitivamente del sistema por obsolescencia, pérdida total o destrucción.',
    categoria: 'INACTIVIDAD',
    badgeVariant: 'destructive',
    badgeClassName: 'status-error opacity-85',
    indicador: '🔴',
  },
}

export function obtenerEstadoVehiculoInfo(estado?: string | null): EstadoVehiculoInfo {
  if (estado && estado in ESTADO_VEHICULO_CONFIG) {
    return ESTADO_VEHICULO_CONFIG[estado as EstadoVehiculoKey]
  }
  return ESTADO_VEHICULO_CONFIG.DISPONIBLE
}


// Comprobación en tiempo de compilación: la lista de arriba debe coincidir exactamente
// con el enum `EstadoVehiculo` de prisma/schema.prisma. Si alguien agrega o quita un
// estado en un solo lado, TypeScript marcará error aquí.
// (Se usa `import type` para no incluir @prisma/client en el bundle del navegador.)
type MismasClaves<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const _estadosVehiculoSincronizados: MismasClaves<EstadoVehiculoKey, EstadoVehiculoPrisma> = true
void _estadosVehiculoSincronizados
