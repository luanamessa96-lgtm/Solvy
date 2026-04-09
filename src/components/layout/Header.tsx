import { ArrowLeft, Bell } from 'lucide-react';
import { Profile } from '../../types';
import DiceBearAvatar from '../ui/DiceBearAvatar';

interface HeaderProps {
  title: string;
  activeProfile: Profile;
  onProfileClick: () => void;
  onBellClick?: () => void;
  notificationCount?: number;
  showBack?: boolean;
  onBack?: () => void;
  darkMode?: boolean;
  isLoading?: boolean;
}

const Header = ({ title, activeProfile, onProfileClick, onBellClick, notificationCount, showBack, onBack, darkMode, isLoading }: HeaderProps) => (
  <header className="sticky top-0 z-20 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b transition-colors duration-500" style={{ backgroundColor: 'var(--color-header-bg)', borderColor: 'var(--color-border)', borderBottomLeftRadius: '1.25rem', borderBottomRightRadius: '1.25rem' }}>
    <div className="flex items-center gap-3">
      {showBack ? (
        <button onClick={onBack} aria-label="Torna indietro" className={`p-2 -ml-2 rounded-xl active:scale-90 transition-all hover:shadow-lg ${darkMode ? 'text-slate-300 hover:shadow-primary/10' : 'text-slate-600 hover:shadow-slate-200'}`} style={{ backgroundColor: 'var(--color-card-bg)' }}>
          <ArrowLeft size={20} />
        </button>
      ) : (
        <img src="/logo.png" alt="Solvy" width={32} height={32} className="shrink-0 drop-shadow-md" />
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
      {isLoading ? (
        <div className={`w-9 h-9 rounded-full animate-pulse ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
      ) : (
        <button onClick={onProfileClick} aria-label={`Profilo di ${activeProfile.name}`} className="rounded-full transition-all active:scale-90 hover:shadow-lg hover:shadow-primary/20">
          <DiceBearAvatar name={activeProfile.name} email={activeProfile.email} size={36} borderWidth={2} />
        </button>
      )}
    </div>
  </header>
);

export default Header;
