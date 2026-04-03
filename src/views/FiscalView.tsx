import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Info, Download, Loader2 } from 'lucide-react';
import { Profile, Document } from '../types';
import { todayLocalISO } from '../utils/date';
import { IT_ADDIZIONALI_REGIONALI } from '../lib/it/addizionali';
import { RETA_BRACKETS } from '../lib/countries/es';
import AtecoSelector from '../components/AtecoSelector';

interface FiscalViewProps {
  profile: Profile;
  onUpdateProfile?: (p: Profile) => void;
  darkMode?: boolean;
  documents?: Document[];
}

const FiscalView = ({ profile, onUpdateProfile, darkMode, documents = [] }: FiscalViewProps) => {
  const [redditoN1Input, setRedditoN1Input] = useState(
    profile.redditoN1 != null ? String(profile.redditoN1) : ''
  );
  const [redditoN1Saved, setRedditoN1Saved] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isExportingZipES, setIsExportingZipES] = useState(false);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } };
  const item = { hidden: { opacity: 0 }, show: { opacity: 1 } };

  // Solo fatture IT pagate (no proforma, no note di credito, no spese)
  const paidInvoices = useMemo(
    () => documents.filter(d => d.type === 'invoice' && d.status === 'paid'),
    [documents]
  );

  // ES-30 — Alert cambio fascia RETA
  const retaAlert = useMemo(() => {
    if (profile.country !== 'Spain') return null;
    const currentYear = new Date().getFullYear();
    // Non mostrare se Tarifa Plana (primo anno)
    console.log('[RETA] anno:', profile.annoInizioAttivita, typeof profile.annoInizioAttivita, 'guard39:', profile.annoInizioAttivita != null && profile.annoInizioAttivita >= currentYear);
    if (profile.annoInizioAttivita != null && profile.annoInizioAttivita >= currentYear) return null;
    const yearDocs = documents.filter(d => {
      const y = new Date(d.date.split('T')[0]).getFullYear();
      return y === currentYear;
    });
    const annualIncome = yearDocs.filter(d => d.type === 'invoice').reduce((s, d) => s + d.amount, 0);
    const annualExpenses = yearDocs.filter(d => d.type === 'expense').reduce((s, d) => s + d.amount, 0);
    const monthlyNet = (annualIncome - annualExpenses) / 12;
    console.log('[RETA] yearDocs:', yearDocs.length, 'annualIncome:', annualIncome, 'annualExpenses:', annualExpenses, 'monthlyNet:', monthlyNet);
    if (monthlyNet <= 0) return null;
    const currentBracketIdx = RETA_BRACKETS.findIndex(b => monthlyNet <= b.maxIncome);
    if (currentBracketIdx === -1 || currentBracketIdx === RETA_BRACKETS.length - 1) return null;
    const currentBracket = RETA_BRACKETS[currentBracketIdx];
    const nextBracket = RETA_BRACKETS[currentBracketIdx + 1];
    // Soglia = tetto del tramo corrente × 0.85 (entro 15% dal cambio fascia)
    const threshold15pct = currentBracket.maxIncome * 0.85;
    console.log('[RETA] currentBracket:', currentBracket, 'nextBracket:', nextBracket, 'threshold15pct:', threshold15pct, 'pass:', monthlyNet >= threshold15pct);
    if (monthlyNet < threshold15pct) return null;
    return {
      currentQuote: currentBracket.monthlyQuote,
      nextQuote: nextBracket.monthlyQuote,
      nextThreshold: currentBracket.maxIncome, // soglia da superare per entrare nel prossimo tramo
    };
  }, [profile, documents]);

  const handleExportBackup = async () => {
    if (!profile || paidInvoices.length === 0) return;
    setIsExportingZip(true);
    try {
      const [{ default: JSZip }, { buildInvoicePDFBlob }, jspdfMod] = await Promise.all([
        import('jszip'),
        import('../lib/generateInvoicePDF'),
        import('jspdf'),
      ]);

      const zip = new JSZip();

      // Raggruppa per anno
      const byYear: Record<number, Document[]> = {};
      for (const inv of paidInvoices) {
        const year = new Date(inv.date.split('T')[0]).getFullYear();
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(inv);
      }

      // Per ogni anno: PDF fatture + riepilogo
      for (const [yearStr, invoices] of Object.entries(byYear)) {
        const year = Number(yearStr);
        const folder = zip.folder(String(year))!;

        // PDF di ogni fattura
        for (const inv of invoices) {
          const { blob, fileName } = await buildInvoicePDFBlob(inv, profile);
          // Nome file: fattura_001_NomeCliente.pdf
          const num = (inv.invoiceNumber || inv.id.slice(0, 8)).replace(/[/\\]/g, '_');
          const client = (inv.client || 'cliente').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
          folder.file(`fattura_${num}_${client}.pdf`, blob);
        }

        // Riepilogo anno
        const jsPDF = jspdfMod.jsPDF;
        const pdoc = new jsPDF();
        pdoc.setFont('helvetica', 'bold');
        pdoc.setFontSize(16);
        pdoc.text(`Riepilogo Fatture ${year}`, 20, 20);
        pdoc.setFont('helvetica', 'normal');
        pdoc.setFontSize(9);
        let y = 35;
        pdoc.setTextColor(150, 150, 150);
        pdoc.text('N° Fattura', 20, y); pdoc.text('Data', 65, y); pdoc.text('Cliente', 95, y); pdoc.text('Importo', 168, y);
        pdoc.setTextColor(0, 0, 0);
        y += 4;
        pdoc.setDrawColor(220, 220, 220);
        pdoc.line(20, y, 190, y);
        y += 7;
        let total = 0;
        const sorted = [...invoices].sort((a, b) => a.date.localeCompare(b.date));
        for (const inv of sorted) {
          pdoc.text(inv.invoiceNumber || '-', 20, y);
          pdoc.text(inv.date.split('T')[0], 65, y);
          pdoc.text((inv.client || '-').slice(0, 28), 95, y);
          pdoc.text(`\u20AC${inv.amount.toFixed(2)}`, 168, y);
          total += inv.amount;
          y += 7;
          if (y > 270) { pdoc.addPage(); y = 20; }
        }
        y += 2;
        pdoc.line(20, y, 190, y);
        y += 8;
        pdoc.setFont('helvetica', 'bold');
        pdoc.text('Totale', 95, y);
        pdoc.text(`\u20AC${total.toFixed(2)}`, 168, y);
        folder.file(`riepilogo_${year}.pdf`, pdoc.output('blob'));
      }

      // README.txt
      const years = Object.keys(byYear).sort().join(', ');
      const readme = [
        'ARCHIVIO SOLVY — BACKUP FATTURE',
        '================================',
        '',
        `Profilo: ${profile.name}`,
        `P.IVA: ${profile.piva || 'N/D'}`,
        `Data esportazione: ${new Date().toLocaleDateString('it-IT')}`,
        `Anni inclusi: ${years}`,
        `Fatture totali: ${paidInvoices.length}`,
        '',
        'STRUTTURA ARCHIVIO',
        '------------------',
        'archivio_solvy_backup/',
        '  ANNO/',
        '    fattura_NNN_Cliente.pdf  — PDF della singola fattura',
        '    riepilogo_ANNO.pdf       — Riepilogo completo con totali',
        '  README.txt                 — Questo file',
        '',
        'NOTE',
        '----',
        'Incluse solo fatture con status "Saldato".',
        'Proforma, note di credito e spese non sono incluse.',
        'Le FatturaPA XML sono conservate automaticamente',
        "dall'Agenzia delle Entrate per 10 anni.",
      ].join('\n');
      zip.file('README.txt', readme);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archivio_solvy_backup_${todayLocalISO()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleExportBackupES = async () => {
    if (!profile || paidInvoices.length === 0) return;
    setIsExportingZipES(true);
    try {
      const [{ default: JSZip }, { buildInvoicePDFBlob }, jspdfMod] = await Promise.all([
        import('jszip'),
        import('../lib/generateInvoicePDF'),
        import('jspdf'),
      ]);

      const zip = new JSZip();

      // Group by year
      const byYear: Record<number, Document[]> = {};
      for (const inv of paidInvoices) {
        const year = new Date(inv.date.split('T')[0]).getFullYear();
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(inv);
      }

      for (const [yearStr, invoices] of Object.entries(byYear)) {
        const year = Number(yearStr);
        const folder = zip.folder(String(year))!;

        // PDF de cada factura
        for (const inv of invoices) {
          const { blob } = await buildInvoicePDFBlob(inv, profile);
          const num = (inv.invoiceNumber || inv.id.slice(0, 8)).replace(/[/\\]/g, '_');
          const client = (inv.client || 'cliente').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
          folder.file(`factura_${num}_${client}.pdf`, blob);
        }

        // Resumen anual
        const jsPDF = jspdfMod.jsPDF;
        const pdoc = new jsPDF();
        pdoc.setFont('helvetica', 'bold');
        pdoc.setFontSize(16);
        pdoc.text(`Resumen Facturas ${year}`, 20, 20);
        pdoc.setFont('helvetica', 'normal');
        pdoc.setFontSize(9);
        let y = 35;
        pdoc.setTextColor(150, 150, 150);
        pdoc.text('Nº Factura', 20, y); pdoc.text('Fecha', 65, y); pdoc.text('Cliente', 95, y); pdoc.text('Importe', 168, y);
        pdoc.setTextColor(0, 0, 0);
        y += 4;
        pdoc.setDrawColor(220, 220, 220);
        pdoc.line(20, y, 190, y);
        y += 7;
        let total = 0;
        const sorted = [...invoices].sort((a, b) => a.date.localeCompare(b.date));
        for (const inv of sorted) {
          pdoc.text(inv.invoiceNumber || '-', 20, y);
          pdoc.text(inv.date.split('T')[0], 65, y);
          pdoc.text((inv.client || '-').slice(0, 28), 95, y);
          pdoc.text(`\u20AC${inv.amount.toFixed(2)}`, 168, y);
          total += inv.amount;
          y += 7;
          if (y > 270) { pdoc.addPage(); y = 20; }
        }
        y += 2;
        pdoc.line(20, y, 190, y);
        y += 8;
        pdoc.setFont('helvetica', 'bold');
        pdoc.text('Total', 95, y);
        pdoc.text(`\u20AC${total.toFixed(2)}`, 168, y);
        folder.file(`resumen_facturas_${year}.pdf`, pdoc.output('blob'));
      }

      // README.txt
      const sortedYears = Object.keys(byYear).sort();
      const nif = profile.nie || profile.piva || 'N/D';
      const yearFolderLines = sortedYears.flatMap(yr => [
        `  ${yr}/`,
        `    factura_NNN_Cliente.pdf`,
        `    resumen_facturas_${yr}.pdf`,
      ]);
      const readme = [
        'ARCHIVO SOLVY — BACKUP FACTURAS',
        '=================================',
        '',
        `Autónomo: ${profile.name}`,
        `NIF/NIE: ${nif}`,
        `Fecha exportación: ${new Date().toLocaleDateString('es-ES')}`,
        `Años incluidos: ${sortedYears.join(', ')}`,
        `Facturas totales: ${paidInvoices.length}`,
        '',
        'ESTRUCTURA DEL ARCHIVO',
        '----------------------',
        'archivo_solvy_backup/',
        ...yearFolderLines,
        '  README.txt',
        '',
        'NOTAS',
        '-----',
        'Solo se incluyen facturas con estado "Pagada".',
        'Los gastos y facturas rectificativas no están incluidos.',
        'La AEAT requiere conservar las facturas durante 4 años.',
      ].join('\n');
      zip.file('README.txt', readme);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archivo_solvy_backup_${todayLocalISO()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingZipES(false);
    }
  };

  if (profile.country !== 'Italy') {
    if (profile.country === 'Spain') {
      return (
        <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-4 pb-40">

          {/* Cotización RETA — rendimiento año anterior */}
          <motion.div variants={item} className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cotización RETA</p>
            <div className="p-4 rounded-3xl border space-y-3 transition-colors" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div>
                <p className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Rendimiento neto año anterior</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Para calcular la cuota mensual RETA</p>
              </div>
              <div className="flex gap-2">
                <div className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-sm font-bold text-slate-400">€</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={redditoN1Input}
                    onChange={e => { setRedditoN1Input(e.target.value); setRedditoN1Saved(false); }}
                    placeholder="ej. 25000"
                    className={`flex-1 text-sm font-bold bg-transparent focus:outline-none ${darkMode ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`}
                  />
                </div>
                <button
                  onClick={() => {
                    const val = redditoN1Input.trim() ? Number(redditoN1Input) : undefined;
                    onUpdateProfile?.({ ...profile, redditoN1: val });
                    setRedditoN1Saved(true);
                    setTimeout(() => setRedditoN1Saved(false), 2000);
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${redditoN1Saved ? 'bg-emerald-500 text-white' : 'bg-primary text-white'}`}
                >
                  {redditoN1Saved ? '✓' : 'Guardar'}
                </button>
              </div>
              {profile.annoInizioAttivita === new Date().getFullYear() && !redditoN1Input.trim() && (
                <p className="text-[10px] text-blue-500 font-bold">
                  Primer año de actividad — puede aplicar tarifa plana RETA.
                </p>
              )}
            </div>
          </motion.div>

          {retaAlert && (
            <motion.div variants={item}>
              <div className={`p-4 rounded-3xl border flex gap-3 ${darkMode ? 'bg-amber-950/30 border-amber-800/50' : 'bg-amber-50 border-amber-200'}`}>
                <span className="text-lg shrink-0">⚠️</span>
                <div className="space-y-1">
                  <p className={`text-xs font-bold ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                    Tu rendimiento estimado se acerca al siguiente tramo RETA
                  </p>
                  <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                    Actual: €{retaAlert.currentQuote}/mes · Próximo tramo: €{retaAlert.nextQuote}/mes a partir de €{retaAlert.nextThreshold.toLocaleString('es-ES')}/mes netos.
                  </p>
                  <p className={`text-[10px] ${darkMode ? 'text-amber-500' : 'text-amber-600'}`}>
                    Consulta con la Seguridad Social.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <motion.div variants={item} className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Backup Documentos</p>
            <div className="p-5 rounded-3xl border space-y-4 transition-colors" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  📦
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Archivo Solvy</p>
                  <p className="text-xs text-slate-400 mt-0.5">Backup de tus facturas · Organizadas por año</p>
                  <p className={`text-xs font-bold mt-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {paidInvoices.length} factura{paidInvoices.length === 1 ? '' : 's'} totales
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                La AEAT requiere conservar las facturas durante 4 años. Solo se incluyen facturas pagadas — gastos y rectificativas no están incluidos.
              </p>
              <button
                type="button"
                onClick={handleExportBackupES}
                disabled={isExportingZipES || paidInvoices.length === 0}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#7c3aed' }}
              >
                {isExportingZipES
                  ? <><Loader2 size={16} className="animate-spin" /> Generando…</>
                  : <><Download size={16} /> Exportar backup PDF</>}
              </button>
              {paidInvoices.length === 0 && (
                <p className="text-[10px] text-slate-400 text-center">No hay facturas pagadas para exportar</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      );
    }
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="p-6 pb-40">
        <motion.div variants={item} className="p-6 rounded-3xl border text-center space-y-2 transition-colors" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <p className={`text-sm font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Sezione disponibile per profili italiani</p>
          <p className="text-xs text-slate-400">Le impostazioni fiscali italiane (ATECO, regione, acconti) sono disponibili solo per profili con paese impostato su Italia.</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-4 pb-40">

      {/* Regione fiscale */}
      <motion.div variants={item} className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Regione fiscale</p>
        <div className="p-4 rounded-3xl border space-y-2 transition-colors" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <p className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Regione fiscale</p>
          {profile.region ? (
            <>
              <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{profile.region}</span>
                {IT_ADDIZIONALI_REGIONALI[profile.region] && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${profile.regime === 'ordinario' ? 'bg-primary/10 text-primary' : (darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500')}`}>
                    {(IT_ADDIZIONALI_REGIONALI[profile.region] * 100).toFixed(2)}%
                  </span>
                )}
              </div>
              {profile.regime === 'forfettario' ? (
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Nel regime forfettario le addizionali non si applicano — salvata per eventuale passaggio all&apos;ordinario.
                </p>
              ) : (
                <p className="text-[10px] text-emerald-600 font-bold">
                  Addizionale regionale applicata al calcolo IRPEF
                </p>
              )}
            </>
          ) : (
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Imposta la provincia nel tuo <span className="font-bold text-primary">Profilo → Modifica</span> per calcolare le addizionali regionali reali.
            </p>
          )}
        </div>
      </motion.div>

      {/* Reddito anno precedente */}
      <motion.div variants={item} className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Acconti</p>
        <div className="p-4 rounded-3xl border space-y-3 transition-colors" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <div>
            <p className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Reddito anno precedente</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Per calcolo acconti più preciso</p>
          </div>
          <div className="flex gap-2">
            <div className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-sm font-bold text-slate-400">€</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={redditoN1Input}
                onChange={e => { setRedditoN1Input(e.target.value); setRedditoN1Saved(false); }}
                placeholder="es. 28000"
                className={`flex-1 text-sm font-bold bg-transparent focus:outline-none ${darkMode ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`}
              />
            </div>
            <button
              onClick={() => {
                const val = redditoN1Input.trim() ? Number(redditoN1Input) : undefined;
                onUpdateProfile?.({ ...profile, redditoN1: val });
                setRedditoN1Saved(true);
                setTimeout(() => setRedditoN1Saved(false), 2000);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${redditoN1Saved ? 'bg-emerald-500 text-white' : 'bg-primary text-white'}`}
            >
              {redditoN1Saved ? '✓' : 'Salva'}
            </button>
          </div>
          {profile.annoInizioAttivita === new Date().getFullYear() && !redditoN1Input.trim() && (
            <p className="text-[10px] text-blue-500 font-bold">
              Primo anno — nessun acconto dovuto nel calendario
            </p>
          )}
        </div>
      </motion.div>

      {/* Categoria ATECO — solo forfettario */}
      {profile.regime === 'forfettario' && (
        <motion.div variants={item} className="space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoria ATECO</p>
          <div className="p-4 rounded-3xl border space-y-3 transition-colors" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div>
              <p className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Categoria Attività (Codice ATECO)</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Determina il coefficiente di redditività</p>
            </div>
            <AtecoSelector
              value={profile.coefficiente}
              onChange={coeff => onUpdateProfile?.({ ...profile, coefficiente: coeff })}
              darkMode={darkMode}
            />
          </div>
        </motion.div>
      )}

      {/* Banner INPS artigiani/commercianti */}
      {(profile.coefficiente === 67 || profile.coefficiente === 40) && (
        <motion.div variants={item}>
          <div className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border ${darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
            <Info size={16} className="mt-0.5 shrink-0" />
            <p className="text-xs font-bold leading-relaxed">
              La tua categoria potrebbe richiedere INPS {profile.coefficiente === 67 ? 'artigiani' : 'commercianti'} invece della gestione separata. Verifica con il tuo commercialista.
            </p>
          </div>
        </motion.div>
      )}

      {/* Backup Documenti */}
      <motion.div variants={item} className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Backup Documenti</p>
        <div className="p-5 rounded-3xl border space-y-4 transition-colors" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          {/* Header card */}
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              📦
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Archivio Solvy</p>
              <p className="text-xs text-slate-400 mt-0.5">Backup delle tue fatture · Dal 2026 ad oggi</p>
              <p className={`text-xs font-bold mt-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {paidInvoices.length} fattur{paidInvoices.length === 1 ? 'a' : 'e'} totali
              </p>
            </div>
          </div>

          {/* Nota informativa */}
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Le FatturaPA XML sono già conservate automaticamente dall&apos;Agenzia delle Entrate per 10 anni.
          </p>

          {/* Bottone export */}
          <button
            type="button"
            onClick={handleExportBackup}
            disabled={isExportingZip || paidInvoices.length === 0}
            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#7c3aed' }}
          >
            {isExportingZip
              ? <><Loader2 size={16} className="animate-spin" /> Generazione in corso…</>
              : <><Download size={16} /> Esporta backup PDF</>}
          </button>

          {paidInvoices.length === 0 && (
            <p className="text-[10px] text-slate-400 text-center">Nessuna fattura saldato da esportare</p>
          )}
        </div>
      </motion.div>

    </motion.div>
  );
};

export default FiscalView;
