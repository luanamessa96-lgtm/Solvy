import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Check, Mail, Share2, Eye, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document as AppDoc, Profile, Accountant } from '../../types';

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
  const [docFilter, setDocFilter] = useState<'all' | 'invoice' | 'expense'>('all');
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const [exporting, setExporting] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set());
  const [readyBlob, setReadyBlob] = useState<{ blob: Blob; fileName: string } | null>(null);
  const [year, setYear] = useState(selectedYear);

  useEffect(() => {
    if (isOpen) {
      setYear(selectedYear);
      setSelectedMonths(new Set());
      setReadyBlob(null);
    }
  }, [isOpen, selectedYear]);

  const availableYears = useMemo(() => {
    const years = new Set<number>(documents.map(d => new Date(d.date).getFullYear()));
    years.add(new Date().getFullYear());
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
    filteredDocs.filter(d => d.type === 'invoice' && (!d.title || !d.invoiceNumber || !d.clientAddress || !d.clientPiva)),
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
    const { blob, fileName } = readyBlob;
    const file = new File([blob], fileName, { type: blob.type });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: fileName });
    } else {
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
    }
    setReadyBlob(null);
    onClose();
  };

  const handleOpenMail = () => {
    if (!accountant) return;
    const subject = encodeURIComponent(`Documenti ${periodLabel}`);
    const body = encodeURIComponent(`Ciao ${accountant.firstName},\n\nti invio i documenti relativi al periodo: ${periodLabel}.\nIn allegato trovi il file ${format.toUpperCase()}.\n\nGrazie`);
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
    const dark: [number, number, number] = [15, 23, 42];
    const muted: [number, number, number] = [100, 116, 139];
    const light: [number, number, number] = [241, 245, 249];

    const MARCA_BOLLO_THRESHOLD = 77.47;
    const MARCA_BOLLO_AMOUNT = 2;
    const RITENUTA_RATE = 0.20;
    const INPS_RATE = 0.04;
    const FORFETTARIO_NOTE =
      "Operazione effettuata in regime forfettario ai sensi dell'art. 1, commi 54-89, L. n. 190/2014. " +
      "Non soggetta ad IVA ai sensi dell'art. 1, co. 58, L. 190/2014. " +
      "Non soggetta a ritenuta d'acconto ai sensi dell'art. 1, co. 67, L. 190/2014.";

    const drawInvoicePage = (inv: AppDoc, isFirst: boolean) => {
      if (!isFirst) pdf.addPage();

      // Header band
      pdf.setFillColor(...primary);
      pdf.rect(0, 0, W, 38, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.text(profile.name, margin, 15);
      const regime = profile.regime === 'ordinario' ? 'Regime Ordinario' : 'Regime Forfettario';
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(regime.toUpperCase(), margin, 22);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`FATTURA N° ${inv.invoiceNumber || '—'}`, rightCol, 15, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(`Data: ${new Date(inv.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}`, rightCol, 22, { align: 'right' });

      let y = 48;

      // Fornitore box
      pdf.setFillColor(...light);
      pdf.roundedRect(margin, y, 85, 38, 3, 3, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(...muted);
      pdf.text('FORNITORE', margin + 4, y + 6);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...dark);
      pdf.text(profile.name, margin + 4, y + 13);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...muted);
      if (profile.address) pdf.text(profile.address, margin + 4, y + 20, { maxWidth: 77 });
      const fiscalLine = [profile.piva ? `P.IVA: ${profile.piva}` : '', profile.codiceFiscale ? `C.F.: ${profile.codiceFiscale}` : ''].filter(Boolean).join('   ');
      if (fiscalLine) pdf.text(fiscalLine, margin + 4, y + 30, { maxWidth: 77 });

      // Cliente box
      const cx = W / 2 + 2;
      pdf.setFillColor(...light);
      pdf.roundedRect(cx, y, W - cx - margin, 38, 3, 3, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(...muted);
      pdf.text('CLIENTE', cx + 4, y + 6);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...dark);
      pdf.text(inv.client || 'Cliente non specificato', cx + 4, y + 13, { maxWidth: W - cx - margin - 8 });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...muted);
      if (inv.clientAddress) pdf.text(inv.clientAddress, cx + 4, y + 20, { maxWidth: W - cx - margin - 8 });
      const clientFiscal = [inv.clientPiva ? `P.IVA: ${inv.clientPiva}` : '', inv.clientCf ? `C.F.: ${inv.clientCf}` : ''].filter(Boolean).join('   ');
      if (clientFiscal) pdf.text(clientFiscal, cx + 4, y + 30, { maxWidth: W - cx - margin - 8 });

      y += 46;

      // Tabella voci
      autoTable(pdf, {
        startY: y,
        head: [['Descrizione', 'Imponibile']],
        body: [[inv.title || 'Servizio non specificato', `€ ${inv.amount.toFixed(2)}`]],
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: primary, textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 35, halign: 'right', fontStyle: 'bold' } },
        margin: { left: margin, right: margin },
      });

      y = (pdf.lastAutoTable?.finalY ?? y + 20) + 4;

      // Riepilogo importi
      const summaryX = W - margin - 80;
      const summaryW = 80;
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

      const summaryRows: [string, string, boolean][] = [
        ['Imponibile', `€ ${inv.amount.toFixed(2)}`, false],
        ...(rivalsaInps ? [[`Rivalsa INPS (4%)`, `+ € ${rivalsaAmount.toFixed(2)}`, false] as [string, string, boolean]] : []),
        ...(isOrdinario ? [[`IVA ${ivaRate}%`, `+ € ${ivaAmount.toFixed(2)}`, false] as [string, string, boolean]] : []),
        ...(marcaBollo ? [['Marca da bollo', `+ € ${MARCA_BOLLO_AMOUNT.toFixed(2)}`, false] as [string, string, boolean]] : []),
        ...(ritenuta ? [["Ritenuta d'acconto (20%)", `− € ${ritenutaAmount.toFixed(2)}`, false] as [string, string, boolean]] : []),
        ['TOTALE DA RICEVERE', `€ ${totale.toFixed(2)}`, true],
      ];

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

      // Nota legale
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
      }

      // Footer
      pdf.setFillColor(...primary);
      pdf.rect(0, 287, W, 10, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255);
      pdf.text(profile.email || '', margin, 293);
      pdf.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, rightCol, 293, { align: 'right' });
    };

    const invoices = filteredDocs.filter(d => d.type === 'invoice');
    const expenses = filteredDocs.filter(d => d.type === 'expense');

    // Una pagina per ogni fattura
    invoices.forEach((inv, i) => drawInvoicePage(inv, i === 0));

    // Pagina riepilogo spese
    if (expenses.length > 0) {
      if (invoices.length > 0) pdf.addPage();
      pdf.setFillColor(...primary);
      pdf.rect(0, 0, W, 38, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.text(profile.name, margin, 15);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(200, 200, 255);
      pdf.text(`Riepilogo Spese · ${periodLabel}`, margin, 23);

      autoTable(pdf, {
        startY: 48,
        head: [['Data', 'Categoria', 'Descrizione', 'Importo']],
        body: expenses.map(d => [
          new Date(d.date).toLocaleDateString('it-IT'),
          d.category || '—',
          d.title,
          `€ ${d.amount.toFixed(2)}`,
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [255, 250, 250] },
        columnStyles: { 0: { cellWidth: 25 }, 3: { cellWidth: 28, halign: 'right' } },
        margin: { left: margin, right: margin },
      });

      const fy = (pdf.lastAutoTable?.finalY ?? 48) + 6;
      const summaryX = W - margin - 60;
      pdf.setFillColor(...primary);
      pdf.rect(summaryX, fy, 60, 8, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      pdf.text('TOTALE SPESE', summaryX + 3, fy + 5.5);
      pdf.text(formatAmount(totals.expenses), summaryX + 57, fy + 5.5, { align: 'right' });

      pdf.setFillColor(...primary);
      pdf.rect(0, 287, W, 10, 'F');
      pdf.setFontSize(7);
      pdf.text(profile.email || '', margin, 293);
      pdf.text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, rightCol, 293, { align: 'right' });
    }

    const blob = pdf.output('blob');
    const fileName = `documenti_${year}_${Date.now()}.pdf`;
    await shareOrDownload(blob, fileName, 'application/pdf');
  };

  const shareOrDownload = async (blob: Blob, fileName: string, mimeType: string) => {
    if (accountant) {
      // Mostra step 2 con opzioni: condividi file + apri mail
      setReadyBlob({ blob, fileName });
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`relative w-full max-w-md rounded-t-[32px] shadow-2xl ${darkMode ? 'bg-slate-900' : 'bg-white'}`}
          >
            <div className="overflow-y-auto max-h-[88vh] p-8 space-y-6">
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
                    <button key={y} onClick={() => { setYear(y); setSelectedMonths(new Set()); }} className={`px-5 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${year === y ? 'bg-primary text-white shadow-lg shadow-primary/40' : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>{y}</button>
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
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-bold transition-all active:scale-95 border-2 ${selected ? 'bg-primary border-primary text-white shadow-md shadow-primary/30' : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500')}`}
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
