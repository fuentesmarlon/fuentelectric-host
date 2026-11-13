// Limitador de intentos en memoria (ventana deslizante).
//
// Nota: la memoria es por instancia del servidor. En un despliegue serverless con
// varias instancias el límite es "por instancia", así que frena el abuso casual
// (spam de códigos OTP, enumeración automatizada) pero no a un atacante distribuido.
// Para un límite global usar un almacén compartido (Upstash Redis, tabla en Postgres…).

const registros = new Map<string, number[]>()
let ultimaLimpieza = 0

function limpiar(ahora: number, ventanaMaxMs: number) {
  if (ahora - ultimaLimpieza < 60_000) return
  ultimaLimpieza = ahora
  for (const [clave, marcas] of registros) {
    const vigentes = marcas.filter((t) => ahora - t < ventanaMaxMs)
    if (vigentes.length === 0) registros.delete(clave)
    else registros.set(clave, vigentes)
  }
}

/**
 * Registra un intento para `clave` y devuelve si está permitido.
 * Si se excede el límite, el intento NO se registra y se indica cuántos segundos esperar.
 */
export function consumirIntento(
  clave: string,
  limite: number,
  ventanaMs: number,
  ahora: number = Date.now(),
): { permitido: true } | { permitido: false; reintentarEnSeg: number } {
  limpiar(ahora, Math.max(ventanaMs, 60 * 60 * 1000))

  const marcas = (registros.get(clave) ?? []).filter((t) => ahora - t < ventanaMs)

  if (marcas.length >= limite) {
    registros.set(clave, marcas)
    const reintentarEnSeg = Math.max(1, Math.ceil((marcas[0] + ventanaMs - ahora) / 1000))
    return { permitido: false, reintentarEnSeg }
  }

  marcas.push(ahora)
  registros.set(clave, marcas)
  return { permitido: true }
}

export function mensajeEspera(seg: number): string {
  const minutos = Math.ceil(seg / 60)
  return minutos > 1
    ? `Demasiados intentos. Por favor espera ${minutos} minutos e intenta de nuevo.`
    : 'Demasiados intentos. Por favor espera un momento e intenta de nuevo.'
}
