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

export async function generateInvoicePDF(doc: Document, profile: Profile): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;
  const W = 210;
  const margin = 14;
  const rightCol = W - margin;

  // ─── Colori ───────────────────────────────────────────────────────────────
  const primary: [number, number, number] = [79, 70, 229];   // indigo
  const dark: [number, number, number] = [15, 23, 42];
  const muted: [number, number, number] = [100, 116, 139];
  const light: [number, number, number] = [241, 245, 249];

  // ─── Header band ──────────────────────────────────────────────────────────
  pdf.setFillColor(...primary);
  pdf.rect(0, 0, W, 38, 'F');

  // Nome freelance
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(255, 255, 255);
  pdf.text(profile.name, margin, 15);

  // Regime pill
  const regime = profile.regime === 'ordinario' ? 'Regime Ordinario' : 'Regime Forfettario';
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(regime.toUpperCase(), margin, 22);

  // Numero fattura (destra)
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`FATTURA N° ${doc.invoiceNumber || '—'}`, rightCol, 15, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Data: ${new Date(doc.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}`, rightCol, 22, { align: 'right' });

  // ─── Dati freelance + cliente ──────────────────────────────────────────────
  let y = 48;

  const boxH = 44;

  // Box Fornitore
  pdf.setFillColor(...light);
  pdf.roundedRect(margin, y, 85, boxH, 3, 3, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(...muted);
  pdf.text('FORNITORE', margin + 4, y + 6);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...dark);
  pdf.text(profile.name, margin + 4, y + 13);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...muted);
  if (profile.address) pdf.text(profile.address, margin + 4, y + 21, { maxWidth: 77 });
  const fiscalLine = [
    profile.piva ? `P.IVA: ${profile.piva}` : '',
    profile.codiceFiscale ? `C.F.: ${profile.codiceFiscale}` : '',
  ].filter(Boolean).join('   ');
  if (fiscalLine) pdf.text(fiscalLine, margin + 4, y + 33, { maxWidth: 77 });

  // Box Cliente
  const cx = W / 2 + 2;
  pdf.setFillColor(...light);
  pdf.roundedRect(cx, y, W - cx - margin, boxH, 3, 3, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(...muted);
  pdf.text('CLIENTE', cx + 4, y + 6);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...dark);
  pdf.text(doc.client || 'Cliente non specificato', cx + 4, y + 13, { maxWidth: W - cx - margin - 8 });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(...muted);
  if (doc.clientAddress) pdf.text(doc.clientAddress, cx + 4, y + 21, { maxWidth: W - cx - margin - 8 });
  const clientPivaDisplay = doc.clientPiva && doc.clientPiva !== 'Privato' ? `P.IVA: ${doc.clientPiva}` : (doc.clientPiva === 'Privato' ? 'Cliente privato' : '');
  const clientFiscal = [
    clientPivaDisplay,
    doc.clientCf ? `C.F.: ${doc.clientCf}` : '',
  ].filter(Boolean).join('   ');
  if (clientFiscal) pdf.text(clientFiscal, cx + 4, y + 33, { maxWidth: W - cx - margin - 8 });

  y += boxH + 6;

  // ─── Tabella voci ─────────────────────────────────────────────────────────
  autoTable(pdf, {
    startY: y,
    head: [['Descrizione', 'Imponibile']],
    body: [[doc.title || 'Servizio non specificato', fmt(doc.amount)]],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: primary, textColor: 255, fontStyle: 'bold', halign: 'left' },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  });

  y = pdf.lastAutoTable?.finalY ?? y + 20;
  y += 4;

  // ─── Riepilogo importi ────────────────────────────────────────────────────
  const summaryX = W - margin - 80;
  const summaryW = 80;

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

  const summaryRows: [string, string, boolean][] = [
    ['Imponibile', fmt(doc.amount), false],
    ...(rivalsaInps ? [[`Rivalsa INPS (4%)`, `+ ${fmt(rivalsaAmount)}`, false] as [string, string, boolean]] : []),
    ...(isOrdinario ? [[`IVA ${ivaRate}%`, `+ ${fmt(ivaAmount)}`, false] as [string, string, boolean]] : []),
    ...(marcaBollo ? [['Marca da bollo', `+ ${fmt(MARCA_BOLLO_AMOUNT)}`, false] as [string, string, boolean]] : []),
    ...(ritenuta ? [["Ritenuta d'acconto (20%)", `- ${fmt(ritenutaAmount)}`, false] as [string, string, boolean]] : []),
    ['TOTALE DA RICEVERE', fmt(totale), true],
  ];

  pdf.setDrawColor(...light);
  summaryRows.forEach(([label, value, isBold]) => {
    const bgColor: [number, number, number] = isBold ? primary : light;
    const textColor: [number, number, number] = isBold ? [255, 255, 255] : muted;
    pdf.setFillColor(...bgColor);
    pdf.rect(summaryX, y, summaryW, 8, 'F');
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setFontSize(isBold ? 9 : 8);
    pdf.setTextColor(...textColor);
    pdf.text(label, summaryX + 3, y + 5.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(value, summaryX + summaryW - 3, y + 5.5, { align: 'right' });
    y += 9;
  });

  y += 8;

  // ─── Nota legale ──────────────────────────────────────────────────────────
  if (!isOrdinario) {
    pdf.setDrawColor(...primary);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, margin + 120, y);
    y += 4;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...muted);
    const lines = pdf.splitTextToSize(FORFETTARIO_NOTE, W - margin * 2);
    pdf.text(lines, margin, y);
    y += lines.length * 3.5 + 4;
  }

  // ─── Footer ───────────────────────────────────────────────────────────────
  pdf.setFillColor(...primary);
  pdf.rect(0, 287, W, 10, 'F');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(255, 255, 255);
  const footerLeft = [profile.email, profile.iban ? `IBAN: ${profile.iban}` : ''].filter(Boolean).join('   |   ');
  pdf.text(footerLeft, margin, 293);
  pdf.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, rightCol, 293, { align: 'right' });

  // ─── Condividi / Scarica ──────────────────────────────────────────────────
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
