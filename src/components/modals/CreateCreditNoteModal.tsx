import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Plus, CheckCircle2, ChevronDown } from 'lucide-react';
import { Document, Profile } from '../../types';

interface CreateCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: Document) => void;
  profile: Profile;
  documents: Document[];
  darkMode?: boolean;
}

const CreateCreditNoteModal = ({ isOpen, onClose, onSave, profile, documents, darkMode }: CreateCreditNoteModalProps) => {
  const dragControls = useDragControls();

  const invoices = useMemo(() => documents.filter(d => d.type === 'invoice'), [documents]);

  const nextCreditNoteNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const count = documents.filter(d => d.type === 'credit_note' && new Date(d.date).getFullYear() === year).length + 1;
    return `NC${String(count).padStart(3, '0')}/${year}`;
  }, [documents]);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [touched, setTouched] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedInvoice = useMemo(() => invoices.find(i => i.id === selectedInvoiceId) ?? null, [invoices, selectedInvoiceId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedInvoiceId('');
      setDate(new Date().toISOString().split('T')[0]);
      setTouched(false);
      setPickerOpen(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    setTouched(true);
    if (!selectedInvoice) return;
    const doc: Document = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'credit_note',
      invoiceNumber: nextCreditNoteNumber,
      amount: selectedInvoice.amount,
      date,
      status: 'paid',
      client: selectedInvoice.client,
      clientAddress: selectedInvoice.clientAddress,
      clientPiva: selectedInvoice.clientPiva,
      clientCf: selectedInvoice.clientCf,
      docRegime: selectedInvoice.docRegime ?? profile.regime ?? 'forfettario',
      category: selectedInvoice.invoiceNumber ?? selectedInvoice.id,
      title: `Storno fattura ${selectedInvoice.invoiceNumber ?? ''}`.trim(),
    };
    onSave(doc);
    onClose();
  };

  const ic = `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`;
  const lc = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div
            drag="y" dragControls={dragControls} dragListener={false} dragConstraints={{ top: 0 }} dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose(); }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl"
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            <div onPointerDown={e => dragControls.start(e)} className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 rounded-full bg-slate-300/50" />
            </div>
            <div className="overflow-y-auto max-h-[90vh] px-8 pb-8 pt-4 space-y-5 [padding-bottom:max(2rem,calc(env(safe-area-inset-bottom)+1rem))]">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Nota di credito</h2>
                  <p className="text-sm text-slate-500">Storno di una fattura esistente</p>
                </div>
                <button onClick={onClose} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}><Plus className="rotate-45" size={24} /></button>
              </div>

              <div className="space-y-1.5">
                <label className={lc}>N° Nota di Credito</label>
                <div className={`${ic} opacity-60 cursor-not-allowed`}>{nextCreditNoteNumber}</div>
              </div>

              <div className="space-y-1.5">
                <label className={lc}>Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={ic} />
              </div>

              {/* Custom invoice picker — iOS-safe (no native <select>) */}
              <div className="space-y-1.5">
                <label className={lc}>Fattura originale *</label>

                {/* Trigger button */}
                <button
                  type="button"
                  onClick={() => setPickerOpen(o => !o)}
                  className={`w-full px-4 py-3 border rounded-xl text-sm text-left flex items-center justify-between transition-all active:scale-[0.98] ${touched && !selectedInvoiceId ? 'border-red-400 ring-1 ring-red-300' : ''} ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
                >
                  <span className={selectedInvoice ? '' : 'text-slate-400'}>
                    {selectedInvoice
                      ? `${selectedInvoice.invoiceNumber ? selectedInvoice.invoiceNumber + ' — ' : ''}${selectedInvoice.client || selectedInvoice.title}`
                      : 'Seleziona una fattura…'}
                  </span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown list */}
                {pickerOpen && (
                  <div className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} shadow-lg`}>
                    {invoices.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-slate-400">Nessuna fattura disponibile</p>
                    ) : (
                      invoices.map(inv => (
                        <button
                          key={inv.id}
                          type="button"
                          onClick={() => { setSelectedInvoiceId(inv.id); setPickerOpen(false); }}
                          className={`w-full px-4 py-3 flex items-center justify-between text-left border-b last:border-b-0 transition-all active:scale-[0.98] ${darkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-50 hover:bg-slate-50'} ${inv.id === selectedInvoiceId ? (darkMode ? 'bg-primary/10' : 'bg-primary/5') : ''}`}
                        >
                          <div className="min-w-0">
                            <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {inv.invoiceNumber ? `${inv.invoiceNumber} — ` : ''}{inv.client || inv.title || 'Fattura'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(inv.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })} · €{inv.amount.toLocaleString('it-IT')}
                            </p>
                          </div>
                          {inv.id === selectedInvoiceId && <CheckCircle2 size={16} className="text-primary shrink-0 ml-2" />}
                        </button>
                      ))
                    )}
                  </div>
                )}

                {touched && !selectedInvoiceId && <p className="text-xs text-red-500 ml-1">Campo obbligatorio</p>}
              </div>

              {selectedInvoice && (
                <>
                  <div className="space-y-1.5">
                    <label className={lc}>Importo stornato</label>
                    <div className={`${ic} opacity-60 cursor-not-allowed text-red-500 font-bold`}>
                      -€{selectedInvoice.amount.toLocaleString('it-IT')}
                    </div>
                    <p className="text-[10px] text-slate-400 ml-1">Importo negativo automatico — storna l'intera fattura</p>
                  </div>
                  <div className={`px-4 py-3 rounded-xl text-xs ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                    Regime: <span className="font-bold">{(selectedInvoice.docRegime ?? profile.regime ?? 'forfettario') === 'ordinario' ? 'Ordinario' : 'Forfettario'}</span>
                  </div>
                </>
              )}

              <button
                onClick={handleSave}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
              >
                Crea Nota di Credito
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateCreditNoteModal;
