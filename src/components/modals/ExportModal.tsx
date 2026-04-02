import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { X, Download, Check, Mail, Share2, Eye, AlertTriangle } from 'lucide-react';
import { Document as AppDoc, Profile, Accountant } from '../../types';
import { useProStatus } from '../../hooks/useProStatus';
import { generateFatturaPA, getMissingProfileFields } from '../../services/fatturaPA';
import { parseLocalDate, getLocalYear, getLocalMonth } from '../../utils/date';
import { calcularTrimestre, generateResumenPDF, getCurrentQuarter, QUARTER_LABELS } from '../../services/modelosES';
import PdfPreviewModal from './PdfPreviewModal';

type jsPDFWithAutoTable = import('jspdf').jsPDF & { lastAutoTable: { finalY: number } };

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: AppDoc[];
  selectedYear: number;
  profile: Profile;
  accountant?: Accountant;
  darkMode?: boolean;
}

const MONTH_NAMES = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

function formatAmount(n: number) {
  return `€${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ExportModal({ isOpen, onClose, documents, selectedYear, profile, accountant, darkMode }: ExportModalProps) {
  const isPro = useProStatus(profile);
  const isItaly = profile.country === 'Italy';
  const isSpain = profile.country === 'Spain';

  const [docFilter, setDocFilter] = useState<'all' | 'invoice' | 'expense'>('all');
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const [exporting, setExporting] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set());
  const [includeFatturaPA, setIncludeFatturaPA] = useState(true);
  const [includeResumen, setIncludeResumen] = useState(true);
  const [includeRegistro, setIncludeRegistro] = useState(false);
  const [includeRiepilogo, setIncludeRiepilogo] = useState(false);
  const [overrideQuarter, setOverrideQuarter] = useState<1 | 2 | 3 | 4 | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ blob: Blob; fileName: string } | null>(null);
  const [readyBlob, setReadyBlob] = useState<{
    blob: Blob; fileName: string;
    xmlFiles?: { blob: Blob; fileName: string }[];
    resumenFile?: { blob: Blob; fileName: string };
    registroFile?: { blob: Blob; fileName: string };
    riepilogoFile?: { blob: Blob; fileName: string };
  } | null>(null);
  const [year, setYear] = useState(selectedYear);

  useEffect(() => {
    if (isOpen) {
      setYear(selectedYear);
      setSelectedMonths(new Set());
      setReadyBlob(null);
      setIncludeFatturaPA(true);
      setIncludeResumen(true);
      setIncludeRegistro(false);
      setIncludeRiepilogo(false);
      setOverrideQuarter(null);
    }
  }, [isOpen, selectedYear]);

  const missingProfileFields = useMemo(() => getMissingProfileFields(profile), [profile]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>(documents.map(d => getLocalYear(d.date)));
    years.add(currentYear);
    years.add(currentYear + 1);
    return Array.from(years).sort((a, b) => b - a);
  }, [documents]);

  const yearDocs = useMemo(() =>
    documents.filter(d => getLocalYear(d.date) === year),
    [documents, year]
  );

  const availableMonths = useMemo(() => {
    const months = new Set<number>(yearDocs.map(d => getLocalMonth(d.date)));
    return Array.from(months).sort((a, b) => a - b);
  }, [yearDocs]);

  const syncedMonths = useMemo(() => {
    const valid = new Set(availableMonths);
    const synced = new Set([...selectedMonths].filter(m => valid.has(m)));
    // If synced is empty but availableMonths has items, return all
    if (synced.size === 0 && availableMonths.length > 0) return new Set(availableMonths);
    return synced;
  }, [availableMonths, selectedMonths]);

  // Derive quarter from selected months; reset manual override when months/year change
  const derivedQuarter = useMemo((): 1 | 2 | 3 | 4 => {
    const months = [...syncedMonths].sort((a, b) => a - b);
    if (months.length === 0) return getCurrentQuarter();
    const mid = months[Math.floor(months.length / 2)];
    if (mid < 3) return 1;
    if (mid < 6) return 2;
    if (mid < 9) return 3;
    return 4;
  }, [syncedMonths]);

  useEffect(() => { setOverrideQuarter(null); }, [syncedMonths, year]);

  const resumenQuarter = overrideQuarter ?? derivedQuarter;
  const resumenYear = year;
  const hasTaxIdSpain = !!(profile.nie || profile.piva);

  const resumenPreview = useMemo(() =>
    calcularTrimestre(documents, resumenQuarter, resumenYear),
    [documents, resumenQuarter, resumenYear]
  );

  const toggleMonth = (m: number) => {
    setReadyBlob(null);
    setSelectedMonths(prev => {
      const next = new Set(prev.size === 0 ? availableMonths : prev);
      if (next.has(m)) { next.delete(m); } else { next.add(m); }
      return next;
    });
  };

  const toggleAll = () => {
    setReadyBlob(null);
    if (syncedMonths.size === availableMonths.length) {
      setSelectedMonths(new Set());
    } else {
      setSelectedMonths(new Set(availableMonths));
    }
  };

  const filteredDocs = useMemo(() => {
    return yearDocs.filter(d => {
      const month = getLocalMonth(d.date);
      if (!syncedMonths.has(month)) return false;
      if (docFilter === 'invoice') return d.type === 'invoice';
      if (docFilter === 'expense') return d.type === 'expense';
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [yearDocs, syncedMonths, docFilter]);

  const incompleteInvoices = useMemo(() =>
    filteredDocs.filter(d => d.type === 'invoice' && (!d.title || !d.invoiceNumber || !d.clientAddress || (!d.clientPiva && d.clientPiva !== 'Privato'))),
    [filteredDocs]
  );

  const totals = useMemo(() => filteredDocs.reduce((acc, d) => {
    if (d.type === 'invoice') acc.income += d.amount;
    else if (d.type === 'credit_note') acc.income -= d.amount;
    else if (d.type === 'expense') acc.expenses += d.amount;
    return acc;
  }, { income: 0, expenses: 0 }), [filteredDocs]);

  const periodLabel = useMemo(() => {
    const months = [...syncedMonths].sort((a, b) => a - b);
    if (months.length === 0) return `${year}`;
    if (months.length === 12) return `Anno ${year}`;
    if (months.length === 1) return `${MONTH_NAMES[months[0]]} ${year}`;
    return `${MONTH_NAMES[months[0]]} – ${MONTH_NAMES[months[months.length - 1]]} ${year}`;
  }, [syncedMonths, year]);

  const handleExport = async () => {
    if (filteredDocs.length === 0 && !includeRiepilogo) return;
    setExporting(true);
    try {
      if (format === 'csv') {
        await exportCSV();
      } else {
        await exportPDF();
      }
    } finally {
      setExporting(false);
    }
  };

  const handleShareFile = async () => {
    if (!readyBlob) return;
    const { blob, fileName, xmlFiles } = readyBlob;
    const primaryFile = new File([blob], fileName, { type: blob.type });
    const xmlFileObjs = (xmlFiles || []).map(f => new File([f.blob], f.fileName, { type: 'application/xml' }));
    const resumenFileObj = readyBlob.resumenFile
      ? new File([readyBlob.resumenFile.blob], readyBlob.resumenFile.fileName, { type: 'application/pdf' })
      : null;
    const registroFileObj = readyBlob.registroFile
      ? new File([readyBlob.registroFile.blob], readyBlob.registroFile.fileName, { type: readyBlob.registroFile.blob.type })
      : null;
    const riepilogoFileObj = readyBlob.riepilogoFile
      ? new File([readyBlob.riepilogoFile.blob], readyBlob.riepilogoFile.fileName, { type: 'application/pdf' })
      : null;
    const allFiles = [primaryFile, ...xmlFileObjs, ...(resumenFileObj ? [resumenFileObj] : []), ...(registroFileObj ? [registroFileObj] : []), ...(riepilogoFileObj ? [riepilogoFileObj] : [])];

    if (navigator.share && navigator.canShare?.({ files: allFiles })) {
      await navigator.share({ files: allFiles, title: fileName });
    } else {
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      for (const f of xmlFiles || []) {
        const u = URL.createObjectURL(f.blob);
        const ax = window.document.createElement('a');
        ax.href = u; ax.download = f.fileName; ax.click();
        URL.revokeObjectURL(u);
      }
      if (readyBlob.resumenFile) {
        const u = URL.createObjectURL(readyBlob.resumenFile.blob);
        const ar = window.document.createElement('a');
        ar.href = u; ar.download = readyBlob.resumenFile.fileName; ar.click();
        URL.revokeObjectURL(u);
      }
      if (readyBlob.registroFile) {
        const u = URL.createObjectURL(readyBlob.registroFile.blob);
        const ar = window.document.createElement('a');
        ar.href = u; ar.download = readyBlob.registroFile.fileName; ar.click();
        URL.revokeObjectURL(u);
      }
      if (readyBlob.riepilogoFile) {
        const u = URL.createObjectURL(readyBlob.riepilogoFile.blob);
        const ar = window.document.createElement('a');
        ar.href = u; ar.download = readyBlob.riepilogoFile.fileName; ar.click();
        URL.revokeObjectURL(u);
      }
    }
    setReadyBlob(null);
    onClose();
  };

  const handleOpenMail = () => {
    if (!accountant) return;
    const xmlFiles = readyBlob?.xmlFiles || [];
    // Download XMLs so they land in the Downloads folder for manual attachment
    for (const f of xmlFiles) {
      const u = URL.createObjectURL(f.blob);
      const a = window.document.createElement('a');
      a.href = u; a.download = f.fileName; a.click();
      URL.revokeObjectURL(u);
    }
    // Download resumen PDF if present
    if (readyBlob?.resumenFile) {
      const u = URL.createObjectURL(readyBlob.resumenFile.blob);
      const ar = window.document.createElement('a');
      ar.href = u; ar.download = readyBlob.resumenFile.fileName; ar.click();
      URL.revokeObjectURL(u);
    }
    // Download registro cronologico if present
    if (readyBlob?.registroFile) {
      const u = URL.createObjectURL(readyBlob.registroFile.blob);
      const ar = window.document.createElement('a');
      ar.href = u; ar.download = readyBlob.registroFile.fileName; ar.click();
      URL.revokeObjectURL(u);
    }
    // Download riepilogo annuale if present
    if (readyBlob?.riepilogoFile) {
      const u = URL.createObjectURL(readyBlob.riepilogoFile.blob);
      const ar = window.document.createElement('a');
      ar.href = u; ar.download = readyBlob.riepilogoFile.fileName; ar.click();
      URL.revokeObjectURL(u);
    }

    const hasXmls = xmlFiles.length > 0;
    const hasResumen = !!readyBlob?.resumenFile;
    const hasRegistro = !!readyBlob?.registroFile;
    const hasRiepilogo = !!readyBlob?.riepilogoFile;
    const subject = encodeURIComponent(`Documenti ${periodLabel} — Solvy`);
    const body = encodeURIComponent(
      `Ciao ${accountant.firstName},\n\n` +
      `ti invio i documenti relativi al periodo: ${periodLabel}.\n` +
      `In allegato trovi il file ${format.toUpperCase()}` +
      (hasXmls ? ` e gli XML FatturaPA di ${xmlFiles.length} fattur${xmlFiles.length === 1 ? 'a' : 'e'}` : '') +
      (hasResumen ? ` e il Resumen Trimestral ${QUARTER_LABELS[resumenQuarter].split(' ')[0]} ${resumenYear}` : '') +
      (hasRegistro ? ` e il Registro Cronologico ${year}` : '') +
      (hasRiepilogo ? ` e il Riepilogo Annuale ${year}` : '') +
      `.\n` +
      (hasXmls ? `\nGli XML FatturaPA sono stati salvati nella cartella Download — allegali manualmente all'email.\n` : '') +
      (hasResumen ? `\nIl PDF Resumen Trimestral è stato salvato nella cartella Download — allegalo manualmente all'email.\n` : '') +
      (hasRegistro ? `\nIl Registro Cronologico è stato salvato nella cartella Download — allegalo manualmente all'email.\n` : '') +
      (hasRiepilogo ? `\nIl Riepilogo Annuale è stato salvato nella cartella Download — allegalo manualmente all'email.\n` : '') +
      `\nGrazie`
    );
    window.location.href = `mailto:${accountant.email}?subject=${subject}&body=${body}`;
  };

  const exportCSV = async () => {
    const header = ['Data', 'Tipo', 'Descrizione', 'Cliente', 'Importo (€)', 'Stato', 'Categoria'];
    const rows = filteredDocs.map(d => [
      parseLocalDate(d.date).toLocaleDateString('it-IT'),
      d.type === 'invoice' ? 'Fattura' : 'Spesa',
      d.title,
      d.client || '',
      d.amount.toFixed(2),
      d.status === 'paid' ? 'Saldato' : d.status === 'pending' ? 'In attesa' : d.status,
      d.category || '',
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const fileName = `documenti_${year}_${Date.now()}.csv`;
    await shareOrDownload(blob, fileName, 'text/csv');
  };

  const exportPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;
    const W = 210;
    const margin = 14;
    const rightCol = W - margin;

    const primary: [number, number, number] = [79, 70, 229];

    const MARCA_BOLLO_THRESHOLD = 77.47;
    const MARCA_BOLLO_AMOUNT = 2;
    const RITENUTA_RATE = 0.20;
    const INPS_RATE = 0.04;
    const FORFETTARIO_NOTE =
      "Operazione effettuata in regime forfettario ai sensi dell'art. 1, commi 54-89, L. n. 190/2014. " +
      "Non soggetta ad IVA ai sensi dell'art. 1, co. 58, L. 190/2014. " +
      "Non soggetta a ritenuta d'acconto ai sensi dell'art. 1, co. 67, L. 190/2014.";

    const black: [number, number, number] = [15, 23, 42];
    const grey: [number, number, number] = [100, 116, 139];
    const lightGrey: [number, number, number] = [226, 232, 240];

    // ── Spain invoice helper ─────────────────────────────────────────────────
    const drawInvoicePageSpain = (inv: AppDoc, isFirst: boolean) => {
      if (!isFirst) pdf.addPage();
      const M = margin;
      const R = rightCol;

      const taxId = profile.nie || profile.piva || '';
      const ivaRate = profile.ivaHabitual ?? 21;
      const currentYr = new Date().getFullYear();
      const yearsActive = profile.annoInizioAttivita ? currentYr - profile.annoInizioAttivita : 10;
      const retencionRate = yearsActive <= 3 ? 7 : 15;

      // Title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(...black);
      pdf.text('FACTURA', M, 18);

      // Nº + Fecha (right)
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(...grey);
      pdf.text(`Nº ${inv.invoiceNumber || '—'}`, R, 14, { align: 'right' });
      pdf.setFontSize(9);
      pdf.text(new Date(inv.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }), R, 20, { align: 'right' });

      // Divider
      pdf.setDrawColor(...lightGrey);
      pdf.setLineWidth(0.4);
      pdf.line(M, 26, R, 26);

      let y = 33;
      const colW = (R - M - 8) / 2;
      const col2 = M + colW + 8;

      // Column headers
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(...grey);
      pdf.text('PROVEEDOR', M, y);
      pdf.text('CLIENTE', col2, y);
      y += 6;

      // Names
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(...black);
      pdf.text(profile.name, M, y);
      pdf.text(inv.client || 'Cliente no especificado', col2, y, { maxWidth: colW });
      y += 5;

      // Details
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(...grey);

      const proveedorLines: string[] = [];
      if (profile.address) proveedorLines.push(profile.address);
      if (taxId) proveedorLines.push(`NIF/NIE: ${taxId}`);
      if (profile.email) proveedorLines.push(profile.email);
      if (profile.iban) proveedorLines.push(`IBAN: ${profile.iban}`);

      const clientNifText = inv.clientPiva && inv.clientPiva !== 'Privato' ? `NIF/CIF: ${inv.clientPiva}` : '';
      const clienteLines: string[] = [];
      if (inv.clientAddress) clienteLines.push(inv.clientAddress);
      if (clientNifText) clienteLines.push(clientNifText);

      const maxLines = Math.max(proveedorLines.length, clienteLines.length);
      for (let i = 0; i < maxLines; i++) {
        if (proveedorLines[i]) pdf.text(proveedorLines[i], M, y, { maxWidth: colW });
        if (clienteLines[i]) pdf.text(clienteLines[i], col2, y, { maxWidth: colW });
        y += 5;
      }
      y += 4;

      // Divider
      pdf.setDrawColor(...lightGrey);
      pdf.line(M, y, R, y);
      y += 8;

      // Line items table
      autoTable(pdf, {
        startY: y,
        head: [['Descripción', 'Importe']],
        body: [[inv.title || 'Servicio no especificado', `€ ${inv.amount.toFixed(2)}`]],
        styles: { fontSize: 9, cellPadding: { top: 5, bottom: 5, left: 3, right: 3 }, textColor: black },
        headStyles: { fillColor: [248, 250, 252], textColor: grey, fontStyle: 'bold', fontSize: 8, lineColor: lightGrey, lineWidth: 0.3 },
        bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 38, halign: 'right', fontStyle: 'bold', textColor: black } },
        margin: { left: M, right: M },
        tableLineColor: lightGrey,
        tableLineWidth: 0.3,
      });

      y = (pdf.lastAutoTable?.finalY ?? y + 20) + 6;

      // Summary
      const summaryX = W - M - 72;
      const summaryW = 72;
      const ivaAmount = inv.amount * (ivaRate / 100);
      const retencionAmount = inv.amount * (retencionRate / 100);
      const totalACobrar = inv.amount + ivaAmount - retencionAmount;

      const summaryRows: [string, string][] = [
        ['Base imponible', `€ ${inv.amount.toFixed(2)}`],
        [`IVA ${ivaRate}%`, `+ € ${ivaAmount.toFixed(2)}`],
        [`Ret. IRPF ${retencionRate}%`, `- € ${retencionAmount.toFixed(2)}`],
      ];

      summaryRows.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...grey);
        pdf.text(label, summaryX, y + 4);
        pdf.setTextColor(...black);
        pdf.text(value, summaryX + summaryW, y + 4, { align: 'right' });
        pdf.setDrawColor(...lightGrey);
        pdf.line(summaryX, y + 7, summaryX + summaryW, y + 7);
        y += 9;
      });

      y += 2;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(...black);
      pdf.text('TOTAL A COBRAR', summaryX, y + 5);
      pdf.setFontSize(11);
      pdf.setTextColor(...primary);
      pdf.text(`€ ${totalACobrar.toFixed(2)}`, summaryX + summaryW, y + 5, { align: 'right' });

      // Footer
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
      pdf.text('Pág. 1 de 1', R, 285, { align: 'right' });
    };

    const drawInvoicePage = (inv: AppDoc, isFirst: boolean) => {
      if (!isFirst) pdf.addPage();
      const M = margin;
      const R = rightCol;
      const isCreditNote = inv.type === 'credit_note';
      const redColor: [number, number, number] = [220, 38, 38];

      // Titolo
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(...(isCreditNote ? redColor : black));
      pdf.text(isCreditNote ? 'NOTA DI CREDITO' : 'FATTURA', M, 18);

      // Badge "Nota di Credito · rif. XXX" sotto il titolo
      if (isCreditNote && inv.category) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(...redColor);
        pdf.text(`Nota di Credito · rif. ${inv.category}`, M, 24);
      }

      // Numero + Data destra
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(...grey);
      pdf.text(`N° ${inv.invoiceNumber || '—'}`, R, 14, { align: 'right' });
      pdf.setFontSize(9);
      pdf.text(new Date(inv.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }), R, 20, { align: 'right' });
      pdf.setFontSize(8);
      pdf.text((profile.regime === 'ordinario' ? 'Regime Ordinario' : 'Regime Forfettario').toUpperCase(), M, 24);

      // Divider
      pdf.setDrawColor(...lightGrey);
      pdf.setLineWidth(0.4);
      pdf.line(M, 28, R, 28);

      let y = 35;
      const colW = (R - M - 8) / 2;
      const col2 = M + colW + 8;

      // Labels
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(...grey);
      pdf.text('FORNITORE', M, y);
      pdf.text('CLIENTE', col2, y);
      y += 6;

      // Nomi
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(...black);
      pdf.text(profile.name, M, y);
      pdf.text(inv.client || 'Cliente non specificato', col2, y, { maxWidth: colW });
      y += 5;

      // Dettagli
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(...grey);

      const fornitoreLines: string[] = [];
      if (profile.address) fornitoreLines.push(profile.address);
      if (profile.piva) fornitoreLines.push(`P.IVA: ${profile.piva}`);
      if (profile.codiceFiscale) fornitoreLines.push(`C.F.: ${profile.codiceFiscale}`);
      if (profile.email) fornitoreLines.push(profile.email);
      if (profile.iban) fornitoreLines.push(`IBAN: ${profile.iban}`);

      const clientePivaText = inv.clientPiva === 'Privato' ? 'Cliente privato' : (inv.clientPiva && inv.clientPiva.toLowerCase() !== 'nessuna') ? `P.IVA: ${inv.clientPiva}` : '';
      const clienteLines: string[] = [];
      if (inv.clientAddress) clienteLines.push(inv.clientAddress);
      if (clientePivaText) clienteLines.push(clientePivaText);
      if (inv.clientCf) clienteLines.push(`C.F.: ${inv.clientCf}`);

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

      // Calcoli
      const docRegime = inv.docRegime ?? profile.regime ?? 'forfettario';
      const isOrdinario = docRegime === 'ordinario';
      const ivaRate = inv.ivaRate ?? 0;
      const rivalsaInps = !isCreditNote && (inv.rivalsaInps ?? false);
      const ritenuta = !isCreditNote && (inv.ritenuta ?? false);
      const marcaBollo = !isCreditNote && !isOrdinario && (inv.marcaBollo ?? (inv.amount > MARCA_BOLLO_THRESHOLD));
      const displayAmount = isCreditNote ? -inv.amount : inv.amount;
      const rivalsaAmount = rivalsaInps ? inv.amount * INPS_RATE : 0;
      const totaleImponibile = isCreditNote ? displayAmount : inv.amount + rivalsaAmount;
      const ivaAmount = isOrdinario && !isCreditNote ? totaleImponibile * (ivaRate / 100) : 0;
      const ritenutaAmount = ritenuta ? inv.amount * RITENUTA_RATE : 0;
      const totale = totaleImponibile + ivaAmount + (marcaBollo ? MARCA_BOLLO_AMOUNT : 0) - ritenutaAmount;

      // Tabella
      autoTable(pdf, {
        startY: y,
        head: [['Descrizione', 'Importo']],
        body: [[inv.title || (isCreditNote ? 'Nota di credito' : 'Servizio non specificato'), `${isCreditNote ? '– ' : ''}€ ${inv.amount.toFixed(2)}`]],
        styles: { fontSize: 9, cellPadding: { top: 5, bottom: 5, left: 3, right: 3 }, textColor: black },
        headStyles: { fillColor: [248, 250, 252], textColor: grey, fontStyle: 'bold', fontSize: 8, lineColor: lightGrey, lineWidth: 0.3 },
        bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 38, halign: 'right', fontStyle: 'bold', textColor: isCreditNote ? redColor : black } },
        margin: { left: M, right: M },
        tableLineColor: lightGrey,
        tableLineWidth: 0.3,
      });

      y = (pdf.lastAutoTable?.finalY ?? y + 20) + 6;

      // Riepilogo
      const summaryX = W - M - 72;
      const summaryW = 72;

      const summaryRows: [string, string][] = isCreditNote
        ? [['Imponibile stornato', `– € ${inv.amount.toFixed(2)}`]]
        : [
            ['Imponibile', `€ ${inv.amount.toFixed(2)}`],
            ...(rivalsaInps ? [[`Rivalsa INPS (4%)`, `+ € ${rivalsaAmount.toFixed(2)}`] as [string, string]] : []),
            ...(isOrdinario ? [[`IVA ${ivaRate}%`, `+ € ${ivaAmount.toFixed(2)}`] as [string, string]] : []),
            ...(marcaBollo ? [['Marca da bollo', `+ € ${MARCA_BOLLO_AMOUNT.toFixed(2)}`] as [string, string]] : []),
            ...(ritenuta ? [["Ritenuta d'acconto (20%)", `- € ${ritenutaAmount.toFixed(2)}`] as [string, string]] : []),
          ];

      summaryRows.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...grey);
        pdf.text(label, summaryX, y + 4);
        pdf.setTextColor(...(isCreditNote ? redColor : black));
        pdf.text(value, summaryX + summaryW, y + 4, { align: 'right' });
        pdf.setDrawColor(...lightGrey);
        pdf.line(summaryX, y + 7, summaryX + summaryW, y + 7);
        y += 9;
      });

      y += 2;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(...black);
      pdf.text(isCreditNote ? 'TOTALE DA STORNARE' : 'TOTALE DA RICEVERE', summaryX, y + 5);
      pdf.setFontSize(11);
      pdf.setTextColor(...(isCreditNote ? redColor : primary));
      pdf.text(`${isCreditNote ? '– ' : ''}€ ${Math.abs(totale).toFixed(2)}`, summaryX + summaryW, y + 5, { align: 'right' });
      y += 14;

      // Nota legale (solo fatture ordinarie/forfettarie, non note di credito)
      if (!isOrdinario && !isCreditNote) {
        pdf.setDrawColor(...lightGrey);
        pdf.line(M, y, R, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(...grey);
        const lines = pdf.splitTextToSize(FORFETTARIO_NOTE, W - M * 2);
        pdf.text(lines, M, y);
      }

      // Footer
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
      pdf.text('Pag. 1 di 1', R, 285, { align: 'right' });
    };

    const invoices = filteredDocs.filter(d => d.type === 'invoice' || d.type === 'credit_note');
    const expenses = filteredDocs.filter(d => d.type === 'expense');

    // Una pagina per ogni fattura/nota di credito
    invoices.forEach((inv, i) => isSpain ? drawInvoicePageSpain(inv, i === 0) : drawInvoicePage(inv, i === 0));

    // Pagina riepilogo spese
    if (expenses.length > 0) {
      if (invoices.length > 0) pdf.addPage();
      const M = margin;
      const R = rightCol;

      // Header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(...black);
      pdf.text(isSpain ? 'GASTOS' : 'RIEPILOGO SPESE', M, 18);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...grey);
      pdf.text(periodLabel, R, 14, { align: 'right' });
      pdf.setFontSize(8);
      pdf.text(profile.name, M, 24);

      pdf.setDrawColor(...lightGrey);
      pdf.setLineWidth(0.4);
      pdf.line(M, 28, R, 28);

      autoTable(pdf, {
        startY: 36,
        head: [isSpain ? ['Fecha', 'Categoría', 'Descripción', 'Importe'] : ['Data', 'Categoria', 'Descrizione', 'Importo']],
        body: expenses.map(d => [
          parseLocalDate(d.date).toLocaleDateString(isSpain ? 'es-ES' : 'it-IT'),
          d.category || '—',
          d.title,
          `€ ${d.amount.toFixed(2)}`,
        ]),
        styles: { fontSize: 9, cellPadding: { top: 5, bottom: 5, left: 3, right: 3 }, textColor: black },
        headStyles: { fillColor: [248, 250, 252], textColor: grey, fontStyle: 'bold', fontSize: 8, lineColor: lightGrey, lineWidth: 0.3 },
        bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
        columnStyles: { 0: { cellWidth: 25 }, 3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' } },
        margin: { left: M, right: M },
        tableLineColor: lightGrey,
        tableLineWidth: 0.3,
      });

      const fy = (pdf.lastAutoTable?.finalY ?? 36) + 8;
      const summaryX = W - M - 72;
      const summaryW = 72;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(...black);
      pdf.text('TOTALE', summaryX, fy + 5);
      pdf.setFontSize(11);
      pdf.setTextColor(...primary);
      pdf.text(formatAmount(totals.expenses), summaryX + summaryW, fy + 5, { align: 'right' });

      // Footer
      pdf.setDrawColor(...lightGrey);
      pdf.setLineWidth(0.4);
      pdf.line(M, 280, R, 280);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(...grey);
      pdf.text(profile.email || '', M, 285);
      pdf.text(isSpain ? `Generado el ${new Date().toLocaleDateString('es-ES')}` : `Generato il ${new Date().toLocaleDateString('it-IT')}`, R, 285, { align: 'right' });
    }

    const blob = pdf.output('blob');
    const fileName = `documenti_${year}_${Date.now()}.pdf`;
    await shareOrDownload(blob, fileName, 'application/pdf');
  };

  const generateRegistroFile = async (): Promise<{ blob: Blob; fileName: string }> => {
    const MARCA_BOLLO_VAL = 2;
    const registroDocs = yearDocs
      .filter(d => (d.type === 'invoice' || d.type === 'credit_note') && syncedMonths.has(getLocalMonth(d.date)))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const calcDoc = (doc: AppDoc) => {
      const isCN = doc.type === 'credit_note';
      const sign = isCN ? -1 : 1;
      const regime = doc.docRegime ?? profile.regime ?? 'forfettario';
      const isOrdinario = regime === 'ordinario';
      const rivalsaAmount = !isCN && doc.rivalsaInps ? doc.amount * 0.04 : 0;
      const imponibile = (doc.amount + rivalsaAmount) * sign;
      const ivaRate = doc.ivaRate ?? 0;
      const ivaAmount = isOrdinario && !isCN ? imponibile * (ivaRate / 100) : 0;
      const ritenutaAmount = !isCN && doc.ritenuta ? doc.amount * 0.20 : 0;
      const bolloAmount = !isCN && doc.marcaBollo ? MARCA_BOLLO_VAL : 0;
      const totale = imponibile + ivaAmount + bolloAmount - ritenutaAmount;
      const stato = isCN ? 'Storno NC' : doc.status === 'paid' ? 'Pagata' : doc.status === 'overdue' ? 'Scaduta' : 'In attesa';
      const dataIncasso = doc.status === 'paid' ? parseLocalDate(doc.date).toLocaleDateString('it-IT') : '';
      const clienteId = doc.clientPiva === 'Privato' ? `CF: ${doc.clientCf || '—'}` : (doc.clientPiva || doc.clientCf || '—');
      return { isCN, imponibile, ivaAmount, ritenutaAmount, bolloAmount, totale, stato, dataIncasso, clienteId };
    };

    if (format === 'csv') {
      const header = ['N°', 'Data', 'N° Documento', 'Cliente', 'P.IVA/C.F.', 'Imponibile (€)', 'IVA (€)', 'Ritenuta (€)', 'Marca Bollo (€)', 'Totale (€)', 'Stato', 'Data Incasso'];
      const rows = registroDocs.map((doc, i) => {
        const c = calcDoc(doc);
        return [
          String(i + 1),
          parseLocalDate(doc.date).toLocaleDateString('it-IT'),
          doc.invoiceNumber || doc.id.slice(0, 8),
          doc.client || '—',
          c.clienteId,
          c.imponibile.toFixed(2),
          c.ivaAmount.toFixed(2),
          c.ritenutaAmount.toFixed(2),
          c.bolloAmount.toFixed(2),
          c.totale.toFixed(2),
          c.stato,
          c.dataIncasso,
        ];
      });
      const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      return { blob: new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }), fileName: `registro_cronologico_${year}.csv` };
    }

    // PDF landscape
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;
    const W = 297; const M = 14; const R = W - M;
    const black: [number, number, number] = [15, 23, 42];
    const grey: [number, number, number] = [100, 116, 139];
    const lightGrey: [number, number, number] = [226, 232, 240];
    const primary: [number, number, number] = [79, 70, 229];

    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18); pdf.setTextColor(...black);
    pdf.text('REGISTRO CRONOLOGICO FATTURE', M, 18);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...grey);
    pdf.text(`${profile.name} · ${periodLabel}`, M, 26);
    if (profile.piva) pdf.text(`P.IVA: ${profile.piva}`, R, 26, { align: 'right' });
    pdf.setDrawColor(...lightGrey); pdf.setLineWidth(0.4); pdf.line(M, 30, R, 30);

    const tableRows = registroDocs.map((doc, i) => {
      const c = calcDoc(doc);
      return [String(i + 1), parseLocalDate(doc.date).toLocaleDateString('it-IT'), doc.invoiceNumber || doc.id.slice(0, 8), (doc.client || '—').slice(0, 28), c.clienteId, c.imponibile.toFixed(2), c.ivaAmount.toFixed(2), c.ritenutaAmount.toFixed(2), c.bolloAmount.toFixed(2), c.totale.toFixed(2), c.stato, c.dataIncasso];
    });

    autoTable(pdf, {
      startY: 36,
      head: [['N°', 'Data', 'N° Doc', 'Cliente', 'P.IVA/CF', 'Imponibile', 'IVA', 'Ritenuta', 'Bollo', 'Totale', 'Stato', 'Data Incasso']],
      body: tableRows,
      styles: { fontSize: 7.5, cellPadding: { top: 3, bottom: 3, left: 2, right: 2 }, textColor: black },
      headStyles: { fillColor: [248, 250, 252], textColor: grey, fontStyle: 'bold', fontSize: 7, lineColor: lightGrey, lineWidth: 0.3 },
      bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 22 }, 2: { cellWidth: 22 }, 3: { cellWidth: 38 }, 4: { cellWidth: 28 }, 5: { cellWidth: 22, halign: 'right' }, 6: { cellWidth: 17, halign: 'right' }, 7: { cellWidth: 19, halign: 'right' }, 8: { cellWidth: 14, halign: 'right' }, 9: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: primary }, 10: { cellWidth: 22 }, 11: { cellWidth: 22 } },
      margin: { left: M, right: M },
      tableLineColor: lightGrey, tableLineWidth: 0.3,
      didParseCell: (data) => {
        if (data.section === 'body' && registroDocs[data.row.index]?.type === 'credit_note') {
          data.cell.styles.fillColor = [255, 241, 242];
          data.cell.styles.textColor = [225, 29, 72];
        }
      },
    });

    const fy = (pdf.lastAutoTable?.finalY ?? 36) + 6;
    const totalImponibile = registroDocs.reduce((s, d) => s + calcDoc(d).imponibile, 0);
    const totalIva = registroDocs.reduce((s, d) => s + calcDoc(d).ivaAmount, 0);
    const totalTotale = registroDocs.reduce((s, d) => s + calcDoc(d).totale, 0);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(...black);
    pdf.text('TOTALE', M, fy);
    pdf.setTextColor(...primary);
    pdf.text(`Imponibile: €${totalImponibile.toFixed(2)}   IVA: €${totalIva.toFixed(2)}   Totale: €${totalTotale.toFixed(2)}`, M + 18, fy);
    pdf.setDrawColor(...lightGrey); pdf.setLineWidth(0.4); pdf.line(M, 200, R, 200);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(...grey);
    pdf.text('Registro cronologico generato da Solvy. Stima indicativa — consulta il tuo commercialista.', M, 205);
    pdf.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, R, 205, { align: 'right' });

    return { blob: pdf.output('blob'), fileName: `registro_cronologico_${year}.pdf` };
  };

  const shareOrDownload = async (blob: Blob, fileName: string, mimeType: string) => {
    if (accountant) {
      // Generate FatturaPA XMLs if toggle is on
      let xmlFiles: { blob: Blob; fileName: string }[] | undefined;
      if (includeFatturaPA && isItaly && isPro && missingProfileFields.length === 0) {
        const invoices = filteredDocs.filter(d => d.type === 'invoice');
        if (invoices.length > 0) {
          xmlFiles = invoices.map(inv => {
            const { xml, filename } = generateFatturaPA(inv, profile);
            return { blob: new Blob([xml], { type: 'application/xml' }), fileName: filename };
          });
        }
      }
      // Generate Resumen Trimestral PDF if toggle is on (Spain)
      let resumenFile: { blob: Blob; fileName: string } | undefined;
      if (includeResumen && isSpain && isPro && hasTaxIdSpain) {
        const resumen = calcularTrimestre(documents, resumenQuarter, resumenYear);
        const resumenPdf = await generateResumenPDF(resumen, profile);
        const nif = (profile.nie || profile.piva || 'SINIF').replace(/\s/g, '');
        const resumenFileName = `ES_${nif}_resumen_T${resumenQuarter}_${resumenYear}.pdf`;
        resumenFile = { blob: resumenPdf.output('blob'), fileName: resumenFileName };
      }

      let registroFile: { blob: Blob; fileName: string } | undefined;
      if (includeRegistro && isItaly && isPro) {
        registroFile = await generateRegistroFile();
      }
      let riepilogoFile: { blob: Blob; fileName: string } | undefined;
      if (includeRiepilogo && isItaly && isPro) {
        riepilogoFile = await generateRiepilogoFile();
      }
      setReadyBlob({ blob, fileName, xmlFiles, resumenFile, registroFile, riepilogoFile });
      return;
    }
    const file = new File([blob], fileName, { type: mimeType });
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: fileName });
    } else {
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
    onClose();
  };

  const generateRiepilogoFile = async (): Promise<{ blob: Blob; fileName: string }> => {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;
      const W = 210;
      const M = 14;
      const R = W - M;
      const primary: [number, number, number] = [79, 70, 229];
      const black: [number, number, number] = [15, 23, 42];
      const grey: [number, number, number] = [100, 116, 139];
      const lightGrey: [number, number, number] = [226, 232, 240];
      const green: [number, number, number] = [16, 185, 129];
      const red: [number, number, number] = [239, 68, 68];

      const INPS_GESTIONE_SEPARATA = 0.2607;
      const INPS_ORDINARIO = 0.24;
      function calcIRPEFLocal(imp: number): number {
        if (imp <= 0) return 0;
        if (imp <= 28000) return imp * 0.23;
        if (imp <= 50000) return 28000 * 0.23 + (imp - 28000) * 0.35;
        return 28000 * 0.23 + 22000 * 0.35 + (imp - 50000) * 0.43;
      }
      const fmtEur = (n: number) => `€ ${Math.abs(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      // ── Calcoli base ────────────────────────────────────────────────────────
      const allYearDocs = documents.filter(d => getLocalYear(d.date) === year);
      const paidInvoices = allYearDocs.filter(d => d.type === 'invoice' && d.status === 'paid');
      const creditNotes = allYearDocs.filter(d => d.type === 'credit_note');
      const expenseDocs = allYearDocs.filter(d => d.type === 'expense');

      const totalFatturato = paidInvoices.reduce((s, d) => s + d.amount, 0);
      const totalCrediti = creditNotes.reduce((s, d) => s + d.amount, 0);
      const totalIncome = totalFatturato - totalCrediti;
      const totalExpensesAmt = expenseDocs.reduce((s, d) => s + d.amount, 0);

      const regime = profile.regime || 'forfettario';
      const isForfettario = regime !== 'ordinario';
      const coeff = (profile.coefficiente != null && profile.coefficiente > 0) ? profile.coefficiente / 100 : 0.78;
      const redditoLordo = isForfettario ? Math.max(0, totalIncome * coeff) : Math.max(0, totalIncome - totalExpensesAmt);
      const inpsRate = isForfettario ? INPS_GESTIONE_SEPARATA : INPS_ORDINARIO;
      const inps = redditoLordo * inpsRate;
      const redditoImponibile = Math.max(0, redditoLordo - inps);
      const annoInizio = profile.annoInizioAttivita ?? null;
      const yearsActive = annoInizio != null ? year - Number(annoInizio) : null;
      const isFivePercent = isForfettario && yearsActive != null && Number.isFinite(yearsActive) && yearsActive < 5;
      const aliquota = isForfettario ? (isFivePercent ? 0.05 : 0.15) : 0;
      const impostaForFeit = redditoImponibile * aliquota;
      const irpef = isForfettario ? 0 : calcIRPEFLocal(redditoImponibile);
      const addizionali = isForfettario ? 0 : redditoImponibile * 0.023;
      const imposta = isForfettario ? impostaForFeit : irpef + addizionali;
      const accontoGiugno = imposta * 0.40;
      const accontoNovembre = imposta * 0.60;
      const saldo = imposta - accontoGiugno - accontoNovembre;
      const netto = isForfettario ? totalIncome - imposta - inps : totalIncome - imposta - inps - totalExpensesAmt;

      const ritenuteDocs = paidInvoices.filter(d => d.ritenuta);
      const totalRitenute = ritenuteDocs.reduce((s, d) => {
        const rivalsaAmt = d.rivalsaInps ? d.amount * 0.04 : 0;
        return s + (d.amount + rivalsaAmt) * 0.20;
      }, 0);

      const spesePerCat: Record<string, number> = {};
      expenseDocs.forEach(d => { const cat = d.category || 'Altro'; spesePerCat[cat] = (spesePerCat[cat] || 0) + d.amount; });
      const speseRows = Object.entries(spesePerCat).sort((a, b) => b[1] - a[1]);

      // ── Header pagina ───────────────────────────────────────────────────────
      pdf.setFillColor(...primary);
      pdf.rect(0, 0, W, 32, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`Riepilogo Annuale ${year}`, M, 14);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(200, 200, 255);
      pdf.text(profile.name, M, 22);
      pdf.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, R, 22, { align: 'right' });
      pdf.setTextColor(200, 200, 255);
      pdf.setFontSize(9);
      pdf.text(`Regime: ${isForfettario ? 'Forfettario' : 'Ordinario'}${isFivePercent ? ' · Aliquota agevolata 5%' : ''}`, R, 14, { align: 'right' });

      let y = 42;

      // ── Riepilogo fatturato ─────────────────────────────────────────────────
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...grey);
      pdf.text('FATTURATO', M, y);
      y += 4;
      autoTable(pdf, {
        startY: y,
        head: [['Voce', 'Importo']],
        body: [
          ['Fatture emesse e incassate', fmtEur(totalFatturato)],
          ...(totalCrediti > 0 ? [['Note di credito emesse', `– ${fmtEur(totalCrediti)}`]] : []),
          ['Fatturato netto', fmtEur(totalIncome)],
        ],
        styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: black },
        headStyles: { fillColor: [248, 250, 252], textColor: grey, fontStyle: 'bold', fontSize: 8, lineColor: lightGrey, lineWidth: 0.3 },
        bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.row.index === (totalCrediti > 0 ? 2 : 1)) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = green;
          }
        },
        margin: { left: M, right: M },
      });
      y = (pdf.lastAutoTable?.finalY ?? y + 20) + 8;

      // ── Calcolo fiscale ─────────────────────────────────────────────────────
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...grey);
      pdf.text('CALCOLO FISCALE STIMATO', M, y);
      y += 4;
      const fiscaleBody: string[][] = isForfettario
        ? [
            ['Coefficiente di redditività', `${(coeff * 100).toFixed(0)}%`],
            ['Reddito lordo', fmtEur(redditoLordo)],
            [`Contributi INPS (${(inpsRate * 100).toFixed(2)}%)`, fmtEur(inps)],
            ['Reddito imponibile', fmtEur(redditoImponibile)],
            [`Imposta sostitutiva (${(aliquota * 100).toFixed(0)}%)`, fmtEur(imposta)],
            ['Acconto giugno (40%)', fmtEur(accontoGiugno)],
            ['Acconto novembre (60%)', fmtEur(accontoNovembre)],
            ['Saldo stimato', fmtEur(saldo)],
          ]
        : [
            ['Reddito lordo (fatturato – spese)', fmtEur(redditoLordo)],
            [`Contributi INPS (${(inpsRate * 100).toFixed(0)}%)`, fmtEur(inps)],
            ['Reddito imponibile', fmtEur(redditoImponibile)],
            ['IRPEF', fmtEur(irpef)],
            ['Addizionali (~2.3%)', fmtEur(addizionali)],
            ['Totale imposta', fmtEur(imposta)],
            ['Acconto giugno (40%)', fmtEur(accontoGiugno)],
            ['Acconto novembre (60%)', fmtEur(accontoNovembre)],
            ['Saldo stimato', fmtEur(saldo)],
          ];
      autoTable(pdf, {
        startY: y,
        head: [['Calcolo', 'Importo stimato']],
        body: fiscaleBody,
        styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: black },
        headStyles: { fillColor: [248, 250, 252], textColor: grey, fontStyle: 'bold', fontSize: 8, lineColor: lightGrey, lineWidth: 0.3 },
        bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 45, halign: 'right' } },
        margin: { left: M, right: M },
      });
      y = (pdf.lastAutoTable?.finalY ?? y + 30) + 8;

      // ── Netto reale ─────────────────────────────────────────────────────────
      autoTable(pdf, {
        startY: y,
        body: [['Netto reale stimato anno ' + year, fmtEur(netto)]],
        styles: { fontSize: 11, fontStyle: 'bold', cellPadding: { top: 5, bottom: 5, left: 3, right: 3 } },
        bodyStyles: { lineColor: primary, lineWidth: 0.4, textColor: primary },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 45, halign: 'right' } },
        margin: { left: M, right: M },
      });
      y = (pdf.lastAutoTable?.finalY ?? y + 14) + 8;

      // ── Spese per categoria (solo se ci sono) ───────────────────────────────
      if (speseRows.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(...grey);
        pdf.text('SPESE DEDUCIBILI PER CATEGORIA', M, y);
        y += 4;
        autoTable(pdf, {
          startY: y,
          head: [['Categoria', 'Totale']],
          body: [...speseRows.map(([cat, amt]) => [cat, fmtEur(amt)]), ['Totale spese', fmtEur(totalExpensesAmt)]],
          styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: black },
          headStyles: { fillColor: [248, 250, 252], textColor: grey, fontStyle: 'bold', fontSize: 8, lineColor: lightGrey, lineWidth: 0.3 },
          bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
          columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 45, halign: 'right' } },
          didParseCell: (data) => {
            if (data.section === 'body' && data.row.index === speseRows.length) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.textColor = red;
            }
          },
          margin: { left: M, right: M },
        });
        y = (pdf.lastAutoTable?.finalY ?? y + 20) + 8;
      }

      // ── Ritenute d'acconto ──────────────────────────────────────────────────
      if (ritenuteDocs.length > 0) {
        if (y > 220) { pdf.addPage(); y = 20; }
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(...grey);
        pdf.text('RITENUTE D\'ACCONTO SUBITE', M, y);
        y += 4;
        autoTable(pdf, {
          startY: y,
          head: [['Fattura', 'Cliente', 'Importo fattura', 'Ritenuta 20%']],
          body: [
            ...ritenuteDocs.map(d => {
              const rivAmt = d.rivalsaInps ? d.amount * 0.04 : 0;
              const ritenuta = (d.amount + rivAmt) * 0.20;
              return [d.invoiceNumber || d.id.slice(0, 8), d.client || '—', fmtEur(d.amount), fmtEur(ritenuta)];
            }),
            ['Totale ritenute subite', '', '', fmtEur(totalRitenute)],
          ],
          styles: { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: black },
          headStyles: { fillColor: [248, 250, 252], textColor: grey, fontStyle: 'bold', fontSize: 7.5, lineColor: lightGrey, lineWidth: 0.3 },
          bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
          columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
          didParseCell: (data) => {
            if (data.section === 'body' && data.row.index === ritenuteDocs.length) {
              data.cell.styles.fontStyle = 'bold';
            }
          },
          margin: { left: M, right: M },
        });
        y = (pdf.lastAutoTable?.finalY ?? y + 20) + 8;
      }

      // ── Lista fatture cronologica ────────────────────────────────────────────
      pdf.addPage();
      pdf.setFillColor(...primary);
      pdf.rect(0, 0, W, 18, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`Lista Fatture e Documenti ${year}`, M, 12);
      y = 26;

      const allDocs = [...paidInvoices, ...allYearDocs.filter(d => d.type === 'invoice' && d.status !== 'paid'), ...creditNotes]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      autoTable(pdf, {
        startY: y,
        head: [['N°', 'Data', 'Tipo', 'Cliente', 'P.IVA/CF', 'Importo', 'Stato']],
        body: allDocs.map(d => [
          d.invoiceNumber || '—',
          new Date(d.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          d.type === 'credit_note' ? 'Nota credito' : 'Fattura',
          d.client || d.title || '—',
          d.clientPiva || d.clientCf || '—',
          d.type === 'credit_note' ? `– ${fmtEur(d.amount)}` : fmtEur(d.amount),
          d.type === 'credit_note' ? 'Storno' : d.status === 'paid' ? 'Saldato' : d.status === 'overdue' ? 'Scaduta' : 'In attesa',
        ]),
        styles: { fontSize: 7.5, cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 }, textColor: black, overflow: 'ellipsize' },
        headStyles: { fillColor: [248, 250, 252], textColor: grey, fontStyle: 'bold', fontSize: 7, lineColor: lightGrey, lineWidth: 0.3 },
        bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 22 }, 2: { cellWidth: 22 }, 3: { cellWidth: 'auto' }, 4: { cellWidth: 28 }, 5: { cellWidth: 25, halign: 'right' }, 6: { cellWidth: 20 } },
        didParseCell: (data) => {
          if (data.section === 'body' && allDocs[data.row.index]?.type === 'credit_note') {
            data.cell.styles.textColor = red;
          }
        },
        margin: { left: M, right: M },
      });

      // ── Disclaimer ──────────────────────────────────────────────────────────
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setDrawColor(...lightGrey);
        pdf.setLineWidth(0.3);
        pdf.line(M, 286, R, 286);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(6.5);
        pdf.setTextColor(...grey);
        pdf.text('Documento riepilogativo con dati stimati. Verificare con il commercialista per la dichiarazione definitiva.', M, 291);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Pag. ${i} di ${pageCount}`, R, 291, { align: 'right' });
      }

      const pdfBlob: Blob = pdf.output('blob');
      const piva = (profile.piva || 'NOPIVA').replace(/\s/g, '');
      const pdfFileName = `riepilogo_annuale_${year}_${piva}.pdf`;
      return { blob: pdfBlob, fileName: pdfFileName };
  };

  const inputBase = `px-4 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95`;
  const dragControls = useDragControls();

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="y" dragControls={dragControls} dragListener={false}
            dragConstraints={{ top: 0 }} dragElastic={0.1}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose(); }}
            className="relative w-full max-w-md rounded-t-[32px] shadow-2xl"
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            <div onPointerDown={e => dragControls.start(e)} className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none">
              <div className={`w-10 h-1 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            </div>
            <div className="overflow-y-auto max-h-[88vh] p-8 space-y-6 [padding-bottom:max(2rem,calc(env(safe-area-inset-bottom)+1rem))]">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Esporta</h2>
                  <p className="text-sm text-slate-500">{periodLabel}</p>
                </div>
                <button onClick={onClose} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'}`}><X size={22} /></button>
              </div>

              {/* Tipo documento */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tipo</p>
                <div className={`p-1 rounded-2xl flex gap-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {(['all', 'invoice', 'expense'] as const).map(f => (
                    <button key={f} onClick={() => { setDocFilter(f); setReadyBlob(null); }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${docFilter === f ? (f === 'invoice' ? 'bg-emerald-500 text-white shadow-lg' : f === 'expense' ? 'bg-red-500 text-white shadow-lg' : 'bg-primary text-white shadow-lg') : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                      {f === 'all' ? 'Tutti' : f === 'invoice' ? 'Fatture' : 'Spese'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Commercialista */}
              {accountant && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {accountant.firstName[0]}{accountant.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{accountant.firstName} {accountant.lastName}</p>
                    <p className="text-xs text-slate-400 truncate">{accountant.email}</p>
                  </div>
                </div>
              )}

              {/* Anno */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Anno</p>
                <div className="flex gap-2 flex-wrap">
                  {availableYears.map(y => (
                    <button key={y} onClick={() => { setYear(y); setSelectedMonths(new Set()); setReadyBlob(null); }} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 ${year === y ? 'bg-primary text-white shadow-lg shadow-primary/40' : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>{y}</button>
                  ))}
                </div>
              </div>

              {/* Mesi */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Mesi · {year}</p>
                  <button onClick={toggleAll} className="text-[11px] font-bold text-primary uppercase tracking-wider">
                    {syncedMonths.size === availableMonths.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                  </button>
                </div>
                {availableMonths.length === 0 ? (
                  <p className="text-sm text-slate-400">Nessun documento per {selectedYear}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableMonths.map(m => {
                      const selected = syncedMonths.has(m);
                      return (
                        <button
                          key={m}
                          onClick={() => toggleMonth(m)}
                          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95 border-2 ${selected ? 'bg-primary border-primary text-white shadow-md shadow-primary/30' : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500')}`}
                        >
                          {selected && <Check size={13} strokeWidth={3} />}
                          {MONTH_NAMES[m].slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Formato */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Formato</p>
                <div className={`p-1 rounded-2xl flex gap-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {(['pdf', 'csv'] as const).map(f => (
                    <button key={f} onClick={() => { setFormat(f); setReadyBlob(null); }} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${format === f ? 'bg-primary text-white shadow-lg shadow-primary/30' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle FatturaPA XML + Registro Cronologico — solo Italy Pro con commercialista */}
              {isItaly && isPro && accountant && docFilter !== 'expense' && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Opzioni</p>
                  {/* FatturaPA XML */}
                  <button
                    onClick={() => { setIncludeFatturaPA(prev => !prev); setReadyBlob(null); }}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${includeFatturaPA ? 'bg-primary border-primary' : darkMode ? 'border-slate-600' : 'border-slate-300'}`}>
                      {includeFatturaPA && <Check size={12} strokeWidth={3} className="text-white" />}
                    </div>
                    <span className="text-xl shrink-0">📄</span>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Includi FatturaPA XML</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-600 shrink-0">AdE</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {missingProfileFields.length > 0
                          ? `⚠ Completa il profilo (${missingProfileFields.map(f => f.label).join(', ')}) per XML corretti`
                          : 'File .xml per l\'Agenzia delle Entrate via SDI'}
                      </p>
                    </div>
                  </button>
                  {/* Registro Cronologico */}
                  <button
                    onClick={() => { setIncludeRegistro(prev => !prev); setReadyBlob(null); }}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${includeRegistro ? 'bg-emerald-500 border-emerald-500' : darkMode ? 'border-slate-600' : 'border-slate-300'}`}>
                      {includeRegistro && <Check size={12} strokeWidth={3} className="text-white" />}
                    </div>
                    <span className="text-xl shrink-0">📋</span>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Includi Registro Cronologico</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-600 shrink-0">Commercialista</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Elenco fatture per il commercialista (CSV/PDF)</p>
                    </div>
                  </button>
                  {/* Riepilogo Annuale */}
                  <button
                    onClick={() => { setIncludeRiepilogo(prev => !prev); setReadyBlob(null); }}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${includeRiepilogo ? 'bg-violet-500 border-violet-500' : darkMode ? 'border-slate-600' : 'border-slate-300'}`}>
                      {includeRiepilogo && <Check size={12} strokeWidth={3} className="text-white" />}
                    </div>
                    <span className="text-xl shrink-0">📊</span>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Riepilogo Annuale</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-600 shrink-0">Pro</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">PDF fiscale completo con stime per il commercialista</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Toggle Resumen Trimestral — solo Spain Pro con commercialista */}
              {isSpain && isPro && accountant && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Opzioni</p>
                  <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    <button
                      onClick={() => { setIncludeResumen(prev => !prev); setReadyBlob(null); }}
                      className={`w-full flex items-center gap-3 p-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${includeResumen ? 'bg-primary border-primary' : darkMode ? 'border-slate-600' : 'border-slate-300'}`}>
                        {includeResumen && <Check size={12} strokeWidth={3} className="text-white" />}
                      </div>
                      <div className="text-left flex-1">
                        <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Includi Resumen Trimestral</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {!hasTaxIdSpain
                            ? '⚠ Añade NIF o NIE en el perfil para incluir el resumen'
                            : `T${resumenQuarter} ${resumenYear} — ${QUARTER_LABELS[resumenQuarter]}`}
                        </p>
                      </div>
                    </button>
                    {includeResumen && (
                      <div className={`px-4 pb-4 pt-3 border-t ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50'}`}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Trimestre</p>
                        <div className="grid grid-cols-4 gap-2">
                          {([1, 2, 3, 4] as const).map(q => (
                            <button
                              key={q}
                              onClick={() => { setOverrideQuarter(q); setReadyBlob(null); }}
                              className={`py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                                resumenQuarter === q
                                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                                  : darkMode ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                              }`}
                            >
                              T{q}
                            </button>
                          ))}
                        </div>
                        {hasTaxIdSpain && (
                          <div className={`mt-3 pt-3 border-t space-y-1.5 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] text-slate-400">Ingresos</span>
                              <span className="text-[11px] font-bold text-emerald-500">{formatAmount(resumenPreview.totalIngresos)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] text-slate-400">Gastos</span>
                              <span className="text-[11px] font-bold text-red-500">{formatAmount(resumenPreview.totalGastos)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-semibold text-slate-500">IRPF 20%</span>
                              <span className="text-[11px] font-bold text-primary">{formatAmount(resumenPreview.cuotaIRPF)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Riepilogo — nascosto per Spain con resumen attivo (sostituito dalle card Ingresos/Gastos/IRPF) */}
              {!(isSpain && includeResumen) && (
                <div className={`rounded-2xl p-4 space-y-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Documenti selezionati</span>
                    <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{filteredDocs.length}</span>
                  </div>
                  {docFilter !== 'expense' && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-emerald-500">Entrate</span>
                      <span className="text-sm font-bold text-emerald-500">{formatAmount(totals.income)}</span>
                    </div>
                  )}
                  {docFilter !== 'invoice' && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-red-500">Uscite</span>
                      <span className="text-sm font-bold text-red-500">{formatAmount(totals.expenses)}</span>
                    </div>
                  )}
                  {docFilter === 'all' && (
                    <div className={`flex justify-between items-center pt-1 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                      <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Netto</span>
                      <span className={`text-sm font-bold ${totals.income - totals.expenses >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatAmount(totals.income - totals.expenses)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Warning fatture incomplete */}
              {incompleteInvoices.length > 0 && !readyBlob && (
                <div className={`flex items-start gap-3 p-4 rounded-2xl ${darkMode ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-100'}`}>
                  <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-600">
                      {incompleteInvoices.length === 1 ? '1 fattura ha dati incompleti' : `${incompleteInvoices.length} fatture hanno dati incompleti`}
                    </p>
                    <p className="text-[11px] text-amber-500/80 mt-0.5">
                      {incompleteInvoices.map(d => d.client || d.invoiceNumber || 'Senza nome').join(', ')} — mancano descrizione, indirizzo o P.IVA cliente
                    </p>
                  </div>
                </div>
              )}

              {/* Bottone / Step 2 */}
              {readyBlob ? (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      // Se il riepilogo è incluso ha priorità nell'anteprima
                      if (readyBlob.riepilogoFile) {
                        setPdfPreview({ blob: readyBlob.riepilogoFile.blob, fileName: readyBlob.riepilogoFile.fileName });
                      } else if (readyBlob.fileName.endsWith('.pdf')) {
                        setPdfPreview({ blob: readyBlob.blob, fileName: readyBlob.fileName });
                      } else {
                        const url = URL.createObjectURL(readyBlob.blob);
                        window.open(url, '_blank');
                      }
                    }}
                    className={`w-full rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 hover:border-primary/40' : 'bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <Check size={18} className="text-emerald-500 shrink-0" />
                    <div className="min-w-0 flex-1 text-left">
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>File pronto</p>
                      <p className="text-xs text-slate-400 truncate">{readyBlob.fileName}</p>
                      {(readyBlob.xmlFiles?.length ?? 0) > 0 && (
                        <p className="text-[10px] text-primary mt-0.5">+ {readyBlob.xmlFiles!.length} XML FatturaPA</p>
                      )}
                      {readyBlob.registroFile && (
                        <p className="text-[10px] text-violet-500 mt-0.5">+ Registro Cronologico</p>
                      )}
                      {readyBlob.riepilogoFile && (
                        <p className="text-[10px] text-violet-500 mt-0.5">+ Riepilogo Annuale</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-primary shrink-0">
                      <Eye size={16} />
                      <span className="text-xs font-bold">Anteprima</span>
                    </div>
                  </button>
                  <button onClick={handleShareFile} className="w-full py-4 rounded-2xl font-bold text-white bg-primary shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                    <Share2 size={18} />
                    Condividi / Allega File
                  </button>
                  {accountant && (
                    <button onClick={handleOpenMail} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'}`}>
                      <Mail size={18} />
                      Apri Mail · {accountant.email}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleExport}
                  disabled={exporting || (filteredDocs.length === 0 && !includeRiepilogo)}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-primary shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <Download size={18} />
                  {exporting ? 'Preparazione...' : accountant ? `Invia al Commercialista` : `Esporta ${format.toUpperCase()}`}
                </button>
              )}
              {/* Disclaimer IT-18 / ES-12 */}
              <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
                {profile.country === 'Spain'
                  ? 'Los cálculos mostrados son estimaciones basadas en los datos introducidos y los tipos fiscales estándar. No constituyen asesoramiento fiscal profesional. Consulta siempre con tu gestor o asesor fiscal.'
                  : 'I calcoli mostrati sono stime indicative basate sui dati inseriti e sulle aliquote fiscali standard. Non costituiscono consulenza fiscale professionale. Consulta sempre il tuo commercialista.'}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    <PdfPreviewModal
      isOpen={!!pdfPreview}
      onClose={() => setPdfPreview(null)}
      blob={pdfPreview?.blob ?? new Blob()}
      fileName={pdfPreview?.fileName ?? ''}
      darkMode={darkMode}
    />
    </>
  );
}
