// PDF · portada, tarjetas KPI, títulos de sección y leyenda.
import { jsPDF } from 'jspdf'
import { type DatosReporteExportacion } from '@/lib/reportes-exportacion'

import type { Rgb } from './estilos'
import { PALETA, pdfSafe } from './estilos'

export function dibujarBannerPortada(doc: jsPDF, datos: DatosReporteExportacion, pageW: number, marginX: number) {
  doc.setFillColor(...PALETA.navyDark)
  doc.rect(0, 0, pageW, 64, 'F')

  doc.setFillColor(...PALETA.goldAccent)
  doc.rect(0, 64, pageW, 2.5, 'F')

  // Contenedor blanco redondeado para el logotipo corporativo FTE
  doc.setFillColor(...PALETA.white)
  doc.roundedRect(marginX, 10, 96, 44, 5, 5, 'F')

  if (datos.logoBase64) {
    try {
      doc.addImage(`data:image/png;base64,${datos.logoBase64}`, 'PNG', marginX + 6, 13, 84, 38)
    } catch {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...PALETA.corporateBlue)
      doc.text('FTE', marginX + 48, 36, { align: 'center' })
    }
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...PALETA.corporateBlue)
    doc.text('FTE', marginX + 48, 36, { align: 'center' })
  }

  const textX = marginX + 108
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...PALETA.goldSoft)
  doc.text(pdfSafe('FUENTELECTRIC  ·  CONTROL OPERATIVO TRABAJANDO PARA EEGSA'), textX, 22)

  const tituloPrincipal =
    datos.tipoReporte === 'programacion'
      ? 'PROGRAMACIÓN OPERATIVA DE TURNOS POR CUADRILLA'
      : datos.tipoReporte === 'auditoria'
        ? 'BITÁCORA DE AUDITORÍA Y TRAZABILIDAD DE TURNOS'
        : 'REPORTE INTEGRAL DE PROGRAMACIÓN Y AUDITORÍA DE TURNOS'

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...PALETA.white)
  doc.text(pdfSafe(tituloPrincipal), textX, 38)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...PALETA.iceText)
  doc.text(pdfSafe(`Periodo consultado: ${datos.etiquetaPeriodo}`), textX, 51)

  // Metadatos alineados a la derecha
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...PALETA.white)
  doc.text(pdfSafe(`Generado: ${datos.generadoTexto}`), pageW - marginX, 26, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...PALETA.iceText)
  doc.text(pdfSafe('Sistema Digital de Asistencias · Documento Oficial'), pageW - marginX, 39, { align: 'right' })
}

export function dibujarTarjetasKpi(
  doc: jsPDF,
  datos: DatosReporteExportacion,
  marginX: number,
  contentW: number,
  startY: number,
): number {
  const gap = 10
  const cardW = (contentW - gap * 3) / 4
  const cardH = 42

  const tarjetas: Array<{ titulo: string; valor: string; sub: string; acento: Rgb }> =
    datos.tipoReporte === 'auditoria'
      ? [
          {
            titulo: 'MOVIMIENTOS AUDITADOS',
            valor: String(datos.snapshots.length),
            sub: 'Registros en el periodo',
            acento: PALETA.corporateBlue,
          },
          {
            titulo: 'CREACIONES DE TURNO',
            valor: String(datos.snapshots.filter((s) => s.accion === 'CREACION').length),
            sub: 'Nuevas asignaciones',
            acento: PALETA.diurnoText,
          },
          {
            titulo: 'EDICIONES REGISTRADAS',
            valor: String(datos.snapshots.filter((s) => s.accion === 'EDICION').length),
            sub: 'Modificaciones previas',
            acento: PALETA.nocturnoText,
          },
          {
            titulo: 'BAJAS / ELIMINACIONES',
            valor: String(datos.snapshots.filter((s) => s.accion === 'ELIMINACION').length),
            sub: 'Turnos retirados',
            acento: PALETA.errorText,
          },
        ]
      : [
          {
            titulo: 'TURNOS PROGRAMADOS',
            valor: `${datos.kpis.totalTurnos}`,
            sub: `${datos.kpis.totalHoras} horas operativas totales`,
            acento: PALETA.navyDark,
          },
          {
            titulo: 'DISTRIBUCIÓN JORNADA',
            valor: `${datos.kpis.turnosDiurnos} D  /  ${datos.kpis.turnosNocturnos} N`,
            sub: 'Turnos Diurnos vs Nocturnos',
            acento: PALETA.corporateBlue,
          },
          {
            titulo: 'TURNOS EXTRAS',
            valor: `${datos.kpis.turnosExtras}`,
            sub: `${datos.kpis.turnosExtras * 12} h extras cubiertas`,
            acento: PALETA.goldAccent,
          },
          {
            titulo: 'FLOTA Y PERSONAL',
            valor: `${datos.kpis.unidadesActivas} Unid. · ${datos.kpis.trabajadoresActivos} Pers.`,
            sub:
              datos.tipoReporte === 'completo'
                ? `${datos.kpis.totalSnapshots} eventos en auditoría`
                : `${datos.kpis.cuposExtras} cupos extras asignados`,
            acento: PALETA.diurnoText,
          },
        ]

  tarjetas.forEach((card, i) => {
    const x = marginX + i * (cardW + gap)
    doc.setFillColor(...PALETA.cardBg)
    doc.setDrawColor(...PALETA.cardBorder)
    doc.setLineWidth(0.6)
    doc.roundedRect(x, startY, cardW, cardH, 4, 4, 'FD')

    // Barra lateral de acento
    doc.setFillColor(...card.acento)
    doc.roundedRect(x, startY, 3.5, cardH, 2, 2, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...PALETA.textMuted)
    doc.text(pdfSafe(card.titulo), x + 10, startY + 12)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...PALETA.textPrimary)
    doc.text(pdfSafe(card.valor), x + 10, startY + 26.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.setTextColor(...PALETA.textMuted)
    doc.text(pdfSafe(card.sub), x + 10, startY + 36.5)
  })

  return startY + cardH + 14
}

export function dibujarTituloSeccion(
  doc: jsPDF,
  titulo: string,
  subtitulo: string,
  marginX: number,
  contentW: number,
  y: number,
): number {
  const pageH = doc.internal.pageSize.getHeight()
  let cursorY = y
  if (cursorY > pageH - 110) {
    doc.addPage()
    cursorY = 44
  }

  doc.setFillColor(...PALETA.corporateBlue)
  doc.rect(marginX, cursorY, 3.5, 16, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...PALETA.navyDark)
  doc.text(pdfSafe(titulo), marginX + 9, cursorY + 10)

  if (subtitulo) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.8)
    doc.setTextColor(...PALETA.textMuted)
    doc.text(pdfSafe(subtitulo), marginX + contentW, cursorY + 10, { align: 'right' })
  }

  return cursorY + 21
}

export function dibujarLeyendaProgramacion(doc: jsPDF, marginX: number, y: number): number {
  const items: Array<{ code: string; desc: string; bg: Rgb; fg: Rgb }> = [
    { code: '12D', desc: 'Diurno (12h)', bg: PALETA.diurnoBg, fg: PALETA.diurnoText },
    { code: '12N', desc: 'Nocturno (12h)', bg: PALETA.nocturnoBg, fg: PALETA.nocturnoText },
    { code: '12D+ / 12N+', desc: 'Turno Extra', bg: PALETA.extraBg, fg: PALETA.extraText },
    { code: '24H', desc: 'Doble Jornada', bg: PALETA.extraBg, fg: PALETA.extraText },
    { code: 'D', desc: 'Descanso / Libre', bg: PALETA.descansoBg, fg: PALETA.textMuted },
  ]

  let cursorX = marginX
  items.forEach((it) => {
    const badgeW = it.code.length > 4 ? 46 : 24
    doc.setFillColor(...it.bg)
    doc.setDrawColor(...PALETA.cardBorder)
    doc.setLineWidth(0.4)
    doc.roundedRect(cursorX, y - 8, badgeW, 12, 2.5, 2.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(...it.fg)
    doc.text(pdfSafe(it.code), cursorX + badgeW / 2, y + 0.3, { align: 'center' })

    cursorX += badgeW + 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.3)
    doc.setTextColor(...PALETA.textMuted)
    doc.text(pdfSafe(it.desc), cursorX, y + 0.3)
    cursorX += doc.getTextWidth(pdfSafe(it.desc)) + 14
  })

  return y + 9
}
