import { useState } from 'react';
import { motion } from 'motion/react';
import { Sun, Moon, Sparkles, Lock, Languages } from 'lucide-react';
import PaywallModal from '../components/modals/PaywallModal';

interface SettingsViewProps {
  theme: string;
  setTheme: (t: string) => void;
  isPro: boolean;
  key?: string;
}

const SettingsView = ({ theme, setTheme, isPro }: SettingsViewProps) => {
  const darkMode = theme === 'dark' || theme === 'pro-dark';
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } };
  const item = { hidden: { opacity: 0 }, show: { opacity: 1 } };

  const themes = [
    { id: 'light', label: 'Light', icon: Sun, pro: false },
    { id: 'dark', label: 'Dark', icon: Moon, pro: false },
    { id: 'pro-light', label: 'Pro Light', icon: Sparkles, pro: true },
    { id: 'pro-dark', label: 'Pro Dark', icon: Sparkles, pro: true },
  ];

  return (
    <>
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-8 pb-24">
      <motion.div variants={item} className="space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Aspetto</p>
        <div className={`rounded-3xl p-2 border grid grid-cols-2 gap-2 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          {themes.map(t => {
            const Icon = t.icon;
            const isActive = theme === t.id;
            const locked = t.pro && !isPro;
            return (
              <button
                key={t.id}
                onClick={() => { if (locked) { setIsPaywallOpen(true); return; } setTheme(t.id); }}
                className={`relative flex items-center justify-center gap-2 py-3 rounded-2xl transition-all active:scale-95 ${
                  isActive
                    ? t.pro
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
                <span className="text-sm font-bold">{t.label}</span>
                {locked && <Lock size={11} className="absolute top-2 right-2 text-slate-400" />}
              </button>
            );
          })}
        </div>
        {!isPro && (
          <p className="text-xs text-slate-400 text-center ml-1">
            I temi Pro richiedono un abbonamento <span className="text-primary font-semibold">FreelanceApp Pro</span>
          </p>
        )}
      </motion.div>

      <motion.div variants={item} className="space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Lingua Applicazione</p>
        <div className={`p-4 rounded-3xl border flex items-center gap-4 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}><Languages size={20} /></div>
          <div>
            <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Italiano</p>
            <p className="text-xs text-slate-400">Altre lingue disponibili in futuro</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className={`p-6 rounded-3xl space-y-2 transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <p className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Versione App</p>
        <p className="text-xs text-slate-500">v2.4.0 (Build 2026.03)</p>
        <div className="pt-4 flex gap-4">
          <button className="text-[10px] font-bold text-primary uppercase tracking-wider active:scale-90 transition-all hover:drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]">Note di rilascio</button>
          <button className="text-[10px] font-bold text-primary uppercase tracking-wider active:scale-90 transition-all hover:drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]">Supporto</button>
        </div>
      </motion.div>
    </motion.div>
    <PaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} darkMode={darkMode} />
    </>
  );
};

export default SettingsView;
