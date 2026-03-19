import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, FileText, CreditCard, Calendar } from 'lucide-react';

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: import('../../types').Document) => void;
  darkMode?: boolean;
}

const CreateExpenseModal = ({ isOpen, onClose, onSave, darkMode }: CreateExpenseModalProps) => {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'abbonamento',
  });

  const handleSubmit = () => {
    if (!formData.amount) return;
    onSave({
      ...formData,
      id: Math.random().toString(36).substr(2, 9),
      amount: parseFloat(formData.amount),
      type: 'expense',
      status: 'paid',
      title: formData.title || formData.category,
    });
    onClose();
    setFormData({ title: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'abbonamento' });
  };

  const categories = [
    { value: 'abbonamento', label: 'Abbonamento', emoji: '📦' },
    { value: 'materiale', label: 'Materiale', emoji: '🛠️' },
    { value: 'software', label: 'Software', emoji: '💻' },
    { value: 'formazione', label: 'Formazione', emoji: '📚' },
    { value: 'altro', label: 'Altro', emoji: '📎' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className={`relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Nuova Spesa</h2>
                  <p className="text-sm text-slate-500">Registra un'uscita deducibile</p>
                </div>
                <button onClick={onClose} className={`p-2 rounded-full transition-all active:scale-90 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                  <div className="grid grid-cols-5 gap-2">
                    {categories.map(cat => (
                      <button key={cat.value} onClick={() => setFormData({ ...formData, category: cat.value })} className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all active:scale-95 ${formData.category === cat.value ? 'bg-indigo-500 border-indigo-500 text-white' : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600')}`}>
                        <span className="text-lg">{cat.emoji}</span>
                        <span className="text-[9px] font-bold">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrizione (opzionale)</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Es: Abbonamento Adobe Creative" className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Importo</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-2 space-y-3">
                <button onClick={handleSubmit} className="w-full bg-indigo-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-500/30 active:scale-[0.98] transition-all hover:bg-indigo-600">Registra Spesa</button>
                <button onClick={onClose} className={`w-full py-4 rounded-2xl font-bold active:scale-[0.98] transition-all ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>Annulla</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateExpenseModal;
