import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { Plus, FileText, CreditCard, Calendar, Paperclip, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getItDeductibilityRate } from '../../lib/it/deductibility';
import { getEsDeductibilityRate } from '../../lib/es/deductibility';
import { todayLocalISO } from '../../utils/date';

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: import('../../types').Document) => void;
  onUpdate?: (doc: import('../../types').Document) => void;
  editDoc?: import('../../types').Document;
  darkMode?: boolean;
  profile?: import('../../types').Profile;
}

const IVA_RATES = [0, 4, 10, 21] as const;

const CreateExpenseModal = ({ isOpen, onClose, onSave, onUpdate, editDoc, darkMode, profile }: CreateExpenseModalProps) => {
  useBodyScrollLock(isOpen);
  const { t } = useTranslation();
  const isSpain = profile?.country === 'Spain';
  const isItaly = profile?.country === 'Italy';
  const isOrdinario = isItaly && profile?.regime === 'ordinario';
  const defaultCategory = isOrdinario ? 'software' : isSpain ? 'suscripcion' : 'abbonamento';

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    date: todayLocalISO(),
    category: defaultCategory,
  });
  const [ivaRate, setIvaRate] = useState<number>(21);
  const [nifProveedor, setNifProveedor] = useState('');
  const [attachData, setAttachData] = useState<string | undefined>(undefined);
  const [attachName, setAttachName] = useState<string | undefined>(undefined);
  const attachRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editDoc) {
      setFormData({
        title: editDoc.title || '',
        amount: String(editDoc.amount),
        date: editDoc.date,
        category: editDoc.category || defaultCategory,
      });
      setIvaRate(editDoc.ivaRate ?? 21);
      setNifProveedor(editDoc.nifProveedor || '');
      setAttachData(editDoc.imageData);
      setAttachName(editDoc.fileName);
    }
  }, [editDoc]);

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setAttachData(ev.target?.result as string);
      setAttachName(file.type.startsWith('image/') ? undefined : file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const [amountTouched, setAmountTouched] = useState(false);
  const amountNum = parseFloat(formData.amount) || 0;
  const amountError = amountTouched && amountNum <= 0 ? 'Inserisci un importo valido' : '';

  const handleSubmit = () => {
    setAmountTouched(true);
    if (amountNum <= 0) return;
    const updatedDoc = {
      ...(editDoc ?? { id: Math.random().toString(36).substr(2, 9), type: 'expense' as const, status: 'paid' as const }),
      ...formData,
      amount: parseFloat(formData.amount),
      title: formData.title || formData.category,
      ...(isSpain ? { ivaRate } : {}),
      ...(isSpain && nifProveedor.trim() ? { nifProveedor: nifProveedor.trim() } : { nifProveedor: undefined }),
      imageData: attachData,
      fileName: attachName,
    };
    if (editDoc && onUpdate) {
      onUpdate(updatedDoc);
    } else {
      onSave(updatedDoc);
    }
    onClose();
    setFormData({ title: '', amount: '', date: todayLocalISO(), category: defaultCategory });
    setIvaRate(21);
    setNifProveedor('');
    setAmountTouched(false);
    setAttachData(undefined);
    setAttachName(undefined);
  };

  const categoriesOrdinario = [
    { value: 'software', label: 'Software', emoji: '💻' },
    { value: 'formazione', label: 'Formazione', emoji: '📚' },
    { value: 'materiale', label: 'Materiale', emoji: '🛠️' },
    { value: 'telefono', label: 'Telefono', emoji: '📱' },
    { value: 'auto_moto', label: 'Auto/Moto', emoji: '🚗' },
  ];

  const categoriesForfettario = [
    { value: 'abbonamento', label: 'Abbonamento', emoji: '📦' },
    { value: 'software', label: 'Software', emoji: '💻' },
    { value: 'materiale', label: 'Materiale', emoji: '🛠️' },
    { value: 'formazione', label: 'Formazione', emoji: '📚' },
    { value: 'telefono', label: 'Telefono', emoji: '📱' },
    { value: 'auto_moto', label: 'Auto/Moto', emoji: '🚗' },
    { value: 'casa_ufficio', label: 'Casa/Ufficio', emoji: '🏠' },
    { value: 'pasti', label: 'Pasti/Rapp.', emoji: '🍽️' },
    { value: 'altro', label: 'Altro', emoji: '📎' },
  ];

  const categoriesSpain = [
    { value: 'suscripcion', label: 'Suscripción', emoji: '📦' },
    { value: 'material',    label: 'Material',    emoji: '🛠️' },
    { value: 'software',    label: 'Software',    emoji: '💻' },
    { value: 'formacion',   label: 'Formación',   emoji: '📚' },
    { value: 'telefono',    label: 'Teléfono',    emoji: '📱' },
  ];

  const categories = isOrdinario ? categoriesOrdinario : isItaly ? categoriesForfettario : categoriesSpain;

  const deductRate = isItaly ? getItDeductibilityRate(formData.category) : isSpain ? getEsDeductibilityRate(formData.category) : 1;
  const deductPct = Math.round(deductRate * 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl max-h-[90dvh] flex flex-col"
            style={{ backgroundColor: 'var(--color-card)' }}>
            <div className={`flex items-start justify-between p-6 pb-4 shrink-0 ${darkMode ? 'border-b border-slate-800' : 'border-b border-slate-100'}`}>
              <div className="space-y-0.5">
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('create_expense.title')}</h2>
                <p className="text-sm text-slate-500">{t('create_expense.subtitle')}</p>
              </div>
              <button onClick={onClose} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}>
                <Plus className="rotate-45" size={18} />
              </button>
            </div>
            <div data-scroll-lock-ignore className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain p-5 space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('common.category')}</label>
                  <div className={`grid gap-1.5 ${isOrdinario ? 'grid-cols-5' : isItaly ? 'grid-cols-3' : 'grid-cols-5'}`}>
                    {categories.map(cat => (
                      <button key={cat.value} onClick={() => setFormData({ ...formData, category: cat.value })} className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl border text-center transition-all active:scale-95 ${formData.category === cat.value ? 'bg-indigo-500 border-indigo-500 text-white' : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600')}`}>
                        <span className="text-base">{cat.emoji}</span>
                        <span className="text-[8px] font-bold">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                  {isOrdinario && (
                    <p className="text-[10px] text-slate-400 ml-1">{t('create_expense.software_hint')}</p>
                  )}
                  {(isOrdinario || isSpain) && (
                    <div className="space-y-1">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold ${deductPct === 100 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                        <span>{deductPct === 100 ? '✅' : '⚠️'}</span>
                        <span>{deductPct}% deducible{isItaly ? 'e' : ''}</span>
                      </div>
                      {isSpain && deductPct < 100 && (
                        <p className="text-[10px] text-slate-400 ml-1">Deducibilidad estimada al 50% (uso mixto). Consulta con tu gestor.</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('create_expense.description_label')}</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder={t('create_expense.description_placeholder')} className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('common.amount')}</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="number" inputMode="decimal" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} onBlur={() => setAmountTouched(true)} placeholder="0.00" className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 font-bold transition-all ${amountError ? 'border-red-400 bg-red-50 text-red-900 focus:ring-red-200 placeholder:text-red-300' : (darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:ring-indigo-500/20' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400 focus:ring-indigo-500/20')}`} />
                      {amountError && <p className="text-[10px] text-red-500 font-semibold ml-1 mt-0.5">{amountError}</p>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('common.date')}</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`} />
                    </div>
                  </div>
                </div>
              {isSpain && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">IVA Soportado</label>
                  <div className="grid grid-cols-4 gap-2">
                    {IVA_RATES.map(rate => (
                      <button
                        key={rate}
                        onClick={() => setIvaRate(rate)}
                        className={`py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                          ivaRate === rate
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {isSpain && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">NIF / CIF Proveedor <span className="font-normal normal-case">(opcional)</span></label>
                  <input type="text" value={nifProveedor} onChange={e => setNifProveedor(e.target.value)} placeholder="B12345678" className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`} />
                </div>
              )}
                {/* Allegato scontrino / justificante */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    {isSpain ? 'Justificante (scontrino / factura)' : 'Allegato'}
                  </label>
                  <input ref={attachRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleAttach} />
                  {attachData ? (
                    <div className={`relative flex items-center gap-3 p-3 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      {attachName ? (
                        <FileText size={20} className="text-primary shrink-0" />
                      ) : (
                        <img src={attachData} alt="preview" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      )}
                      <p className={`text-xs font-semibold flex-1 truncate ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                        {attachName ?? 'Foto allegata'}
                      </p>
                      <button onClick={() => { setAttachData(undefined); setAttachName(undefined); }} className="w-6 h-6 rounded-full bg-slate-300/60 flex items-center justify-center shrink-0">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => attachRef.current?.click()} className={`w-full flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed transition-all active:scale-[0.98] ${darkMode ? 'border-slate-700 text-slate-400 hover:border-slate-500' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                      <Paperclip size={16} />
                      <span className="text-sm font-semibold">{isSpain ? 'Adjuntar scontrino o factura' : 'Allega documento'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="shrink-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 space-y-2.5">
              <button onClick={handleSubmit} className="w-full bg-indigo-500 text-white py-3.5 rounded-2xl font-bold shadow-xl shadow-indigo-500/30 active:scale-[0.98] transition-all hover:bg-indigo-600">{t('create_expense.submit_btn')}</button>
              <button onClick={onClose} className={`w-full py-3 rounded-2xl font-bold active:scale-[0.98] transition-all ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>{t('common.cancel')}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateExpenseModal;
