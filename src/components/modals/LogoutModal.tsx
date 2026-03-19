import { motion, AnimatePresence } from 'motion/react';
import { LogOut } from 'lucide-react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  darkMode?: boolean;
}

const LogoutModal = ({ isOpen, onClose, onConfirm, darkMode }: LogoutModalProps) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className={`relative w-full max-w-sm rounded-[32px] p-8 shadow-2xl space-y-6 overflow-hidden transition-colors ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl ${darkMode ? 'bg-red-500/10' : 'bg-red-500/5'}`} />
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-colors ${darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500'}`}>
              <LogOut size={40} strokeWidth={1.5} />
            </div>
            <div className="space-y-2">
              <h3 className={`text-xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Vuoi uscire veramente?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Dovrai reinserire le tue credenziali per accedere nuovamente al tuo account.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button onClick={onClose} className={`py-4 rounded-2xl font-bold transition-all active:scale-95 ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Annulla</button>
            <button onClick={onConfirm} className="py-4 bg-red-500 text-white rounded-2xl font-bold shadow-xl shadow-red-500/40 hover:bg-red-600 transition-all active:scale-95">Sì, Esci</button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default LogoutModal;
