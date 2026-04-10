import { useState, useMemo } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Plus, FileText, CheckCircle2, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Document, Profile } from '../../types';
import { todayLocalISO, getLocalYear } from '../../utils/date';
import InfoTooltip from '../ui/InfoTooltip';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: Document) => void;
  onUpdateProfile: (p: Profile) => void;
  profile: Profile;
  documents: Document[];
  darkMode?: boolean;
  isProforma?: boolean;
}

const MARCA_BOLLO_THRESHOLD = 77.47;
const MARCA_BOLLO_AMOUNT = 2;
const RITENUTA_RATE = 0.20;
const INPS_RATE = 0.04;

const FORFETTARIO_NOTE =
  "Operazione effettuata ai sensi dell'art. 1 c. 58 L. 190/2014 – non soggetta a IVA. " +
  "Non soggetta a ritenuta d'acconto ai sensi dell'art. 1, co. 67, L. 190/2014.";

const IVA_OPTIONS = [4, 5, 10, 22];

const CreateInvoiceModal = ({ isOpen, onClose, onSave, onUpdateProfile, profile, documents, darkMode, isProforma = false }: CreateInvoiceModalProps) => {
  const { t } = useTranslation();
  const regime = profile.regime ?? 'forfettario';

  const nextInvoiceNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const yearStr = String(year);
    if (isProforma) {
      const count = documents.filter(d => d.type === 'proforma' && new Date(d.date).getFullYear() === year).length + 1;
      return `PRO${String(count).padStart(3, '0')}/${year}`;
    }
    const existingCount = documents.filter(d => d.type === 'invoice' && new Date(d.date).getFullYear() === year).length;
    const counter = profile.invoiceCounters?.[yearStr] ?? existingCount;
    return `${String(counter + 1).padStart(3, '0')}/${year}`;
  }, [documents, isProforma, profile.invoiceCounters]);

  // ─── Ricerca intelligente clienti esistenti ────────────────────────────────
  // Mappa client → ultimo documento (ordinata per data desc) per auto-fill
  const clientHistory = useMemo(() => {
    const seen = new Map<string, Document>();
    [...documents]
      .filter(d => d.client && (d.type === 'invoice' || d.type === 'proforma'))
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach(d => { if (d.client && !seen.has(d.client)) seen.set(d.client, d); });
    return Array.from(seen.values());
  }, [documents]);

  const [form, setForm] = useState({
    invoiceNumber: '',
    date: todayLocalISO(),
    status: 'pending' as 'paid' | 'pending',
    client: '',
    clientAddress: '',
    clientPiva: '',
    clientCf: '',
    clientSdi: '',
    clientPec: '',
    title: '',
    amount: '',
    ritenuta: false,
    rivalsaInps: false,
    ivaRate: 22,
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) => setForm(f => ({ ...f, [key]: value }));
  const touch = (key: string) => setTouched(t => ({ ...t, [key]: true }));

  const reset = () => {
    setForm({
      invoiceNumber: '',
      date: todayLocalISO(),
      status: 'pending',
      client: '',
      clientAddress: '',
      clientPiva: '',
      clientCf: '',
      clientSdi: '',
      clientPec: '',
      title: '',
      amount: '',
      ritenuta: false,
      rivalsaInps: false,
      ivaRate: 22,
    });
    setTouched({});
    setShowSuggestions(false);
  };

  const clientSuggestions = useMemo(() => {
    if (!form.client.trim() || !showSuggestions) return [];
    const q = form.client.toLowerCase();
    return clientHistory.filter(d => d.client?.toLowerCase().includes(q) ?? false).slice(0, 5);
  }, [form.client, clientHistory, showSuggestions]);

  const applyClient = (d: Document) => {
    setForm(f => ({
      ...f,
      client: d.client || f.client,
      clientAddress: d.clientAddress || f.clientAddress,
      clientPiva: d.clientPiva || f.clientPiva,
      clientCf: d.clientCf || f.clientCf,
      clientSdi: d.clientSdi || f.clientSdi,
      clientPec: d.clientPec || f.clientPec,
    }));
    setShowSuggestions(false);
  };

  const amount = parseFloat(form.amount.replace(',', '.')) || 0;

  // Calcoli fiscali (mostrati anche per proforma)
  const rivalsaAmount = regime === 'ordinario' && form.rivalsaInps ? amount * INPS_RATE : 0;
  const totaleImponibile = amount + rivalsaAmount;
  const ivaAmount = regime === 'ordinario' ? totaleImponibile * (form.ivaRate / 100) : 0;
  const ritenutaAmount = form.ritenuta ? amount * RITENUTA_RATE : 0;
  const marcaBollo = regime === 'forfettario' && amount > MARCA_BOLLO_THRESHOLD;
  const totaleFattura = totaleImponibile + ivaAmount + (marcaBollo ? MARCA_BOLLO_AMOUNT : 0);
  const totaleDaRicevere = totaleFattura - ritenutaAmount;

  const sdiValue = form.clientSdi.trim().toUpperCase();
  const errors = {
    client: touched.client && !form.client.trim() ? 'Campo obbligatorio' : '',
    title: touched.title && !form.title.trim() ? 'Campo obbligatorio' : '',
    amount: touched.amount && (amount <= 0 || isNaN(amount)) ? 'Inserisci un importo valido' : '',
    clientSdi: touched.clientSdi && sdiValue.length > 0 && !/^[A-Z0-9]{7}$/.test(sdiValue) ? '7 caratteri alfanumerici' : '',
  };

  const hasErrors = Object.values(errors).some(Boolean);
  const isItaly = profile.country === 'Italy';

  const buildDoc = (overrideType?: 'invoice'): Document => ({
    id: Math.random().toString(36).substr(2, 9),
    type: overrideType ?? (isProforma ? 'proforma' : 'invoice'),
    status: (overrideType === 'invoice' || !isProforma) ? form.status : 'pending',
    invoiceNumber: form.invoiceNumber || nextInvoiceNumber,
    date: form.date,
    client: form.client,
    clientAddress: form.clientAddress,
    clientPiva: form.clientPiva,
    clientCf: form.clientCf,
    clientSdi: form.clientPiva !== 'Privato' && isItaly ? (sdiValue || '0000000') : undefined,
    clientPec: form.clientPiva !== 'Privato' && isItaly && form.clientPec.trim() ? form.clientPec.trim() : undefined,
    title: form.title,
    amount,
    ritenuta: form.ritenuta,
    marcaBollo,
    ivaRate: regime === 'ordinario' ? form.ivaRate : 0,
    rivalsaInps: regime === 'ordinario' && form.rivalsaInps,
    docRegime: (regime === 'ordinario' ? 'ordinario' : 'forfettario') as 'forfettario' | 'ordinario',
  });

  const incrementCounter = () => {
    const year = new Date().getFullYear();
    const yearStr = String(year);
    // Use Math.max to prevent duplicates on rapid creation: if the stored counter is behind
    // the actual document count (race condition), the document count wins as the floor.
    const existingCount = documents.filter(d => d.type === 'invoice' && getLocalYear(d.date) === year).length;
    const current = Math.max(profile.invoiceCounters?.[yearStr] ?? 0, existingCount);
    onUpdateProfile({ ...profile, invoiceCounters: { ...(profile.invoiceCounters ?? {}), [yearStr]: current + 1 } });
  };

  const validate = () => {
    setTouched({ client: true, title: true, amount: true, clientSdi: true });
    if (!form.client.trim() || !form.title.trim() || amount <= 0) return false;
    if (sdiValue.length > 0 && !/^[A-Z0-9]{7}$/.test(sdiValue)) return false;
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (!isProforma) incrementCounter();
    onSave(buildDoc());
    reset();
    onClose();
  };

  // Converti in fattura definitiva: salva direttamente come fattura (non come proforma)
  const handleConvertToInvoice = () => {
    if (!validate()) return;
    incrementCounter();
    onSave(buildDoc('invoice'));
    reset();
    onClose();
  };

  const dragControls = useDragControls();

  const ic = (err?: string) => `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
    err
      ? 'border-red-400 bg-red-50 text-red-900 focus:ring-red-200 placeholder:text-red-300'
      : darkMode
        ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:ring-primary/20'
        : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400 focus:ring-primary/20'
  }`;
  const lc = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1';
  const errMsg = (msg: string) => msg ? <p className="text-[10px] text-red-500 font-semibold ml-1 mt-0.5">{msg}</p> : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            drag="y" dragControls={dragControls} dragListener={false}
            dragConstraints={{ top: 0 }} dragElastic={0.1}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose(); }}
            className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl"
            style={{ backgroundColor: 'var(--color-card)' }}>
            <div onPointerDown={e => dragControls.start(e)} className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none">
              <div className={`w-10 h-1 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            </div>
            <div className="overflow-y-auto max-h-[92vh] p-8 space-y-6 [padding-bottom:max(2rem,calc(env(safe-area-inset-bottom)+1rem))]">

              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{isProforma ? t('documents.new_proforma') : t('documents.new_invoice')}</h2>
                  <p className="text-sm text-slate-500">{form.invoiceNumber || nextInvoiceNumber}</p>
                </div>
                <button onClick={onClose} aria-label="Chiudi" className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              {/* Dati Fattura */}
              <div className="space-y-3">
                <label className={lc}>{isProforma ? t('documents.field_proforma_data') : t('documents.field_invoice_data')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={lc}>{isProforma ? t('documents.field_proforma_number_short') : t('documents.field_invoice_number_short')}</label>
                    <input type="text" value={form.invoiceNumber || nextInvoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} className={ic()} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={lc}>Data</label>
                    <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={ic()} />
                  </div>
                </div>
              </div>

              {/* Dati Cliente — con ricerca intelligente */}
              <div className="space-y-3">
                <label className={lc}>{t('documents.field_client_data')}</label>

                {/* Toggle Azienda / Privato */}
                <div className={`p-1 rounded-2xl flex gap-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {(['Azienda', 'Privato'] as const).map(t => (
                    <button key={t} type="button"
                      onClick={() => set('clientPiva', t === 'Privato' ? 'Privato' : '')}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${(t === 'Privato' ? form.clientPiva === 'Privato' : form.clientPiva !== 'Privato') ? 'bg-primary text-white shadow-lg shadow-primary/30' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                      {t}
                    </button>
                  ))}
                </div>

                {/* Campo cliente con autocomplete intelligente */}
                <div className="space-y-1.5 relative">
                  <label className={lc}>Ragione Sociale / Nome</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.client}
                      onChange={e => { set('client', e.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => { touch('client'); setTimeout(() => setShowSuggestions(false), 150); }}
                      placeholder={form.clientPiva === 'Privato' ? 'Es. Mario Rossi' : 'Es. Acme Srl'}
                      className={ic(errors.client)}
                      autoComplete="off"
                    />
                    {clientHistory.length > 0 && (
                      <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    )}
                  </div>
                  {errMsg(errors.client)}

                  {/* Dropdown suggerimenti */}
                  {showSuggestions && clientSuggestions.length > 0 && (
                    <div className={`absolute z-20 w-full mt-1 rounded-2xl border shadow-xl overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                      {clientSuggestions.map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onMouseDown={() => applyClient(d)}
                          className={`w-full px-4 py-3 text-left flex items-start gap-3 transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${darkMode ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                            <FileText size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{d.client}</p>
                            {d.clientAddress && <p className="text-[11px] text-slate-400 truncate">{d.clientAddress}</p>}
                            {d.clientPiva && d.clientPiva !== 'Privato' && <p className="text-[11px] text-slate-400">P.IVA {d.clientPiva}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className={lc}>Indirizzo</label>
                  <input type="text" value={form.clientAddress} onChange={e => set('clientAddress', e.target.value)} placeholder="Via Roma 1, 20100 Milano" className={ic()} />
                </div>
                <div className={`grid gap-3 ${form.clientPiva === 'Privato' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {form.clientPiva !== 'Privato' && (
                    <div className="space-y-1.5">
                      <label className={lc}>P.IVA Cliente</label>
                      <input type="text" value={form.clientPiva} onChange={e => set('clientPiva', e.target.value)} placeholder="IT12345678901" className={ic()} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className={lc}>C.F. Cliente</label>
                    <input type="text" value={form.clientCf} onChange={e => set('clientCf', e.target.value.toUpperCase())} placeholder={form.clientPiva !== 'Privato' ? 'Opzionale per aziende' : 'RSSMRA80...'} className={ic()} />
                  </div>
                </div>

                {/* SDI / PEC — solo IT + Azienda (anche su proforma) */}
                {isItaly && form.clientPiva !== 'Privato' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className={lc}>Codice SDI</label>
                      <input
                        type="text"
                        value={form.clientSdi}
                        onChange={e => set('clientSdi', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}
                        onBlur={() => touch('clientSdi')}
                        placeholder="0000000"
                        maxLength={7}
                        className={ic(errors.clientSdi)}
                      />
                      {errors.clientSdi ? errMsg(errors.clientSdi) : <p className="text-[10px] text-slate-400 ml-1">7 caratteri — default 0000000</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className={lc}>PEC destinatario</label>
                      <input
                        type="email"
                        value={form.clientPec}
                        onChange={e => set('clientPec', e.target.value)}
                        placeholder="fatture@pec.it"
                        className={ic()}
                      />
                      <p className="text-[10px] text-slate-400 ml-1">Alternativa al SDI</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Servizio */}
              <div className="space-y-3">
                <label className={lc}>Servizio</label>
                <div className="space-y-1.5">
                  <label className={lc}>Descrizione</label>
                  <input type="text" value={form.title} onChange={e => set('title', e.target.value)} onBlur={() => touch('title')} placeholder="Es. Consulenza web — Maggio 2026" className={ic(errors.title)} />
                  {errMsg(errors.title)}
                </div>
                <div className="space-y-1.5">
                  <label className={lc}>Importo €</label>
                  <input type="text" inputMode="decimal" value={form.amount} onChange={e => set('amount', e.target.value)} onBlur={() => touch('amount')} placeholder="0.00" className={ic(errors.amount)} />
                  {errMsg(errors.amount)}
                </div>
              </div>

              {/* Opzioni Fiscali — visibili anche su proforma */}
              <div className="space-y-3">
                <label className={lc}>Opzioni Fiscali</label>

                {/* IVA — solo ordinario */}
                {regime === 'ordinario' && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Aliquota IVA</p>
                    <div className="flex gap-2 flex-wrap">
                      {IVA_OPTIONS.map(rate => (
                        <button key={rate} type="button" onClick={() => set('ivaRate', rate)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${form.ivaRate === rate ? 'bg-primary text-white shadow-md shadow-primary/30' : (darkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 border border-slate-200')}`}>
                          {rate}%
                        </button>
                      ))}
                    </div>
                    {amount > 0 && (
                      <p className="text-xs text-slate-400">IVA {form.ivaRate}% = <span className="font-bold text-primary">€{(totaleImponibile * form.ivaRate / 100).toFixed(2)}</span></p>
                    )}
                  </div>
                )}

                {/* Rivalsa INPS — solo ordinario */}
                {regime === 'ordinario' && (
                  <div className={`flex items-center gap-3 p-4 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex-1">
                      <p className={`text-sm font-bold flex items-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Rivalsa INPS 4%
                        <InfoTooltip text="Quota dei contributi INPS che puoi addebitare al cliente in fattura. Riduce il tuo costo INPS effettivo." darkMode={darkMode} />
                      </p>
                      {amount > 0 && form.rivalsaInps && (
                        <p className="text-xs text-slate-400 mt-0.5">+€{rivalsaAmount.toFixed(2)} sull'imponibile</p>
                      )}
                    </div>
                    <input type="checkbox" checked={form.rivalsaInps} onChange={e => set('rivalsaInps', e.target.checked)} className="w-5 h-5 rounded-lg text-primary focus:ring-primary" />
                  </div>
                )}

                {/* Ritenuta — forfettario IT: badge informativo; ordinario: checkbox */}
                {regime === 'forfettario' && isItaly ? (
                  <div className={`flex items-start gap-3 p-4 rounded-2xl border ${darkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                    <span className="text-base leading-none mt-0.5">ℹ️</span>
                    <p className={`text-xs leading-relaxed ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      <span className="font-bold">Regime forfettario</span> — non soggetto a ritenuta d&apos;acconto (art. 1, co. 67, L.190/2014)
                    </p>
                  </div>
                ) : (
                  <div className={`flex items-center gap-3 p-4 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex-1">
                      <p className={`text-sm font-bold flex items-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Ritenuta d&apos;acconto 20%
                        <InfoTooltip text="Il cliente trattiene il 20% del compenso e lo versa per te all'Agenzia delle Entrate. I forfettari ne sono esenti per legge." darkMode={darkMode} />
                      </p>
                      {amount > 0 && form.ritenuta && (
                        <p className="text-xs text-slate-400 mt-0.5">−€{ritenutaAmount.toFixed(2)} trattenuti dal cliente</p>
                      )}
                    </div>
                    <input type="checkbox" checked={form.ritenuta} onChange={e => set('ritenuta', e.target.checked)} className="w-5 h-5 rounded-lg text-primary focus:ring-primary" />
                  </div>
                )}

                {/* Marca da bollo — solo forfettario */}
                {regime === 'forfettario' && amount > 0 && (
                  <div className={`flex items-center gap-3 p-4 rounded-2xl border ${marcaBollo ? (darkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-100') : (darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100')}`}>
                    <div className="flex-1">
                      <p className={`text-sm font-bold flex items-center ${marcaBollo ? 'text-amber-500' : 'text-slate-400'}`}>
                        Marca da bollo €2
                        <InfoTooltip text="Imposta di bollo obbligatoria sulle fatture superiori a €77,47 in regime forfettario (esenti IVA)." darkMode={darkMode} />
                      </p>
                      <p className={`text-xs mt-0.5 ${marcaBollo ? 'text-amber-500/70' : 'text-slate-400'}`}>
                        {marcaBollo ? 'Applicata automaticamente (importo > €77,47)' : 'Non applicata (importo ≤ €77,47)'}
                      </p>
                    </div>
                    {marcaBollo && <span className="text-sm font-bold text-amber-500">+€2,00</span>}
                  </div>
                )}

                {/* Nota legale — solo forfettario (anche su proforma) */}
                {regime === 'forfettario' && (
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-primary/5 border-primary/20' : 'bg-primary/5 border-primary/10'}`}>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Nota legale automatica</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">{FORFETTARIO_NOTE}</p>
                  </div>
                )}
              </div>

              {/* Riepilogo importi */}
              {amount > 0 && (
                <div className={`rounded-2xl p-4 space-y-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div className="flex justify-between">
                    <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Imponibile</span>
                    <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{amount.toFixed(2)}</span>
                  </div>
                  {regime === 'ordinario' && form.rivalsaInps && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Rivalsa INPS 4%</span>
                      <span className="text-sm font-bold text-slate-500">+€{rivalsaAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {regime === 'ordinario' && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">IVA {form.ivaRate}%</span>
                      <span className="text-sm font-bold text-slate-500">+€{ivaAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {marcaBollo && (
                    <div className="flex justify-between">
                      <span className="text-sm text-amber-500">Marca da bollo</span>
                      <span className="text-sm font-bold text-amber-500">+€{MARCA_BOLLO_AMOUNT.toFixed(2)}</span>
                    </div>
                  )}
                  {form.ritenuta && (
                    <div className="flex justify-between">
                      <span className="text-sm text-red-400">Ritenuta 20%</span>
                      <span className="text-sm font-bold text-red-400">−€{ritenutaAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className={`flex justify-between pt-2 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Totale da ricevere</span>
                    <span className="text-sm font-bold text-emerald-500">€{totaleDaRicevere.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Stato pagamento — solo fattura definitiva */}
              {!isProforma && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl border ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white"><CheckCircle2 size={20} /></div>
                  <div className="flex-1">
                    <p className={`text-xs font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>Segna come Pagata</p>
                    <p className={`text-[10px] ${darkMode ? 'text-emerald-500/60' : 'text-emerald-600'}`}>Aggiornerà le entrate in Home</p>
                  </div>
                  <input type="checkbox" checked={form.status === 'paid'} onChange={e => set('status', e.target.checked ? 'paid' : 'pending')} className="w-5 h-5 rounded-lg border-emerald-200 text-emerald-500 focus:ring-emerald-500" />
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-[10px] text-slate-400 leading-relaxed">
                I calcoli mostrati sono stime indicative basate sui dati inseriti e sulle aliquote fiscali standard. Non costituiscono consulenza fiscale professionale. Consulta sempre il tuo commercialista.
              </p>

              {/* Azioni */}
              <div className="space-y-3 pb-2">
                <button onClick={handleSubmit} disabled={hasErrors && Object.keys(touched).length > 0}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  <FileText size={18} />
                  {isProforma ? t('documents.create_proforma') : t('documents.create_invoice')}
                </button>

                {/* Converti in fattura definitiva con un click — solo proforma */}
                {isProforma && (
                  <button onClick={handleConvertToInvoice} disabled={hasErrors && Object.keys(touched).length > 0}
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 ${darkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                    <CheckCircle2 size={18} />
                    {t('documents.convert_to_invoice')}
                  </button>
                )}

                <button onClick={onClose} className={`w-full py-4 rounded-2xl font-bold ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>{t('documents.cancel')}</button>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateInvoiceModal;
