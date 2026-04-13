import { motion, AnimatePresence } from 'motion/react';
import { Plus, Globe, FileText, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Accountant } from '../../types';

interface AccountantModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountant: Accountant;
  darkMode?: boolean;
}

const AccountantModal = ({ isOpen, onClose, accountant, darkMode }: AccountantModalProps) => {
  const { t } = useTranslation();

  return (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl transition-all backdrop-blur-xl max-h-[90dvh]" style={{ backgroundColor: 'var(--color-card)' }}>
          <div className="p-8 space-y-6 overflow-y-auto max-h-[90dvh]">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className={`text-2xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('accountant_modal.title')}</h2>
                <p className="text-sm text-slate-500">{t('accountant_modal.subtitle')}</p>
              </div>
              <button onClick={onClose} className={`p-2 rounded-full transition-all active:scale-90 hover:shadow-lg ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:shadow-primary/10' : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:shadow-slate-200'}`}>
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <div className={`flex items-center gap-4 p-4 rounded-2xl transition-colors ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white text-xl font-bold">
                {accountant.firstName[0]}{accountant.lastName[0]}
              </div>
              <div>
                <p className={`text-lg font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{accountant.firstName} {accountant.lastName}</p>
                <p className="text-sm text-slate-500">{t('accountant_modal.designation')}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('accountant_modal.office_label')}</p>
                <div className="flex items-start gap-2">
                  <Globe size={16} className="text-slate-400 mt-0.5" />
                  <p className={`text-sm font-medium transition-colors ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{accountant.office}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('accountant_modal.contract_label')}</p>
                <div className="flex items-start gap-2">
                  <FileText size={16} className="text-slate-400 mt-0.5" />
                  <p className={`text-sm font-medium transition-colors ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{accountant.contractDetails}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('accountant_modal.instructions_label')}</p>
                <div className={`p-4 rounded-xl border transition-colors ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                  <p className={`text-sm leading-relaxed font-medium transition-colors ${darkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>{accountant.sendingInstructions}</p>
                </div>
              </div>
            </div>
            <div className="pt-2">
              <a href={`mailto:${accountant.email}`} className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm shadow-xl active:scale-[0.98] transition-all ${darkMode ? 'bg-white text-slate-900 shadow-white/10 hover:bg-slate-100' : 'bg-slate-900 text-white shadow-slate-900/20 hover:bg-slate-800'}`}>
                <Mail size={18} />
                {t('accountant_modal.send_email_btn')}
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
  );
};

export default AccountantModal;
