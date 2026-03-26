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
  <header className={`sticky top-0 z-20 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b transition-colors duration-500 ${darkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
    <div className="flex items-center gap-3">
      {showBack ? (
        <button onClick={onBack} aria-label="Torna indietro" className={`p-2 -ml-2 rounded-xl active:scale-90 transition-all hover:shadow-lg ${darkMode ? 'bg-slate-900 text-slate-300 hover:shadow-primary/10' : 'bg-slate-50 text-slate-600 hover:shadow-slate-200'}`}>
          <ArrowLeft size={20} />
        </button>
      ) : (
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
          <div className="w-4 h-4 border-2 border-white rounded-sm transform rotate-45" />
        </div>
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
        <img src={activeProfile.avatar} alt={activeProfile.name} className="w-full h-full object-cover" />
      </button>
    </div>
  </header>
);

export default Header;
