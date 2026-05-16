import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { X, Download, Check, Share2, Eye, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { getClient } from '../../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
import { Document as AppDoc, Profile, Accountant } from '../../types';
import { useProStatus } from '../../hooks/useProStatus';
import { generateFatturaPA, getMissingProfileFields, validateForSdi } from '../../services/fatturaPA';
import { parseLocalDate, getLocalYear, getLocalMonth } from '../../utils/date';
import { getItDeductibilityRate } from '../../lib/it/deductibility';
import { getAddizionaliRate } from '../../lib/it/addizionali';
import { getSpainDefaultVatRate } from '../../lib/countries/es';
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
  return `${n < 0 ? '-' : ''}€${Math.abs(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ExportModal({ isOpen, onClose, documents, selectedYear, profile, accountant, darkMode }: ExportModalProps) {
  const isPro = useProStatus(profile);
  const isItaly = profile.country === 'Italy';
  const isSpain = profile.country === 'Spain';

  const [docFilter, setDocFilter] = useState<'all' | 'invoice' | 'expense'>('all');
  const [exporting, setExporting] = useState(false);
  const [sdiSending, setSdiSending] = useState(false);
  const [sdiResults, setSdiResults] = useState<{ sent: number; skipped: number; errors: number; incomplete: number; incompleteItems: { id: string; label: string; reasons: string[] }[] } | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set());
  const [includeFatturaPA, setIncludeFatturaPA] = useState(true);
  const [includeResumen, setIncludeResumen] = useState(true);
  const [includeDocumenti, setIncludeDocumenti] = useState(true);
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
      setSdiResults(null);
      setIncludeResumen(true);
      setIncludeDocumenti(true);
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

  const currentYrExport = new Date().getFullYear();
  const yearsActiveExport = profile.annoInizioAttivita ? currentYrExport - profile.annoInizioAttivita : 10;
  const esRetencionRateExport = yearsActiveExport <= 3 ? 0.07 : 0.15;

  const resumenPreview = useMemo(() =>
    calcularTrimestre(documents, resumenQuarter, resumenYear, esRetencionRateExport, profile.annoInizioAttivita),
    [documents, resumenQuarter, resumenYear, esRetencionRateExport, profile.annoInizioAttivita]
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
      if (docFilter === 'invoice') return d.type === 'invoice' || d.type === 'factura_rectificativa';
      if (docFilter === 'expense') return d.type === 'expense';
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [yearDocs, syncedMonths, docFilter]);

  const incompleteInvoices = useMemo(() =>
    filteredDocs.filter(d => d.type === 'invoice' && (!d.title || !d.invoiceNumber || !d.clientAddress || (!d.clientPiva && d.clientPiva !== 'Privato'))),
    [filteredDocs]
  );

  const invoiceMissingFields = useMemo(() => {
    const toSend = filteredDocs.filter(d =>
      (d.type === 'invoice' || d.type === 'credit_note') &&
      d.sdiStatus !== 'sent' && d.sdiStatus !== 'delivered'
    );
    const seen = new Set<string>();
    const result: { label: string; where: 'profilo' | 'fattura' }[] = [];
    for (const doc of toSend) {
      for (const e of validateForSdi(doc, profile)) {
        const key = `${e.where}:${e.field}`;
        if (!seen.has(key)) { seen.add(key); result.push(e); }
      }
    }
    return result;
  }, [filteredDocs, profile]);

  const totals = useMemo(() => filteredDocs.reduce((acc, d) => {
    if (d.type === 'invoice') acc.income += d.amount;
    else if (d.type === 'credit_note' || d.type === 'factura_rectificativa') acc.income -= d.amount;
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
    if (filteredDocs.length === 0 && !includeRiepilogo && !includeRegistro) return;
    setExporting(true);
    try {
      await exportPDF();
    } finally {
      setExporting(false);
    }
  };

  const handleShareFile = async () => {
    if (!readyBlob) return;
    const { blob, fileName, xmlFiles } = readyBlob;

    const primaryFile = new File([blob], fileName, { type: 'application/octet-stream' });
    const xmlFileObjs = (xmlFiles || []).map(f => new File([f.blob], f.fileName, { type: 'application/xml' }));
    const resumenFileObj = readyBlob.resumenFile
      ? new File([readyBlob.resumenFile.blob], readyBlob.resumenFile.fileName, { type: 'application/octet-stream' })
      : null;
    const registroFileObj = readyBlob.registroFile
      ? new File([readyBlob.registroFile.blob], readyBlob.registroFile.fileName, { type: 'application/octet-stream' })
      : null;
    const riepilogoFileObj = readyBlob.riepilogoFile
      ? new File([readyBlob.riepilogoFile.blob], readyBlob.riepilogoFile.fileName, { type: 'application/octet-stream' })
      : null;

    const pdfFiles = [primaryFile, ...(resumenFileObj ? [resumenFileObj] : []), ...(registroFileObj ? [registroFileObj] : []), ...(riepilogoFileObj ? [riepilogoFileObj] : [])];
    const allFiles = [...pdfFiles, ...xmlFileObjs];

    const downloadFile = (f: { blob: Blob; fileName: string }) => {
      const u = URL.createObjectURL(f.blob);
      const a = window.document.createElement('a');
      a.href = u; a.download = f.fileName; a.click();
      URL.revokeObjectURL(u);
    };

    try {
      if (navigator.share && navigator.canShare?.({ files: allFiles })) {
        // All files (PDF + XML) shareable together
        await navigator.share({ files: allFiles, title: fileName });
      } else if (navigator.share && navigator.canShare?.({ files: pdfFiles })) {
        // XML not shareable on this device — download XMLs, share PDFs via share sheet
        for (const f of xmlFiles || []) downloadFile(f);
        await navigator.share({ files: pdfFiles, title: fileName });
      } else {
        // No share support — download everything
        downloadFile({ blob, fileName });
        for (const f of xmlFiles || []) downloadFile(f);
        if (readyBlob.resumenFile) downloadFile(readyBlob.resumenFile);
        if (readyBlob.registroFile) downloadFile(readyBlob.registroFile);
        if (readyBlob.riepilogoFile) downloadFile(readyBlob.riepilogoFile);
      }
    } catch (err) {
      // AbortError = user dismissed the share sheet — don't close the modal
      if (err instanceof Error && err.name === 'AbortError') return;
      // Any other error: fall back to download
      downloadFile({ blob, fileName });
      for (const f of xmlFiles || []) downloadFile(f);
      if (readyBlob.resumenFile) downloadFile(readyBlob.resumenFile);
      if (readyBlob.registroFile) downloadFile(readyBlob.registroFile);
      if (readyBlob.riepilogoFile) downloadFile(readyBlob.riepilogoFile);
    }
    setReadyBlob(null);
    onClose();
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
      const ivaRate = inv.ivaRate ?? profile.ivaHabitual ?? getSpainDefaultVatRate(profile.territory);
      const taxLabel = profile.territory === 'canarias' ? 'IGIC' : 'IVA';
      const currentYr = new Date().getFullYear();
      const yearsActive = profile.annoInizioAttivita ? currentYr - profile.annoInizioAttivita : 10;
      const retencionRate = yearsActive <= 3 ? 7 : 15;

      const isRectificativaES = inv.type === 'factura_rectificativa';

      // Title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(...primary);
      pdf.text('SOLVY', M, 18);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...grey);
      pdf.text(isRectificativaES ? 'Factura Rectificativa' : 'Factura', M, 25);

      if (isRectificativaES && inv.category) {
        pdf.setFontSize(8);
        pdf.text(`Factura original: ${inv.category}`, M, 29);
      } else {
        pdf.setFontSize(8);
        pdf.text('Estimación Directa Simplificada', M, 29);
      }

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
      pdf.line(M, 33, R, 33);

      let y = 40;
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
        body: [[inv.title || (isRectificativaES ? 'Factura rectificativa' : 'Servicio no especificado'), isRectificativaES ? `– € ${inv.amount.toFixed(2)}` : `€ ${inv.amount.toFixed(2)}`]],
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
      const totalADevolver = -(inv.amount + ivaAmount - retencionAmount);

      const summaryRows: [string, string][] = isRectificativaES
        ? [
            ['Base imponible', `– € ${inv.amount.toFixed(2)}`],
            [`${taxLabel} ${ivaRate}%`, `– € ${ivaAmount.toFixed(2)}`],
            [`Ret. IRPF ${retencionRate}%`, `+ € ${retencionAmount.toFixed(2)}`],
          ]
        : [
            ['Base imponible', `€ ${inv.amount.toFixed(2)}`],
            [`${taxLabel} ${ivaRate}%`, `+ € ${ivaAmount.toFixed(2)}`],
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
      pdf.text(isRectificativaES ? 'TOTAL A DEVOLVER' : 'TOTAL A COBRAR', summaryX, y + 5);
      pdf.setFontSize(11);
      pdf.setTextColor(...primary);
      pdf.text(isRectificativaES ? `– € ${Math.abs(totalADevolver).toFixed(2)}` : `€ ${totalACobrar.toFixed(2)}`, summaryX + summaryW, y + 5, { align: 'right' });

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
      pdf.setTextColor(...primary);
      pdf.text('SOLVY', M, 18);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...grey);
      pdf.text(isCreditNote ? 'Nota di Credito' : 'Fattura', M, 25);

      pdf.setFontSize(8);
      if (isCreditNote && inv.category) {
        pdf.text(`Nota di Credito · rif. ${inv.category}`, M, 29);
      } else {
        pdf.text(profile.regime === 'ordinario' ? 'Regime Ordinario' : 'Regime Forfettario', M, 29);
      }

      // Numero + Data destra
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(...grey);
      pdf.text(`N° ${inv.invoiceNumber || '—'}`, R, 14, { align: 'right' });
      pdf.setFontSize(9);
      pdf.text(new Date(inv.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }), R, 20, { align: 'right' });

      // Divider
      pdf.setDrawColor(...lightGrey);
      pdf.setLineWidth(0.4);
      pdf.line(M, 33, R, 33);

      let y = 40;
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

    const invoices = includeDocumenti ? filteredDocs.filter(d => d.type === 'invoice' || d.type === 'credit_note' || d.type === 'factura_rectificativa') : [];
    const expenses = includeDocumenti ? filteredDocs.filter(d => d.type === 'expense') : [];

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

    const hasMainContent = invoices.length > 0 || expenses.length > 0;
    let pdfSections = hasMainContent ? 1 : 0;

    // ── SEZIONE INLINE: Registro Cronologico (solo IT Pro, formato PDF) ───────
    if (includeRegistro && isItaly && isPro) {
      if (pdfSections > 0) pdf.addPage();
      pdfSections++;
      const regDocs = yearDocs
        .filter(d => (d.type === 'invoice' || d.type === 'credit_note' || d.type === 'factura_rectificativa') && syncedMonths.has(getLocalMonth(d.date)))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      pdf.setFillColor(...primary);
      pdf.rect(0, 0, W, 22, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(255, 255, 255);
      pdf.text('REGISTRO CRONOLOGICO', margin, 14);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(200, 200, 255);
      pdf.text(`${profile.name} · ${periodLabel}`, margin, 20);
      const MBVAL = 2;
      const calcR = (doc: AppDoc) => {
        const isCN = doc.type === 'credit_note';
        const sign = isCN ? -1 : 1;
        const isOrd = (doc.docRegime ?? profile.regime ?? 'forfettario') === 'ordinario';
        const rivA = !isCN && doc.rivalsaInps ? doc.amount * 0.04 : 0;
        const imp = (doc.amount + rivA) * sign;
        const iva = isOrd && !isCN ? imp * ((doc.ivaRate ?? 0) / 100) : 0;
        const rit = !isCN && doc.ritenuta ? doc.amount * 0.20 : 0;
        const bollo = !isCN && doc.marcaBollo ? MBVAL : 0;
        const tot = imp + iva + bollo - rit;
        const stato = isCN ? 'Storno' : doc.status === 'paid' ? 'Pagata' : doc.status === 'overdue' ? 'Scaduta' : 'In attesa';
        const incasso = doc.status === 'paid' ? parseLocalDate(doc.date).toLocaleDateString('it-IT') : '';
        const cid = doc.clientPiva === 'Privato' ? `CF: ${doc.clientCf || '—'}` : (doc.clientPiva || doc.clientCf || '—');
        return { imp, iva, rit, bollo, tot, stato, incasso, cid };
      };
      autoTable(pdf, {
        startY: 28,
        head: [['N°', 'Data', 'N° Doc', 'Cliente', 'P.IVA/CF', 'Imponib.', 'IVA', 'Ritenuta', 'Bollo', 'Totale', 'Stato', 'Incasso']],
        body: regDocs.map((doc, i) => {
          const c = calcR(doc);
          return [String(i+1), parseLocalDate(doc.date).toLocaleDateString('it-IT'), doc.invoiceNumber || doc.id.slice(0,8), (doc.client||'—').slice(0,22), c.cid.slice(0,18), c.imp.toFixed(2), c.iva.toFixed(2), c.rit.toFixed(2), c.bollo.toFixed(2), c.tot.toFixed(2), c.stato, c.incasso];
        }),
        styles: { fontSize: 6, cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 }, textColor: black },
        headStyles: { fillColor: [248, 250, 252], textColor: grey, fontStyle: 'bold', fontSize: 5.5, lineColor: lightGrey, lineWidth: 0.3 },
        bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
        columnStyles: { 0:{cellWidth:7,halign:'center'}, 1:{cellWidth:16}, 2:{cellWidth:15}, 3:{cellWidth:25}, 4:{cellWidth:20}, 5:{cellWidth:16,halign:'right'}, 6:{cellWidth:12,halign:'right'}, 7:{cellWidth:14,halign:'right'}, 8:{cellWidth:10,halign:'right'}, 9:{cellWidth:17,halign:'right',fontStyle:'bold'}, 10:{cellWidth:14}, 11:{cellWidth:16} },
        didParseCell: (data) => { if (data.section==='body' && regDocs[data.row.index]?.type==='credit_note') { data.cell.styles.textColor=[225,29,72]; } },
        margin: { left: margin, right: margin },
      });
    }

    // ── SEZIONE INLINE: Riepilogo Annuale (solo IT Pro, formato PDF) ──────────
    if (includeRiepilogo && isItaly && isPro) {
      if (pdfSections > 0) pdf.addPage();
      pdfSections++;
      const green: [number,number,number] = [16,185,129];
      const red: [number,number,number] = [239,68,68];
      const fmtE = (n: number) => `€ ${Math.abs(n).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
      function calcIRPEFi(imp: number): number {
        if (imp<=0) return 0;
        if (imp<=28000) return imp*0.23;
        if (imp<=50000) return 28000*0.23+(imp-28000)*0.33;
        return 28000*0.23+22000*0.33+(imp-50000)*0.43;
      }
      const allY = documents.filter(d => getLocalYear(d.date)===year);
      const paidInv = allY.filter(d => d.type==='invoice' && d.status==='paid');
      const cNotes = allY.filter(d => d.type==='credit_note');
      const expD = allY.filter(d => d.type==='expense');
      const totFatt = paidInv.reduce((s,d)=>s+d.amount,0);
      const totCred = cNotes.reduce((s,d)=>s+d.amount,0);
      const totInc = totFatt-totCred;
      const totExpFull = expD.reduce((s,d)=>s+d.amount,0);
      const regimeR = profile.regime||'forfettario';
      const isForf = regimeR!=='ordinario';
      const isItOrd = profile.country==='Italy' && !isForf;
      const totExp = isItOrd ? expD.reduce((s,d)=>s+d.amount*getItDeductibilityRate(d.category),0) : totExpFull;
      const coeff = (profile.coefficiente!=null&&profile.coefficiente>0)?profile.coefficiente/100:0.78;
      const redLordo = isForf ? Math.max(0,totInc*coeff) : Math.max(0,totInc-totExp);
      const inpsR = 0.2607; // GS 26.07% sia forfettario che ordinario professionisti
      const inps = redLordo*inpsR;
      const redImp = Math.max(0,redLordo-inps);
      const annoIn = profile.annoInizioAttivita??null;
      const yrsAct = annoIn!=null ? year-Number(annoIn) : null;
      const is5pct = isForf && yrsAct!=null && Number.isFinite(yrsAct) && yrsAct<5;
      const aliq = isForf?(is5pct?0.05:0.15):0;
      const impForf = redImp*aliq;
      const irpef = isForf?0:calcIRPEFi(redImp);
      const addiz = isForf?0:redImp*getAddizionaliRate(profile.region);
      const imposta = isForf?impForf:irpef+addiz;
      const accGiu = imposta*0.40;
      const accNov = imposta*0.60;
      const saldo = imposta-accGiu-accNov;
      const netto = isForf?totInc-imposta-inps:totInc-imposta-inps-totExpFull;
      const ritDocs = paidInv.filter(d=>d.ritenuta);
      const totRit = ritDocs.reduce((s,d)=>{const rA=d.rivalsaInps?d.amount*0.04:0; return s+(d.amount+rA)*0.20;},0);
      const spCat: Record<string,{ gross: number; deductible: number; rate: number }> = {};
      expD.forEach(d=>{ const cat=d.category||'Altro'; const rate=isItOrd?getItDeductibilityRate(d.category):1; if(!spCat[cat]) spCat[cat]={gross:0,deductible:0,rate}; spCat[cat].gross+=d.amount; spCat[cat].deductible+=d.amount*rate; });
      const spRows = Object.entries(spCat).sort((a,b)=>b[1].deductible-a[1].deductible);

      // Header viola
      pdf.setFillColor(...primary);
      pdf.rect(0,0,W,32,'F');
      pdf.setFont('helvetica','bold'); pdf.setFontSize(18); pdf.setTextColor(255,255,255);
      pdf.text(`Riepilogo Annuale ${year}`,margin,14);
      pdf.setFont('helvetica','normal'); pdf.setFontSize(10); pdf.setTextColor(200,200,255);
      pdf.text(profile.name,margin,22);
      pdf.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`,rightCol,22,{align:'right'});
      pdf.setFontSize(9);
      pdf.text(`Regime: ${isForf?'Forfettario':'Ordinario'}${is5pct?' · 5%':''}`,rightCol,14,{align:'right'});

      let ry=42;

      // Fatturato
      pdf.setFont('helvetica','bold'); pdf.setFontSize(9); pdf.setTextColor(...grey);
      pdf.text('FATTURATO',margin,ry); ry+=4;
      autoTable(pdf,{
        startY:ry,
        head:[['Voce','Importo']],
        body:[['Fatture incassate',fmtE(totFatt)],...(totCred>0?[['Note di credito',`– ${fmtE(totCred)}`]]:[]),['Fatturato netto',fmtE(totInc)]],
        styles:{fontSize:9,cellPadding:{top:3,bottom:3,left:3,right:3},textColor:black},
        headStyles:{fillColor:[248,250,252],textColor:grey,fontStyle:'bold',fontSize:8,lineColor:lightGrey,lineWidth:0.3},
        bodyStyles:{lineColor:lightGrey,lineWidth:0.2},
        columnStyles:{0:{cellWidth:'auto'},1:{cellWidth:45,halign:'right',fontStyle:'bold'}},
        didParseCell:(data)=>{ if(data.section==='body'&&data.row.index===(totCred>0?2:1)){ data.cell.styles.fontStyle='bold'; data.cell.styles.textColor=green; } },
        margin:{left:margin,right:margin},
      });
      ry=(pdf.lastAutoTable?.finalY??ry+20)+8;

      // Calcolo fiscale
      pdf.setFont('helvetica','bold'); pdf.setFontSize(9); pdf.setTextColor(...grey);
      pdf.text('CALCOLO FISCALE STIMATO',margin,ry); ry+=4;
      const fiscBody = isForf
        ? [['Coefficiente',`${(coeff*100).toFixed(0)}%`],['Reddito lordo',fmtE(redLordo)],[`INPS (${(inpsR*100).toFixed(2)}%)`,fmtE(inps)],['Reddito imponibile',fmtE(redImp)],[`Imposta sostitutiva (${(aliq*100).toFixed(0)}%)`,fmtE(imposta)],['Acconto giugno (40%)',fmtE(accGiu)],['Acconto novembre (60%)',fmtE(accNov)],['Saldo stimato',fmtE(saldo)]]
        : [['Reddito lordo',fmtE(redLordo)],[`INPS (${(inpsR*100).toFixed(0)}%)`,fmtE(inps)],['Reddito imponibile',fmtE(redImp)],['IRPEF',fmtE(irpef)],[`Addizionali (${(getAddizionaliRate(profile.region)*100).toFixed(2)}%)`,fmtE(addiz)],['Totale imposta',fmtE(imposta)],['Acconto giugno (40%)',fmtE(accGiu)],['Acconto novembre (60%)',fmtE(accNov)],['Saldo stimato',fmtE(saldo)]];
      autoTable(pdf,{
        startY:ry,
        head:[['Calcolo','Importo stimato']],
        body:fiscBody,
        styles:{fontSize:9,cellPadding:{top:3,bottom:3,left:3,right:3},textColor:black},
        headStyles:{fillColor:[248,250,252],textColor:grey,fontStyle:'bold',fontSize:8,lineColor:lightGrey,lineWidth:0.3},
        bodyStyles:{lineColor:lightGrey,lineWidth:0.2},
        columnStyles:{0:{cellWidth:'auto'},1:{cellWidth:45,halign:'right'}},
        margin:{left:margin,right:margin},
      });
      ry=(pdf.lastAutoTable?.finalY??ry+30)+8;

      autoTable(pdf,{startY:ry,body:[[`Netto reale stimato anno ${year}`,fmtE(netto)]],styles:{fontSize:11,fontStyle:'bold',cellPadding:{top:5,bottom:5,left:3,right:3}},bodyStyles:{lineColor:primary,lineWidth:0.4,textColor:primary},columnStyles:{0:{cellWidth:'auto'},1:{cellWidth:45,halign:'right'}},margin:{left:margin,right:margin}});
      ry=(pdf.lastAutoTable?.finalY??ry+14)+8;

      if (spRows.length>0) {
        pdf.setFont('helvetica','bold'); pdf.setFontSize(9); pdf.setTextColor(...grey);
        pdf.text('SPESE DEDUCIBILI PER CATEGORIA',margin,ry); ry+=4;
        if (isItOrd) {
          const totGross=expD.reduce((s,d)=>s+d.amount,0);
          autoTable(pdf,{startY:ry,head:[['Categoria','Lordo','Deducibile','%']],body:[...spRows.map(([cat,{gross,deductible,rate}])=>[cat,fmtE(gross),fmtE(deductible),`${Math.round(rate*100)}%`]),['Totale',fmtE(totGross),fmtE(totExp),'']],styles:{fontSize:9,cellPadding:{top:3,bottom:3,left:3,right:3},textColor:black},headStyles:{fillColor:[248,250,252],textColor:grey,fontStyle:'bold',fontSize:8,lineColor:lightGrey,lineWidth:0.3},bodyStyles:{lineColor:lightGrey,lineWidth:0.2},columnStyles:{0:{cellWidth:'auto'},1:{cellWidth:38,halign:'right'},2:{cellWidth:38,halign:'right'},3:{cellWidth:16,halign:'center'}},didParseCell:(data)=>{ if(data.section==='body'&&data.row.index===spRows.length){ data.cell.styles.fontStyle='bold'; data.cell.styles.textColor=red; } },margin:{left:margin,right:margin}});
          ry=(pdf.lastAutoTable?.finalY??ry+20)+4;
          pdf.setFont('helvetica','italic'); pdf.setFontSize(7); pdf.setTextColor(...grey);
          pdf.text('Gli importi nella colonna Deducibile sono utilizzati per il calcolo del reddito imponibile.',margin,ry);
          ry+=8;
        } else {
          autoTable(pdf,{startY:ry,head:[['Categoria','Totale']],body:[...spRows.map(([cat,{gross}])=>[cat,fmtE(gross)]),['Totale spese',fmtE(totExp)]],styles:{fontSize:9,cellPadding:{top:3,bottom:3,left:3,right:3},textColor:black},headStyles:{fillColor:[248,250,252],textColor:grey,fontStyle:'bold',fontSize:8,lineColor:lightGrey,lineWidth:0.3},bodyStyles:{lineColor:lightGrey,lineWidth:0.2},columnStyles:{0:{cellWidth:'auto'},1:{cellWidth:45,halign:'right'}},didParseCell:(data)=>{ if(data.section==='body'&&data.row.index===spRows.length){ data.cell.styles.fontStyle='bold'; data.cell.styles.textColor=red; } },margin:{left:margin,right:margin}});
          ry=(pdf.lastAutoTable?.finalY??ry+20)+8;
        }
      }

      if (ritDocs.length>0) {
        if(ry>220){pdf.addPage();ry=20;}
        pdf.setFont('helvetica','bold'); pdf.setFontSize(9); pdf.setTextColor(...grey);
        pdf.text("RITENUTE D'ACCONTO SUBITE",margin,ry); ry+=4;
        autoTable(pdf,{startY:ry,head:[['Fattura','Cliente','Importo','Ritenuta 20%']],body:[...ritDocs.map(d=>{const rA=d.rivalsaInps?d.amount*0.04:0;const rit=(d.amount+rA)*0.20;return[d.invoiceNumber||d.id.slice(0,8),d.client||'—',fmtE(d.amount),fmtE(rit)];}),['Totale ritenute','','',fmtE(totRit)]],styles:{fontSize:8,cellPadding:{top:3,bottom:3,left:3,right:3},textColor:black},headStyles:{fillColor:[248,250,252],textColor:grey,fontStyle:'bold',fontSize:7.5,lineColor:lightGrey,lineWidth:0.3},bodyStyles:{lineColor:lightGrey,lineWidth:0.2},columnStyles:{2:{halign:'right'},3:{halign:'right',fontStyle:'bold'}},didParseCell:(data)=>{ if(data.section==='body'&&data.row.index===ritDocs.length){ data.cell.styles.fontStyle='bold'; } },margin:{left:margin,right:margin}});
      }

      // Disclaimer su ogni pagina del riepilogo
      const pgCount = pdf.getNumberOfPages();
      for (let i=1;i<=pgCount;i++) {
        pdf.setPage(i);
        pdf.setDrawColor(...lightGrey); pdf.setLineWidth(0.3); pdf.line(margin,286,rightCol,286);
        pdf.setFont('helvetica','italic'); pdf.setFontSize(6.5); pdf.setTextColor(...grey);
        pdf.text('Documento riepilogativo con dati stimati. Verificare con il commercialista per la dichiarazione definitiva.',margin,291);
        pdf.setFont('helvetica','normal');
        pdf.text(`Pag. ${i} di ${pgCount}`,rightCol,291,{align:'right'});
      }
    }

    const blob = pdf.output('blob');
    const fileName = `documenti_${year}_${Date.now()}.pdf`;
    await shareOrDownload(blob, fileName, 'application/pdf');
  };

  const generateRegistroFile = async (): Promise<{ blob: Blob; fileName: string }> => {
    const MARCA_BOLLO_VAL = 2;
    const registroDocs = yearDocs
      .filter(d => (d.type === 'invoice' || d.type === 'credit_note' || d.type === 'factura_rectificativa') && syncedMonths.has(getLocalMonth(d.date)))
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
      // Generate Resumen Trimestral PDF if toggle is on (Spain)
      let resumenFile: { blob: Blob; fileName: string } | undefined;
      if (includeResumen && isSpain && isPro && hasTaxIdSpain) {
        const resumen = calcularTrimestre(documents, resumenQuarter, resumenYear, esRetencionRateExport, profile.annoInizioAttivita);
        const resumenPdf = await generateResumenPDF(resumen, profile);
        const nif = (profile.nie || profile.piva || 'SINIF').replace(/\s/g, '');
        const resumenFileName = `ES_${nif}_resumen_T${resumenQuarter}_${resumenYear}.pdf`;
        resumenFile = { blob: resumenPdf.output('blob'), fileName: resumenFileName };
      }

      // Registro e Riepilogo sono già inline nel PDF principale
      const registroFile: { blob: Blob; fileName: string } | undefined = undefined;
      const riepilogoFile: { blob: Blob; fileName: string } | undefined = undefined;
      setReadyBlob({ blob, fileName, xmlFiles: undefined, resumenFile, registroFile, riepilogoFile });
      return;
    }
    const file = new File([blob], fileName, { type: 'application/octet-stream' });
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
      function calcIRPEFLocal(imp: number): number {
        if (imp <= 0) return 0;
        if (imp <= 28000) return imp * 0.23;
        if (imp <= 50000) return 28000 * 0.23 + (imp - 28000) * 0.33;
        return 28000 * 0.23 + 22000 * 0.33 + (imp - 50000) * 0.43;
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
      const isItOrdinario = profile.country === 'Italy' && !isForfettario;
      const totalDeductibleExpenses = isItOrdinario
        ? expenseDocs.reduce((s, d) => s + d.amount * getItDeductibilityRate(d.category), 0)
        : totalExpensesAmt;
      const coeff = (profile.coefficiente != null && profile.coefficiente > 0) ? profile.coefficiente / 100 : 0.78;
      const redditoLordo = isForfettario ? Math.max(0, totalIncome * coeff) : Math.max(0, totalIncome - totalDeductibleExpenses);
      const inpsRate = INPS_GESTIONE_SEPARATA; // GS 26.07% sia forfettario che ordinario professionisti
      const inps = redditoLordo * inpsRate;
      const redditoImponibile = Math.max(0, redditoLordo - inps);
      const annoInizio = profile.annoInizioAttivita ?? null;
      const yearsActive = annoInizio != null ? year - Number(annoInizio) : null;
      const isFivePercent = isForfettario && yearsActive != null && Number.isFinite(yearsActive) && yearsActive < 5;
      const aliquota = isForfettario ? (isFivePercent ? 0.05 : 0.15) : 0;
      const impostaForFeit = redditoImponibile * aliquota;
      const irpef = isForfettario ? 0 : calcIRPEFLocal(redditoImponibile);
      const addizionali = isForfettario ? 0 : redditoImponibile * getAddizionaliRate(profile.region);
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

      const spesePerCat: Record<string, { gross: number; deductible: number; rate: number }> = {};
      expenseDocs.forEach(d => {
        const cat = d.category || 'Altro';
        const rate = isItOrdinario ? getItDeductibilityRate(d.category) : 1;
        if (!spesePerCat[cat]) spesePerCat[cat] = { gross: 0, deductible: 0, rate };
        spesePerCat[cat].gross += d.amount;
        spesePerCat[cat].deductible += d.amount * rate;
      });
      const speseRows = Object.entries(spesePerCat).sort((a, b) => b[1].deductible - a[1].deductible);

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
            [`Addizionali (${(getAddizionaliRate(profile.region) * 100).toFixed(2)}%)`, fmtEur(addizionali)],
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
        if (isItOrdinario) {
          const totalGross = expenseDocs.reduce((s, d) => s + d.amount, 0);
          autoTable(pdf, {
            startY: y,
            head: [['Categoria', 'Lordo', 'Deducibile', '%']],
            body: [
              ...speseRows.map(([cat, { gross, deductible, rate }]) => [cat, fmtEur(gross), fmtEur(deductible), `${Math.round(rate * 100)}%`]),
              ['Totale', fmtEur(totalGross), fmtEur(totalDeductibleExpenses), ''],
            ],
            styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: black },
            headStyles: { fillColor: [248, 250, 252], textColor: grey, fontStyle: 'bold', fontSize: 8, lineColor: lightGrey, lineWidth: 0.3 },
            bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
            columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 38, halign: 'right' }, 2: { cellWidth: 38, halign: 'right' }, 3: { cellWidth: 16, halign: 'center' } },
            didParseCell: (data) => {
              if (data.section === 'body' && data.row.index === speseRows.length) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = red;
              }
            },
            margin: { left: M, right: M },
          });
          y = (pdf.lastAutoTable?.finalY ?? y + 20) + 4;
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(7);
          pdf.setTextColor(...grey);
          pdf.text('Gli importi nella colonna Deducibile sono utilizzati per il calcolo del reddito imponibile.', M, y);
          y += 8;
        } else {
          autoTable(pdf, {
            startY: y,
            head: [['Categoria', 'Totale']],
            body: [...speseRows.map(([cat, { gross }]) => [cat, fmtEur(gross)]), ['Totale spese', fmtEur(totalDeductibleExpenses)]],
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
  useBodyScrollLock(isOpen);
  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl max-h-[90dvh] flex flex-col"
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            <div className={`flex items-start justify-between p-6 pb-4 shrink-0 ${darkMode ? 'border-b border-slate-800' : 'border-b border-slate-100'}`}>
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Esporta</h2>
                <p className="text-sm text-slate-500">{periodLabel}</p>
              </div>
              <button onClick={onClose} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}><X size={18} /></button>
            </div>
            <div data-scroll-lock-ignore className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-6 space-y-5 [padding-bottom:max(3rem,calc(env(safe-area-inset-bottom)+2rem))]">

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
                <div
                  className={`flex items-center gap-3 p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : ''}`}
                  style={!darkMode ? { backgroundColor: 'var(--export-card-bg, #f8fafc)', border: '1px solid var(--export-card-border, transparent)' } : undefined}
                >
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
                    <button key={y} onClick={() => { setYear(y); setSelectedMonths(new Set()); setReadyBlob(null); }} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 ${year === y ? 'bg-primary text-white' : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>{y}</button>
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
                          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95 ${selected ? 'bg-primary text-white' : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}
                        >
                          {selected && <Check size={13} strokeWidth={3} />}
                          {MONTH_NAMES[m].slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Toggle FatturaPA XML + Registro Cronologico — solo Italy Pro con commercialista */}
              {isItaly && isPro && accountant && docFilter !== 'expense' && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Opzioni</p>
                  {/* FatturaPA XML */}
                  <button
                    onClick={() => { setIncludeFatturaPA(prev => !prev); setReadyBlob(null); }}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border border-slate-700' : ''}`}
                    style={!darkMode ? { backgroundColor: 'var(--export-card-bg, #f8fafc)', border: '1px solid var(--export-card-border, transparent)' } : undefined}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${includeFatturaPA ? 'bg-primary border-primary' : darkMode ? 'border-slate-600' : 'border-slate-300'}`}>
                      {includeFatturaPA && <Check size={12} strokeWidth={3} className="text-white" />}
                    </div>
                    <span className="text-xl shrink-0">📄</span>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Invia a SdI</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-600 shrink-0">AdE</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {missingProfileFields.length > 0
                          ? `⚠ Completa il profilo (${missingProfileFields.map(f => f.label).join(', ')}) per l'invio`
                          : 'Trasmette le fatture del periodo all\'Agenzia delle Entrate via SdI'}
                      </p>
                    </div>
                  </button>
                  {/* Fatture del periodo */}
                  <button
                    onClick={() => { setIncludeDocumenti(prev => !prev); setReadyBlob(null); }}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border border-slate-700' : ''}`}
                    style={!darkMode ? { backgroundColor: 'var(--export-card-bg, #f8fafc)', border: '1px solid var(--export-card-border, transparent)' } : undefined}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${includeDocumenti ? 'bg-primary border-primary' : darkMode ? 'border-slate-600' : 'border-slate-300'}`}>
                      {includeDocumenti && <Check size={12} strokeWidth={3} className="text-white" />}
                    </div>
                    <span className="text-xl shrink-0">🧾</span>
                    <div className="text-left flex-1 min-w-0">
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Fatture del periodo</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Una pagina per ogni fattura/spesa selezionata</p>
                    </div>
                  </button>
                  {/* Registro Cronologico */}
                  <button
                    onClick={() => { setIncludeRegistro(prev => !prev); setReadyBlob(null); }}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border border-slate-700' : ''}`}
                    style={!darkMode ? { backgroundColor: 'var(--export-card-bg, #f8fafc)', border: '1px solid var(--export-card-border, transparent)' } : undefined}
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
                      <p className="text-[10px] text-slate-400 mt-0.5">Elenco fatture per il commercialista</p>
                    </div>
                  </button>
                  {/* Riepilogo Annuale */}
                  <button
                    onClick={() => { setIncludeRiepilogo(prev => !prev); setReadyBlob(null); }}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border border-slate-700' : ''}`}
                    style={!darkMode ? { backgroundColor: 'var(--export-card-bg, #f8fafc)', border: '1px solid var(--export-card-border, transparent)' } : undefined}
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
                    <span className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {includeFatturaPA && isItaly ? 'Fatture da inviare a SdI' : 'Documenti selezionati'}
                    </span>
                    <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {includeFatturaPA && isItaly
                        ? filteredDocs.filter(d => d.type === 'invoice' || d.type === 'credit_note').length
                        : filteredDocs.length}
                    </span>
                  </div>
                  {docFilter !== 'expense' && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-emerald-500">Entrate</span>
                      <span className="text-sm font-bold text-emerald-500">{formatAmount(totals.income)}</span>
                    </div>
                  )}
                  {docFilter !== 'invoice' && !(isItaly && (includeFatturaPA || includeDocumenti)) && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-red-500">Uscite</span>
                      <span className="text-sm font-bold text-red-500">{formatAmount(totals.expenses)}</span>
                    </div>
                  )}
                  {docFilter === 'all' && !(isItaly && (includeFatturaPA || includeDocumenti)) && (
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
                      if (readyBlob.fileName.endsWith('.pdf')) {
                        setPdfPreview({ blob: readyBlob.blob, fileName: readyBlob.fileName });
                      } else {
                        const url = URL.createObjectURL(readyBlob.blob);
                        window.open(url, '_blank');
                      }
                    }}
                    className={`w-full rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 hover:border-primary/40' : 'bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <div className="min-w-0 flex-1 text-left space-y-1.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pronto per l'invio</p>
                      <div className="flex items-center gap-1.5">
                        <Check size={13} className="text-emerald-500 shrink-0" />
                        <p className="text-xs text-slate-500 truncate">{readyBlob.fileName}</p>
                      </div>
                      {(readyBlob.xmlFiles?.length ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] leading-none shrink-0">📎</span>
                          <p className="text-[11px] text-blue-500">{readyBlob.xmlFiles!.length} file XML FatturaPA allegati</p>
                        </div>
                      )}
                      {includeRegistro && (
                        <div className="flex items-center gap-1.5">
                          <Check size={13} className="text-emerald-500 shrink-0" />
                          <p className="text-[11px] text-emerald-600 font-medium">+ Registro Cronologico</p>
                        </div>
                      )}
                      {includeRiepilogo && (
                        <div className="flex items-center gap-1.5">
                          <Check size={13} className="text-violet-500 shrink-0" />
                          <p className="text-[11px] text-violet-500 font-medium">+ Riepilogo Annuale {year}</p>
                        </div>
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
                </div>
              ) : (
                <div className="space-y-3">
                  {includeFatturaPA && isItaly && isPro && (
                    <>
                      <button
                        disabled={sdiSending || syncedMonths.size === 0 || missingProfileFields.length > 0}
                        onClick={async () => {
                          const invoicesToSend = filteredDocs.filter(d =>
                            (d.type === 'invoice' || d.type === 'credit_note') &&
                            d.sdiStatus !== 'sent' && d.sdiStatus !== 'delivered'
                          );
                          if (invoicesToSend.length === 0) {
                            setSdiResults({ sent: 0, skipped: filteredDocs.filter(d => d.type === 'invoice' || d.type === 'credit_note').length, errors: 0, incomplete: 0, incompleteItems: [] });
                            return;
                          }
                          setSdiSending(true);
                          setSdiResults(null);
                          let sent = 0, skipped = 0, errors = 0;
                          const incompleteItems: { id: string; label: string; reasons: string[] }[] = [];
                          const { data: { session } } = await getClient().auth.getSession();
                          for (const doc of invoicesToSend) {
                            const docLabel = doc.invoiceNumber || doc.client || doc.id.slice(0, 8);
                            const sdiErrors = validateForSdi(doc, profile);
                            if (sdiErrors.length > 0) {
                              errors++;
                              incompleteItems.push({ id: doc.id, label: docLabel, reasons: sdiErrors.map(e => e.label) });
                              continue;
                            }
                            try {
                              const res = await fetch(`${SUPABASE_URL}/functions/v1/sdi-send`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                                body: JSON.stringify({ document_id: doc.id }),
                              });
                              if (res.ok) { sent++; }
                              else if ((await res.json().catch(() => ({}))).error?.includes('già inviata')) { skipped++; }
                              else {
                                errors++;
                                const errData = await res.json().catch(() => ({}));
                                let reasons: string[] = [];
                                try {
                                  const raw = typeof errData.detail === 'string' ? JSON.parse(errData.detail) : errData.detail;
                                  if (raw?.violations?.length) {
                                    reasons = raw.violations.map((v: { propertyPath?: string; message?: string }) =>
                                      [v.propertyPath, v.message].filter(Boolean).join(': ')
                                    );
                                  } else if (raw?.detail) {
                                    reasons = [raw.detail];
                                  } else if (raw?.title) {
                                    reasons = [raw.title];
                                  }
                                } catch { /* ignore parse error */ }
                                if (!reasons.length) reasons = ['Verifica: P.IVA/CF cliente, indirizzo con CAP, numero fattura'];
                                incompleteItems.push({ id: doc.id, label: docLabel, reasons });
                              }
                            } catch { errors++; incompleteItems.push({ id: doc.id, label: docLabel, reasons: ['Errore di rete'] }); }
                          }
                          setSdiSending(false);
                          setSdiResults({ sent, skipped, errors: 0, incomplete: errors, incompleteItems });
                        }}
                        className="w-full py-4 rounded-2xl font-bold text-white bg-blue-500 shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {sdiSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        {sdiSending
                          ? 'Invio in corso…'
                          : (() => { const n = filteredDocs.filter(d => (d.type === 'invoice' || d.type === 'credit_note') && d.sdiStatus !== 'sent' && d.sdiStatus !== 'delivered').length; return `Invia ${n} ${n === 1 ? 'fattura' : 'fatture'} a SdI`; })()}
                      </button>
                      {invoiceMissingFields.length > 0 && (
                        <div className={`p-3 rounded-2xl space-y-1.5 ${darkMode ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                          <p className={`text-[11px] font-bold ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>⚠ Prima di inviare, completa:</p>
                          {invoiceMissingFields.filter(e => e.where === 'profilo').length > 0 && (
                            <p className={`text-[11px] ${darkMode ? 'text-amber-400/80' : 'text-amber-600'}`}>
                              Nel profilo: {invoiceMissingFields.filter(e => e.where === 'profilo').map(e => e.label).join(', ')}
                            </p>
                          )}
                          {invoiceMissingFields.filter(e => e.where === 'fattura').length > 0 && (
                            <p className={`text-[11px] ${darkMode ? 'text-amber-400/80' : 'text-amber-600'}`}>
                              Nelle fatture: {invoiceMissingFields.filter(e => e.where === 'fattura').map(e => e.label).join(', ')}
                            </p>
                          )}
                        </div>
                      )}
                      {sdiResults && (
                        <div className={`w-full p-3 rounded-2xl text-[11px] space-y-1.5 ${sdiResults.incomplete > 0 ? (darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700') : (darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700')}`}>
                          <p className="font-bold text-center">
                            {`✓ ${sdiResults.sent} inviate`}
                            {sdiResults.skipped > 0 && ` · ↩ ${sdiResults.skipped} già inviate`}
                            {sdiResults.incomplete > 0 && ` · ⚠ ${sdiResults.incomplete} ${sdiResults.incomplete === 1 ? 'dato incompleto' : 'dati incompleti'}`}
                          </p>
                          {sdiResults.incompleteItems.map(item => (
                            <div key={item.id} className={`pt-1 border-t ${darkMode ? 'border-amber-500/20' : 'border-amber-200'}`}>
                              <p className="font-semibold">{item.label}</p>
                              <p className="opacity-80">{item.reasons.join(' · ')}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  <button
                    onClick={handleExport}
                    disabled={exporting || (filteredDocs.length === 0 && !includeRiepilogo && !includeRegistro)}
                    className="w-full py-4 rounded-2xl font-bold text-white bg-primary shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <Download size={18} />
                    {exporting ? 'Preparazione...' : accountant ? `Invia al Commercialista` : `Esporta PDF`}
                  </button>
                </div>
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
