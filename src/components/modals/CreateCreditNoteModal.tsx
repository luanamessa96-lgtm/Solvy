import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { Plus, CheckCircle2, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Document, Profile } from '../../types';
import { todayLocalISO } from '../../utils/date';

interface CreateCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: Document) => void;
  profile: Profile;
  documents: Document[];
  darkMode?: boolean;
}

const CreateCreditNoteModal = ({ isOpen, onClose, onSave, profile, documents, darkMode }: CreateCreditNoteModalProps) => {
  const { t } = useTranslation();
  const dragControls = useDragControls();

  const invoices = useMemo(() => documents.filter(d => d.type === 'invoice'), [documents]);

  const nextCreditNoteNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const count = documents.filter(d => d.type === 'credit_note' && new Date(d.date).getFullYear() === year).length + 1;
    return `NC${String(count).padStart(3, '0')}/${year}`;
  }, [documents]);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [date, setDate] = useState(todayLocalISO());
  const [touched, setTouched] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedInvoice = useMemo(() => invoices.find(i => i.id === selectedInvoiceId) ?? null, [invoices, selectedInvoiceId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedInvoiceId('');
      setDate(todayLocalISO());
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
      docRegime: selectedInvoice.docRegime ?? (profile.regime === 'autonomo' ? 'forfettario' : profile.regime ?? 'forfettario'),
      category: selectedInvoice.invoiceNumber ?? selectedInvoice.id,
      title: `Storno fattura ${selectedInvoice.invoiceNumber ?? ''}`.trim(),
    };
    onSave(doc);
    onClose();
  };

  useBodyScrollLock(isOpen);
  const ic = `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`;
  const lc = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl max-h-[90dvh] grid grid-rows-[auto_1fr]"
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            <div className={`flex items-start justify-between p-6 pb-4 shrink-0 ${darkMode ? 'border-b border-slate-800' : 'border-b border-slate-100'}`}>
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('create_credit_note.title')}</h2>
                <p className="text-sm text-slate-500">{t('create_credit_note.subtitle')}</p>
              </div>
              <button onClick={onClose} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}><Plus className="rotate-45" size={18} /></button>
            </div>

            <div className="overflow-y-auto overscroll-y-contain p-6 space-y-5 [padding-bottom:max(3rem,calc(env(safe-area-inset-bottom)+2rem))]">
              <div className="space-y-1.5">
                <label className={lc}>{t('create_credit_note.number_label')}</label>
                <div className={`${ic} opacity-60 cursor-not-allowed`}>{nextCreditNoteNumber}</div>
              </div>

              <div className="space-y-1.5">
                <label className={lc}>{t('common.date')}</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={ic} />
              </div>

              {/* Custom invoice picker — iOS-safe (no native <select>) */}
              <div className="space-y-1.5">
                <label className={lc}>{t('create_credit_note.invoice_label')}</label>

                {/* Trigger button */}
                <button
                  type="button"
                  onClick={() => setPickerOpen(o => !o)}
                  className={`w-full px-4 py-3 border rounded-xl text-sm text-left flex items-center justify-between transition-all active:scale-[0.98] ${touched && !selectedInvoiceId ? 'border-red-400 ring-1 ring-red-300' : ''} ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
                >
                  <span className={selectedInvoice ? '' : 'text-slate-400'}>
                    {selectedInvoice
                      ? `${selectedInvoice.invoiceNumber ? selectedInvoice.invoiceNumber + ' — ' : ''}${selectedInvoice.client || selectedInvoice.title}`
                      : t('create_credit_note.select_invoice')}
                  </span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown list */}
                {pickerOpen && (
                  <div className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} shadow-lg`}>
                    {invoices.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-slate-400">{t('create_credit_note.no_invoices')}</p>
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
                              {new Date(inv.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} · €{inv.amount.toLocaleString()}
                            </p>
                          </div>
                          {inv.id === selectedInvoiceId && <CheckCircle2 size={16} className="text-primary shrink-0 ml-2" />}
                        </button>
                      ))
                    )}
                  </div>
                )}

                {touched && !selectedInvoiceId && <p className="text-xs text-red-500 ml-1">{t('common.required')}</p>}
              </div>

              {selectedInvoice && (
                <>
                  <div className="space-y-1.5">
                    <label className={lc}>{t('create_credit_note.reversed_amount_label')}</label>
                    <div className={`${ic} opacity-60 cursor-not-allowed text-red-500 font-bold`}>
                      -€{selectedInvoice.amount.toLocaleString()}
                    </div>
                    <p className="text-[10px] text-slate-400 ml-1">{t('create_credit_note.auto_negative_hint')}</p>
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
                {t('create_credit_note.create_btn')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateCreditNoteModal;
