import { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Calendar, Shield, CreditCard, XCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Spinner from '../components/ui/Spinner';
import { Profile } from '../types';
import { getClient } from '../lib/supabase';

interface SubscriptionViewProps {
  profile: Profile;
  darkMode?: boolean;
}

// Usa lo stesso URL del client Supabase (Dev in preview, Production in prod)
// così il JWT e la edge function appartengono sempre allo stesso progetto
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL_DEV ?? import.meta.env.VITE_SUPABASE_URL) as string;

const SubscriptionView = ({ profile, darkMode }: SubscriptionViewProps) => {
  const { t } = useTranslation();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');

  type CancelStep = 'idle' | 'confirming' | 'loading' | 'success' | 'error';
  const [cancelStep, setCancelStep] = useState<CancelStep>('idle');
  const [cancelError, setCancelError] = useState('');
  const [cancelDate, setCancelDate] = useState('');

  const planLabel = profile.subscriptionPlan === 'yearly' ? t('subscription_view.plan_yearly') : t('subscription_view.plan_monthly');
  const planPrice = profile.subscriptionPlan === 'yearly' ? t('subscription_view.price_yearly') : t('subscription_view.price_monthly');

  const renewalDate = (() => {
    if (!profile.subscriptionStartedAt) return null;
    const d = new Date(profile.subscriptionStartedAt);
    if (profile.subscriptionPlan === 'yearly') {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  })();

  const startDate = profile.subscriptionStartedAt
    ? new Date(profile.subscriptionStartedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    setPortalError('');
    // Apre la finestra subito nel tick sincrono del tap — altrimenti iOS Safari la blocca come popup
    const win = window.open('', '_blank');
    try {
      const { data: { user } } = await getClient().auth.getUser();
      if (!user) throw new Error('Sessione non trovata');
      const { data: { session } } = await getClient().auth.getSession();
      if (!session) throw new Error('Sessione non trovata');
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-customer-portal-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ return_url: window.location.href }),
      });
      const data = await res.json();
      if (!res.ok) {
        win?.close();
        throw new Error(data.error ?? `Errore ${res.status} apertura portale`);
      }
      if (!data.url) { win?.close(); throw new Error('URL portale non ricevuto'); }
      if (win) {
        win.location.href = data.url;
      } else {
        window.location.href = data.url;
      }
    } catch (err) {
      setPortalError((err as Error).message);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelStep('loading');
    setCancelError('');
    try {
      // getUser() valida il token via rete (come fa il portal). Se ok, getSession()
      // restituisce il token aggiornato dall'autoRefresh interno del client.
      const { data: { user }, error: userError } = await getClient().auth.getUser();
      if (userError || !user) throw new Error('Sessione scaduta, effettua nuovamente l\'accesso');
      const { data: { session } } = await getClient().auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Token non disponibile, effettua nuovamente l\'accesso');
      const res = await fetch(`${SUPABASE_URL}/functions/v1/cancel-subscription-end-period`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore cancellazione');
      const date = data.current_period_end
        ? new Date(data.current_period_end).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
      setCancelDate(date);
      setCancelStep('success');
    } catch (err) {
      setCancelError((err as Error).message);
      setCancelStep('error');
    }
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } };
  const item = { hidden: { opacity: 0 }, show: { opacity: 1 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 7rem)' }}>

      {/* Badge Pro attivo */}
      <motion.div variants={item} className={`p-5 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles size={22} className="text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('subscription_view.pro_active')}</p>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[10px] font-bold uppercase tracking-wide">{t('subscription_view.active_badge')}</span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">{planLabel} · {planPrice}</p>
            {startDate && <p className="text-xs text-slate-500 mt-0.5">{t('subscription_view.active_since', { date: startDate })}</p>}
          </div>
        </div>
      </motion.div>

      {/* Prossimo rinnovo */}
      {renewalDate && cancelStep !== 'success' && (
        <motion.div variants={item} className={`flex items-center gap-4 p-5 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Calendar size={22} className="text-primary" />
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">{t('subscription_view.next_renewal')}</p>
            <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{renewalDate}</p>
          </div>
        </motion.div>
      )}

      {/* Successo cancellazione */}
      {cancelStep === 'success' && (
        <motion.div variants={item} className={`flex items-center gap-3 p-4 rounded-2xl ${darkMode ? 'bg-amber-900/20 border border-amber-800' : 'bg-amber-50 border border-amber-200'}`}>
          <CheckCircle2 size={18} className="text-amber-500 shrink-0" />
          <p className={`text-sm font-medium ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
            {t('subscription_view.cancel_success', { date: cancelDate })}
          </p>
        </motion.div>
      )}

      {/* Gestisci pagamento */}
      <motion.div variants={item}>
        <button
          onClick={handleOpenPortal}
          disabled={portalLoading}
          className={`w-full flex items-center gap-4 p-5 rounded-3xl border transition-all active:scale-[0.98] disabled:opacity-60 ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40' : 'bg-white border-slate-100 hover:border-primary/20'}`}
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            {portalLoading ? <Spinner size={22} /> : <CreditCard size={22} className="text-primary" />}
          </div>
          <div className="text-left">
            <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('subscription_view.payment_title')}</p>
            <p className="text-xs text-slate-400">{t('subscription_view.payment_subtitle')}</p>
          </div>
        </button>
        {portalError && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <AlertCircle size={13} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-500">{portalError}</p>
          </div>
        )}
      </motion.div>

      {/* Cancella abbonamento */}
      {cancelStep !== 'success' && (
        <motion.div variants={item} className={`p-5 rounded-3xl border space-y-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <XCircle size={16} className="text-slate-400 shrink-0" />
            <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('subscription_view.cancel_title')}</p>
          </div>
          <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('subscription_view.cancel_body')}
          </p>

          {cancelStep === 'error' && (
            <div className={`flex items-center gap-2 p-3 rounded-2xl ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
              <AlertCircle size={15} className="text-red-500 shrink-0" />
              <p className={`text-xs font-medium ${darkMode ? 'text-red-300' : 'text-red-800'}`}>{cancelError || t('subscription_view.cancel_error')}</p>
            </div>
          )}

          {cancelStep === 'confirming' ? (
            <div className={`p-4 rounded-2xl space-y-3 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('subscription_view.cancel_confirm_title')}</p>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('subscription_view.cancel_confirm_body')}
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCancelSubscription}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-red-500 active:scale-95 transition-all"
                >
                  {t('subscription_view.cancel_yes')}
                </button>
                <button
                  onClick={() => setCancelStep('idle')}
                  className={`flex-1 py-3 rounded-2xl text-sm font-bold active:scale-95 transition-all ${darkMode ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-600 border border-slate-200'}`}
                >
                  {t('subscription_view.cancel_no')}
                </button>
              </div>
            </div>
          ) : cancelStep === 'loading' ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Spinner size={18} />
              <span className="text-sm text-slate-500">{t('subscription_view.cancel_loading')}</span>
            </div>
          ) : (
            <button
              onClick={() => setCancelStep('confirming')}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-red-500 border active:scale-[0.98] transition-all ${darkMode ? 'border-red-900 hover:bg-red-900/20' : 'border-red-200 hover:bg-red-50'}`}
            >
              <XCircle size={16} /> {t('subscription_view.cancel_btn')}
            </button>
          )}
        </motion.div>
      )}

      {/* Footer sicurezza */}
      <motion.div variants={item} className="flex items-center justify-center gap-2 pt-2">
        <Shield size={13} className="text-slate-400" />
        <p className="text-xs text-slate-400">{t('subscription_view.secure_payment')}</p>
      </motion.div>

    </motion.div>
  );
};

export default SubscriptionView;
