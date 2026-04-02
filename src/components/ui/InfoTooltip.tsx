import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
  darkMode?: boolean;
}

const TOOLTIP_W = 224; // w-56

const InfoTooltip = ({ text, darkMode }: InfoTooltipProps) => {
  const [open, setOpen] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Close on any scroll (capture phase catches scroll inside modals/lists too)
  useEffect(() => {
    if (!open) return;
    const onScroll = () => close();
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', onScroll, { capture: true });
  }, [open, close]);

  const calcStyle = (): React.CSSProperties => {
    if (!btnRef.current) return {};
    const rect = btnRef.current.getBoundingClientRect();

    // Horizontal: clamp so tooltip never bleeds off screen
    let left = rect.left;
    if (left + TOOLTIP_W > window.innerWidth - 8) {
      left = window.innerWidth - TOOLTIP_W - 8;
    }
    left = Math.max(8, left);

    // Vertical: show above if less than 150px below button
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < 150;

    return {
      position: 'fixed',
      left,
      // above → anchor bottom of tooltip to top of button (via translateY)
      top: above ? rect.top - 6 : rect.bottom + 6,
      transform: above ? 'translateY(-100%)' : undefined,
      zIndex: 9999,
      width: TOOLTIP_W,
    };
  };

  const handleToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!open) {
      setTooltipStyle(calcStyle());
      setOpen(true);
    } else {
      close();
    }
  };

  return (
    <span className="inline-flex items-center">
      <button
        ref={btnRef}
        type="button"
        // Both onClick (mouse) and onTouchEnd (iOS Safari tap)
        onClick={handleToggle}
        onTouchEnd={handleToggle}
        className={`ml-1 shrink-0 transition-colors active:scale-90 ${open ? 'text-primary' : 'text-slate-400 hover:text-slate-500'}`}
        aria-label="Informazioni"
      >
        <Info size={12} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Full-screen backdrop — onPointerDown for instant response on iOS */}
            <div
              className="fixed inset-0"
              style={{ zIndex: 9998 }}
              onPointerDown={close}
              onTouchStart={close}
              onClick={close}
            />
            {/* Tooltip — pointer-events-none so touches pass through to backdrop */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.1 }}
              style={tooltipStyle}
              className={`pointer-events-none rounded-2xl shadow-2xl border p-3 text-xs leading-relaxed ${
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
