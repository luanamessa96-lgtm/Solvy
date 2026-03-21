import { useState } from 'react';
import { motion } from 'motion/react';
import { Briefcase, Settings, CreditCard, LogOut, ChevronRight, type LucideIcon } from 'lucide-react';
import { Profile } from '../types';
import LogoutModal from '../components/modals/LogoutModal';

interface MenuViewProps {
  activeProfile: Profile;
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onAccountantClick: () => void;
  onLogout: () => void;
  darkMode?: boolean;
  key?: string;
}

const MenuView = ({ activeProfile, onProfileClick, onSettingsClick, onAccountantClick, onLogout, darkMode }: MenuViewProps) => {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const menuItems: { label: string; icon: LucideIcon; onClick: () => void; color?: string }[] = [
    { label: 'Il mio Commercialista', icon: Briefcase, onClick: onAccountantClick },
    { label: 'Impostazioni', icon: Settings, onClick: onSettingsClick },
    { label: 'Abbonamento', icon: CreditCard, onClick: () => {} },
    { label: 'Logout', icon: LogOut, onClick: () => setIsLogoutModalOpen(true), color: 'text-red-500' },
  ];

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 15, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-6 pb-24">
      <motion.button variants={item} onClick={onProfileClick} className={`w-full p-6 rounded-[32px] border flex items-center gap-5 active:scale-[0.98] transition-all shadow-sm hover:shadow-xl ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'}`}>
        <div className="relative">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-[#E8D5C4]'}`}>
            <img src={activeProfile.avatar} alt={activeProfile.name} className={`w-full h-full object-cover ${darkMode ? 'opacity-90' : 'mix-blend-multiply opacity-80'}`} />
          </div>
          <div className={`absolute inset-0 rounded-full border-2 ${darkMode ? 'border-slate-700/50' : 'border-white/50'}`} />
        </div>
        <div className="text-left">
          <h2 className={`text-xl font-bold leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{activeProfile.name}</h2>
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

      <div className={`p-6 rounded-3xl space-y-4 relative overflow-hidden transition-all hover:shadow-2xl active:scale-[0.99] ${darkMode ? 'bg-primary/10 border border-primary/20 hover:border-primary/40 hover:shadow-primary/10' : 'bg-slate-900 text-white hover:shadow-slate-900/20'}`}>
        {!darkMode && <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />}
        <h3 className={`text-lg font-bold relative z-10 ${darkMode ? 'text-primary' : 'text-white'}`}>Passa a Pro</h3>
        <p className={`text-xs relative z-10 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>Sblocca l'export per il commercialista, tasse automatiche e profili illimitati.</p>
        <button className="w-full bg-primary py-3 rounded-xl text-sm font-bold relative z-10 text-white shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all">Scopri i Piani</button>
      </div>

      <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={() => { setIsLogoutModalOpen(false); onLogout(); }} darkMode={darkMode} />
    </motion.div>
  );
};

export default MenuView;
