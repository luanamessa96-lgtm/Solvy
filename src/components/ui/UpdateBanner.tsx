import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UpdateBannerProps {
  onUpdate: () => void;
  onDismiss: () => void;
  darkMode?: boolean;
}

export function UpdateBanner({ onUpdate, onDismiss, darkMode }: UpdateBannerProps) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed bottom-28 left-0 right-0 z-[300] px-6 flex justify-center pointer-events-none"
    >
      <div className={`max-w-md w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl pointer-events-auto ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-slate-900'} text-white`}>
        <RefreshCw size={18} className="shrink-0 text-primary" />
        <p className="text-sm font-semibold flex-1">{t('pwa.update_available')}</p>
        <button
          onClick={onDismiss}
          className="text-xs text-slate-400 hover:text-white transition-colors active:scale-90 px-2 py-1"
        >
          {t('pwa.dismiss_btn')}
        </button>
        <button
          onClick={onUpdate}
          className="text-xs font-bold bg-primary px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors active:scale-90"
        >
          {t('pwa.update_btn')}
        </button>
      </div>
    </motion.div>
  );
}
