import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Sparkles } from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

const features = [
  'Temi glassmorphism esclusivi (Light & Dark Pro)',
  'Libreria media con UI premium',
  'Clienti ricorrenti',
  'Scadenze con descrizione personalizzata',
  'Export avanzato per il commercialista',
  'Supporto prioritario',
];

export default function PaywallModal({ isOpen, onClose, darkMode }: PaywallModalProps) {
  const handleUpgrade = () => {
    window.location.href = 'mailto:luanamessa96@gmail.com?subject=Richiesta%20upgrade%20Pro&body=Ciao%2C%20vorrei%20passare%20al%20piano%20Pro!';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh]"
          >
            {/* Sfondo gradiente */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0d1f3c] to-[#061020]" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

            <div className="relative z-10 p-8 overflow-y-auto max-h-[90vh]">
              {/* Close */}
              <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors">
                <X size={16} />
              </button>

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
                <Sparkles size={24} className="text-primary" />
              </div>

              {/* Titolo */}
              <h2 className="text-2xl font-bold text-white mb-1">FreelanceApp Pro</h2>
              <p className="text-slate-400 text-sm mb-6">Sblocca tutte le funzionalità premium</p>

              {/* Features */}
              <div className="space-y-3 mb-8">
                {features.map(f => (
                  <div key={f} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} className="text-primary" />
                    </div>
                    <span className="text-sm text-slate-300 leading-snug">{f}</span>
                  </div>
                ))}
              </div>

              {/* Prezzo */}
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-white">€4.99</span>
                <span className="text-slate-400 text-sm mb-1">/mese</span>
              </div>

              {/* CTA */}
              <button
                onClick={handleUpgrade}
                className="w-full py-4 rounded-2xl bg-primary font-bold text-white text-sm shadow-xl shadow-primary/30 active:scale-[0.98] transition-all hover:bg-primary/90"
              >
                Passa a Pro
              </button>
              <p className="text-center text-xs text-slate-500 mt-3">
                Scrivi una email e ti attiviamo entro 24h
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
