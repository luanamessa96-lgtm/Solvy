import { useState, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Plus, FileText, CreditCard, Calendar, Paperclip, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getItDeductibilityRate } from '../../lib/it/deductibility';
import { getEsDeductibilityRate } from '../../lib/es/deductibility';
import { todayLocalISO } from '../../utils/date';

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: import('../../types').Document) => void;
  darkMode?: boolean;
  profile?: import('../../types').Profile;
}

const IVA_RATES = [0, 4, 10, 21] as const;

const CreateExpenseModal = ({ isOpen, onClose, onSave, darkMode, profile }: CreateExpenseModalProps) => {
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
  const [attachData, setAttachData] = useState<string | undefined>(undefined);
  const [attachName, setAttachName] = useState<string | undefined>(undefined);
  const attachRef = useRef<HTMLInputElement>(null);

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

  const dragControls = useDragControls();
  const [amountTouched, setAmountTouched] = useState(false);
  const amountNum = parseFloat(formData.amount) || 0;
  const amountError = amountTouched && amountNum <= 0 ? 'Inserisci un importo valido' : '';

  const handleSubmit = () => {
    setAmountTouched(true);
    if (amountNum <= 0) return;
    onSave({
      ...formData,
      id: Math.random().toString(36).substr(2, 9),
      amount: parseFloat(formData.amount),
      type: 'expense',
      status: 'paid',
      title: formData.title || formData.category,
      ...(isSpain ? { ivaRate } : {}),
      ...(attachData ? { imageData: attachData, fileName: attachName } : {}),
    });
    onClose();
    setFormData({ title: '', amount: '', date: todayLocalISO(), category: defaultCategory });
    setIvaRate(21);
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
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            drag="y" dragControls={dragControls} dragListener={false}
            dragConstraints={{ top: 0 }} dragElastic={0.1}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose(); }}
            className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl flex flex-col max-h-[90dvh]"
            style={{ backgroundColor: 'var(--color-card)' }}>
            <div onPointerDown={e => dragControls.start(e)} className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none shrink-0">
              <div className={`w-10 h-1 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            </div>
            {/* Header — fisso */}
          <div className="shrink-0 flex justify-between items-start px-5 pt-2 pb-3">
            <div className="space-y-0.5">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('create_expense.title')}</h2>
              <p className="text-sm text-slate-500">{t('create_expense.subtitle')}</p>
            </div>
            <button onClick={onClose} className={`p-2 rounded-full transition-all active:scale-90 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
              <Plus className="rotate-45" size={22} />
            </button>
          </div>

          {/* Preview allegato — fissa sopra il form quando presente */}
          {attachData && (
            <div className="shrink-0 px-5 pb-3">
              <input ref={attachRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleAttach} />
              <div className={`flex items-center gap-3 p-3 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                {attachName ? (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <FileText size={18} className="text-primary" />
                  </div>
                ) : (
                  <img src={attachData} alt="preview" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200" />
                )}
                <p className={`text-xs font-semibold flex-1 truncate ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                  {attachName ?? 'Foto allegata'}
                </p>
                <button onClick={() => { setAttachData(undefined); setAttachName(undefined); }} className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                  <X size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Form scrollabile */}
          <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-4">
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
                {/* Allegato scontrino / justificante */}
                {!attachData && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      {isSpain ? 'Justificante (scontrino / factura)' : 'Allegato'}
                    </label>
                    <input ref={attachRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleAttach} />
                    <button onClick={() => attachRef.current?.click()} className={`w-full flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed transition-all active:scale-[0.98] ${darkMode ? 'border-slate-700 text-slate-400 hover:border-slate-500' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                      <Paperclip size={16} />
                      <span className="text-sm font-semibold">{isSpain ? 'Adjuntar scontrino o factura' : 'Allega documento'}</span>
                    </button>
                  </div>
                )}
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
