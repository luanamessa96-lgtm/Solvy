import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, FileText, CheckCircle2 } from 'lucide-react';
import { Document, Profile } from '../../types';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: Document) => void;
  onUpdateProfile: (p: Profile) => void;
  profile: Profile;
  documents: Document[];
  darkMode?: boolean;
}

const MARCA_BOLLO_THRESHOLD = 77.47;
const MARCA_BOLLO_AMOUNT = 2;
const RITENUTA_RATE = 0.20;
const INPS_RATE = 0.04;

const FORFETTARIO_NOTE =
  "Operazione effettuata ai sensi dell'art. 1 c. 58 L. 190/2014 – non soggetta a IVA. " +
  "Non soggetta a ritenuta d'acconto ai sensi dell'art. 1, co. 67, L. 190/2014.";

const IVA_OPTIONS = [4, 5, 10, 22];

const CreateInvoiceModal = ({ isOpen, onClose, onSave, onUpdateProfile, profile, documents, darkMode }: CreateInvoiceModalProps) => {
  const [regime, setRegime] = useState<'forfettario' | 'ordinario'>(profile.regime ?? 'forfettario');

  useEffect(() => {
    if (isOpen) setRegime(profile.regime ?? 'forfettario');
  }, [isOpen, profile.regime]);

  const nextInvoiceNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const count = documents.filter(d => d.type === 'invoice' && new Date(d.date).getFullYear() === year).length + 1;
    return `${String(count).padStart(3, '0')}/${year}`;
  }, [documents]);

  const [form, setForm] = useState({
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending' as 'paid' | 'pending',
    client: '',
    clientAddress: '',
    clientPiva: '',
    clientCf: '',
    title: '',
    amount: '',
    ritenuta: false,
    rivalsaInps: false,
    ivaRate: 22,
  });

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) => setForm(f => ({ ...f, [key]: value }));

  const reset = () => {
    setForm({
      invoiceNumber: '',
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      client: '',
      clientAddress: '',
      clientPiva: '',
      clientCf: '',
      title: '',
      amount: '',
      ritenuta: false,
      rivalsaInps: false,
      ivaRate: 22,
    });
  };

  const amount = parseFloat(form.amount.replace(',', '.')) || 0;

  // Calcoli fiscali
  const rivalsaAmount = regime === 'ordinario' && form.rivalsaInps ? amount * INPS_RATE : 0;
  const totaleImponibile = amount + rivalsaAmount;
  const ivaAmount = regime === 'ordinario' ? totaleImponibile * (form.ivaRate / 100) : 0;
  const ritenutaAmount = form.ritenuta ? amount * RITENUTA_RATE : 0;
  const marcaBollo = regime === 'forfettario' && amount > MARCA_BOLLO_THRESHOLD;
  const totaleFattura = totaleImponibile + ivaAmount + (marcaBollo ? MARCA_BOLLO_AMOUNT : 0);
  const totaleDaRicevere = totaleFattura - ritenutaAmount;

  const handleRegimeChange = (r: 'forfettario' | 'ordinario') => {
    setRegime(r);
    onUpdateProfile({ ...profile, regime: r });
  };

  const handleSubmit = () => {
    if (!form.client || !form.amount || !form.title) return;
    onSave({
      id: Math.random().toString(36).substr(2, 9),
      type: 'invoice',
      status: form.status,
      invoiceNumber: form.invoiceNumber || nextInvoiceNumber,
      date: form.date,
      client: form.client,
      clientAddress: form.clientAddress,
      clientPiva: form.clientPiva,
      clientCf: form.clientCf,
      title: form.title,
      amount,
      ritenuta: form.ritenuta,
      marcaBollo,
      ivaRate: regime === 'ordinario' ? form.ivaRate : 0,
      rivalsaInps: regime === 'ordinario' && form.rivalsaInps,
      docRegime: regime,
    });
    reset();
    onClose();
  };

  const ic = `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`;
  const lc = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className={`relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}>
            <div className="overflow-y-auto max-h-[92vh] p-8 space-y-6">

              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Nuova Fattura</h2>
                  <p className="text-sm text-slate-500">{form.invoiceNumber || nextInvoiceNumber}</p>
                </div>
                <button onClick={onClose} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              {/* Regime toggle */}
              <div className="space-y-2">
                <label className={lc}>Regime Fiscale</label>
                <div className={`p-1 rounded-2xl flex gap-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {(['forfettario', 'ordinario'] as const).map(r => (
                    <button key={r} type="button" onClick={() => handleRegimeChange(r)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${regime === r ? 'bg-primary text-white shadow-lg shadow-primary/30' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dati Fattura */}
              <div className="space-y-3">
                <label className={lc}>Dati Fattura</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={lc}>N° Fattura</label>
                    <input type="text" value={form.invoiceNumber || nextInvoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} className={ic} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={lc}>Data</label>
                    <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={ic} />
                  </div>
                </div>
              </div>

              {/* Dati Cliente */}
              <div className="space-y-3">
                <label className={lc}>Dati Cliente</label>
                <div className="space-y-1.5">
                  <label className={lc}>Ragione Sociale / Nome</label>
                  <input type="text" value={form.client} onChange={e => set('client', e.target.value)} placeholder="Es. Acme Srl" className={ic} />
                </div>
                <div className="space-y-1.5">
                  <label className={lc}>Indirizzo</label>
                  <input type="text" value={form.clientAddress} onChange={e => set('clientAddress', e.target.value)} placeholder="Via Roma 1, 20100 Milano" className={ic} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className={lc}>P.IVA Cliente</label>
                      <button type="button" onClick={() => set('clientPiva', form.clientPiva === 'Privato' ? '' : 'Privato')} className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${form.clientPiva === 'Privato' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                        Privato
                      </button>
                    </div>
                    <input type="text" value={form.clientPiva} onChange={e => set('clientPiva', e.target.value)} disabled={form.clientPiva === 'Privato'} placeholder={form.clientPiva === 'Privato' ? 'Cliente privato' : 'IT12345678901'} className={`${ic} ${form.clientPiva === 'Privato' ? 'opacity-40' : ''}`} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={lc}>C.F. Cliente</label>
                    <input type="text" value={form.clientCf} onChange={e => set('clientCf', e.target.value.toUpperCase())} placeholder="RSSMRA80..." className={ic} />
                  </div>
                </div>
              </div>

              {/* Servizio */}
              <div className="space-y-3">
                <label className={lc}>Servizio</label>
                <div className="space-y-1.5">
                  <label className={lc}>Descrizione</label>
                  <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Es. Consulenza web — Maggio 2026" className={ic} />
                </div>
                <div className="space-y-1.5">
                  <label className={lc}>Importo €</label>
                  <input type="text" inputMode="decimal" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" className={ic} />
                </div>
              </div>

              {/* Opzioni Fiscali */}
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
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Rivalsa INPS 4%</p>
                      {amount > 0 && form.rivalsaInps && (
                        <p className="text-xs text-slate-400 mt-0.5">+€{rivalsaAmount.toFixed(2)} sull'imponibile</p>
                      )}
                    </div>
                    <input type="checkbox" checked={form.rivalsaInps} onChange={e => set('rivalsaInps', e.target.checked)} className="w-5 h-5 rounded-lg text-primary focus:ring-primary" />
                  </div>
                )}

                {/* Ritenuta — entrambi i regimi */}
                <div className={`flex items-center gap-3 p-4 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Ritenuta d'acconto 20%</p>
                    {amount > 0 && form.ritenuta && (
                      <p className="text-xs text-slate-400 mt-0.5">−€{ritenutaAmount.toFixed(2)} trattenuti dal cliente</p>
                    )}
                  </div>
                  <input type="checkbox" checked={form.ritenuta} onChange={e => set('ritenuta', e.target.checked)} className="w-5 h-5 rounded-lg text-primary focus:ring-primary" />
                </div>

                {/* Marca da bollo — solo forfettario */}
                {regime === 'forfettario' && amount > 0 && (
                  <div className={`flex items-center gap-3 p-4 rounded-2xl border ${marcaBollo ? (darkMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-100') : (darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100')}`}>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${marcaBollo ? 'text-amber-500' : 'text-slate-400'}`}>Marca da bollo €2</p>
                      <p className={`text-xs mt-0.5 ${marcaBollo ? 'text-amber-500/70' : 'text-slate-400'}`}>
                        {marcaBollo ? 'Applicata automaticamente (importo > €77,47)' : 'Non applicata (importo ≤ €77,47)'}
                      </p>
                    </div>
                    {marcaBollo && <span className="text-sm font-bold text-amber-500">+€2,00</span>}
                  </div>
                )}

                {/* Nota legale forfettario */}
                {regime === 'forfettario' && (
                  <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-primary/5 border-primary/20' : 'bg-primary/5 border-primary/10'}`}>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Nota legale automatica</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">{FORFETTARIO_NOTE}</p>
                  </div>
                )}
              </div>

              {/* Riepilogo */}
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

              {/* Stato pagamento */}
              <div className={`flex items-center gap-3 p-4 rounded-2xl border ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white"><CheckCircle2 size={20} /></div>
                <div className="flex-1">
                  <p className={`text-xs font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>Segna come Pagata</p>
                  <p className={`text-[10px] ${darkMode ? 'text-emerald-500/60' : 'text-emerald-600'}`}>Aggiornerà le entrate in Home</p>
                </div>
                <input type="checkbox" checked={form.status === 'paid'} onChange={e => set('status', e.target.checked ? 'paid' : 'pending')} className="w-5 h-5 rounded-lg border-emerald-200 text-emerald-500 focus:ring-emerald-500" />
              </div>

              {/* Azioni */}
              <div className="space-y-3 pb-2">
                <button onClick={handleSubmit} disabled={!form.client || !form.amount || !form.title}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  <FileText size={18} />
                  Crea Fattura
                </button>
                <button onClick={onClose} className={`w-full py-4 rounded-2xl font-bold ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>Annulla</button>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateInvoiceModal;
