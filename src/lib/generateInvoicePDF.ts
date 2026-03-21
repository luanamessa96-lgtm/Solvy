import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Profile } from '../types';

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

const FORFETTARIO_NOTE =
  "Operazione effettuata in regime forfettario ai sensi dell'art. 1, commi 54-89, L. n. 190/2014. " +
  "Non soggetta ad IVA ai sensi dell'art. 1, co. 58, L. 190/2014. " +
  "Non soggetta a ritenuta d'acconto ai sensi dell'art. 1, co. 67, L. 190/2014.";

const MARCA_BOLLO_THRESHOLD = 77.47;
const MARCA_BOLLO_AMOUNT = 2;
const RITENUTA_RATE = 0.20;
const INPS_RATE = 0.04;

function fmt(n: number) {
  return `€ ${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildInvoicePDF(doc: Document, profile: Profile): jsPDF {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;
  const W = 210;
  const M = 16; // margin
  const R = W - M; // right edge

  const black: [number, number, number] = [15, 23, 42];
  const grey: [number, number, number] = [100, 116, 139];
  const lightGrey: [number, number, number] = [226, 232, 240];
  const primary: [number, number, number] = [79, 70, 229];

  // ─── Header ───────────────────────────────────────────────────────────────
  // "FATTURA" top left
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(...black);
  pdf.text('FATTURA', M, 18);

  // Numero fattura top right
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(...grey);
  pdf.text(`N° ${doc.invoiceNumber || '—'}`, R, 14, { align: 'right' });

  // Data
  pdf.setFontSize(9);
  pdf.text(
    new Date(doc.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }),
    R, 20, { align: 'right' }
  );

  // Regime
  pdf.setFontSize(8);
  pdf.setTextColor(...grey);
  pdf.text((profile.regime === 'ordinario' ? 'Regime Ordinario' : 'Regime Forfettario').toUpperCase(), M, 24);

  // Divider
  pdf.setDrawColor(...lightGrey);
  pdf.setLineWidth(0.4);
  pdf.line(M, 28, R, 28);

  // ─── Fornitore + Cliente ───────────────────────────────────────────────────
  let y = 35;
  const colW = (R - M - 8) / 2;
  const col2 = M + colW + 8;

  // Label FORNITORE
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(...grey);
  pdf.text('FORNITORE', M, y);
  pdf.text('CLIENTE', col2, y);

  y += 6;

  // Nome fornitore
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...black);
  pdf.text(profile.name, M, y);

  // Nome cliente
  pdf.text(doc.client || 'Cliente non specificato', col2, y, { maxWidth: colW });

  y += 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...grey);

  // Righe fornitore
  const fornitoreLines: string[] = [];
  if (profile.address) fornitoreLines.push(profile.address);
  if (profile.piva) fornitoreLines.push(`P.IVA: ${profile.piva}`);
  if (profile.codiceFiscale) fornitoreLines.push(`C.F.: ${profile.codiceFiscale}`);
  if (profile.email) fornitoreLines.push(profile.email);
  if (profile.iban) fornitoreLines.push(`IBAN: ${profile.iban}`);

  // Righe cliente
  const clientePivaText = doc.clientPiva === 'Privato'
    ? 'Cliente privato'
    : (doc.clientPiva && doc.clientPiva.toLowerCase() !== 'nessuna') ? `P.IVA: ${doc.clientPiva}` : '';
  const clienteLines: string[] = [];
  if (doc.clientAddress) clienteLines.push(doc.clientAddress);
  if (clientePivaText) clienteLines.push(clientePivaText);
  if (doc.clientCf) clienteLines.push(`C.F.: ${doc.clientCf}`);

  const maxLines = Math.max(fornitoreLines.length, clienteLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (fornitoreLines[i]) pdf.text(fornitoreLines[i], M, y, { maxWidth: colW });
    if (clienteLines[i]) pdf.text(clienteLines[i], col2, y, { maxWidth: colW });
    y += 5;
  }

  y += 4;

  // Divider
  pdf.setDrawColor(...lightGrey);
  pdf.line(M, y, R, y);
  y += 8;

  // ─── Tabella voci ─────────────────────────────────────────────────────────
  const docRegime = doc.docRegime ?? (profile.regime ?? 'forfettario');
  const isOrdinario = docRegime === 'ordinario';
  const ivaRate = doc.ivaRate ?? 0;
  const rivalsaInps = doc.rivalsaInps ?? false;
  const ritenuta = doc.ritenuta ?? false;
  const marcaBollo = !isOrdinario && (doc.marcaBollo ?? (doc.amount > MARCA_BOLLO_THRESHOLD));

  const rivalsaAmount = rivalsaInps ? doc.amount * INPS_RATE : 0;
  const totaleImponibile = doc.amount + rivalsaAmount;
  const ivaAmount = isOrdinario ? totaleImponibile * (ivaRate / 100) : 0;
  const ritenutaAmount = ritenuta ? doc.amount * RITENUTA_RATE : 0;
  const totale = totaleImponibile + ivaAmount + (marcaBollo ? MARCA_BOLLO_AMOUNT : 0) - ritenutaAmount;

  autoTable(pdf, {
    startY: y,
    head: [['Descrizione', 'Importo']],
    body: [[doc.title || 'Servizio non specificato', fmt(doc.amount)]],
    styles: { fontSize: 9, cellPadding: { top: 5, bottom: 5, left: 3, right: 3 }, textColor: black },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: grey,
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: lightGrey,
      lineWidth: 0.3,
    },
    bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 38, halign: 'right', fontStyle: 'bold', textColor: black },
    },
    margin: { left: M, right: M },
    tableLineColor: lightGrey,
    tableLineWidth: 0.3,
  });

  y = (pdf as jsPDFWithAutoTable).lastAutoTable?.finalY ?? y + 20;
  y += 6;

  // ─── Riepilogo ────────────────────────────────────────────────────────────
  const summaryX = W - M - 72;
  const summaryW = 72;

  const summaryRows: [string, string, boolean][] = [
    ['Imponibile', fmt(doc.amount), false],
    ...(rivalsaInps ? [[`Rivalsa INPS (4%)`, `+ ${fmt(rivalsaAmount)}`, false] as [string, string, boolean]] : []),
    ...(isOrdinario ? [[`IVA ${ivaRate}%`, `+ ${fmt(ivaAmount)}`, false] as [string, string, boolean]] : []),
    ...(marcaBollo ? [['Marca da bollo', `+ ${fmt(MARCA_BOLLO_AMOUNT)}`, false] as [string, string, boolean]] : []),
    ...(ritenuta ? [["Ritenuta d'acconto (20%)", `- ${fmt(ritenutaAmount)}`, false] as [string, string, boolean]] : []),
  ];

  summaryRows.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...grey);
    pdf.text(label, summaryX, y + 4);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...black);
    pdf.text(value, summaryX + summaryW, y + 4, { align: 'right' });
    pdf.setDrawColor(...lightGrey);
    pdf.line(summaryX, y + 7, summaryX + summaryW, y + 7);
    y += 9;
  });

  // Riga totale
  y += 2;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...black);
  pdf.text('TOTALE DA RICEVERE', summaryX, y + 5);
  pdf.setFontSize(11);
  pdf.setTextColor(...primary);
  pdf.text(fmt(totale), summaryX + summaryW, y + 5, { align: 'right' });

  y += 14;

  // ─── Nota legale forfettario ───────────────────────────────────────────────
  if (!isOrdinario) {
    pdf.setDrawColor(...lightGrey);
    pdf.line(M, y, R, y);
    y += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...grey);
    const lines = pdf.splitTextToSize(FORFETTARIO_NOTE, W - M * 2);
    pdf.text(lines, M, y);
    y += lines.length * 3.5 + 4;
  }

  // ─── Footer ───────────────────────────────────────────────────────────────
  pdf.setDrawColor(...lightGrey);
  pdf.setLineWidth(0.4);
  pdf.line(M, 280, R, 280);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...grey);

  const footerParts: string[] = [];
  if (profile.email) footerParts.push(profile.email);
  if (profile.iban) footerParts.push(`IBAN: ${profile.iban}`);
  pdf.text(footerParts.join('   |   '), M, 285);
  pdf.text(`Pag. 1 di 1`, R, 285, { align: 'right' });

  return pdf;
}

export async function generateInvoicePDF(doc: Document, profile: Profile): Promise<void> {
  const pdf = buildInvoicePDF(doc, profile);
  const fileName = `fattura_${doc.invoiceNumber?.replace('/', '-') || doc.id}_${profile.name.replace(/\s+/g, '_')}.pdf`;
  const blob = pdf.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: fileName });
  } else {
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}
