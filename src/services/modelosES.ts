import { Document, Profile } from '../types';
import { getLocalYear } from '../utils/date';

type jsPDFWithAutoTable = import('jspdf').jsPDF & { lastAutoTable: { finalY: number } };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResumenTrimestral {
  quarter: 1 | 2 | 3 | 4;
  year: number;
  invoices: Document[];
  rectificativas: Document[];
  expenses: Document[];
  totalIngresos: number;
  totalGastos: number;
  ivaRepercutida: number;
  ivaSoportada: number;
  diferenciaIVA: number;
  baseImponible130: number;
  cuotaIRPF: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const QUARTER_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: '1er Trimestre (Ene–Mar)',
  2: '2º Trimestre (Abr–Jun)',
  3: '3er Trimestre (Jul–Sep)',
  4: '4º Trimestre (Oct–Dic)',
};

export function getCurrentQuarter(): 1 | 2 | 3 | 4 {
  const m = new Date().getMonth();
  if (m < 3) return 1;
  if (m < 6) return 2;
  if (m < 9) return 3;
  return 4;
}

function getQuarterRange(quarter: 1 | 2 | 3 | 4, year: number): { start: Date; end: Date } {
  const startMonths = [0, 3, 6, 9];
  const endMonths   = [2, 5, 8, 11];
  const sm = startMonths[quarter - 1];
  const em = endMonths[quarter - 1];
  return {
    start: new Date(year, sm, 1, 0, 0, 0, 0),
    end:   new Date(year, em + 1, 0, 23, 59, 59, 999), // last day of end month, end of day
  };
}

function fmtES(n: number): string {
  return `€ ${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Calculation ──────────────────────────────────────────────────────────────

export function calcularTrimestre(
  documents: Document[],
  quarter: 1 | 2 | 3 | 4,
  year: number
): ResumenTrimestral {
  const { start, end } = getQuarterRange(quarter, year);

  const inRange = (d: Document) => {
    const parts = d.date.split('T')[0].split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date >= start && date <= end;
  };

  const invoices      = documents.filter(d => d.type === 'invoice' && inRange(d));
  // factura_rectificativa: filtered by its OWN date (d.date), not the original invoice date
  const rectificativas = documents.filter(d => d.type === 'factura_rectificativa' && inRange(d));
  const expenses      = documents.filter(d => d.type === 'expense' && inRange(d));

  const totalIngresos = invoices.reduce((sum, d) => sum + d.amount, 0)
                      - rectificativas.reduce((sum, d) => sum + d.amount, 0);
  const totalGastos   = expenses.reduce((sum, d) => sum + d.amount, 0);

  const ivaRepercutida = invoices.reduce((sum, d) => sum + d.amount * ((d.ivaRate ?? 0) / 100), 0)
                       - rectificativas.reduce((sum, d) => sum + d.amount * ((d.ivaRate ?? 0) / 100), 0);
  const ivaSoportada   = expenses
    .filter(d => (d.ivaRate ?? 0) > 0)
    .reduce((sum, d) => sum + d.amount * ((d.ivaRate ?? 0) / 100), 0);

  const baseImponible130 = Math.max(0, totalIngresos - totalGastos);
  const cuotaIRPF        = baseImponible130 * 0.20;

  return {
    quarter, year,
    invoices, rectificativas, expenses,
    totalIngresos, totalGastos,
    ivaRepercutida, ivaSoportada,
    diferenciaIVA: ivaRepercutida - ivaSoportada,
    baseImponible130, cuotaIRPF,
  };
}

// ─── PDF Generation ───────────────────────────────────────────────────────────

export async function generateResumenPDF(resumen: ResumenTrimestral, profile: Profile): Promise<import('jspdf').jsPDF> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;

  const W = 210, M = 16, R = W - M;
  const black:     [number, number, number] = [15, 23, 42];
  const grey:      [number, number, number] = [100, 116, 139];
  const lightGrey: [number, number, number] = [226, 232, 240];
  const primary:   [number, number, number] = [79, 70, 229];
  const bgLight:   [number, number, number] = [248, 250, 252];

  const nif = profile.nie || profile.piva || '';
  const { invoices, rectificativas, expenses, totalIngresos, totalGastos,
          ivaRepercutida, ivaSoportada, diferenciaIVA,
          baseImponible130, cuotaIRPF } = resumen;

  // ── Header ─────────────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(...primary);
  pdf.text('SOLVY', M, 18);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...grey);
  pdf.text('Resumen Trimestral', M, 25);

  // Freelancer info (right)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...black);
  pdf.text(profile.name, R, 14, { align: 'right' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...grey);
  const infoLines: string[] = [];
  if (nif) infoLines.push(`NIF/NIE: ${nif}`);
  if (profile.address) infoLines.push(profile.address);
  if (profile.email) infoLines.push(profile.email);
  infoLines.forEach((line, i) => pdf.text(line, R, 20 + i * 5, { align: 'right' }));

  // ── Title ──────────────────────────────────────────────────────────────────
  pdf.setDrawColor(...lightGrey);
  pdf.setLineWidth(0.4);
  pdf.line(M, 32, R, 32);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(...black);
  pdf.text(`T${resumen.quarter} ${resumen.year} — ${QUARTER_LABELS[resumen.quarter]}`, M, 40);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...grey);
  const reportDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  pdf.text(`Generado el ${reportDate}`, R, 40, { align: 'right' });

  pdf.line(M, 44, R, 44);

  let y = 52;

  // ── INGRESOS table ─────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...grey);
  pdf.text('INGRESOS', M, y);
  y += 4;

  const red: [number, number, number] = [220, 38, 38];
  const allIngresosDocs = [...invoices, ...rectificativas.map(d => ({ ...d, _isRect: true as const }))];
  const invoiceRows = allIngresosDocs.length > 0
    ? allIngresosDocs.map(d => {
        const isRect = d.type === 'factura_rectificativa';
        const sign = isRect ? -1 : 1;
        const base = sign * d.amount;
        const iva = base * ((d.ivaRate ?? 0) / 100);
        return [
          d.invoiceNumber || '—',
          isRect ? `↩ ${d.client || d.title}` : (d.client || d.title),
          new Date(d.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          fmtES(base),
          d.ivaRate ? `${d.ivaRate}%` : '—',
          fmtES(base + iva),
        ];
      })
    : [['—', 'No hay facturas en este período', '', '', '', '']];

  autoTable(pdf, {
    startY: y,
    head: [['N° Factura', 'Cliente/Descripción', 'Fecha', 'Base', 'IVA', 'Total']],
    body: invoiceRows,
    ...(allIngresosDocs.length > 0 ? {
      foot: [['', 'TOTAL INGRESOS', '', fmtES(totalIngresos), '', fmtES(totalIngresos + ivaRepercutida)]],
      footStyles: { fillColor: bgLight, textColor: black, fontStyle: 'bold', fontSize: 8 },
    } : {}),
    didParseCell: (data) => {
      if (data.section === 'body') {
        const doc = allIngresosDocs[data.row.index];
        if (doc?.type === 'factura_rectificativa') {
          (data.cell.styles as { textColor: unknown }).textColor = red;
        }
      }
    },
    styles: { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: black },
    headStyles: { fillColor: bgLight, textColor: grey, fontStyle: 'bold', fontSize: 7, lineColor: lightGrey, lineWidth: 0.3 },
    bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22 },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: M, right: M },
    tableLineColor: lightGrey,
    tableLineWidth: 0.3,
  });

  y = pdf.lastAutoTable.finalY + 8;
  if (y > 220) { pdf.addPage(); y = 20; }

  // ── GASTOS table ───────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...grey);
  pdf.text('GASTOS', M, y);
  y += 4;

  const expenseRows = expenses.length > 0
    ? expenses.map(d => {
        const rate = d.ivaRate ?? 0;
        const ivaAmt = d.amount * (rate / 100);
        return [
          d.title,
          d.category || '—',
          new Date(d.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          fmtES(d.amount),
          rate > 0 ? `${rate}%` : '—',
          rate > 0 ? fmtES(ivaAmt) : '—',
        ];
      })
    : [['No hay gastos en este período', '', '', '', '', '']];

  autoTable(pdf, {
    startY: y,
    head: [['Descripción', 'Categoría', 'Fecha', 'Base', 'IVA', 'Cuota IVA']],
    body: expenseRows,
    ...(expenses.length > 0 ? {
      foot: [['TOTAL GASTOS', '', '', fmtES(totalGastos), '', `- ${fmtES(ivaSoportada)}`]],
      footStyles: { fillColor: bgLight, textColor: black, fontStyle: 'bold', fontSize: 8 },
    } : {}),
    styles: { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: black },
    headStyles: { fillColor: bgLight, textColor: grey, fontStyle: 'bold', fontSize: 7, lineColor: lightGrey, lineWidth: 0.3 },
    bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 28 },
      2: { cellWidth: 20 },
      3: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: M, right: M },
    tableLineColor: lightGrey,
    tableLineWidth: 0.3,
  });

  y = pdf.lastAutoTable.finalY + 10;
  if (y > 210) { pdf.addPage(); y = 20; }

  // ── Fiscal sections (2 columns) ────────────────────────────────────────────
  pdf.setDrawColor(...lightGrey);
  pdf.setLineWidth(0.4);
  pdf.line(M, y, R, y);
  y += 8;

  const colW  = 84;
  const col1  = M;
  const col2  = M + colW + 6;

  // Section titles
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...grey);
  pdf.text('MODELO 130 — PAGO FRACCIONADO IRPF', col1, y);
  pdf.text('MODELO 303 — DECLARACIÓN IVA TRIMESTRAL', col2, y);
  y += 5;

  // ── Modelo 130 rows (left column) ──────────────────────────────────────────
  const rows130: [string, string][] = [
    ['Total ingresos',       fmtES(totalIngresos)],
    ['Gastos deducibles',    `- ${fmtES(totalGastos)}`],
    ['Rendimiento neto',     fmtES(baseImponible130)],
    ['Tipo pago fraccionado','20%'],
  ];

  const startFiscalY = y;
  let y130 = startFiscalY;

  rows130.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...grey);
    pdf.text(label, col1 + 2, y130 + 4);
    pdf.setTextColor(...black);
    pdf.text(value, col1 + colW - 2, y130 + 4, { align: 'right' });
    pdf.setDrawColor(...lightGrey);
    pdf.setLineWidth(0.2);
    pdf.line(col1, y130 + 7, col1 + colW, y130 + 7);
    y130 += 7;
  });
  // Total 130
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...black);
  pdf.text('Cuota a ingresar', col1 + 2, y130 + 5);
  pdf.setTextColor(...primary);
  pdf.text(fmtES(cuotaIRPF), col1 + colW - 2, y130 + 5, { align: 'right' });
  y130 += 9;

  // ── Modelo 303 rows (right column) ─────────────────────────────────────────
  const rows303: [string, string][] = [
    ['IVA repercutida (devengada)',    fmtES(ivaRepercutida)],
    ['IVA soportada (deducible)*',    `- ${fmtES(ivaSoportada)}`],
    ['', ''],
    ['', ''],
  ];

  let y303 = startFiscalY;
  rows303.forEach(([label, value]) => {
    if (label) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...grey);
      pdf.text(label, col2 + 2, y303 + 4);
      pdf.setTextColor(...black);
      pdf.text(value, col2 + colW - 2, y303 + 4, { align: 'right' });
    }
    pdf.setDrawColor(...lightGrey);
    pdf.setLineWidth(0.2);
    pdf.line(col2, y303 + 7, col2 + colW, y303 + 7);
    y303 += 7;
  });
  // Total 303
  const isDevolver = diferenciaIVA < 0;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...black);
  pdf.text(isDevolver ? 'A devolver' : 'A ingresar', col2 + 2, y303 + 5);
  const amtColor: [number, number, number] = isDevolver ? [16, 185, 129] : [229, 70, 70];
  pdf.setTextColor(...amtColor);
  pdf.text(fmtES(Math.abs(diferenciaIVA)), col2 + colW - 2, y303 + 5, { align: 'right' });
  y303 += 9;

  y = Math.max(y130, y303) + 6;

  // IVA note — solo se ivaSoportada è zero avvisa l'utente
  if (ivaSoportada === 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(...grey);
    pdf.text('* IVA soportada: €0,00. Añade el tipo de IVA al registrar los gastos para calcular la deducción correctamente.', M, y);
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footerY = pdf.internal.pageSize.height - 14;
  pdf.setDrawColor(...lightGrey);
  pdf.setLineWidth(0.4);
  pdf.line(M, footerY, R, footerY);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...grey);
  pdf.text('Documento generado con Solvy — solvyapp.com', M, footerY + 5);
  pdf.text(`T${resumen.quarter} ${resumen.year}`, R, footerY + 5, { align: 'right' });

  return pdf;
}

// ─── Download ─────────────────────────────────────────────────────────────────

export async function buildResumenPDFBlob(
  documents: Document[],
  profile: Profile,
  quarter: 1 | 2 | 3 | 4,
  year: number
): Promise<{ blob: Blob; fileName: string }> {
  const resumen = calcularTrimestre(documents, quarter, year);
  const pdf = await generateResumenPDF(resumen, profile);
  const nif = (profile.nie || profile.piva || 'SINIF').replace(/\s/g, '');
  const fileName = `ES_${nif}_resumen_T${quarter}_${year}.pdf`;
  return { blob: pdf.output('blob'), fileName };
}

export async function downloadResumenTrimestral(
  documents: Document[],
  profile: Profile,
  quarter: 1 | 2 | 3 | 4,
  year: number
): Promise<void> {
  const resumen = calcularTrimestre(documents, quarter, year);
  const pdf = await generateResumenPDF(resumen, profile);
  const nif = (profile.nie || profile.piva || 'SINIF').replace(/\s/g, '');
  const filename = `ES_${nif}_resumen_T${quarter}_${year}.pdf`;
  const blob = pdf.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: filename });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ─── Libro Registro Facturas Emitidas ─────────────────────────────────────────

export async function generateLibroEmitidaBlob(
  documents: Document[],
  profile: Profile,
  year: number
): Promise<{ blob: Blob; fileName: string }> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;
  const W = 297, M = 12, R = W - M;
  const black:     [number, number, number] = [15, 23, 42];
  const grey:      [number, number, number] = [100, 116, 139];
  const lightGrey: [number, number, number] = [226, 232, 240];
  const primary:   [number, number, number] = [79, 70, 229];
  const aeat:      [number, number, number] = [37, 99, 235];
  const red:       [number, number, number] = [220, 38, 38];

  const currentYr = new Date().getFullYear();
  const yearsActive = profile.annoInizioAttivita ? currentYr - profile.annoInizioAttivita : 10;
  const retencionRate = yearsActive <= 3 ? 7 : 15;
  const defaultIvaRate = profile.ivaHabitual ?? 21;
  const taxId = profile.nie || profile.piva || '';
  const fmtES = (n: number) => `€ ${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const libroDocs = documents
    .filter(d => (d.type === 'invoice' || d.type === 'factura_rectificativa') && getLocalYear(d.date) === year)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(...black);
  pdf.text('LIBRO REGISTRO DE FACTURAS EMITIDAS', M, 14);

  pdf.setFillColor(...aeat);
  pdf.roundedRect(R - 22, 8, 22, 8, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(255, 255, 255);
  pdf.text('AEAT', R - 11, 13.2, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...grey);
  pdf.text(`${profile.name}${taxId ? ` · NIF/NIE: ${taxId}` : ''} · Ejercicio ${year}`, M, 20);
  pdf.setDrawColor(...lightGrey);
  pdf.setLineWidth(0.4);
  pdf.line(M, 23, R, 23);

  let totalBase = 0, totalCuotaIva = 0, totalRetencion = 0, totalFactura = 0;

  const rows = libroDocs.map(doc => {
    const isRect = doc.type === 'factura_rectificativa';
    const sign = isRect ? -1 : 1;
    const base = sign * doc.amount;
    const ivaRate = doc.ivaRate ?? defaultIvaRate;
    const cuotaIva = base * (ivaRate / 100);
    const retPct = doc.ritenuta ? retencionRate : 0;
    const impRet = doc.ritenuta ? base * (retencionRate / 100) : 0;
    const total = base + cuotaIva - impRet;
    totalBase += base; totalCuotaIva += cuotaIva; totalRetencion += impRet; totalFactura += total;
    return [
      doc.invoiceNumber || '—',
      new Date(doc.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      doc.clientPiva && doc.clientPiva !== 'Privato' ? doc.clientPiva : '—',
      doc.client || doc.title || '—',
      fmtES(base), `${ivaRate}%`, fmtES(cuotaIva),
      retPct > 0 ? `${retPct}%` : '—',
      retPct > 0 ? fmtES(impRet) : '—',
      fmtES(total),
    ];
  });

  rows.push(['', '', '', 'TOTAL', fmtES(totalBase), '', fmtES(totalCuotaIva), '', fmtES(totalRetencion), fmtES(totalFactura)]);

  autoTable(pdf, {
    startY: 26,
    head: [['Nº Factura', 'Fecha Exp.', 'NIF/NIE Dest.', 'Nombre/Razón Social', 'Base Imponible', 'Tipo IVA', 'Cuota IVA', 'Ret. IRPF', 'Imp. Ret.', 'Total Factura']],
    body: rows,
    styles: { fontSize: 7.5, cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }, textColor: black },
    headStyles: { fillColor: [241, 245, 249], textColor: grey, fontStyle: 'bold', fontSize: 7, lineColor: lightGrey, lineWidth: 0.3 },
    bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 22 }, 1: { cellWidth: 20 }, 2: { cellWidth: 24 }, 3: { cellWidth: 'auto' },
      4: { cellWidth: 24, halign: 'right' }, 5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 22, halign: 'right' }, 7: { cellWidth: 14, halign: 'center' },
      8: { cellWidth: 22, halign: 'right' }, 9: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: M, right: M },
    tableLineColor: lightGrey,
    tableLineWidth: 0.3,
    didParseCell: (data) => {
      const isLastRow = data.row.index === rows.length - 1;
      if (data.section === 'body' && isLastRow) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = primary;
      }
      if (data.section === 'body' && !isLastRow) {
        const doc = libroDocs[data.row.index];
        if (doc?.type === 'factura_rectificativa') data.cell.styles.textColor = red;
      }
    },
  });

  const fy = (pdf.lastAutoTable?.finalY ?? 26) + 8;
  pdf.setDrawColor(...lightGrey); pdf.setLineWidth(0.3); pdf.line(M, fy, R, fy);
  pdf.setFont('helvetica', 'italic'); pdf.setFontSize(6.5); pdf.setTextColor(...grey);
  pdf.text('Libro registro generado con Solvy. Estimación indicativa — verifica con tu gestor o asesor fiscal.', M, fy + 4);
  pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')} · Ejercicio ${year}`, R, fy + 4, { align: 'right' });

  const nif = (profile.nie || profile.piva || 'SINIF').replace(/\s/g, '');
  return { blob: pdf.output('blob'), fileName: `ES_${nif}_libro_registro_facturas_${year}.pdf` };
}

// ─── Libro Registro Facturas Recibidas ────────────────────────────────────────

export async function generateLibroRecibidaBlob(
  documents: Document[],
  profile: Profile,
  year: number
): Promise<{ blob: Blob; fileName: string }> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;
  const W = 297, M = 12, R = W - M;
  const black:     [number, number, number] = [15, 23, 42];
  const grey:      [number, number, number] = [100, 116, 139];
  const lightGrey: [number, number, number] = [226, 232, 240];
  const primary:   [number, number, number] = [79, 70, 229];
  const aeat:      [number, number, number] = [37, 99, 235];

  const taxId = profile.nie || profile.piva || '';
  const fmtES = (n: number) => `€ ${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const recibidaDocs = documents
    .filter(d => d.type === 'expense' && getLocalYear(d.date) === year)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(...black);
  pdf.text('LIBRO REGISTRO DE FACTURAS RECIBIDAS', M, 14);

  pdf.setFillColor(...aeat);
  pdf.roundedRect(R - 22, 8, 22, 8, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(255, 255, 255);
  pdf.text('AEAT', R - 11, 13.2, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...grey);
  pdf.text(`${profile.name}${taxId ? ` · NIF/NIE: ${taxId}` : ''} · Ejercicio ${year}`, M, 20);
  pdf.setDrawColor(...lightGrey);
  pdf.setLineWidth(0.4);
  pdf.line(M, 23, R, 23);

  let totalBase = 0, totalCuotaIva = 0, totalFactura = 0;

  const rows = recibidaDocs.map((doc, i) => {
    const ivaRate = doc.ivaRate ?? 0;
    const cuotaIva = doc.amount * (ivaRate / 100);
    const total = doc.amount + cuotaIva;
    totalBase += doc.amount; totalCuotaIva += cuotaIva; totalFactura += total;
    return [
      `FREC${String(i + 1).padStart(3, '0')}/${new Date(doc.date).getFullYear()}`,
      new Date(doc.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      '—',
      doc.title || doc.category || '—',
      fmtES(doc.amount),
      ivaRate > 0 ? `${ivaRate}%` : '—',
      ivaRate > 0 ? fmtES(cuotaIva) : '—',
      fmtES(total),
    ];
  });

  rows.push(['', '', '', 'TOTAL', fmtES(totalBase), '', fmtES(totalCuotaIva), fmtES(totalFactura)]);

  autoTable(pdf, {
    startY: 26,
    head: [['Nº Factura Recibida', 'Fecha Recepción', 'NIF Proveedor', 'Nombre/Razón Social', 'Base Imponible', 'Tipo IVA Ded.', 'Cuota IVA Ded.', 'Total Factura']],
    body: rows,
    styles: { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }, textColor: black },
    headStyles: { fillColor: [241, 245, 249], textColor: grey, fontStyle: 'bold', fontSize: 7.5, lineColor: lightGrey, lineWidth: 0.3 },
    bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 30 }, 1: { cellWidth: 24 }, 2: { cellWidth: 28 }, 3: { cellWidth: 'auto' },
      4: { cellWidth: 26, halign: 'right' }, 5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 26, halign: 'right' }, 7: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: M, right: M },
    tableLineColor: lightGrey,
    tableLineWidth: 0.3,
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = primary;
      }
    },
  });

  const fy = (pdf.lastAutoTable?.finalY ?? 26) + 8;
  pdf.setDrawColor(...lightGrey); pdf.setLineWidth(0.3); pdf.line(M, fy, R, fy);
  pdf.setFont('helvetica', 'italic'); pdf.setFontSize(6.5); pdf.setTextColor(...grey);
  pdf.text('Libro registro generado con Solvy. Estimación indicativa — verifica con tu gestor o asesor fiscal.', M, fy + 4);
  pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')} · Ejercicio ${year}`, R, fy + 4, { align: 'right' });

  const nif = (profile.nie || profile.piva || 'SINIF').replace(/\s/g, '');
  return { blob: pdf.output('blob'), fileName: `ES_${nif}_libro_registro_recibidas_${year}.pdf` };
}

// ─── Facturas del Trimestre ────────────────────────────────────────────────────
// Generates a multi-page PDF: one full invoice layout per page (same as single invoice download).

export async function generateFacturasTrimestreBlob(
  invoiceDocs: Document[],
  profile: Profile,
  quarter: 1 | 2 | 3 | 4,
  year: number
): Promise<{ blob: Blob; fileName: string }> {
  const [{ default: jsPDF }, { buildInvoicePage }] = await Promise.all([
    import('jspdf'),
    import('../lib/generateInvoicePDF'),
  ]);

  const docs = [...invoiceDocs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  for (let i = 0; i < docs.length; i++) {
    if (i > 0) pdf.addPage('a4', 'portrait');
    await buildInvoicePage(pdf, docs[i], profile);
  }

  const nif = (profile.nie || profile.piva || 'SINIF').replace(/\s/g, '');
  return { blob: pdf.output('blob'), fileName: `ES_${nif}_facturas_T${quarter}_${year}.pdf` };
}

// ─── Gastos del Trimestre ──────────────────────────────────────────────────────

export async function generateGastosTrimestreBlob(
  expenseDocs: Document[],
  profile: Profile,
  quarter: 1 | 2 | 3 | 4,
  year: number
): Promise<{ blob: Blob; fileName: string }> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;
  const W = 297, M = 12, R = W - M;
  const black:     [number, number, number] = [15, 23, 42];
  const grey:      [number, number, number] = [100, 116, 139];
  const lightGrey: [number, number, number] = [226, 232, 240];
  const primary:   [number, number, number] = [79, 70, 229];

  const taxId = profile.nie || profile.piva || '';
  const fmtES = (n: number) => `€ ${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const qLabel = QUARTER_LABELS[quarter];

  const docs = [...expenseDocs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.setTextColor(...black);
  pdf.text(`GASTOS — T${quarter} ${year}`, M, 14);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...grey);
  pdf.text(`${profile.name}${taxId ? ` · NIF/NIE: ${taxId}` : ''} · ${qLabel} ${year}`, M, 20);
  pdf.setDrawColor(...lightGrey); pdf.setLineWidth(0.4); pdf.line(M, 23, R, 23);

  let totalBase = 0, totalCuotaIva = 0, totalFactura = 0;

  const rows = docs.map((doc, i) => {
    const ivaRate = doc.ivaRate ?? 0;
    const cuotaIva = doc.amount * (ivaRate / 100);
    const total = doc.amount + cuotaIva;
    totalBase += doc.amount; totalCuotaIva += cuotaIva; totalFactura += total;
    return [
      `FREC${String(i + 1).padStart(3, '0')}/${year}`,
      new Date(doc.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      '—',
      doc.title || doc.category || '—',
      fmtES(doc.amount),
      ivaRate > 0 ? `${ivaRate}%` : '—',
      ivaRate > 0 ? fmtES(cuotaIva) : '—',
      fmtES(total),
    ];
  });
  rows.push(['', '', '', 'TOTAL', fmtES(totalBase), '', fmtES(totalCuotaIva), fmtES(totalFactura)]);

  autoTable(pdf, {
    startY: 26,
    head: [['Nº Ref.', 'Fecha', 'NIF Proveedor', 'Concepto', 'Base Imponible', 'Tipo IVA', 'Cuota IVA', 'Total']],
    body: rows,
    styles: { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }, textColor: black },
    headStyles: { fillColor: [241, 245, 249], textColor: grey, fontStyle: 'bold', fontSize: 7.5, lineColor: lightGrey, lineWidth: 0.3 },
    bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 30 }, 1: { cellWidth: 24 }, 2: { cellWidth: 28 }, 3: { cellWidth: 'auto' },
      4: { cellWidth: 26, halign: 'right' }, 5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 26, halign: 'right' }, 7: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: M, right: M },
    tableLineColor: lightGrey, tableLineWidth: 0.3,
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        (data.cell.styles as { textColor: unknown }).textColor = primary;
      }
    },
  });

  const fy = (pdf.lastAutoTable?.finalY ?? 26) + 8;
  pdf.setDrawColor(...lightGrey); pdf.setLineWidth(0.3); pdf.line(M, fy, R, fy);
  pdf.setFont('helvetica', 'italic'); pdf.setFontSize(6.5); pdf.setTextColor(...grey);
  pdf.text('Generado con Solvy. Estimación indicativa — verifica con tu gestor o asesor fiscal.', M, fy + 4);
  pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')} · T${quarter} ${year}`, R, fy + 4, { align: 'right' });

  const nif = (profile.nie || profile.piva || 'SINIF').replace(/\s/g, '');
  return { blob: pdf.output('blob'), fileName: `ES_${nif}_gastos_T${quarter}_${year}.pdf` };
}
