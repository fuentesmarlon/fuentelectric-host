// PDF · paleta corporativa y utilidades de texto/posición.
import { jsPDF } from 'jspdf'

export type Rgb = [number, number, number]



export const PALETA = {
  navyDark: [11, 33, 61] as Rgb,
  navyMid: [18, 52, 91] as Rgb,
  navyWeekend: [30, 58, 95] as Rgb,
  corporateBlue: [0, 72, 132] as Rgb,
  goldAccent: [234, 179, 8] as Rgb,
  goldSoft: [253, 224, 71] as Rgb,
  iceText: [203, 213, 225] as Rgb,
  white: [255, 255, 255] as Rgb,
  cardBg: [248, 250, 252] as Rgb,
  cardBorder: [226, 232, 240] as Rgb,
  unitGroupBg: [239, 246, 255] as Rgb,
  zebraBg: [248, 250, 252] as Rgb,
  textPrimary: [15, 23, 42] as Rgb,
  textMuted: [100, 116, 139] as Rgb,
  textSubtle: [160, 174, 192] as Rgb,
  diurnoBg: [220, 252, 231] as Rgb,
  diurnoText: [22, 101, 52] as Rgb,
  nocturnoBg: [219, 234, 254] as Rgb,
  nocturnoText: [30, 64, 175] as Rgb,
  extraBg: [254, 243, 199] as Rgb,
  extraText: [146, 64, 14] as Rgb,
  descansoBg: [248, 250, 252] as Rgb,
  errorBg: [254, 226, 226] as Rgb,
  errorText: [153, 27, 27] as Rgb,
}

/**
 * Normaliza caracteres fuera de WinAnsi/Latin-1 para que la fuente estándar Helvetica de jsPDF
 * nunca muestre glifos corruptos al imprimir o abrir en visores PDF.
 */
export function pdfSafe(texto: string | number | null | undefined): string {
  if (texto === null || texto === undefined) return ''
  return String(texto)
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022\u25B8]/g, '·')
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '')
}

export function obtenerFinalY(doc: jsPDF, fallback: number): number {
  const d = doc as jsPDF & { lastAutoTable?: { finalY?: number } }
  return d.lastAutoTable?.finalY ?? fallback
}
