import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, FileText, Calendar, Settings, Plus } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode?: boolean;
  theme?: string;
  onPlusPress?: () => void;
  isNavHidden?: boolean;
}

const BottomNav = ({ activeTab, setActiveTab, darkMode, theme, onPlusPress, isNavHidden }: BottomNavProps) => {
  const isPro = theme === 'pro-light' || theme === 'pro-dark';
  const isProLight = theme === 'pro-light';
  const isProDark = theme === 'pro-dark';

  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const maxScroll = 150;
      const progress = Math.min(scrollY / maxScroll, 1);
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const tabs = [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    { id: 'docs', label: 'Doc', icon: FileText },
    { id: 'calendar', label: 'Cal', icon: Calendar },
    { id: 'menu', label: 'Menù', icon: Settings },
  ];

  const hideTranslate = isNavHidden ? 'translateY(calc(100% + 80px))' : 'translateY(0)';
  const containerStyle: import('react').CSSProperties = isPro
    ? { position: 'fixed', bottom: '16px', left: '16px', right: '16px', width: 'auto', zIndex: 30, pointerEvents: 'none', transform: hideTranslate, transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }
    : { position: 'fixed', bottom: 0, left: 0, right: 0, width: '100vw', padding: 0, zIndex: 30, pointerEvents: 'none', transform: hideTranslate, transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' };

  const navClass = isPro
    ? 'flex items-center justify-around'
    : `pointer-events-auto border px-0 py-3 flex items-center justify-evenly backdrop-blur-xl transition-all duration-500 ${
        darkMode
          ? 'border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.3)]'
          : 'bg-white/90 border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
      }`;

  const p = scrollProgress;

  const navStyle: import('react').CSSProperties = isProLight
    ? {
        background: `rgba(255, 255, 255, ${0.72 + p * 0.2})`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '28px',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        boxShadow: `0 4px ${16 + p * 24}px rgba(200, 85, 247, ${0.08 + p * 0.22})`,
        padding: '12px 24px',
        pointerEvents: 'auto',
      }
    : isProDark
    ? {
        background: `rgba(20, 20, 30, ${0.72 + p * 0.2})`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '28px',
        border: '1px solid rgba(200, 85, 247, 0.15)',
        boxShadow: `0 4px ${16 + p * 24}px rgba(200, 85, 247, ${0.12 + p * 0.28})`,
        padding: '12px 24px',
        pointerEvents: 'auto',
      }
    : { width: '100%', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))', ...(darkMode ? { backgroundColor: 'var(--color-nav-bg)' } : {}) };

  return (
    <div style={containerStyle}>
      {onPlusPress && (
        <button
          onClick={onPlusPress}
          aria-label="Aggiungi"
          style={{
            position: 'absolute',
            top: '-28px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
            borderRadius: '50%',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px color-mix(in srgb, var(--color-primary) 40%, transparent)',
            border: 'none',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 1,
            touchAction: 'manipulation',
          }}
        >
          <Plus size={24} color="white" strokeWidth={2.5} />
        </button>
      )}
      <nav role="navigation" aria-label="Navigazione principale" style={navStyle} className={navClass}>
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
                isActive ? '' : (isProLight ? '' : darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
              }`}
              style={isActive ? { color: 'var(--color-nav-icon)' } : (isProLight ? { color: '#9ca3af' } : undefined)}
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
