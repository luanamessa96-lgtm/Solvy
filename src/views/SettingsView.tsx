import { motion } from 'motion/react';
import { Sun, Moon, Languages } from 'lucide-react';

interface SettingsViewProps {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  key?: string;
}

const SettingsView = ({ darkMode, setDarkMode }: SettingsViewProps) => {

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 20, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-8">
      <motion.div variants={item} className="space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Aspetto</p>
        <div className={`rounded-3xl p-2 border flex gap-2 transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <button onClick={() => setDarkMode(false)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all active:scale-95 ${!darkMode ? 'bg-white text-slate-900 shadow-lg shadow-slate-200' : 'text-slate-500 hover:text-slate-300'}`}>
            <Sun size={18} />
            <span className="text-sm font-bold">Light</span>
          </button>
          <button onClick={() => setDarkMode(true)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all active:scale-95 ${darkMode ? 'bg-slate-700 text-white shadow-lg shadow-slate-900/40' : 'text-slate-400 hover:text-slate-600'}`}>
            <Moon size={18} />
            <span className="text-sm font-bold">Dark</span>
          </button>
        </div>
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
  );
};

export default SettingsView;
