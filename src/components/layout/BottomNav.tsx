import { motion } from 'motion/react';
import { LayoutDashboard, FileText, Calendar, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode?: boolean;
  theme?: string;
}

const BottomNav = ({ activeTab, setActiveTab, darkMode, theme }: BottomNavProps) => {
  const isPro = theme === 'pro-light' || theme === 'pro-dark';

  const tabs = [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    { id: 'docs', label: 'Doc', icon: FileText },
    { id: 'calendar', label: 'Cal', icon: Calendar },
    { id: 'menu', label: 'Menù', icon: Settings },
  ];

  const containerStyle: import('react').CSSProperties = isPro
    ? { position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 24px)', maxWidth: 'calc(448px - 24px)', zIndex: 30, pointerEvents: 'none' }
    : { position: 'fixed', bottom: 0, left: 0, right: 0, width: '100vw', padding: 0, zIndex: 30, pointerEvents: 'none' };

  const navClass = isPro
    ? `pointer-events-auto border px-2 py-2 flex items-center justify-around overflow-hidden backdrop-blur-xl transition-all duration-500 rounded-[20px] shadow-2xl ${
        darkMode
          ? 'bg-slate-800/70 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
          : 'bg-white/80 border-white/60 shadow-[0_8px_32px_rgba(0,100,255,0.12)]'
      }`
    : `pointer-events-auto border px-0 py-3 flex items-center justify-evenly backdrop-blur-xl transition-all duration-500 ${
        darkMode
          ? 'bg-slate-900/90 border-slate-800 shadow-[0_20px_50px_rgba(59,130,246,0.15)]'
          : 'bg-white/90 border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
      }`;

  return (
    <div style={containerStyle}>
      <nav role="navigation" aria-label="Navigazione principale" style={isPro ? undefined : { width: '100%', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }} className={navClass}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-all active:scale-95 ${
                isActive ? 'text-primary' : (darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
              }`}
            >
              {isPro && isActive ? (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-0.5 ${darkMode ? 'bg-blue-500/15' : 'bg-[#E8F0FE]'}`}>
                  <Icon size={18} strokeWidth={2.5} className={darkMode ? 'text-[#00B4FF]' : 'text-[#4A7FD4]'} />
                </div>
              ) : (
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-300" />
              )}
              {isActive && <span className="text-[9px] font-bold uppercase tracking-wide leading-none">{tab.label}</span>}
              {isActive && (
                <motion.div
                  layoutId="nav-dot"
                  className={`absolute -bottom-1.5 w-1.5 h-1.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] ${isPro && darkMode ? 'bg-[#00B4FF]' : isPro ? 'bg-[#4A7FD4]' : 'bg-primary'}`}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
