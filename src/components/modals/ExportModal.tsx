import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Check, Mail, Share2, Eye } from 'lucide-react';
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
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDFWithAutoTable;
    const pageW = 210;
    const margin = 14;
    const contentW = pageW - margin * 2;

    const invoices = filteredDocs.filter(d => d.type === 'invoice');
    const expenses = filteredDocs.filter(d => d.type === 'expense');

    // ── Cover / header ──────────────────────────────────────────
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageW, 38, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(profile.name, margin, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 255);
    doc.text(`${profile.email}   |   ${periodLabel}`, margin, 23);
    if (profile.piva) doc.text(`P.IVA ${profile.piva}`, margin, 29);

    let y = 48;

    // ── Helper ───────────────────────────────────────────────────
    const checkPage = (needed: number) => {
      if (y + needed > 280) { doc.addPage(); y = 14; }
    };

    const sectionTitle = (title: string) => {
      checkPage(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(79, 70, 229);
      doc.text(title, margin, y);
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.4);
      doc.line(margin, y + 2, margin + contentW, y + 2);
      y += 8;
    };

    const labelValue = (label: string, value: string, x: number, col: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text(label.toUpperCase(), x, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      const maxW = col === 1 ? contentW / 2 - 4 : contentW / 2 - 4;
      doc.text(value || '—', x, y + 5, { maxWidth: maxW });
    };

    // ── Fatture ──────────────────────────────────────────────────
    if (invoices.length > 0) {
      sectionTitle(`Fatture (${invoices.length})`);

      for (const inv of invoices) {
        const blockH = 52;
        checkPage(blockH + 4);

        // Card background
        doc.setFillColor(250, 250, 255);
        doc.setDrawColor(220, 220, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, y, contentW, blockH, 2, 2, 'FD');

        // Status badge
        const isPaid = inv.status === 'paid';
        doc.setFillColor(isPaid ? 5 : 245, isPaid ? 150 : 158, isPaid ? 105 : 11);
        doc.roundedRect(margin + contentW - 28, y + 3, 26, 7, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(isPaid ? 'SALDATO' : 'IN ATTESA', margin + contentW - 27, y + 7.8);

        // Invoice number + date
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 30, 30);
        doc.text(`Fattura ${inv.invoiceNumber || '—'}`, margin + 3, y + 9);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(120, 120, 120);
        doc.text(new Date(inv.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }), margin + 3, y + 15);

        // Divider
        doc.setDrawColor(220, 220, 240);
        doc.line(margin + 3, y + 18, margin + contentW - 3, y + 18);

        const row1Y = y + 23;
        const row2Y = y + 35;
        const col2X = margin + contentW / 2;

        labelValue('Cliente', inv.client || '', margin + 3, 1);
        labelValue('Descrizione', inv.title, col2X, 2);
        y = row1Y;

        y = row2Y;
        labelValue('Indirizzo', inv.clientAddress || '', margin + 3, 1);
        labelValue('P.IVA / CF Cliente', [inv.clientPiva, inv.clientCf].filter(Boolean).join(' · ') || '', col2X, 2);

        // Amount
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(79, 70, 229);
        doc.text(formatAmount(inv.amount), margin + contentW - 3, y + 10, { align: 'right' });

        y += blockH - 10 + 6;
      }
      y += 4;
    }

    // ── Spese ────────────────────────────────────────────────────
    if (expenses.length > 0) {
      checkPage(20);
      sectionTitle(`Spese (${expenses.length})`);

      const expRows = expenses.map(d => [
        new Date(d.date).toLocaleDateString('it-IT'),
        d.category || '—',
        d.title,
        formatAmount(d.amount),
      ]);

      autoTable(doc, {
        startY: y,
        head: [['Data', 'Categoria', 'Descrizione', 'Importo']],
        body: expRows,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [255, 250, 250] },
        columnStyles: {
          0: { cellWidth: 25 },
          3: { cellWidth: 28, halign: 'right' },
        },
        margin: { left: margin, right: margin },
      });

      y = (doc.lastAutoTable?.finalY ?? y) + 6;
    }

    // ── Riepilogo finale ─────────────────────────────────────────
    checkPage(30);
    doc.setFillColor(245, 245, 255);
    doc.setDrawColor(200, 200, 230);
    doc.roundedRect(margin, y, contentW, docFilter === 'all' ? 26 : 14, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    let ry = y + 8;
    if (docFilter !== 'expense') {
      doc.setTextColor(5, 150, 105);
      doc.text('Totale Entrate', margin + 4, ry);
      doc.text(formatAmount(totals.income), margin + contentW - 4, ry, { align: 'right' });
      ry += 7;
    }
    if (docFilter !== 'invoice') {
      doc.setTextColor(220, 38, 38);
      doc.text('Totale Uscite', margin + 4, ry);
      doc.text(formatAmount(totals.expenses), margin + contentW - 4, ry, { align: 'right' });
      ry += 7;
    }
    if (docFilter === 'all') {
      const net = totals.income - totals.expenses;
      doc.setTextColor(net >= 0 ? 5 : 220, net >= 0 ? 150 : 38, net >= 0 ? 105 : 38);
      doc.text('Bilancio Netto', margin + 4, ry);
      doc.text(formatAmount(net), margin + contentW - 4, ry, { align: 'right' });
    }

    const blob = doc.output('blob');
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
