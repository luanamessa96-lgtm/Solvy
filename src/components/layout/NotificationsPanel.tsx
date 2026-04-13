import { motion, AnimatePresence } from 'motion/react';
import { Plus, CheckCircle2, Circle, Bell, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Deadline } from '../../types';

interface NotificationsPanelProps {
  isOpen: boolean;
  deadlines: Deadline[];
  onClose: () => void;
  onUpdateDeadline: (d: Deadline) => void;
  darkMode?: boolean;
  theme?: string;
  isPro?: boolean;
}

const NotificationsPanel = ({ isOpen, deadlines, onClose, onUpdateDeadline, darkMode, theme, isPro: isProProp }: NotificationsPanelProps) => {
  const { t } = useTranslation();
  const isProDark = theme === 'pro-dark';
  const isProLight = theme === 'pro-light';
  const isPro = isProProp ?? (isProDark || isProLight);
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
    { label: t('notifications.group_today'), items: withDiff.filter(d => d.diffDays === 0), accent: 'text-red-500', dot: 'bg-red-500' },
    { label: t('notifications.group_week'), items: withDiff.filter(d => d.diffDays >= 1 && d.diffDays <= 7), accent: 'text-orange-500', dot: 'bg-orange-400' },
    { label: t('notifications.group_month'), items: withDiff.filter(d => d.diffDays >= 8 && d.diffDays <= 30), accent: 'text-slate-400', dot: 'bg-slate-300' },
  ].filter(g => g.items.length > 0);

  const typeIcon = (type: string) => {
    if (type === 'tax') return '🏛️';
    if (type === 'payment') return '💸';
    return '📌';
  };

  const activeCount = withDiff.filter(d => !d.completed).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl`}
            style={isProDark ? { background: '#1c1c1e', boxShadow: '0 0 0 1px rgba(200,85,247,0.15), 0 32px 64px rgba(200,85,247,0.2), 0 8px 24px rgba(0,0,0,0.6)' } : isProLight ? { background: 'rgba(255,255,255,0.98)', boxShadow: '0 0 0 1px rgba(200,85,247,0.15), 0 32px 64px rgba(200,85,247,0.15), 0 8px 24px rgba(200,85,247,0.08)' } : { backgroundColor: darkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)' }}
          >
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('notifications.title')}</h2>
                  <p className="text-sm text-slate-500">
                    {activeCount > 0 ? t('notifications.active_deadlines', { count: activeCount }) : t('notifications.all_clear')}
                  </p>
                </div>
                <button onClick={onClose} className={`p-2 rounded-full transition-all active:scale-90 ${isPro ? 'text-slate-400' : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`} style={isProDark ? { background: 'rgba(255,255,255,0.08)' } : isProLight ? { background: 'rgba(200,85,247,0.08)' } : undefined}>
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="space-y-5 max-h-[60vh] overflow-y-auto -mx-1 px-1">
                {groups.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <p className="text-4xl">🎉</p>
                    <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('notifications.empty_title')}</p>
                    <p className="text-sm text-slate-400">{t('notifications.empty_subtitle')}</p>
                  </div>
                ) : groups.map(group => (
                  <div key={group.label} className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${group.dot}`} />
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${group.accent}`}>{group.label}</p>
                    </div>
                    {group.items.map(n => (
                      <div key={n.id} className={`flex items-center gap-3 p-4 rounded-2xl transition-all ${n.completed ? 'opacity-50' : ''}`} style={{ background: isProDark ? 'rgba(255,255,255,0.05)' : isProLight ? 'rgba(200,85,247,0.04)' : darkMode ? '#1e293b' : '#f8fafc', border: isPro ? '1px solid rgba(200,85,247,0.12)' : undefined }}>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0`} style={{ background: isPro ? 'rgba(200,85,247,0.1)' : darkMode ? '#334155' : '#ffffff' }}>{typeIcon(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${n.completed ? 'line-through text-slate-400' : (darkMode ? 'text-white' : 'text-slate-900')}`}>{n.title}</p>
                          <p className="text-xs text-slate-400">
                            {n.diffDays === 0 ? t('notifications.expires_today') : n.diffDays === 1 ? t('notifications.expires_tomorrow') : t('notifications.expires_in_days', { count: n.diffDays })}
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

              {!isPro && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl border [padding-bottom:max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] ${darkMode ? 'bg-primary/5 border-primary/20' : 'bg-primary/5 border-primary/10'}`}>
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Bell size={16} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('notifications.push_title')}</p>
                    <p className="text-xs text-slate-400">{t('notifications.push_subtitle')}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full shrink-0">
                    <Lock size={10} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Pro</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationsPanel;
