import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { X, Download, Check, Mail, Share2, Eye, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document as AppDoc, Profile, Accountant } from '../../types';
import { useProStatus } from '../../hooks/useProStatus';
import { generateFatturaPA, getMissingProfileFields } from '../../services/fatturaPA';

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

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

  const [docFilter, setDocFilter] = useState<'all' | 'invoice' | 'expense'>('all');
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const [exporting, setExporting] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set());
  const [includeFatturaPA, setIncludeFatturaPA] = useState(true);
  const [readyBlob, setReadyBlob] = useState<{
    blob: Blob; fileName: string;
    xmlFiles?: { blob: Blob; fileName: string }[];
  } | null>(null);
  const [year, setYear] = useState(selectedYear);

  useEffect(() => {
    if (isOpen) {
      setYear(selectedYear);
      setSelectedMonths(new Set());
      setReadyBlob(null);
      setIncludeFatturaPA(true);
    }
  }, [isOpen, selectedYear]);

  const missingProfileFields = useMemo(() => getMissingProfileFields(profile), [profile]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>(documents.map(d => new Date(d.date).getFullYear()));
    years.add(currentYear);
    years.add(currentYear + 1);
    return Array.from(years).sort((a, b) => b - a);
  }, [documents]);

  const yearDocs = useMemo(() =>
    documents.filter(d => new Date(d.date).getFullYear() === year),
    [documents, year]
  );

  const availableMonths = useMemo(() => {
    const months = new Set<number>(yearDocs.map(d => new Date(d.date).getMonth()));
    return Array.from(months).sort((a, b) => a - b);
  }, [yearDocs]);

  const syncedMonths = useMemo(() => {
    const valid = new Set(availableMonths);
    const synced = new Set([...selectedMonths].filter(m => valid.has(m)));
    // If synced is empty but availableMonths has items, return all
    if (synced.size === 0 && availableMonths.length > 0) return new Set(availableMonths);
    return synced;
  }, [availableMonths, selectedMonths]);

  const toggleMonth = (m: number) => {
    setSelectedMonths(prev => {
      const next = new Set(prev.size === 0 ? availableMonths : prev);
      if (next.has(m)) { next.delete(m); } else { next.add(m); }
      return next;
    });
  };

  const toggleAll = () => {
    if (syncedMonths.size === availableMonths.length) {
      setSelectedMonths(new Set());
    } else {
      setSelectedMonths(new Set(availableMonths));
    }
  };

  const filteredDocs = useMemo(() => {
    return yearDocs.filter(d => {
      const month = new Date(d.date).getMonth();
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
    else acc.expenses += d.amount;
    return acc;
  }, { income: 0, expenses: 0 }), [filteredDocs]);

  const periodLabel = useMemo(() => {
    const months = [...syncedMonths].sort((a, b) => a - b);
    if (months.length === 0) return `${year}`;
    if (months.length === 12) return `Anno ${year}`;
    if (months.length === 1) return `${MONTH_NAMES[months[0]]} ${year}`;
    return `${MONTH_NAMES[months[0]]} – ${MONTH_NAMES[months[months.length - 1]]} ${year}`;
  }, [syncedMonths, selectedYear]);

  const handleExport = async () => {
    if (filteredDocs.length === 0) return;
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
    const allFiles = [primaryFile, ...xmlFileObjs];

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
    const hasXmls = xmlFiles.length > 0;
    const subject = encodeURIComponent(`Documenti ${periodLabel} — Solvy`);
    const body = encodeURIComponent(
      `Ciao ${accountant.firstName},\n\n` +
      `ti invio i documenti relativi al periodo: ${periodLabel}.\n` +
      `In allegato trovi il file ${format.toUpperCase()}` +
      (hasXmls ? ` e gli XML FatturaPA di ${xmlFiles.length} fattur${xmlFiles.length === 1 ? 'a' : 'e'}` : '') +
      `.\n` +
      (hasXmls ? `\nGli XML FatturaPA sono stati salvati nella cartella Download — allegali manualmente all'email.\n` : '') +
      `\nGrazie`
    );
    window.location.href = `mailto:${accountant.email}?subject=${subject}&body=${body}`;
  };

  const exportCSV = async () => {
    const header = ['Data', 'Tipo', 'Descrizione', 'Cliente', 'Importo (€)', 'Stato', 'Categoria'];
    const rows = filteredDocs.map(d => [
      new Date(d.date).toLocaleDateString('it-IT'),
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

    const drawInvoicePage = (inv: AppDoc, isFirst: boolean) => {
      if (!isFirst) pdf.addPage();
      const M = margin;
      const R = rightCol;

      // FATTURA title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(...black);
      pdf.text('FATTURA', M, 18);

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
      const rivalsaInps = inv.rivalsaInps ?? false;
      const ritenuta = inv.ritenuta ?? false;
      const marcaBollo = !isOrdinario && (inv.marcaBollo ?? (inv.amount > MARCA_BOLLO_THRESHOLD));
      const rivalsaAmount = rivalsaInps ? inv.amount * INPS_RATE : 0;
      const totaleImponibile = inv.amount + rivalsaAmount;
      const ivaAmount = isOrdinario ? totaleImponibile * (ivaRate / 100) : 0;
      const ritenutaAmount = ritenuta ? inv.amount * RITENUTA_RATE : 0;
      const totale = totaleImponibile + ivaAmount + (marcaBollo ? MARCA_BOLLO_AMOUNT : 0) - ritenutaAmount;

      // Tabella
      autoTable(pdf, {
        startY: y,
        head: [['Descrizione', 'Importo']],
        body: [[inv.title || 'Servizio non specificato', `€ ${inv.amount.toFixed(2)}`]],
        styles: { fontSize: 9, cellPadding: { top: 5, bottom: 5, left: 3, right: 3 }, textColor: black },
        headStyles: { fillColor: [248, 250, 252], textColor: grey, fontStyle: 'bold', fontSize: 8, lineColor: lightGrey, lineWidth: 0.3 },
        bodyStyles: { lineColor: lightGrey, lineWidth: 0.2 },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 38, halign: 'right', fontStyle: 'bold', textColor: black } },
        margin: { left: M, right: M },
        tableLineColor: lightGrey,
        tableLineWidth: 0.3,
      });

      y = (pdf.lastAutoTable?.finalY ?? y + 20) + 6;

      // Riepilogo
      const summaryX = W - M - 72;
      const summaryW = 72;

      const summaryRows: [string, string][] = [
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
      pdf.text('TOTALE DA RICEVERE', summaryX, y + 5);
      pdf.setFontSize(11);
      pdf.setTextColor(...primary);
      pdf.text(`€ ${totale.toFixed(2)}`, summaryX + summaryW, y + 5, { align: 'right' });
      y += 14;

      // Nota legale
      if (!isOrdinario) {
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

    const invoices = filteredDocs.filter(d => d.type === 'invoice');
    const expenses = filteredDocs.filter(d => d.type === 'expense');

    // Una pagina per ogni fattura
    invoices.forEach((inv, i) => drawInvoicePage(inv, i === 0));

    // Pagina riepilogo spese
    if (expenses.length > 0) {
      if (invoices.length > 0) pdf.addPage();
      const M = margin;
      const R = rightCol;

      // Header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(...black);
      pdf.text('RIEPILOGO SPESE', M, 18);

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
        head: [['Data', 'Categoria', 'Descrizione', 'Importo']],
        body: expenses.map(d => [
          new Date(d.date).toLocaleDateString('it-IT'),
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
      pdf.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, R, 285, { align: 'right' });
    }

    const blob = pdf.output('blob');
    const fileName = `documenti_${year}_${Date.now()}.pdf`;
    await shareOrDownload(blob, fileName, 'application/pdf');
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
      setReadyBlob({ blob, fileName, xmlFiles });
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

  const inputBase = `px-4 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95`;
  const dragControls = useDragControls();

  return (
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
            className={`relative w-full max-w-md rounded-t-[32px] shadow-2xl ${darkMode ? 'bg-slate-900' : 'bg-white'}`}
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
                    <button key={f} onClick={() => setDocFilter(f)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${docFilter === f ? (f === 'invoice' ? 'bg-emerald-500 text-white shadow-lg' : f === 'expense' ? 'bg-red-500 text-white shadow-lg' : 'bg-primary text-white shadow-lg') : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
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
                    <button key={y} onClick={() => { setYear(y); setSelectedMonths(new Set()); }} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 ${year === y ? 'bg-primary text-white shadow-lg shadow-primary/40' : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>{y}</button>
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
                    <button key={f} onClick={() => setFormat(f)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${format === f ? 'bg-primary text-white shadow-lg shadow-primary/30' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle FatturaPA XML — solo Italy Pro con commercialista */}
              {isItaly && isPro && accountant && docFilter !== 'expense' && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Opzioni</p>
                  <button
                    onClick={() => setIncludeFatturaPA(prev => !prev)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${includeFatturaPA ? 'bg-primary border-primary' : darkMode ? 'border-slate-600' : 'border-slate-300'}`}>
                      {includeFatturaPA && <Check size={12} strokeWidth={3} className="text-white" />}
                    </div>
                    <div className="text-left flex-1">
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Includi FatturaPA XML</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {missingProfileFields.length > 0
                          ? `⚠ Completa il profilo (${missingProfileFields.map(f => f.label).join(', ')}) per XML corretti`
                          : `${filteredDocs.filter(d => d.type === 'invoice').length} XML allegati all'email`}
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {/* Riepilogo */}
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
                      const url = URL.createObjectURL(readyBlob.blob);
                      window.open(url, '_blank');
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
                  disabled={exporting || filteredDocs.length === 0}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-primary shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <Download size={18} />
                  {exporting ? 'Preparazione...' : accountant ? `Invia al Commercialista` : `Esporta ${format.toUpperCase()}`}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
