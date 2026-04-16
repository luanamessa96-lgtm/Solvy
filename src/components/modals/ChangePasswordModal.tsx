import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getClient } from '../../lib/supabase';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

const ChangePasswordModal = ({ isOpen, onClose, darkMode }: ChangePasswordModalProps) => {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowNew(false);
    setShowConfirm(false);
    setError('');
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async () => {
    setError('');
    if (newPassword.length < 8) {
      setError(t('change_password_modal.error_min_length'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('change_password_modal.error_mismatch'));
      return;
    }
    setIsLoading(true);
    try {
      const { error: supaError } = await getClient().auth.updateUser({ password: newPassword });
      if (supaError) throw supaError;
      setSuccess(true);
      setTimeout(handleClose, 2000);
    } catch {
      setError(t('change_password_modal.error_generic'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative w-full rounded-t-[32px] p-8 shadow-2xl space-y-6 transition-colors"
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${darkMode ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                  <Lock size={18} />
                </div>
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('change_password_modal.title')}</h3>
              </div>
              <button
                onClick={handleClose}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
              >
                <X size={16} />
              </button>
            </div>

            {success ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-50 text-green-600'}`}>
                  <Lock size={28} strokeWidth={1.5} />
                </div>
                <p className={`text-sm font-semibold text-center ${darkMode ? 'text-green-400' : 'text-green-700'}`}>{t('change_password_modal.success')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Nuova password */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('change_password_modal.new_password')}</label>
                  <div className={`flex items-center gap-2 px-4 rounded-2xl border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder={t('change_password_modal.new_password_placeholder')}
                      className={`flex-1 py-3.5 text-sm bg-transparent outline-none ${darkMode ? 'text-white placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'}`}
                    />
                    <button type="button" onClick={() => setShowNew(v => !v)} className="text-slate-400 shrink-0 active:scale-90 transition-transform">
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Conferma password */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('change_password_modal.confirm_password')}</label>
                  <div className={`flex items-center gap-2 px-4 rounded-2xl border transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder={t('change_password_modal.confirm_password_placeholder')}
                      className={`flex-1 py-3.5 text-sm bg-transparent outline-none ${darkMode ? 'text-white placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'}`}
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-slate-400 shrink-0 active:scale-90 transition-transform">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Errore */}
                {error && (
                  <p className="text-xs text-red-500 font-medium px-1">{error}</p>
                )}

                {/* Bottoni */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleClose}
                    className={`py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {t('change_password_modal.cancel')}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading || !newPassword || !confirmPassword}
                    className="py-3.5 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isLoading ? '…' : t('change_password_modal.save')}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ChangePasswordModal;
