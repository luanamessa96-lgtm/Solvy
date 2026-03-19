import { motion, AnimatePresence } from 'motion/react';
import { Plus } from 'lucide-react';
import { Deadline } from '../../types';

interface NotificationsPanelProps {
  deadlines: Deadline[];
  onClose: () => void;
  darkMode?: boolean;
}

const NotificationsPanel = ({ deadlines, onClose, darkMode }: NotificationsPanelProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const notifications = deadlines
    .map(d => {
      const date = new Date(d.date);
      date.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...d, diffDays };
    })
    .filter(d => d.diffDays <= 30)
    .sort((a, b) => a.diffDays - b.diffDays);

  const getLabel = (diffDays: number) => {
    if (diffDays < 0) return { text: `Scaduta ${Math.abs(diffDays)} giorni fa`, color: 'text-red-500' };
    if (diffDays === 0) return { text: 'Scade oggi', color: 'text-red-500' };
    if (diffDays === 1) return { text: 'Scade domani', color: 'text-orange-500' };
    return { text: `Tra ${diffDays} giorni`, color: diffDays <= 7 ? 'text-orange-500' : 'text-slate-400' };
  };

  const typeIcon = (type: string) => {
    if (type === 'tax') return '🏛️';
    if (type === 'payment') return '💸';
    return '📌';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={`relative w-full max-w-md rounded-t-[32px] overflow-hidden shadow-2xl backdrop-blur-xl ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}>
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Notifiche</h2>
                <p className="text-sm text-slate-500">Scadenze nei prossimi 30 giorni</p>
              </div>
              <button onClick={onClose} className={`p-2 rounded-full transition-all active:scale-90 hover:shadow-lg ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:shadow-primary/10' : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:shadow-slate-200'}`}>
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto -mx-1 px-1">
              {notifications.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <p className="text-4xl">🎉</p>
                  <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Tutto in ordine!</p>
                  <p className="text-sm text-slate-400">Nessuna scadenza nei prossimi 30 giorni</p>
                </div>
              ) : notifications.map(n => {
                const label = getLabel(n.diffDays);
                return (
                  <div key={n.id} className={`flex items-center gap-4 p-4 rounded-2xl transition-colors ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${darkMode ? 'bg-slate-700' : 'bg-white'}`}>{typeIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{n.title}</p>
                      <p className={`text-xs font-semibold ${label.color}`}>{label.text}</p>
                    </div>
                    {n.amount && <p className={`text-sm font-bold shrink-0 ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{n.amount.toLocaleString()}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NotificationsPanel;
