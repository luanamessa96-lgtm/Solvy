import { useState } from 'react';
import { motion } from 'motion/react';
import { Briefcase, Settings, CreditCard, LogOut, ChevronRight, Sparkles, BarChart2, BookOpen, X, Calendar, XCircle, RotateCcw, Loader2, CheckCircle2, AlertCircle, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Profile } from '../types';
import LogoutModal from '../components/modals/LogoutModal';
import PaywallModal from '../components/modals/PaywallModal';
import { getClient } from '../lib/supabase';

interface MenuViewProps {
  activeProfile: Profile;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onAccountantClick: () => void;
  onFiscalClick: () => void;
  onGuidaFiscaleClick: () => void;
  onGuiaFiscalESClick: () => void;
  onLogout: () => void;
  darkMode?: boolean;
  key?: string;
}

const MenuView = ({ activeProfile, onProfileClick, onSettingsClick, onAccountantClick, onFiscalClick, onGuidaFiscaleClick, onGuiaFiscalESClick, onLogout, darkMode }: MenuViewProps) => {
  const { t } = useTranslation();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const isPro = activeProfile.isPro ?? false;

  type RefundStep = 'idle' | 'confirming' | 'loading' | 'success' | 'error';
  const [refundStep, setRefundStep] = useState<RefundStep>('idle');
  const [refundError, setRefundError] = useState('');

  const daysLeft = (() => {
    if (!activeProfile.subscriptionStartedAt) return null;
    const elapsed = (Date.now() - new Date(activeProfile.subscriptionStartedAt).getTime()) / (1000 * 60 * 60 * 24);
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

  const menuItems: { label: string; icon: LucideIcon; onClick: () => void; color?: string }[] = [
    { label: 'Fiscalità', icon: BarChart2, onClick: onFiscalClick },
    ...(activeProfile.country !== 'Spain' ? [{ label: '📚 Guida Fiscale', icon: BookOpen, onClick: onGuidaFiscaleClick }] : []),
    ...(activeProfile.country === 'Spain' ? [{ label: '📚 Guía Fiscal', icon: BookOpen, onClick: onGuiaFiscalESClick }] : []),
    { label: t('menu.accountant'), icon: Briefcase, onClick: onAccountantClick },
    { label: t('menu.settings'), icon: Settings, onClick: onSettingsClick },
    { label: t('menu.subscription'), icon: CreditCard, onClick: () => isPro ? setIsSubModalOpen(true) : setIsPaywallOpen(true) },
    { label: t('menu.logout'), icon: LogOut, onClick: () => setIsLogoutModalOpen(true), color: 'text-red-500' },
  ];

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } };
  const item = { hidden: { opacity: 0 }, show: { opacity: 1 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-6 pb-24">
      <motion.button variants={item} onClick={onProfileClick} className={`w-full p-6 rounded-[32px] border flex items-center gap-5 active:scale-[0.98] transition-all shadow-sm hover:shadow-xl ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'}`}>
        <div className="relative">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-[#E8D5C4]'}`}>
            <img src={activeProfile.avatar} alt={activeProfile.name} width="64" height="64" className={`w-full h-full object-cover ${darkMode ? 'opacity-90' : 'mix-blend-multiply opacity-80'}`} />
          </div>
          <div className={`absolute inset-0 rounded-full border-2 ${darkMode ? 'border-slate-700/50' : 'border-white/50'}`} />
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <h2 className={`text-xl font-bold leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{activeProfile.name}</h2>
            {isPro && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold">
                <Sparkles size={9} /> PRO
              </span>
            )}
          </div>
          <p className={`text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{activeProfile.jobType}</p>
        </div>
        <ChevronRight size={20} className="ml-auto text-slate-300" />
      </motion.button>

      <div className="space-y-2">
        {menuItems.map(menuItem => {
          const Icon = menuItem.icon;
          return (
            <motion.button variants={item} key={menuItem.label} onClick={menuItem.onClick} className={`w-full p-4 rounded-2xl border flex items-center justify-between group active:scale-[0.98] transition-all hover:shadow-lg ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${menuItem.color ? 'bg-red-50 text-red-500' : (darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-400')}`}><Icon size={20} /></div>
                <span className={`font-bold ${menuItem.color || (darkMode ? 'text-slate-200' : 'text-slate-900')}`}>{menuItem.label}</span>
              </div>
              <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          );
        })}
      </div>

      {isPro ? (
        <div className={`p-5 rounded-3xl flex items-center gap-4 border transition-colors ${darkMode ? 'bg-primary/10 border-primary/20' : 'bg-primary/5 border-primary/15'}`}>
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-primary">{t('menu.pro_active')}</p>
            <p className="text-xs text-slate-400 mt-0.5">{t('menu.pro_features')}</p>
          </div>
          <button onClick={() => setIsSubModalOpen(true)} className={`text-xs font-bold text-primary shrink-0 active:scale-90 transition-all ${darkMode ? 'hover:text-primary/80' : ''}`}>
            {t('menu.manage')}
          </button>
        </div>
      ) : (
        <div className={`p-6 rounded-3xl space-y-4 relative overflow-hidden transition-all hover:shadow-2xl active:scale-[0.99] ${darkMode ? 'bg-primary/10 border border-primary/20 hover:border-primary/40 hover:shadow-primary/10' : 'bg-slate-900 text-white hover:shadow-slate-900/20'}`}>
          {!darkMode && <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />}
          <h3 className={`text-lg font-bold relative z-10 ${darkMode ? 'text-primary' : 'text-white'}`}>{t('menu.upgrade_title')}</h3>
          <p className={`text-xs relative z-10 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>{t('menu.upgrade_body')}</p>
          <button onClick={() => setIsPaywallOpen(true)} className="w-full bg-primary py-3 rounded-xl text-sm font-bold relative z-10 text-white shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all">{t('menu.discover_plans')}</button>
        </div>
      )}

      <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={() => { setIsLogoutModalOpen(false); onLogout(); }} darkMode={darkMode} />
      <PaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} darkMode={darkMode} />

      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsSubModalOpen(false)} />
          <div className={`relative w-full max-w-md rounded-t-[32px] p-6 pb-10 space-y-4 shadow-2xl ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Il mio abbonamento</h2>
              <button onClick={() => setIsSubModalOpen(false)} className={`p-2 rounded-full active:scale-90 transition-all ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}><X size={18} /></button>
            </div>

            <div className={`flex items-center gap-3 p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Sparkles size={18} className="text-primary" /></div>
              <div>
                <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Solvy Pro</p>
                <p className="text-xs text-slate-400">Piano attivo ✓</p>
              </div>
            </div>

            {activeProfile.subscriptionStartedAt && (
              <div className={`flex items-center gap-3 p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Calendar size={18} className="text-primary" /></div>
                <div>
                  <p className="text-xs text-slate-400">Prossimo rinnovo stimato</p>
                  <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{(() => { const d = new Date(activeProfile.subscriptionStartedAt!); d.setMonth(d.getMonth() + 1); return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); })()}</p>
                </div>
              </div>
            )}

            <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-2 mb-2"><XCircle size={15} className="text-slate-400 shrink-0" /><p className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Come cancellare</p></div>
              <p className="text-xs text-slate-400 leading-relaxed">Vai su <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-700'}`}>App Store → ID Apple → Abbonamenti → Solvy</span> e seleziona "Annulla abbonamento".</p>
            </div>

            {daysLeft !== null && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">Hai ancora {daysLeft} giorn{daysLeft === 1 ? 'o' : 'i'} per richiedere il rimborso.</p>
                {refundStep === 'success' ? (
                  <div className={`flex items-center gap-2 p-3 rounded-2xl ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}><CheckCircle2 size={16} className="text-green-500" /><p className={`text-xs font-medium ${darkMode ? 'text-green-300' : 'text-green-800'}`}>Rimborso elaborato con successo.</p></div>
                ) : refundStep === 'error' ? (
                  <div className={`flex items-center gap-2 p-3 rounded-2xl ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}><AlertCircle size={16} className="text-red-500" /><p className={`text-xs font-medium ${darkMode ? 'text-red-300' : 'text-red-800'}`}>{refundError || 'Errore nel rimborso.'}</p></div>
                ) : refundStep === 'confirming' ? (
                  <div className={`p-4 rounded-2xl space-y-3 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <p className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Conferma rimborso</p>
                    <p className="text-xs text-slate-400">L'abbonamento verrà cancellato e riceverai un rimborso proporzionale.</p>
                    <div className="flex gap-2">
                      <button onClick={handleRefund} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500 active:scale-95 transition-all flex items-center justify-center gap-1.5"><RotateCcw size={12} />Conferma</button>
                      <button onClick={() => setRefundStep('idle')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all ${darkMode ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-600 border border-slate-200'}`}>Annulla</button>
                    </div>
                  </div>
                ) : refundStep === 'loading' ? (
                  <div className="flex items-center justify-center gap-2 py-3"><Loader2 size={16} className="text-primary animate-spin" /><span className="text-sm text-slate-500">Elaborazione…</span></div>
                ) : (
                  <button onClick={() => setRefundStep('confirming')} className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-red-500 border active:scale-[0.98] transition-all ${darkMode ? 'border-red-900 hover:bg-red-900/20' : 'border-red-200 hover:bg-red-50'}`}><RotateCcw size={14} />Richiedi rimborso</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MenuView;
