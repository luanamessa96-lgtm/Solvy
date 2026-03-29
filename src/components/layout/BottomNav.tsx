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

  const isProDark = theme === 'pro-dark';

  const navClass = isPro
    ? `pointer-events-auto border px-2 py-2 flex items-center justify-around transition-all duration-500 rounded-[20px] shadow-2xl ${
        isProDark
          ? 'border-transparent'
          : darkMode
          ? 'border-white/10 backdrop-blur-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
          : 'border-white/40 overflow-hidden shadow-[0_8px_32px_rgba(200,85,247,0.12)]'
      }`
    : `pointer-events-auto border px-0 py-3 flex items-center justify-evenly backdrop-blur-xl transition-all duration-500 ${
        darkMode
          ? 'border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)]'
          : 'bg-white/90 border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
      }`;

  return (
    <div style={containerStyle}>
      <nav role="navigation" aria-label="Navigazione principale" style={isPro
          ? (isProDark
            ? { background: 'rgba(15, 10, 30, 0.9)', border: '1px solid rgba(200, 85, 247, 0.12)', borderRadius: '20px' }
            : { backgroundColor: 'var(--color-nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' })
          : { width: '100%', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))', ...(darkMode ? { backgroundColor: 'var(--color-nav-bg)' } : {}) }
        } className={navClass}>
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
                isActive ? '' : (darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
              }`}
              style={isActive ? { color: 'var(--color-nav-icon)' } : undefined}
            >
              {isPro && isActive ? (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-0.5" style={{ backgroundColor: 'var(--color-nav-icon-bg)' }}>
                  <Icon size={18} strokeWidth={2.5} style={{ color: 'var(--color-nav-icon)' }} />
                </div>
              ) : (
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-300" />
              )}
              {isActive && <span className="text-[9px] font-bold uppercase tracking-wide leading-none">{tab.label}</span>}
              {isActive && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-nav-icon)', boxShadow: '0 0 10px color-mix(in srgb, var(--color-nav-icon) 80%, transparent)' }}
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
