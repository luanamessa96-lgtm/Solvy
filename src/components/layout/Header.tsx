import { ArrowLeft, Bell } from 'lucide-react';
import { Profile } from '../../types';

interface HeaderProps {
  title: string;
  activeProfile: Profile;
  onProfileClick: () => void;
  onBellClick?: () => void;
  notificationCount?: number;
  showBack?: boolean;
  onBack?: () => void;
  darkMode?: boolean;
}

const Header = ({ title, activeProfile, onProfileClick, onBellClick, notificationCount, showBack, onBack, darkMode }: HeaderProps) => (
  <header className="sticky top-0 z-20 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b transition-colors duration-500" style={{ backgroundColor: 'var(--color-header-bg)', borderColor: 'var(--color-border)' }}>
    <div className="flex items-center gap-3">
      {showBack ? (
        <button onClick={onBack} aria-label="Torna indietro" className={`p-2 -ml-2 rounded-xl active:scale-90 transition-all hover:shadow-lg ${darkMode ? 'text-slate-300 hover:shadow-primary/10' : 'text-slate-600 hover:shadow-slate-200'}`} style={{ backgroundColor: 'var(--color-card-bg)' }}>
          <ArrowLeft size={20} />
        </button>
      ) : (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 drop-shadow-md">
          <defs>
            <linearGradient id="solvy-grad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2DD4BF"/>
              <stop offset="45%" stopColor="#E040FB"/>
              <stop offset="100%" stopColor="#7C3AED"/>
            </linearGradient>
            <clipPath id="solvy-clip">
              <circle cx="11" cy="11" r="10"/>
              <circle cx="21" cy="11" r="10"/>
              <circle cx="11" cy="21" r="10"/>
              <circle cx="21" cy="21" r="10"/>
            </clipPath>
          </defs>
          <rect x="0" y="0" width="32" height="32" fill="url(#solvy-grad)" clipPath="url(#solvy-clip)"/>
        </svg>
      )}
      <h1 className={`text-xl font-bold tracking-tight transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h1>
    </div>
    <div className="flex items-center gap-4">
      {!showBack && (
        <button onClick={onBellClick} aria-label="Notifiche" className={`relative p-2 transition-all active:scale-90 hover:shadow-lg rounded-xl ${darkMode ? 'text-slate-500 hover:text-primary hover:shadow-primary/10' : 'text-slate-400 hover:text-primary hover:shadow-slate-200'}`}>
          <Bell size={22} />
          {notificationCount !== undefined && notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 border-2 border-white rounded-full text-[10px] font-bold text-white flex items-center justify-center">{notificationCount}</span>
          )}
        </button>
      )}
      <button onClick={onProfileClick} aria-label={`Profilo di ${activeProfile.name}`} className={`w-9 h-9 rounded-full border-2 overflow-hidden transition-all active:scale-90 hover:shadow-lg ${darkMode ? 'border-slate-800 hover:border-primary hover:shadow-primary/20' : 'border-slate-100 hover:border-primary hover:shadow-slate-200'}`}>
        <img src={activeProfile.avatar} alt={activeProfile.name} width="36" height="36" className="w-full h-full object-cover" />
      </button>
    </div>
  </header>
);

export default Header;
