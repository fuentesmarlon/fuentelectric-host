// PDF · matriz de programación de turnos.
import { jsPDF } from 'jspdf'
import autoTable, { type CellInput, type RowInput } from 'jspdf-autotable'
import {
  obtenerInfoFechaIso,
  type DatosReporteExportacion,
} from '@/lib/reportes-exportacion'

import { PALETA, pdfSafe, obtenerFinalY } from './estilos'
import { dibujarTituloSeccion, dibujarLeyendaProgramacion } from './portada'

export function renderizarMatrizProgramacionPdf(
  doc: jsPDF,
  datos: DatosReporteExportacion,
  marginX: number,
  contentW: number,
  startY: number,
): number {
  let cursorY = dibujarTituloSeccion(
    doc,
    '1. MATRIZ DE PROGRAMACIÓN POR UNIDAD Y CUADRILLA',
    datos.notaMatriz || 'Agrupación operativa por vehículo, horario y área de cobertura',
    marginX,
    contentW,
    startY,
  )

  cursorY = dibujarLeyendaProgramacion(doc, marginX, cursorY + 4)

  if (datos.filasProgramacion.length === 0 || datos.fechasMatriz.length === 0) {
    doc.setFillColor(...PALETA.cardBg)
    doc.setDrawColor(...PALETA.cardBorder)
    doc.roundedRect(marginX, cursorY, contentW, 28, 4, 4, 'FD')
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(...PALETA.textMuted)
    doc.text(
      pdfSafe('No se registran turnos programados en el rango de fechas seleccionado.'),
      marginX + contentW / 2,
      cursorY + 17,
      { align: 'center' },
    )
    return cursorY + 40
  }

  // Las fechas se parten en bloques de hasta 16 días (una quincena por tabla): con más
  // columnas los días ya no caben legibles en una hoja horizontal
  const MAX_DIAS_POR_BLOQUE = 16
  const bloquesFechas: string[][] = []
  for (let i = 0; i < datos.fechasMatriz.length; i += MAX_DIAS_POR_BLOQUE) {
    bloquesFechas.push(datos.fechasMatriz.slice(i, i + MAX_DIAS_POR_BLOQUE))
  }

  bloquesFechas.forEach((fechasBloque, bloqueIdx) => {
    if (bloqueIdx > 0) {
      const pageH = doc.internal.pageSize.getHeight()
      if (cursorY > pageH - 150) {
        doc.addPage()
        cursorY = 44
      } else {
        cursorY += 12
      }
      const fIni = obtenerInfoFechaIso(fechasBloque[0]).ddMmYyyy
      const fFin = obtenerInfoFechaIso(fechasBloque[fechasBloque.length - 1]).ddMmYyyy
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.2)
      doc.setTextColor(...PALETA.corporateBlue)
      doc.text(
        pdfSafe(`Continuación de Matriz  ·  Bloque ${bloqueIdx + 1} de ${bloquesFechas.length} (${fIni} al ${fFin})`),
        marginX,
        cursorY,
      )
      cursorY += 6
    }

    const weekendColSet = new Set<number>()
    const headRow: CellInput[] = ['UNIDAD', 'TRABAJADOR', 'HORARIO', 'ÁREA']
    fechasBloque.forEach((fIso, idx) => {
      const info = obtenerInfoFechaIso(fIso)
      if (info.esFinDeSemana) weekendColSet.add(4 + idx)
      headRow.push(pdfSafe(`${info.diaCorto}\n${info.ddMm}`))
    })
    headRow.push('TOT.', 'EXT.')

    const bodyRows: RowInput[] = []
    let unidadPrevia = ''

    for (const fila of datos.filasProgramacion) {
      if (fila.unidad !== unidadPrevia) {
        unidadPrevia = fila.unidad
        bodyRows.push([
          {
            content: pdfSafe(`UNIDAD ${fila.unidad}   ·   ${fila.areaPrincipal.toUpperCase()}`),
            colSpan: 4 + fechasBloque.length + 2,
            styles: {
              fillColor: PALETA.unitGroupBg,
              textColor: PALETA.navyDark,
              fontStyle: 'bold',
              halign: 'left',
              fontSize: 7.2,
              cellPadding: { top: 2.8, bottom: 2.8, left: 5, right: 4 },
            },
          },
        ])
      }

      let subTurnosBloque = 0
      let subExtrasBloque = 0
      const rowCells: CellInput[] = [
        pdfSafe(fila.unidad),
        pdfSafe(fila.trabajador),
        pdfSafe(fila.horarioPrincipal),
        pdfSafe(fila.areaPrincipal),
      ]

      fechasBloque.forEach((fIso) => {
        const celda = fila.celdasPorFecha[fIso]
        subTurnosBloque += celda.turnosCount
        subExtrasBloque += celda.extrasCount
        rowCells.push(celda.codigo)
      })

      rowCells.push(
        bloquesFechas.length === 1 ? String(fila.totalTurnos) : String(subTurnosBloque),
        bloquesFechas.length === 1 ? String(fila.totalExtras) : String(subExtrasBloque),
      )

      bodyRows.push(rowCells)
    }

    // Fila de cobertura diaria al pie
    const footRow: CellInput[] = [
      {
        content: 'COBERTURA DIARIA ACTIVA',
        colSpan: 4,
        styles: { halign: 'right', fontStyle: 'bold', fillColor: PALETA.navyDark, textColor: PALETA.white },
      },
    ]
    let totalTurnosBloque = 0
    let totalExtrasBloque = 0
    fechasBloque.forEach((fIso) => {
      const c = datos.totalesPorFecha[fIso] || 0
      totalTurnosBloque += c
      footRow.push(String(c))
    })
    for (const fila of datos.filasProgramacion) {
      fechasBloque.forEach((fIso) => {
        totalExtrasBloque += fila.celdasPorFecha[fIso]?.extrasCount || 0
      })
    }
    footRow.push(String(totalTurnosBloque), String(totalExtrasBloque))
    bodyRows.push(footRow)

    const colTotIdx = 4 + fechasBloque.length
    const colExtIdx = 5 + fechasBloque.length

    // Las columnas fijas suman 348 pt; lo que sobra de la hoja se reparte entre los días
    const fixedW = 40 + 114 + 56 + 84 + 28 + 26 // 348pt fijos
    const availableForDates = contentW - fixedW
    const dateColW = Math.max(24, Math.min(38, availableForDates / fechasBloque.length))

    const columnStyles: Record<number, Partial<{ cellWidth: number; halign: 'left' | 'center' | 'right'; fontStyle: 'normal' | 'bold' }>> = {
      0: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 114, halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 56, halign: 'center' },
      3: { cellWidth: 84, halign: 'left' },
      [colTotIdx]: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
      [colExtIdx]: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
    }
    for (let i = 0; i < fechasBloque.length; i++) {
      columnStyles[4 + i] = { cellWidth: dateColW, halign: 'center' }
    }

    autoTable(doc, {
      startY: cursorY,
      head: [headRow],
      body: bodyRows,
      margin: { left: marginX, right: marginX, top: 42, bottom: 28 },
      styles: {
        font: 'helvetica',
        fontSize: 6.9,
        cellPadding: { top: 2.6, bottom: 2.6, left: 2, right: 2 },
        lineColor: PALETA.cardBorder,
        lineWidth: 0.35,
        textColor: PALETA.textPrimary,
        valign: 'middle',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: PALETA.navyDark,
        textColor: PALETA.white,
        fontStyle: 'bold',
        fontSize: 6.7,
        halign: 'center',
        cellPadding: { top: 3.5, bottom: 3.5, left: 1.5, right: 1.5 },
      },
      columnStyles,
      didParseCell(hookData) {
        const col = hookData.column.index
        const rawText = String(hookData.cell.raw ?? '')

        if (hookData.section === 'head') {
          if (col === 1 || col === 3) {
            hookData.cell.styles.halign = 'left'
          }
          if (weekendColSet.has(col)) {
            hookData.cell.styles.fillColor = PALETA.navyWeekend
            hookData.cell.styles.textColor = PALETA.goldSoft
          }
        }

        if (hookData.section === 'body') {
          const isCoverageFooter = hookData.row.index === bodyRows.length - 1
          if (isCoverageFooter && col >= 4) {
            hookData.cell.styles.fillColor = col >= colTotIdx ? PALETA.navyDark : PALETA.navyMid
            hookData.cell.styles.textColor = col >= colTotIdx ? PALETA.white : PALETA.goldSoft
            hookData.cell.styles.fontStyle = 'bold'
            return
          }

          // Color de cada celda según su código (12D, 12N, D…); la paleta está en estilos.ts
          if (col >= 4 && col < colTotIdx) {
            if (rawText === '12D') {
              hookData.cell.styles.fillColor = PALETA.diurnoBg
              hookData.cell.styles.textColor = PALETA.diurnoText
              hookData.cell.styles.fontStyle = 'bold'
            } else if (rawText === '12N') {
              hookData.cell.styles.fillColor = PALETA.nocturnoBg
              hookData.cell.styles.textColor = PALETA.nocturnoText
              hookData.cell.styles.fontStyle = 'bold'
            } else if (rawText === '12D+' || rawText === '12N+' || rawText === '24H') {
              hookData.cell.styles.fillColor = PALETA.extraBg
              hookData.cell.styles.textColor = PALETA.extraText
              hookData.cell.styles.fontStyle = 'bold'
            } else if (rawText === 'D') {
              hookData.cell.styles.fillColor = PALETA.descansoBg
              hookData.cell.styles.textColor = PALETA.textSubtle
            }
          }

          if (col === colExtIdx && Number(rawText) > 0) {
            hookData.cell.styles.fillColor = PALETA.extraBg
            hookData.cell.styles.textColor = PALETA.extraText
          }
        }
      },
    })

    cursorY = obtenerFinalY(doc, cursorY + 40)
  })

  return cursorY + 16
}
