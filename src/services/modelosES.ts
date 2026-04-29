import { Document, Profile } from '../types';
import { getLocalYear } from '../utils/date';
import { getEsDeductibilityRate } from '../lib/es/deductibility';
import { calculateGastosDificilJustificacion, getReduccionInicio, getSpainDefaultVatRate } from '../lib/countries/es';

type jsPDFWithAutoTable = import('jspdf').jsPDF & { lastAutoTable: { finalY: number } };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResumenTrimestral {
  quarter: 1 | 2 | 3 | 4;
  year: number;
  invoices: Document[];
  rectificativas: Document[];
  expenses: Document[];
  totalIngresos: number;        // solo questo trimestre (per le tabelle PDF)
  totalGastos: number;          // solo questo trimestre
  ivaRepercutida: number;       // solo questo trimestre
  ivaSoportada: number;         // solo questo trimestre
  diferenciaIVA: number;        // solo questo trimestre
  // Modelo 130 — valori cumulativi (Ene → fine trimestre)
  ingresosCumulativos: number;
  gastosCumulativos: number;
  baseImponible130: number;     // = max(0, ingresosCumulativos − gastosCumulativos)
  cuotaAcumulada: number;       // baseImponible130 × 20%
  retencionesCumulativas: number; // retenciones soportadas accumulate da gen → fine trimestre
  pagosAnteriores: number;      // cuotas nette già versate in T1..T(n-1)
  cuotaIRPF: number;            // netta = max(0, cuotaAcumulada − retencionesCumulativas − pagosAnteriores)
  exentoMinimo: boolean;        // true se rendimiento neto cumulativo < €1.000 → cuota = 0
  reduccionInicioRate: number;  // 0, 0.20 (año 1) o 0.30 (año 2) — art. 32.3 LIRPF
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

/** Cumulative base and cuota from Jan 1 to end of the given quarter (Modelo 130). */
function calcCuotaAcumulada(
  documents: Document[],
  upToQuarter: 1 | 2 | 3 | 4,
  year: number,
  startYear?: number
): { ingresos: number; gastos: number; base: number; cuota: number } {
  const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
  const endDate   = getQuarterRange(upToQuarter, year).end;

  const inCum = (d: Document) => {
    if (!d.date) return false;
    const parts = d.date.split('T')[0].split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return false;
    const date  = new Date(parts[0], parts[1] - 1, parts[2]);
    return date >= startDate && date <= endDate;
  };

  const inv  = documents.filter(d => d.type === 'invoice' && inCum(d));
  const rect = documents.filter(d => d.type === 'factura_rectificativa' && inCum(d));
  const exp  = documents.filter(d => d.type === 'expense' && inCum(d));

  const ingresos = inv.reduce((s, d) => s + d.amount, 0) - rect.reduce((s, d) => s + d.amount, 0);
  const gastos   = exp.reduce((s, d) => s + d.amount * getEsDeductibilityRate(d.category), 0);
  const rendimientoNetoPrevio = Math.max(0, ingresos - gastos);
  // Gastos difícil justificación: 5% del rendimiento neto previo, max €2.000 (art.30 RIRPF)
  const gastosDificil = calculateGastosDificilJustificacion(rendimientoNetoPrevio);
  const base = rendimientoNetoPrevio - gastosDificil;
  // Reducción inicio actividad (art. 32.3 LIRPF): 20% año 1, 30% año 2
  const reduccionRate = getReduccionInicio(startYear, year);
  const baseConReduccion = Math.max(0, base * (1 - reduccionRate));
  return { ingresos, gastos, base, cuota: baseConReduccion * 0.20 };
}

/** Sum of retenciones soportadas (withheld by clients) from Jan 1 to end of the given quarter. */
function calcRetencionesCumulativas(
  documents: Document[],
  upToQuarter: 1 | 2 | 3 | 4,
  year: number,
  retencionRate: number
): number {
  if (retencionRate === 0) return 0;
  const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
  const endDate   = getQuarterRange(upToQuarter, year).end;
  const inCum = (d: Document) => {
    if (!d.date) return false;
    const parts = d.date.split('T')[0].split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return false;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date >= startDate && date <= endDate;
  };
  const inv  = documents.filter(d => d.type === 'invoice' && d.ritenuta && inCum(d));
  const rect = documents.filter(d => d.type === 'factura_rectificativa' && d.ritenuta && inCum(d));
  const ingresos = inv.reduce((s, d) => s + d.amount, 0) - rect.reduce((s, d) => s + d.amount, 0);
  return Math.round(ingresos * retencionRate * 100) / 100;
}

export function calcularTrimestre(
  documents: Document[],
  quarter: 1 | 2 | 3 | 4,
  year: number,
  retencionRate: number = 0,
  startYear?: number
): ResumenTrimestral {
  const { start, end } = getQuarterRange(quarter, year);

  const inRange = (d: Document) => {
    if (!d.date) return false;
    const parts = d.date.split('T')[0].split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return false;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date >= start && date <= end;
  };

  const invoices      = documents.filter(d => d.type === 'invoice' && inRange(d));
  // factura_rectificativa: filtered by its OWN date (d.date), not the original invoice date
  const rectificativas = documents.filter(d => d.type === 'factura_rectificativa' && inRange(d));
  const expenses      = documents.filter(d => d.type === 'expense' && inRange(d));

  const totalIngresos = invoices.reduce((sum, d) => sum + d.amount, 0)
                      - rectificativas.reduce((sum, d) => sum + d.amount, 0);
  const totalGastos   = expenses.reduce((sum, d) => sum + d.amount * getEsDeductibilityRate(d.category), 0);

  // Operaciones intracomunitarias: IVA = 0 (inversión del sujeto pasivo) — no computan en ivaRepercutida
  const ivaRepercutida = invoices
    .filter(d => !d.intracomunitaria)
    .reduce((sum, d) => sum + d.amount * ((d.ivaRate ?? 0) / 100), 0)
    - rectificativas.reduce((sum, d) => sum + d.amount * ((d.ivaRate ?? 0) / 100), 0);
  // IVA soportada: aplicar tasa de deducibilidad por categoría (ej. teléfono 50%)
  const ivaSoportada   = expenses
    .filter(d => (d.ivaRate ?? 0) > 0)
    .reduce((sum, d) => sum + d.amount * getEsDeductibilityRate(d.category) * ((d.ivaRate ?? 0) / 100), 0);

  // Modelo 130 — calcolo cumulativo (Ene → fine trimestre)
  const cumActual = calcCuotaAcumulada(documents, quarter, year, startYear);

  const ingresosCumulativos = cumActual.ingresos;
  const gastosCumulativos   = cumActual.gastos;
  const baseImponible130    = cumActual.base;
  const cuotaAcumulada      = cumActual.cuota;

  // Sequential pagosAnteriores: sum of actual net cuotasIRPF paid in T1..T(n-1).
  // Each previous quarter's net cuota = max(0, cuotaAcum_q - retenciones_q - pagosAnt_q).
  let pagosAnteriores = 0;
  for (let q = 1; q < quarter; q++) {
    const qNum = q as 1 | 2 | 3 | 4;
    const qCum = calcCuotaAcumulada(documents, qNum, year, startYear);
    const qRet = calcRetencionesCumulativas(documents, qNum, year, retencionRate);
    const qExento = qCum.base < 1000;
    const qCuotaIRPF = qExento ? 0 : Math.max(0, qCum.cuota - qRet - pagosAnteriores);
    pagosAnteriores += qCuotaIRPF;
  }

  const retencionesCumulativas = calcRetencionesCumulativas(documents, quarter, year, retencionRate);
  const exentoMinimo = baseImponible130 < 1000;
  const cuotaIRPF = exentoMinimo ? 0 : Math.max(0, cuotaAcumulada - retencionesCumulativas - pagosAnteriores);

  return {
    quarter, year,
    invoices, rectificativas, expenses,
    totalIngresos, totalGastos,
    ivaRepercutida, ivaSoportada,
    diferenciaIVA: ivaRepercutida - ivaSoportada,
    ingresosCumulativos, gastosCumulativos,
    baseImponible130, cuotaAcumulada, retencionesCumulativas, pagosAnteriores, cuotaIRPF, exentoMinimo,
    reduccionInicioRate: getReduccionInicio(startYear, year),
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
  const isCanarias = profile.territory === 'canarias';
  const taxLabel = isCanarias ? 'IGIC' : 'IVA';

  const nif = profile.nie || profile.piva || '';
  const nifLabel = profile.nie ? 'NIE' : 'NIF';
  const { invoices, rectificativas, expenses, totalIngresos, totalGastos,
          ivaRepercutida, ivaSoportada, diferenciaIVA,
          ingresosCumulativos, gastosCumulativos,
          baseImponible130, cuotaAcumulada, pagosAnteriores, cuotaIRPF,
          reduccionInicioRate } = resumen;

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
  if (nif) infoLines.push(`${nifLabel}: ${nif}`);
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
          isRect ? `<< ${d.client || d.title}` : (d.client || d.title),
          new Date(d.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          fmtES(base),
          d.ivaRate ? `${d.ivaRate}%` : '—',
          fmtES(base + iva),
        ];
      })
    : [['—', 'No hay facturas en este período', '', '', '', '']];

  autoTable(pdf, {
    startY: y,
    head: [['N° Factura', 'Cliente/Descripción', 'Fecha', 'Base', taxLabel, 'Total']],
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
    head: [['Descripción', 'Categoría', 'Fecha', 'Base', taxLabel, `Cuota ${taxLabel}`]],
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

  // ── Modelo 130 rows (left column) — valori cumulativi ─────────────────────
  const gastosDificilPDF = Math.max(0, (ingresosCumulativos - gastosCumulativos) - baseImponible130);
  const rows130: [string, string][] = [
    ['Ingresos acumulados',  fmtES(ingresosCumulativos)],
    ['Gastos acumulados',    `- ${fmtES(gastosCumulativos)}`],
    ...(gastosDificilPDF > 0 ? [
      ['Gastos difícil just. (5%)', `- ${fmtES(gastosDificilPDF)}`] as [string, string],
    ] : []),
    ['Rendimiento neto',     fmtES(baseImponible130)],
    ...(reduccionInicioRate > 0 ? [
      [`Reducción inicio act. (${(reduccionInicioRate * 100).toFixed(0)}%) art.32.3`, `- ${fmtES(baseImponible130 * reduccionInicioRate)}`] as [string, string],
    ] : []),
    ['Tipo pago fraccionado','20%'],
    ...(pagosAnteriores > 0 ? [
      ['Cuota íntegra',       fmtES(cuotaAcumulada)] as [string, string],
      ['Pagos anteriores',    `- ${fmtES(pagosAnteriores)}`] as [string, string],
    ] : []),
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
    [`${taxLabel} repercutid${isCanarias ? 'o' : 'a'} (devengad${isCanarias ? 'o' : 'a'})`, fmtES(ivaRepercutida)],
    [`${taxLabel} soportad${isCanarias ? 'o' : 'a'} (deducible)*`,                         `- ${fmtES(ivaSoportada)}`],
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
    pdf.text(`* ${taxLabel} soportad${isCanarias ? 'o' : 'a'}: €0,00. Añade el tipo de ${taxLabel} al registrar los gastos para calcular la deducción correctamente.`, M, y);
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
  const currentYr = new Date().getFullYear();
  const yearsActiveP = profile.annoInizioAttivita ? currentYr - profile.annoInizioAttivita : 10;
  const retencionRateP = yearsActiveP <= 3 ? 0.07 : 0.15;
  const resumen = calcularTrimestre(documents, quarter, year, retencionRateP, profile.annoInizioAttivita);
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
  const currentYrD = new Date().getFullYear();
  const yearsActiveD = profile.annoInizioAttivita ? currentYrD - profile.annoInizioAttivita : 10;
  const retencionRateD = yearsActiveD <= 3 ? 0.07 : 0.15;
  const resumen = calcularTrimestre(documents, quarter, year, retencionRateD, profile.annoInizioAttivita);
  const pdf = await generateResumenPDF(resumen, profile);
  const nif = (profile.nie || profile.piva || 'SINIF').replace(/\s/g, '');
  const filename = `ES_${nif}_resumen_T${quarter}_${year}.pdf`;
  const blob = pdf.output('blob');
  const file = new File([blob], filename, { type: 'application/octet-stream' });
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
  const defaultIvaRate = profile.ivaHabitual ?? getSpainDefaultVatRate(profile.territory);
  const taxId = profile.nie || profile.piva || '';
  const nifLabel = profile.nie ? 'NIE' : 'NIF';
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
  pdf.text(`${profile.name}${taxId ? ` · ${nifLabel}: ${taxId}` : ''} · Ejercicio ${year}`, M, 20);
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
  const nifLabel = profile.nie ? 'NIE' : 'NIF';
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
  pdf.text(`${profile.name}${taxId ? ` · ${nifLabel}: ${taxId}` : ''} · Ejercicio ${year}`, M, 20);
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
      doc.nifProveedor || '—',
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

// ─── Resumen Anual ────────────────────────────────────────────────────────────

export async function generateResumenAnualBlob(
  documents: Document[],
  profile: Profile,
  year: number
): Promise<{ blob: Blob; fileName: string }> {
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
  const green:     [number, number, number] = [16, 185, 129];
  const red:       [number, number, number] = [220, 38, 38];

  const nif = profile.nie || profile.piva || '';
  const nifLabel = profile.nie ? 'NIE' : 'NIF';
  const fmt = (n: number) => `€ ${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const currentYr = new Date().getFullYear();
  const yearsActive = profile.annoInizioAttivita ? currentYr - profile.annoInizioAttivita : 10;
  const retencionRate = yearsActive <= 3 ? 7 : 15;

  const yearInvoices      = documents.filter(d => d.type === 'invoice' && getLocalYear(d.date) === year);
  const yearRect          = documents.filter(d => d.type === 'factura_rectificativa' && getLocalYear(d.date) === year);
  const yearExpenses      = documents.filter(d => d.type === 'expense' && getLocalYear(d.date) === year);

  const totalIngresos     = yearInvoices.reduce((s, d) => s + d.amount, 0)
                          - yearRect.reduce((s, d) => s + d.amount, 0);
  const totalGastos       = yearExpenses.reduce((s, d) => s + d.amount * getEsDeductibilityRate(d.category), 0);
  const ivaRepercutida    = yearInvoices.filter(d => !d.intracomunitaria)
                              .reduce((s, d) => s + d.amount * ((d.ivaRate ?? 0) / 100), 0)
                          - yearRect.reduce((s, d) => s + d.amount * ((d.ivaRate ?? 0) / 100), 0);
  const ivaSoportada      = yearExpenses.filter(d => (d.ivaRate ?? 0) > 0)
                              .reduce((s, d) => s + d.amount * getEsDeductibilityRate(d.category) * ((d.ivaRate ?? 0) / 100), 0);
  const diferenciaIVA     = ivaRepercutida - ivaSoportada;
  const totalRetenciones  = yearInvoices.filter(d => d.ritenuta)
                              .reduce((s, d) => s + d.amount * (retencionRate / 100), 0);
  const baseModelo100     = Math.max(0, totalIngresos - totalGastos);

  // Per-quarter breakdown
  const quarterData = ([1, 2, 3, 4] as const).map(q => {
    const r = calcularTrimestre(documents, q, year, retencionRate / 100, profile.annoInizioAttivita);
    return { q, totalIngresos: r.totalIngresos, ivaRepercutida: r.ivaRepercutida };
  });

  // Gastos grouped by category
  const byCat: Record<string, number> = {};
  for (const d of yearExpenses) {
    const cat = d.category || 'Sin categoría';
    byCat[cat] = (byCat[cat] || 0) + d.amount * getEsDeductibilityRate(d.category);
  }

  // ── Header ─────────────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(22); pdf.setTextColor(...primary);
  pdf.text('SOLVY', M, 18);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...grey);
  pdf.text('Resumen Anual', M, 25);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(...black);
  pdf.text(profile.name, R, 14, { align: 'right' });
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...grey);
  const infoLines: string[] = [];
  if (nif) infoLines.push(`${nifLabel}: ${nif}`);
  if (profile.address) infoLines.push(profile.address);
  if (profile.email) infoLines.push(profile.email);
  infoLines.forEach((l, i) => pdf.text(l, R, 20 + i * 5, { align: 'right' }));

  pdf.setDrawColor(...lightGrey); pdf.setLineWidth(0.4); pdf.line(M, 32, R, 32);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(...black);
  pdf.text(`Ejercicio ${year}`, M, 40);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...grey);
  pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`, R, 40, { align: 'right' });
  pdf.line(M, 44, R, 44);

  let y = 52;

  // ── Ingresos por trimestre ─────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(...grey);
  pdf.text('INGRESOS POR TRIMESTRE', M, y);
  y += 4;

  autoTable(pdf, {
    startY: y,
    head: [['Período', 'Base Imponible', 'IVA Repercutida', 'Total Facturado']],
    body: quarterData.map(({ q, totalIngresos: ti, ivaRepercutida: ivR }) => [
      QUARTER_LABELS[q],
      fmt(ti),
      fmt(ivR),
      fmt(ti + ivR),
    ]),
    foot: [['TOTAL ANUAL', fmt(totalIngresos), fmt(ivaRepercutida), fmt(totalIngresos + ivaRepercutida)]],
    footStyles: { fillColor: bgLight, textColor: black, fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: black },
    headStyles: { fillColor: bgLight, textColor: grey, fontStyle: 'bold', fontSize: 7, lineColor: lightGrey, lineWidth: 0.3 },
    bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 42, halign: 'right' },
      2: { cellWidth: 42, halign: 'right' },
      3: { cellWidth: 42, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: M, right: M },
    tableLineColor: lightGrey, tableLineWidth: 0.3,
  });

  y = pdf.lastAutoTable.finalY + 8;
  if (y > 210) { pdf.addPage(); y = 20; }

  // ── Gastos por categoría ───────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(...grey);
  pdf.text('GASTOS POR CATEGORÍA', M, y);
  y += 4;

  const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const catRows = catEntries.length > 0
    ? catEntries.map(([cat, amt]) => [cat, fmt(amt)])
    : [['Sin gastos registrados', '—']];
  const catFoot = catEntries.length > 0 ? [['TOTAL GASTOS', fmt(totalGastos)]] : undefined;

  autoTable(pdf, {
    startY: y,
    head: [['Categoría', 'Importe']],
    body: catRows,
    ...(catFoot ? { foot: catFoot, footStyles: { fillColor: bgLight, textColor: black, fontStyle: 'bold', fontSize: 8 } } : {}),
    styles: { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: black },
    headStyles: { fillColor: bgLight, textColor: grey, fontStyle: 'bold', fontSize: 7, lineColor: lightGrey, lineWidth: 0.3 },
    bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 42, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: M, right: M },
    tableLineColor: lightGrey, tableLineWidth: 0.3,
  });

  y = pdf.lastAutoTable.finalY + 10;
  if (y > 200) { pdf.addPage(); y = 20; }

  // ── Resumen fiscal (3 cajas: IVA · Retenciones · Modelo 100) ──────────────
  pdf.setDrawColor(...lightGrey); pdf.setLineWidth(0.4); pdf.line(M, y, R, y);
  y += 8;

  const colW = 55, gap = 6;
  const col1 = M, col2 = M + colW + gap, col3 = M + (colW + gap) * 2;

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(...grey);
  pdf.text('IVA — MODELO 303', col1, y);
  pdf.text('RETENCIONES IRPF', col2, y);
  pdf.text('BASE ESTIMADA MOD. 100', col3, y);
  y += 5;

  const drawRows = (
    col: number,
    rows: [string, string][],
    totalLabel: string,
    totalValue: string,
    valueColor: [number, number, number],
    startY: number
  ): number => {
    let cy = startY;
    rows.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...grey);
      pdf.text(label, col + 2, cy + 4);
      pdf.setTextColor(...black); pdf.text(value, col + colW - 2, cy + 4, { align: 'right' });
      pdf.setDrawColor(...lightGrey); pdf.setLineWidth(0.2); pdf.line(col, cy + 7, col + colW, cy + 7);
      cy += 7;
    });
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...black);
    pdf.text(totalLabel, col + 2, cy + 5);
    pdf.setTextColor(...valueColor);
    pdf.text(totalValue, col + colW - 2, cy + 5, { align: 'right' });
    return cy + 9;
  };

  const isDevolver = diferenciaIVA < 0;
  const yAfterIVA = drawRows(col1,
    [['IVA repercutida', fmt(ivaRepercutida)], ['IVA soportada', `- ${fmt(ivaSoportada)}`]],
    isDevolver ? 'A devolver' : 'A ingresar',
    fmt(Math.abs(diferenciaIVA)),
    isDevolver ? green : red,
    y
  );

  const yAfterRet = drawRows(col2,
    [['Tipo retención', `${retencionRate}%`], ['Base retenciones', fmt(totalIngresos)]],
    'Total retenido',
    fmt(totalRetenciones),
    primary,
    y
  );

  const yAfterM100 = drawRows(col3,
    [['Total ingresos', fmt(totalIngresos)], ['Gastos deducibles', `- ${fmt(totalGastos)}`]],
    'Rendimiento neto',
    fmt(baseModelo100),
    primary,
    y
  );

  y = Math.max(yAfterIVA, yAfterRet, yAfterM100) + 6;

  // ── Disclaimer ─────────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'italic'); pdf.setFontSize(6.5); pdf.setTextColor(...grey);
  pdf.text('Estimación indicativa. Verifica los datos con tu gestor o asesor fiscal antes de presentar declaraciones.', M, y);

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footerY = pdf.internal.pageSize.height - 14;
  pdf.setDrawColor(...lightGrey); pdf.setLineWidth(0.4); pdf.line(M, footerY, R, footerY);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...grey);
  pdf.text('Documento generado con Solvy — solvyapp.com', M, footerY + 5);
  pdf.text(`Ejercicio ${year}`, R, footerY + 5, { align: 'right' });

  const nifClean = (profile.nie || profile.piva || 'SINIF').replace(/\s/g, '');
  return { blob: pdf.output('blob'), fileName: `ES_${nifClean}_resumen_anual_${year}.pdf` };
}

// ─── Resumen Anual IVA (Modelo 390) ──────────────────────────────────────────

export async function generateResumenAnualIVABlob(
  documents: Document[],
  profile: Profile,
  year: number
): Promise<{ blob: Blob; fileName: string }> {
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
  const green:     [number, number, number] = [16, 185, 129];
  const red:       [number, number, number] = [220, 38, 38];

  const nif = profile.nie || profile.piva || '';
  const nifLabel = profile.nie ? 'NIE' : 'NIF';
  const fmt = (n: number) => `€ ${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const yearInvoices = documents.filter(d => d.type === 'invoice' && getLocalYear(d.date) === year);
  const yearRect     = documents.filter(d => d.type === 'factura_rectificativa' && getLocalYear(d.date) === year);
  const yearExpenses = documents.filter(d => d.type === 'expense' && getLocalYear(d.date) === year);

  // IVA repercutida grouped by rate — operaciones intracomunitarias excluidas (inversión del sujeto pasivo)
  const ivaRepRates: Record<number, { base: number; cuota: number }> = {};
  for (const d of yearInvoices.filter(d => !d.intracomunitaria)) {
    const rate = d.ivaRate ?? getSpainDefaultVatRate(profile.territory);
    if (!ivaRepRates[rate]) ivaRepRates[rate] = { base: 0, cuota: 0 };
    ivaRepRates[rate].base += d.amount;
    ivaRepRates[rate].cuota += d.amount * (rate / 100);
  }
  for (const d of yearRect) {
    const rate = d.ivaRate ?? getSpainDefaultVatRate(profile.territory);
    if (!ivaRepRates[rate]) ivaRepRates[rate] = { base: 0, cuota: 0 };
    ivaRepRates[rate].base -= d.amount;
    ivaRepRates[rate].cuota -= d.amount * (rate / 100);
  }

  // IVA soportada grouped by rate — aplicar tasa de deducibilidad por categoría (ej. teléfono 50%)
  const ivaSopRates: Record<number, { base: number; cuota: number }> = {};
  for (const d of yearExpenses) {
    const rate = d.ivaRate ?? 0;
    if (rate === 0) continue;
    const dedRate = getEsDeductibilityRate(d.category);
    if (!ivaSopRates[rate]) ivaSopRates[rate] = { base: 0, cuota: 0 };
    ivaSopRates[rate].base += d.amount * dedRate;
    ivaSopRates[rate].cuota += d.amount * dedRate * (rate / 100);
  }

  const totalIvaRep = Object.values(ivaRepRates).reduce((s, v) => s + v.cuota, 0);
  const totalIvaSop = Object.values(ivaSopRates).reduce((s, v) => s + v.cuota, 0);
  const diferenciaTotal = totalIvaRep - totalIvaSop;

  const quarterData = ([1, 2, 3, 4] as const).map(q => {
    const r = calcularTrimestre(documents, q, year, 0, profile.annoInizioAttivita);
    return { q, ivaRep: r.ivaRepercutida, ivaSop: r.ivaSoportada, dif: r.diferenciaIVA };
  });

  // ── Header ─────────────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(22); pdf.setTextColor(...primary);
  pdf.text('SOLVY', M, 18);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...grey);
  pdf.text('Resumen Anual IVA · Modelo 390', M, 25);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(...black);
  pdf.text(profile.name, R, 14, { align: 'right' });
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...grey);
  const infoLines: string[] = [];
  if (nif) infoLines.push(`${nifLabel}: ${nif}`);
  if (profile.address) infoLines.push(profile.address);
  if (profile.email) infoLines.push(profile.email);
  infoLines.forEach((l, i) => pdf.text(l, R, 20 + i * 5, { align: 'right' }));
  pdf.setDrawColor(...lightGrey); pdf.setLineWidth(0.4); pdf.line(M, 32, R, 32);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(...black);
  pdf.text(`Ejercicio ${year}`, M, 40);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...grey);
  pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`, R, 40, { align: 'right' });
  pdf.line(M, 44, R, 44);

  let y = 52;

  // ── IVA Repercutida ────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(...grey);
  pdf.text('IVA REPERCUTIDA — FACTURAS EMITIDAS', M, y);
  y += 4;

  const repRates = Object.keys(ivaRepRates).map(Number).sort((a, b) => a - b);
  autoTable(pdf, {
    startY: y,
    head: [['Tipo IVA', 'Base Imponible', 'Cuota IVA']],
    body: repRates.length > 0
      ? repRates.map(r => [`${r}%`, fmt(ivaRepRates[r].base), fmt(ivaRepRates[r].cuota)])
      : [['—', 'Sin facturas con IVA', '—']],
    ...(repRates.length > 0 ? {
      foot: [['TOTAL', fmt(repRates.reduce((s, r) => s + ivaRepRates[r].base, 0)), fmt(totalIvaRep)]],
      footStyles: { fillColor: bgLight, textColor: black, fontStyle: 'bold', fontSize: 8 },
    } : {}),
    styles: { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: black },
    headStyles: { fillColor: bgLight, textColor: grey, fontStyle: 'bold', fontSize: 7, lineColor: lightGrey, lineWidth: 0.3 },
    bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto', halign: 'right' },
      2: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: M, right: M },
    tableLineColor: lightGrey, tableLineWidth: 0.3,
  });

  y = pdf.lastAutoTable.finalY + 8;
  if (y > 210) { pdf.addPage(); y = 20; }

  // ── IVA Soportada ─────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(...grey);
  pdf.text('IVA SOPORTADA — GASTOS DEDUCIBLES', M, y);
  y += 4;

  const sopRates = Object.keys(ivaSopRates).map(Number).sort((a, b) => a - b);
  autoTable(pdf, {
    startY: y,
    head: [['Tipo IVA', 'Base Imponible', 'Cuota IVA']],
    body: sopRates.length > 0
      ? sopRates.map(r => [`${r}%`, fmt(ivaSopRates[r].base), fmt(ivaSopRates[r].cuota)])
      : [['—', 'Sin gastos con IVA deducible', '—']],
    ...(sopRates.length > 0 ? {
      foot: [['TOTAL', fmt(sopRates.reduce((s, r) => s + ivaSopRates[r].base, 0)), fmt(totalIvaSop)]],
      footStyles: { fillColor: bgLight, textColor: black, fontStyle: 'bold', fontSize: 8 },
    } : {}),
    styles: { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: black },
    headStyles: { fillColor: bgLight, textColor: grey, fontStyle: 'bold', fontSize: 7, lineColor: lightGrey, lineWidth: 0.3 },
    bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto', halign: 'right' },
      2: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: M, right: M },
    tableLineColor: lightGrey, tableLineWidth: 0.3,
  });

  y = pdf.lastAutoTable.finalY + 8;
  if (y > 210) { pdf.addPage(); y = 20; }

  // ── Diferencia per trimestre ───────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(...grey);
  pdf.text('DIFERENCIA IVA POR TRIMESTRE', M, y);
  y += 4;

  autoTable(pdf, {
    startY: y,
    head: [['Trimestre', 'IVA Repercutida', 'IVA Soportada', 'Diferencia', 'Resultado']],
    body: quarterData.map(({ q, ivaRep, ivaSop, dif }) => [
      QUARTER_LABELS[q],
      fmt(ivaRep),
      fmt(ivaSop),
      fmt(Math.abs(dif)),
      dif >= 0 ? 'A ingresar' : 'A devolver',
    ]),
    foot: [['TOTAL ANUAL', fmt(totalIvaRep), fmt(totalIvaSop), fmt(Math.abs(diferenciaTotal)), diferenciaTotal >= 0 ? 'A ingresar' : 'A devolver']],
    footStyles: { fillColor: bgLight, textColor: black, fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: black },
    headStyles: { fillColor: bgLight, textColor: grey, fontStyle: 'bold', fontSize: 7, lineColor: lightGrey, lineWidth: 0.3 },
    bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 34, halign: 'right' },
      2: { cellWidth: 34, halign: 'right' },
      3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 26, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const qd = quarterData[data.row.index];
        (data.cell.styles as { textColor: unknown }).textColor = (qd?.dif ?? 0) >= 0 ? red : green;
      }
      if (data.section === 'foot' && data.column.index === 4) {
        (data.cell.styles as { textColor: unknown }).textColor = diferenciaTotal >= 0 ? red : green;
      }
    },
    margin: { left: M, right: M },
    tableLineColor: lightGrey, tableLineWidth: 0.3,
  });

  y = pdf.lastAutoTable.finalY + 10;
  if (y > 200) { pdf.addPage(); y = 20; }

  // ── Resultado final ────────────────────────────────────────────────────────
  pdf.setDrawColor(...lightGrey); pdf.setLineWidth(0.4); pdf.line(M, y, R, y);
  y += 8;
  const isDevolver = diferenciaTotal < 0;
  const resultColor: [number, number, number] = isDevolver ? green : red;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(...black);
  pdf.text('Resultado anual Modelo 390:', M, y);
  pdf.setTextColor(...resultColor);
  pdf.text(`${fmt(Math.abs(diferenciaTotal))} — ${isDevolver ? 'A devolver' : 'A ingresar'}`, R, y, { align: 'right' });
  y += 10;

  // ── Disclaimer ─────────────────────────────────────────────────────────────
  pdf.setFillColor(...bgLight);
  pdf.roundedRect(M, y, R - M, 10, 2, 2, 'F');
  pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7.5); pdf.setTextColor(...grey);
  pdf.text('Datos para el Modelo 390. Presentar con gestor fiscal.', M + 4, y + 6.5);

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footerY = pdf.internal.pageSize.height - 14;
  pdf.setDrawColor(...lightGrey); pdf.setLineWidth(0.4); pdf.line(M, footerY, R, footerY);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...grey);
  pdf.text('Documento generado con Solvy — solvyapp.com', M, footerY + 5);
  pdf.text(`Ejercicio ${year}`, R, footerY + 5, { align: 'right' });

  const nifClean = (profile.nie || profile.piva || 'SINIF').replace(/\s/g, '');
  return { blob: pdf.output('blob'), fileName: `ES_${nifClean}_resumen_anual_iva_${year}.pdf` };
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
  const nifLabel = profile.nie ? 'NIE' : 'NIF';
  const fmtES = (n: number) => `€ ${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const qLabel = QUARTER_LABELS[quarter];

  const docs = [...expenseDocs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.setTextColor(...black);
  pdf.text(`GASTOS — T${quarter} ${year}`, M, 14);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...grey);
  pdf.text(`${profile.name}${taxId ? ` · ${nifLabel}: ${taxId}` : ''} · ${qLabel} ${year}`, M, 20);
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
      doc.nifProveedor || '—',
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
