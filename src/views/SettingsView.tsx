import { useState } from 'react';
import { motion } from 'motion/react';
import { Sun, Moon, Sparkles, Lock, Languages, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PaywallModal from '../components/modals/PaywallModal';
import DeleteAccountModal from '../components/modals/DeleteAccountModal';
import { useProStatus } from '../hooks/useProStatus';
import { Profile } from '../types';

interface SettingsViewProps {
  theme: string;
  setTheme: (t: string) => void;
  profile: Profile;
  key?: string;
}

const SettingsView = ({ theme, setTheme, profile }: SettingsViewProps) => {
  const { t } = useTranslation();
  const isPro = useProStatus(profile);
  const darkMode = theme === 'dark' || theme === 'pro-dark';
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } };
  const item = { hidden: { opacity: 0 }, show: { opacity: 1 } };

  const themes = [
    { id: 'light', label: 'Light', icon: Sun, pro: false },
    { id: 'dark', label: 'Dark', icon: Moon, pro: false },
    { id: 'pro-light', label: 'Pro Light', icon: Sparkles, pro: true },
    { id: 'pro-dark', label: 'Pro Dark', icon: Sparkles, pro: true },
  ];

  const legalItems = [
    { label: t('settings.privacy_policy'), href: '/privacy' },
    { label: t('settings.terms_of_service'), href: '/terms' },
  ];

  return (
    <>
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-8 pb-40">
      <motion.div variants={item} className="space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('settings.appearance')}</p>
        <div className={`rounded-3xl p-2 border grid grid-cols-2 gap-2 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          {themes.map(themeItem => {
            const Icon = themeItem.icon;
            const isActive = theme === themeItem.id;
            const locked = themeItem.pro && !isPro;
            return (
              <button
                key={themeItem.id}
                onClick={() => { if (locked) { setIsPaywallOpen(true); return; } setTheme(themeItem.id); }}
                className={`relative flex items-center justify-center gap-2 py-3 rounded-2xl transition-all active:scale-95 ${
                  isActive
                    ? themeItem.pro
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : darkMode
                      ? 'bg-slate-700 text-white shadow-lg shadow-slate-900/40'
                      : 'bg-white text-slate-900 shadow-lg shadow-slate-200'
                    : locked
                    ? 'opacity-50 cursor-not-allowed'
                    : darkMode
                    ? 'text-slate-500 hover:text-slate-300'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon size={16} />
                <span className="text-sm font-bold">{themeItem.label}</span>
                {locked && <Lock size={11} className="absolute top-2 right-2 text-slate-400" />}
              </button>
            );
          })}
        </div>
        {!isPro && (
          <p className="text-xs text-slate-400 text-center ml-1">
            {t('settings.pro_themes_hint')}<span className="text-primary font-semibold">FreelanceApp Pro</span>
          </p>
        )}
      </motion.div>

      <motion.div variants={item} className="space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('settings.language')}</p>
        <div className={`p-4 rounded-3xl border flex items-center gap-4 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}><Languages size={20} /></div>
          <div>
            <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('settings.language_current')}</p>
            <p className="text-xs text-slate-400">{t('settings.language_future')}</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className={`p-6 rounded-3xl space-y-2 transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <p className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('settings.app_version')}</p>
        <p className="text-xs text-slate-500">v2.5.0 (Build 2026.03)</p>
        <div className="pt-4 flex gap-4">
          <button className="text-[10px] font-bold text-primary uppercase tracking-wider active:scale-90 transition-all hover:drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]">{t('settings.release_notes')}</button>
          <button className="text-[10px] font-bold text-primary uppercase tracking-wider active:scale-90 transition-all hover:drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]">{t('settings.support')}</button>
        </div>
      </motion.div>

      <motion.div variants={item} className={`rounded-3xl border overflow-hidden transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-5 pt-5 pb-3">{t('settings.legal')}</p>
        {legalItems.map(({ label, href }, i, arr) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between px-5 py-3.5 active:bg-primary/5 transition-colors ${i < arr.length - 1 ? (darkMode ? 'border-b border-slate-800' : 'border-b border-slate-50') : ''}`}
          >
            <span className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{label}</span>
            <span className="text-slate-400 text-xs">↗</span>
          </a>
        ))}
      </motion.div>
      <motion.div variants={item} className="pt-2">
        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-red-500 border active:scale-[0.98] transition-all ${darkMode ? 'border-red-900 hover:bg-red-900/20' : 'border-red-200 hover:bg-red-50'}`}
        >
          <Trash2 size={15} />
          {t('settings.delete_account')}
        </button>
      </motion.div>
    </motion.div>
    <PaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} darkMode={darkMode} />
    <DeleteAccountModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} darkMode={darkMode} />
    </>
  );
};

export default SettingsView;
