import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Profile } from '../types';

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResumenTrimestral {
  quarter: 1 | 2 | 3 | 4;
  year: number;
  invoices: Document[];
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
    start: new Date(year, sm, 1),
    end:   new Date(year, em + 1, 0), // last day of end month
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
    const date = new Date(d.date);
    return date >= start && date <= end;
  };

  const invoices = documents.filter(d => d.type === 'invoice' && inRange(d));
  const expenses = documents.filter(d => d.type === 'expense' && inRange(d));

  const totalIngresos = invoices.reduce((sum, d) => sum + d.amount, 0);
  const totalGastos   = expenses.reduce((sum, d) => sum + d.amount, 0);

  const ivaRepercutida = invoices.reduce((sum, d) => sum + d.amount * ((d.ivaRate ?? 0) / 100), 0);
  const ivaSoportada   = 0; // expenses don't track IVA breakdown

  const baseImponible130 = Math.max(0, totalIngresos - totalGastos);
  const cuotaIRPF        = baseImponible130 * 0.20;

  return {
    quarter, year,
    invoices, expenses,
    totalIngresos, totalGastos,
    ivaRepercutida, ivaSoportada,
    diferenciaIVA: ivaRepercutida - ivaSoportada,
    baseImponible130, cuotaIRPF,
  };
}

// ─── PDF Generation ───────────────────────────────────────────────────────────

export function generateResumenPDF(resumen: ResumenTrimestral, profile: Profile): jsPDF {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;

  const W = 210, M = 16, R = W - M;
  const black:     [number, number, number] = [15, 23, 42];
  const grey:      [number, number, number] = [100, 116, 139];
  const lightGrey: [number, number, number] = [226, 232, 240];
  const primary:   [number, number, number] = [79, 70, 229];
  const bgLight:   [number, number, number] = [248, 250, 252];

  const nif = profile.nie || profile.piva || '';
  const { invoices, expenses, totalIngresos, totalGastos,
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

  const invoiceRows = invoices.length > 0
    ? invoices.map(d => {
        const iva = d.amount * ((d.ivaRate ?? 0) / 100);
        return [
          d.invoiceNumber || '—',
          d.client || d.title,
          new Date(d.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          fmtES(d.amount),
          d.ivaRate ? `${d.ivaRate}%` : '—',
          fmtES(d.amount + iva),
        ];
      })
    : [['—', 'No hay facturas en este período', '', '', '', '']];

  autoTable(pdf, {
    startY: y,
    head: [['N° Factura', 'Cliente', 'Fecha', 'Base', 'IVA', 'Total']],
    body: invoiceRows,
    ...(invoices.length > 0 ? {
      foot: [['', 'TOTAL INGRESOS', '', fmtES(totalIngresos), '', fmtES(totalIngresos + ivaRepercutida)]],
      footStyles: { fillColor: bgLight, textColor: black, fontStyle: 'bold', fontSize: 8 },
    } : {}),
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
    ? expenses.map(d => [
        d.title,
        d.category || '—',
        new Date(d.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        fmtES(d.amount),
      ])
    : [['No hay gastos en este período', '', '', '']];

  autoTable(pdf, {
    startY: y,
    head: [['Descripción', 'Categoría', 'Fecha', 'Importe']],
    body: expenseRows,
    ...(expenses.length > 0 ? {
      foot: [['TOTAL GASTOS', '', '', fmtES(totalGastos)]],
      footStyles: { fillColor: bgLight, textColor: black, fontStyle: 'bold', fontSize: 8 },
    } : {}),
    styles: { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: black },
    headStyles: { fillColor: bgLight, textColor: grey, fontStyle: 'bold', fontSize: 7, lineColor: lightGrey, lineWidth: 0.3 },
    bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 35 },
      2: { cellWidth: 22 },
      3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
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

  // IVA note
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(...grey);
  pdf.text('* Los gastos registrados no incluyen desglose de IVA soportado. Consulta tus facturas de proveedor para completar este dato.', M, y);

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

export async function downloadResumenTrimestral(
  documents: Document[],
  profile: Profile,
  quarter: 1 | 2 | 3 | 4,
  year: number
): Promise<void> {
  const resumen = calcularTrimestre(documents, quarter, year);
  const pdf = generateResumenPDF(resumen, profile);
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
