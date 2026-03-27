import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ScanFace, Lock, ShieldCheck, ChevronRight } from 'lucide-react';
import { getClient } from '../../lib/supabase';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
  profileId?: string;
  userEmail?: string;
}

const SecurityModal = ({ isOpen, onClose, darkMode, profileId, userEmail }: SecurityModalProps) => {
  const storageKey = profileId ? `faceId_${profileId}` : 'faceId';
  const [faceIdEnabled, setFaceIdEnabled] = useState<boolean>(() => {
    return localStorage.getItem(storageKey) !== 'false';
  });

  const handleFaceIdToggle = () => {
    const next = !faceIdEnabled;
    setFaceIdEnabled(next);
    localStorage.setItem(storageKey, next ? 'true' : 'false');
  };

  const handlePasswordReset = async () => {
    const email = userEmail ?? (await getClient().auth.getUser()).data.user?.email;
    if (!email) return;
    await getClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    onClose();
  };

  const handleTerms = () => {
    window.location.href = '/terms';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className={`relative w-full max-w-sm rounded-[32px] p-6 shadow-2xl space-y-6 overflow-hidden transition-colors ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Sicurezza</h3>
              <button onClick={onClose} className={`p-2 rounded-xl transition-all active:scale-90 hover:shadow-lg ${darkMode ? 'bg-slate-800 text-slate-400 hover:shadow-primary/10' : 'bg-slate-50 text-slate-400 hover:shadow-slate-200'}`}>
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <div className="space-y-3">
              <div className={`p-4 rounded-2xl flex items-center justify-between transition-colors ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-colors ${darkMode ? 'bg-slate-700 text-primary' : 'bg-white text-primary'}`}><ScanFace size={20} /></div>
                  <div>
                    <p className={`text-sm font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Face ID</p>
                    <p className="text-[10px] text-slate-500">Accesso rapido biometrico</p>
                  </div>
                </div>
                <button onClick={handleFaceIdToggle} className={`w-12 h-6 rounded-full transition-all relative active:scale-95 ${faceIdEnabled ? 'bg-primary shadow-lg shadow-primary/30' : (darkMode ? 'bg-slate-700' : 'bg-slate-200')}`}>
                  <motion.div animate={{ x: faceIdEnabled ? 24 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                </button>
              </div>
              <button onClick={handlePasswordReset} className={`w-full p-4 border rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-slate-800 text-slate-500 group-hover:text-primary' : 'bg-slate-50 text-slate-400 group-hover:text-primary'}`}><Lock size={20} /></div>
                  <div className="text-left">
                    <p className={`text-sm font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Password</p>
                    <p className="text-[10px] text-slate-500">Aggiorna la tua chiave d'accesso</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={handleTerms} className={`w-full p-4 border rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all hover:shadow-lg ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-slate-800 text-slate-500 group-hover:text-primary' : 'bg-slate-50 text-slate-400 group-hover:text-primary'}`}><ShieldCheck size={20} /></div>
                  <div className="text-left">
                    <p className={`text-sm font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Termini e Condizioni</p>
                    <p className="text-[10px] text-slate-500">Note legali e privacy policy</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <button onClick={onClose} className={`w-full py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all ${darkMode ? 'bg-white text-slate-900 shadow-slate-900/20' : 'bg-slate-900 text-white shadow-slate-200'}`}>Chiudi</button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SecurityModal;
