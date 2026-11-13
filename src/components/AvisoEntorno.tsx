import { ETIQUETA_ENTORNO, obtenerEntorno } from '@/lib/entorno'

// Etiqueta fija en una esquina que indica que NO es producción (staging o desarrollo),
// para que nadie confunda un entorno de pruebas con el real. En producción no se muestra.
export function AvisoEntorno() {
  const entorno = obtenerEntorno()
  if (entorno === 'produccion') return null

  const color =
    entorno === 'staging'
      ? 'bg-amber-400 text-amber-950 ring-amber-600/40'
      : 'bg-sky-500 text-white ring-sky-700/40'

  return (
    <div
      role="status"
      aria-label={`Entorno: ${ETIQUETA_ENTORNO[entorno]}`}
      className={`pointer-events-none fixed bottom-3 left-3 z-[200] rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide shadow-md ring-1 ${color}`}
    >
      {ETIQUETA_ENTORNO[entorno]}
    </div>
  )
}
