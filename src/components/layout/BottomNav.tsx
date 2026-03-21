import { motion } from 'motion/react';
import { LayoutDashboard, FileText, Calendar, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode?: boolean;
}

const BottomNav = ({ activeTab, setActiveTab, darkMode }: BottomNavProps) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    { id: 'docs', label: 'Doc', icon: FileText },
    { id: 'calendar', label: 'Cal', icon: Calendar },
    { id: 'menu', label: 'Menù', icon: Settings },
  ];

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, width: '100vw', padding: 0, zIndex: 30, pointerEvents: 'none' }}>
      <nav style={{ width: '100%', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }} className={`pointer-events-auto border px-1 py-3 flex items-center justify-around overflow-hidden backdrop-blur-xl transition-all duration-500 ${darkMode ? 'bg-slate-900/90 border-slate-800 shadow-[0_20px_50px_rgba(59,130,246,0.15)]' : 'bg-white/90 border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)]'}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ maxWidth: '25%' }} className={`relative flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-all active:scale-95 ${isActive ? 'text-primary' : (darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}>
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-300" />
              {isActive && <span className="text-[9px] font-bold uppercase tracking-wide leading-none">{tab.label}</span>}
              {isActive && (
                <motion.div layoutId="nav-dot" className="absolute -bottom-1.5 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
