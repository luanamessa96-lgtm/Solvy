import { motion, AnimatePresence } from 'motion/react';
import { Plus, CheckCircle2, Circle } from 'lucide-react';
import { Deadline } from '../../types';

interface NotificationsPanelProps {
  deadlines: Deadline[];
  onClose: () => void;
  onUpdateDeadline: (d: Deadline) => void;
  darkMode?: boolean;
}

const NotificationsPanel = ({ deadlines, onClose, onUpdateDeadline, darkMode }: NotificationsPanelProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const withDiff = deadlines
    .map(d => {
      const date = new Date(d.date);
      date.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...d, diffDays };
    })
    .filter(d => d.diffDays >= 0 && d.diffDays <= 30)
    .sort((a, b) => a.diffDays - b.diffDays);

  const groups = [
    { label: 'Oggi', items: withDiff.filter(d => d.diffDays === 0), accent: 'text-red-500', dot: 'bg-red-500' },
    { label: 'Questa settimana', items: withDiff.filter(d => d.diffDays >= 1 && d.diffDays <= 7), accent: 'text-orange-500', dot: 'bg-orange-400' },
    { label: 'Questo mese', items: withDiff.filter(d => d.diffDays >= 8 && d.diffDays <= 30), accent: 'text-slate-400', dot: 'bg-slate-300' },
  ].filter(g => g.items.length > 0);

  const typeIcon = (type: string) => {
    if (type === 'tax') return '🏛️';
    if (type === 'payment') return '💸';
    return '📌';
  };

  const activeCount = withDiff.filter(d => !d.completed).length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={`relative w-full max-w-md rounded-t-[32px] overflow-hidden shadow-2xl backdrop-blur-xl ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}>
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Notifiche</h2>
                <p className="text-sm text-slate-500">
                  {activeCount > 0 ? `${activeCount} scadenz${activeCount === 1 ? 'a' : 'e'} nei prossimi 30 giorni` : 'Tutto in ordine'}
                </p>
              </div>
              <button onClick={onClose} className={`p-2 rounded-full transition-all active:scale-90 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            <div className="space-y-5 max-h-[60vh] overflow-y-auto -mx-1 px-1">
              {groups.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <p className="text-4xl">🎉</p>
                  <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Tutto in ordine!</p>
                  <p className="text-sm text-slate-400">Nessuna scadenza nei prossimi 30 giorni</p>
                </div>
              ) : groups.map(group => (
                <div key={group.label} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${group.dot}`} />
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${group.accent}`}>{group.label}</p>
                  </div>
                  {group.items.map(n => (
                    <div key={n.id} className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${n.completed ? 'opacity-50' : ''} ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 ${darkMode ? 'bg-slate-700' : 'bg-white'}`}>{typeIcon(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${n.completed ? 'line-through text-slate-400' : (darkMode ? 'text-white' : 'text-slate-900')}`}>{n.title}</p>
                        <p className="text-xs text-slate-400">
                          {n.diffDays === 0 ? 'Scade oggi' : n.diffDays === 1 ? 'Scade domani' : `Tra ${n.diffDays} giorni`}
                          {n.amount ? ` · €${n.amount.toLocaleString()}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => onUpdateDeadline({ ...n, completed: !n.completed })}
                        className={`shrink-0 transition-all active:scale-90 ${n.completed ? 'text-emerald-500' : (darkMode ? 'text-slate-600 hover:text-emerald-400' : 'text-slate-300 hover:text-emerald-500')}`}
                      >
                        {n.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NotificationsPanel;
