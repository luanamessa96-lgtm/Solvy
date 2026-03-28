import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Image } from 'lucide-react';

interface ScanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: import('../../types').Document) => void;
  darkMode?: boolean;
}

const ScanReceiptModal = ({ isOpen, onClose, onSave, darkMode }: ScanReceiptModalProps) => {
  const [preview, setPreview] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ title: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'altro' });
  const [amountError, setAmountError] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const categories = [
    { value: 'abbonamento', label: 'Abbonamento', emoji: '📦' },
    { value: 'materiale', label: 'Materiale', emoji: '🛠️' },
    { value: 'software', label: 'Software', emoji: '💻' },
    { value: 'formazione', label: 'Formazione', emoji: '📚' },
    { value: 'altro', label: 'Altro', emoji: '📎' },
  ];

  const handleClose = () => {
    setPreview(null);
    setForm({ title: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'altro' });
    setAmountError(false);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
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
    if (preview) localStorage.setItem(`receipt_${docId}`, preview);
    onSave({
      id: docId,
      type: 'expense',
      status: 'paid',
      title: form.title || form.category,
      amount: parsed,
      date: form.date,
      category: form.category,
    });
    handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl backdrop-blur-xl" style={{ backgroundColor: 'var(--color-card)' }}>
            <div className="overflow-y-auto max-h-[85vh] p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Aggiungi Foto</h2>
                  <p className="text-sm text-slate-500">Salva un'immagine con la spesa</p>
                </div>
                <button onClick={handleClose} className={`p-2 rounded-full transition-all active:scale-90 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {preview ? (
                <div className="relative w-full h-40 rounded-2xl overflow-hidden">
                  <img src={preview} alt="Scontrino" className="w-full h-full object-cover" />
                  <button onClick={() => { setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-slate-900/60 backdrop-blur-sm flex items-center justify-center text-white">
                    <Plus className="rotate-45" size={16} />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className={`w-full h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.98] ${darkMode ? 'border-slate-700 hover:border-primary/50 bg-slate-800/50' : 'border-slate-200 hover:border-primary/40 bg-slate-50'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary'}`}><Image size={22} /></div>
                  <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Scegli dalla libreria</p>
                  <p className="text-xs text-slate-400">Scontrino, ricevuta o documento</p>
                </button>
              )}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descrizione</label>
                  <input type="text" placeholder="Es. Cena con cliente" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={`w-full px-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 border ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={`text-xs font-bold uppercase tracking-wider ${amountError ? 'text-red-500' : 'text-slate-400'}`}>Importo €{amountError ? ' — obbligatorio' : ''}</label>
                    <input type="text" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={e => { setAmountError(false); setForm(p => ({ ...p, amount: e.target.value })); }} className={`w-full px-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 border ${amountError ? 'border-red-400 focus:ring-red-400/20' : 'focus:ring-primary/20 ' + (darkMode ? 'border-slate-700' : 'border-slate-100')} ${darkMode ? 'bg-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 text-slate-900'}`} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data</label>
                    <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={`w-full px-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 border ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                      <button key={c.value} type="button" onClick={() => setForm(p => ({ ...p, category: c.value }))} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${form.category === c.value ? 'bg-primary text-white shadow-lg shadow-primary/30' : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
                        {c.emoji} {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button type="button" onClick={handleSave} className="w-full py-4 rounded-2xl font-bold bg-primary text-white shadow-xl shadow-primary/30 active:scale-[0.98] transition-all">Salva Spesa</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ScanReceiptModal;
