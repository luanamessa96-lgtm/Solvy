import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Camera, FileText as FileIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { todayLocalISO } from '../../utils/date';

interface ImportDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: import('../../types').Document) => void;
  darkMode?: boolean;
}

type DocType = 'invoice' | 'expense';
type Step = 'source' | 'form';

const categories = [
  { value: 'abbonamento', label: 'Abbonamento', emoji: '📦' },
  { value: 'materiale', label: 'Materiale', emoji: '🛠️' },
  { value: 'software', label: 'Software', emoji: '💻' },
  { value: 'formazione', label: 'Formazione', emoji: '📚' },
  { value: 'altro', label: 'Altro', emoji: '📎' },
];

const ImportDocumentModal = ({ isOpen, onClose, onSave, darkMode }: ImportDocumentModalProps) => {
  const { t } = useTranslation();
  const [step, setStep] = React.useState<Step>('source');
  const [preview, setPreview] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [docType, setDocType] = React.useState<DocType>('expense');
  const [form, setForm] = React.useState({
    title: '',
    client: '',
    amount: '',
    date: todayLocalISO(),
    category: 'altro',
  });
  const [amountError, setAmountError] = React.useState(false);

  const cameraRef = React.useRef<HTMLInputElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('source');
    setPreview(null);
    setFileName(null);
    setDocType('expense');
    setForm({ title: '', client: '', amount: '', date: todayLocalISO(), category: 'altro' });
    setAmountError(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
      setStep('form');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const parsed = parseFloat(form.amount.replace(',', '.'));
    if (!form.amount.trim() || isNaN(parsed)) {
      setAmountError(true);
      return;
    }
    setAmountError(false);
    const docId = Math.random().toString(36).substr(2, 9);
    if (preview) { try { localStorage.setItem(`receipt_${docId}`, preview); } catch { /* quota storage superata, ignora */ } }
    onSave({
      id: docId,
      type: docType,
      status: docType === 'expense' ? 'paid' : 'pending',
      title: form.title || form.category,
      client: docType === 'invoice' ? form.client : undefined,
      amount: parsed,
      date: form.date,
      category: form.category,
    });
    handleClose();
  };

  const inputClass = (error = false) =>
    `w-full px-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 border ${
      error
        ? 'border-red-400 focus:ring-red-400/20'
        : `focus:ring-primary/20 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`
    } ${darkMode ? 'bg-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 text-slate-900 placeholder:text-slate-400'}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl backdrop-blur-xl"
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            {/* Hidden file inputs */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xlsx,.csv" className="hidden" onChange={handleFileChange} />

            <div className="overflow-y-auto max-h-[85vh] p-8 space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {step === 'source' ? t('import_document.add_title') : t('import_document.details_title')}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {step === 'source' ? t('import_document.add_subtitle') : t('import_document.details_subtitle')}
                  </p>
                </div>
                <button onClick={step === 'form' ? () => setStep('source') : handleClose} className={`p-2 rounded-full transition-all active:scale-90 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
                  {step === 'form' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  ) : (
                    <Plus className="rotate-45" size={24} />
                  )}
                </button>
              </div>

              {step === 'source' ? (
                /* Step 1: Source selection */
                <div className="space-y-3">
                  <button
                    onClick={() => cameraRef.current?.click()}
                    className={`w-full p-5 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-primary/40' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-lg'}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary'}`}>
                      <Camera size={22} />
                    </div>
                    <div className="text-left">
                      <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('import_document.camera_label')}</p>
                      <p className="text-sm text-slate-500">{t('import_document.camera_hint')}</p>
                    </div>
                  </button>

                  <button
                    onClick={() => fileRef.current?.click()}
                    className={`w-full p-5 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500/40' : 'bg-white border-slate-100 hover:border-indigo-500/20 hover:shadow-lg'}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                      <FileIcon size={22} />
                    </div>
                    <div className="text-left">
                      <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('import_document.file_label')}</p>
                      <p className="text-sm text-slate-500">{t('import_document.file_hint')}</p>
                    </div>
                  </button>
                </div>
              ) : (
                /* Step 2: Preview + Form */
                <div className="space-y-5">
                  {/* Preview */}
                  {preview && (
                    preview.startsWith('data:image') ? (
                      <div className="relative w-full h-40 rounded-2xl overflow-hidden">
                        <img src={preview} alt="Documento" className="w-full h-full object-cover" />
                        <button
                          onClick={() => { setPreview(null); setFileName(null); setStep('source'); }}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-slate-900/60 backdrop-blur-sm flex items-center justify-center text-white"
                        >
                          <Plus className="rotate-45" size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className={`w-full h-20 rounded-2xl flex items-center gap-3 px-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <FileIcon size={28} className="text-indigo-500 shrink-0" />
                        <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{fileName}</p>
                        <button onClick={() => { setPreview(null); setFileName(null); setStep('source'); }} className="ml-auto text-slate-400">
                          <Plus className="rotate-45" size={20} />
                        </button>
                      </div>
                    )
                  )}

                  {/* Fattura / Spesa toggle */}
                  <div className={`p-1 rounded-2xl flex ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <button
                      onClick={() => setDocType('invoice')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${docType === 'invoice' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}
                    >
                      {t('import_document.toggle_invoice')}
                    </button>
                    <button
                      onClick={() => setDocType('expense')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${docType === 'expense' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}
                    >
                      {t('import_document.toggle_expense')}
                    </button>
                  </div>

                  {/* Form fields */}
                  <div className="space-y-3">
                    {docType === 'invoice' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('common.client')}</label>
                        <input
                          type="text"
                          placeholder={t('import_document.client_placeholder')}
                          value={form.client}
                          onChange={e => setForm(p => ({ ...p, client: e.target.value }))}
                          className={inputClass()}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('common.description')}</label>
                      <input
                        type="text"
                        placeholder={t('import_document.description_placeholder')}
                        value={form.title}
                        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                        className={inputClass()}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className={`text-xs font-bold uppercase tracking-wider ${amountError ? 'text-red-500' : 'text-slate-400'}`}>
                          {t('common.amount')}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={form.amount}
                          onChange={e => { setAmountError(false); setForm(p => ({ ...p, amount: e.target.value })); }}
                          className={inputClass(amountError)}
                        />
                        {amountError && <p className="text-xs font-bold text-red-500">{t('import_document.amount_error')}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('common.date')}</label>
                        <input
                          type="date"
                          value={form.date}
                          onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                          className={inputClass()}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('common.category')}</label>
                      <div className="flex flex-wrap gap-2">
                        {categories.map(c => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setForm(p => ({ ...p, category: c.value }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                              form.category === c.value
                                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {c.emoji} {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSave}
                    className={`w-full py-4 rounded-2xl font-bold text-white shadow-xl active:scale-[0.98] transition-all ${
                      docType === 'invoice' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-indigo-500 shadow-indigo-500/30'
                    }`}
                  >
                    {docType === 'invoice' ? t('import_document.save_invoice_btn') : t('import_document.save_expense_btn')}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ImportDocumentModal;
