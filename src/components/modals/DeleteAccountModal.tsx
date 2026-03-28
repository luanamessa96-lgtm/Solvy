import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, Loader2, Trash2 } from 'lucide-react';
import { getClient } from '../../lib/supabase';
import { Profile } from '../../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const CONFIRM_WORD = 'ELIMINA';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
  profile: Profile;
  profilesCount: number;
}

export default function DeleteAccountModal({ isOpen, onClose, darkMode, profile, profilesCount }: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmText === CONFIRM_WORD;
  // If the user has multiple profiles, delete only this profile — keep auth account and other profiles
  const isProfileOnly = profilesCount > 1;

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await getClient().auth.getSession();
      if (!session) {
        setError('Sessione scaduta. Rieffettua il login e riprova.');
        setLoading(false);
        return;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(isProfileOnly ? { profileId: profile.id } : {}),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Errore durante la cancellazione.');
      }

      if (isProfileOnly) {
        // Solo il profilo: l'account auth rimane intatto, ricarica senza hash URL
        window.location.replace(window.location.origin);
      } else {
        // Account completo: disconnetti e ricarica senza hash URL
        await getClient().auth.signOut().catch(() => {});
        localStorage.clear();
        document.cookie.split(';').forEach(c => {
          const key = c.trim().split('=')[0];
          document.cookie = `${key}=;max-age=0;path=/;SameSite=Lax`;
        });
        window.location.replace(window.location.origin);
      }

    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setConfirmText('');
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`relative w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl ${darkMode ? 'bg-slate-900' : 'bg-white'}`}
          >
            <div className="p-7 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle size={22} className="text-red-600" />
                </div>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-700'}`}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Title */}
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {isProfileOnly ? 'Elimina profilo' : 'Elimina account'}
                </h2>
                <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Questa operazione è <strong>irreversibile</strong> e non può essere annullata.
                </p>
              </div>

              {/* What gets deleted */}
              <div className={`rounded-2xl p-4 space-y-2 ${darkMode ? 'bg-slate-800' : 'bg-red-50'}`}>
                <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                  Verrà cancellato permanentemente:
                </p>
                <ul className={`text-sm space-y-1 ${darkMode ? 'text-slate-300' : 'text-red-800'}`}>
                  {(isProfileOnly ? [
                    `Il profilo "${profile.name}"`,
                    'Tutte le fatture e le spese del profilo',
                    'Tutte le scadenze del profilo',
                    'I dati del commercialista del profilo',
                  ] : [
                    'Il tuo account e le credenziali di accesso',
                    'Tutti i profili fiscali',
                    'Tutte le fatture e le spese',
                    'Tutte le scadenze',
                    'I dati del commercialista',
                    'L\'abbonamento Pro (se attivo)',
                  ]).map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 text-red-500">✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
                {isProfileOnly && (
                  <p className={`text-xs mt-2 pt-2 border-t ${darkMode ? 'border-slate-700 text-slate-400' : 'border-red-100 text-red-600'}`}>
                    Gli altri profili e il tuo account rimarranno intatti.
                  </p>
                )}
              </div>

              {/* Confirmation input */}
              <div className="space-y-2">
                <label className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Digita <span className={`font-black tracking-widest ${darkMode ? 'text-red-400' : 'text-red-600'}`}>ELIMINA</span> per confermare
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => { setConfirmText(e.target.value.toUpperCase()); setError(null); }}
                  placeholder="ELIMINA"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={loading}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-bold tracking-widest border-2 outline-none transition-all ${
                    confirmText && !isConfirmed
                      ? 'border-red-300 bg-red-50 text-red-900'
                      : isConfirmed
                      ? darkMode ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-red-500 bg-red-50 text-red-700'
                      : darkMode
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600 focus:border-red-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-red-400'
                  }`}
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-red-500 text-xs font-medium">{error}</p>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handleDelete}
                  disabled={!isConfirmed || loading}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Cancellazione in corso…
                    </>
                  ) : (
                    <>
                      <Trash2 size={15} />
                      {isProfileOnly ? 'Elimina profilo' : 'Elimina definitivamente'}
                    </>
                  )}
                </button>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className={`w-full py-3 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Annulla
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
