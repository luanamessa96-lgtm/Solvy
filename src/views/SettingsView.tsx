import { useState } from 'react';
import { motion } from 'motion/react';
import { Sun, Moon, Languages, CheckCircle2 } from 'lucide-react';

interface SettingsViewProps {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  key?: string;
}

const SettingsView = ({ darkMode, setDarkMode }: SettingsViewProps) => {
  const [selectedLang, setSelectedLang] = useState('Italiano');
  const languages = ['Italiano', 'English', 'Español', 'Français'];

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 20, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-8">
      <motion.div variants={item} className="space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Aspetto</p>
        <div className={`rounded-3xl p-2 border flex gap-2 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <button onClick={() => setDarkMode(false)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all active:scale-95 ${!darkMode ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:bg-slate-800'}`}>
            <Sun size={18} />
            <span className="text-sm font-bold">Light</span>
          </button>
          <button onClick={() => setDarkMode(true)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all active:scale-95 ${darkMode ? 'bg-white text-slate-900 shadow-xl shadow-white/20' : 'text-slate-400 hover:bg-slate-50'}`}>
            <Moon size={18} />
            <span className="text-sm font-bold">Dark</span>
          </button>
        </div>
      </motion.div>

      <motion.div variants={item} className="space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Lingua Applicazione</p>
        <div className={`rounded-3xl border overflow-hidden divide-y transition-colors ${darkMode ? 'bg-slate-900 border-slate-800 divide-slate-800' : 'bg-white border-slate-100 divide-slate-50'}`}>
          {languages.map(lang => (
            <button key={lang} onClick={() => setSelectedLang(lang)} className={`w-full p-4 flex items-center justify-between group active:scale-[0.98] transition-all ${selectedLang === lang ? (darkMode ? 'bg-slate-800/80 shadow-inner' : 'bg-slate-50 shadow-inner') : (darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50')}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${selectedLang === lang ? 'bg-primary/10 text-primary' : (darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-400')}`}><Languages size={16} /></div>
                <span className={`text-sm font-bold ${selectedLang === lang ? (darkMode ? 'text-white' : 'text-slate-900') : 'text-slate-500'}`}>{lang}</span>
              </div>
              {selectedLang === lang && <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white"><CheckCircle2 size={12} strokeWidth={3} /></div>}
            </button>
          ))}
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
  );
};

export default SettingsView;
