import { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Calendar, XCircle, RotateCcw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Profile } from '../types';
import { getClient } from '../lib/supabase';

interface SubscriptionViewProps {
  profile: Profile;
  darkMode?: boolean;
}

const SubscriptionView = ({ profile, darkMode }: SubscriptionViewProps) => {
  type RefundStep = 'idle' | 'confirming' | 'loading' | 'success' | 'error';
  const [refundStep, setRefundStep] = useState<RefundStep>('idle');
  const [refundError, setRefundError] = useState('');

  const daysLeft = (() => {
    if (!profile.subscriptionStartedAt) return null;
    const elapsed = (Date.now() - new Date(profile.subscriptionStartedAt).getTime()) / (1000 * 60 * 60 * 24);
    const remaining = 14 - elapsed;
    return remaining > 0 ? Math.ceil(remaining) : null;
  })();

  const handleRefund = async () => {
    setRefundStep('loading');
    try {
      const { data: { session } } = await getClient().auth.getSession();
      if (!session) throw new Error('Sessione non trovata');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore rimborso');
      setRefundStep('success');
    } catch (err) {
      setRefundError((err as Error).message);
      setRefundStep('error');
    }
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } };
  const item = { hidden: { opacity: 0 }, show: { opacity: 1 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 7rem)' }}>

      {/* Piano attivo */}
      <motion.div variants={item} className={`flex items-center gap-4 p-5 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles size={22} className="text-primary" />
        </div>
        <div>
          <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Solvy Pro</p>
          <p className="text-sm text-slate-400">Piano attivo ✓</p>
        </div>
      </motion.div>

      {/* Data rinnovo */}
      {profile.subscriptionStartedAt && (
        <motion.div variants={item} className={`flex items-center gap-4 p-5 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Calendar size={22} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Prossimo rinnovo stimato</p>
            <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {(() => {
                const d = new Date(profile.subscriptionStartedAt!);
                d.setMonth(d.getMonth() + 1);
                return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
              })()}
            </p>
          </div>
        </motion.div>
      )}

      {/* Come cancellare */}
      <motion.div variants={item} className={`p-5 rounded-3xl border space-y-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center gap-2">
          <XCircle size={16} className="text-slate-400 shrink-0" />
          <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Come cancellare</p>
        </div>
        <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Vai su{' '}
          <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-700'}`}>
            App Store → ID Apple → Abbonamenti → Solvy
          </span>{' '}
          e seleziona "Annulla abbonamento".
        </p>
      </motion.div>

      {/* Rimborso 14 giorni */}
      {daysLeft !== null && (
        <motion.div variants={item} className={`p-5 rounded-3xl border space-y-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Hai ancora <span className="font-bold text-primary">{daysLeft} giorn{daysLeft === 1 ? 'o' : 'i'}</span> per richiedere il rimborso.
          </p>

          {refundStep === 'success' ? (
            <div className={`flex items-center gap-3 p-4 rounded-2xl ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
              <CheckCircle2 size={18} className="text-green-500 shrink-0" />
              <p className={`text-sm font-medium ${darkMode ? 'text-green-300' : 'text-green-800'}`}>Rimborso elaborato con successo.</p>
            </div>
          ) : refundStep === 'error' ? (
            <div className={`flex items-center gap-3 p-4 rounded-2xl ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
              <AlertCircle size={18} className="text-red-500 shrink-0" />
              <p className={`text-sm font-medium ${darkMode ? 'text-red-300' : 'text-red-800'}`}>{refundError || 'Errore nel rimborso.'}</p>
            </div>
          ) : refundStep === 'confirming' ? (
            <div className={`p-4 rounded-2xl space-y-3 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Conferma rimborso</p>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>L'abbonamento verrà cancellato e riceverai un rimborso proporzionale.</p>
              <div className="flex gap-2 pt-1">
                <button onClick={handleRefund} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-red-500 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <RotateCcw size={14} /> Conferma
                </button>
                <button onClick={() => setRefundStep('idle')} className={`flex-1 py-3 rounded-2xl text-sm font-bold active:scale-95 transition-all ${darkMode ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-600 border border-slate-200'}`}>
                  Annulla
                </button>
              </div>
            </div>
          ) : refundStep === 'loading' ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 size={18} className="text-primary animate-spin" />
              <span className="text-sm text-slate-500">Elaborazione rimborso…</span>
            </div>
          ) : (
            <button onClick={() => setRefundStep('confirming')} className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-red-500 border active:scale-[0.98] transition-all ${darkMode ? 'border-red-900 hover:bg-red-900/20' : 'border-red-200 hover:bg-red-50'}`}>
              <RotateCcw size={16} /> Richiedi rimborso
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default SubscriptionView;
