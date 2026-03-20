import { motion } from 'motion/react';
import { LayoutDashboard, FileText, Calendar, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode?: boolean;
}

const BottomNav = ({ activeTab, setActiveTab, darkMode }: BottomNavProps) => {
  const tabs = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'docs', label: 'Documenti', icon: FileText },
    { id: 'calendar', label: 'Calendario', icon: Calendar },
    { id: 'menu', label: 'Menu', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-6 [padding-bottom:max(1.5rem,env(safe-area-inset-bottom))] pointer-events-none">
      <nav className={`max-w-md mx-auto pointer-events-auto rounded-[32px] border px-4 py-4 flex justify-between items-center backdrop-blur-xl transition-all duration-500 ${darkMode ? 'bg-slate-900/90 border-slate-800 shadow-[0_20px_50px_rgba(59,130,246,0.15)] hover:shadow-[0_20px_60px_rgba(59,130,246,0.25)]' : 'bg-white/90 border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)]'}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex flex-col items-center gap-1 py-2 px-2 transition-all active:scale-95 ${isActive ? 'text-primary' : (darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-300" />
              <span className={`text-[9px] font-bold uppercase tracking-wide transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-40'}`}>{tab.label}</span>
              {isActive && (
                <motion.div layoutId="nav-dot" className="absolute -bottom-2 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
