import { useState } from 'react';
import { motion } from 'motion/react';
import { Briefcase, Settings, CreditCard, LogOut, ChevronRight, Sparkles, BarChart2, BookOpen, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Profile } from '../types';
import LogoutModal from '../components/modals/LogoutModal';
import PaywallModal from '../components/modals/PaywallModal';

interface MenuViewProps {
  activeProfile: Profile;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onAccountantClick: () => void;
  onFiscalClick: () => void;
  onGuidaFiscaleClick: () => void;
  onLogout: () => void;
  darkMode?: boolean;
  key?: string;
}

const MenuView = ({ activeProfile, onProfileClick, onSettingsClick, onAccountantClick, onFiscalClick, onGuidaFiscaleClick, onLogout, darkMode }: MenuViewProps) => {
  const { t } = useTranslation();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const isPro = activeProfile.isPro ?? false;

  const menuItems: { label: string; icon: LucideIcon; onClick: () => void; color?: string }[] = [
    { label: 'Fiscalità', icon: BarChart2, onClick: onFiscalClick },
    { label: '📚 Guida Fiscale', icon: BookOpen, onClick: onGuidaFiscaleClick },
    { label: t('menu.accountant'), icon: Briefcase, onClick: onAccountantClick },
    { label: t('menu.settings'), icon: Settings, onClick: onSettingsClick },
    { label: t('menu.subscription'), icon: CreditCard, onClick: () => setIsPaywallOpen(true) },
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
          <button onClick={() => setIsPaywallOpen(true)} className={`text-xs font-bold text-primary shrink-0 active:scale-90 transition-all ${darkMode ? 'hover:text-primary/80' : ''}`}>
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
    </motion.div>
  );
};

export default MenuView;
