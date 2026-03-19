import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, User, CreditCard, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: any) => void;
  darkMode?: boolean;
}

const CreateInvoiceModal = ({ isOpen, onClose, onSave, darkMode }: CreateInvoiceModalProps) => {
  const [formData, setFormData] = useState({
    client: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    title: '',
    status: 'paid' as const,
  });

  const handleSubmit = () => {
    if (!formData.client || !formData.amount) return;
    onSave({
      ...formData,
      id: Math.random().toString(36).substr(2, 9),
      amount: parseFloat(formData.amount),
      type: 'invoice',
    });
    onClose();
    setFormData({ client: '', amount: '', date: new Date().toISOString().split('T')[0], title: '', status: 'paid' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className={`relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl transition-all backdrop-blur-xl ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h2 className={`text-2xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Nuova Fattura</h2>
                  <p className="text-sm text-slate-500">Compila i dettagli per creare il documento</p>
                </div>
                <button onClick={onClose} className={`p-2 rounded-full transition-all active:scale-90 hover:shadow-lg ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:shadow-primary/10' : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:shadow-slate-200'}`}>
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={formData.client} onChange={e => setFormData({ ...formData, client: e.target.value })} placeholder="Nome del cliente o azienda" className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Importo</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">EUR</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white color-scheme-dark' : 'bg-slate-50 border-slate-100 text-slate-900'}`} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrizione / Numero</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Es: Consulenza Maggio - Fattura #004" className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`} />
                  </div>
                </div>
                <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white"><CheckCircle2 size={20} /></div>
                  <div className="flex-1">
                    <p className={`text-xs font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>Segna come Pagato</p>
                    <p className={`text-[10px] ${darkMode ? 'text-emerald-500/60' : 'text-emerald-600'}`}>Aggiornerà le entrate in Home</p>
                  </div>
                  <input type="checkbox" checked={formData.status === 'paid'} onChange={e => setFormData({ ...formData, status: e.target.checked ? 'paid' : 'pending' })} className="w-5 h-5 rounded-lg border-emerald-200 text-emerald-500 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="pt-4 space-y-3">
                <button onClick={handleSubmit} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all hover:bg-primary/90">Crea e Salva Pagamento</button>
                <button onClick={onClose} className={`w-full py-4 rounded-2xl font-bold active:scale-[0.98] transition-all hover:shadow-lg ${darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:shadow-primary/10' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:shadow-slate-200'}`}>Annulla</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateInvoiceModal;
