import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
  darkMode?: boolean;
}

const InfoTooltip = ({ text, darkMode }: InfoTooltipProps) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 240));
      setPos({ top: rect.bottom + 6, left });
    }
    setOpen(o => !o);
  };

  return (
    <span className="inline-flex items-center">
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        className={`ml-1 shrink-0 transition-colors active:scale-90 ${open ? 'text-primary' : 'text-slate-400 hover:text-slate-500'}`}
        aria-label="Informazioni"
      >
        <Info size={12} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ top: pos.top, left: pos.left }}
              className={`fixed z-50 w-56 p-3 rounded-2xl shadow-xl border text-xs leading-relaxed pointer-events-none ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-300'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              {text}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </span>
  );
};

export default InfoTooltip;
