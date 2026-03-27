import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Sparkles, Loader2 } from 'lucide-react';
import { getClient } from '../../lib/supabase';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

const features = [
  'Fatture illimitate',
  'Profili multipli illimitati',
  'Clienti ricorrenti',
  'Preventivi convertibili in fattura',
  'Export completo per il commercialista',
  'Report avanzati',
  'Promemoria pagamento automatici',
  'OCR scontrini',
  'Temi glassmorphism (Pro Light & Dark)',
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export default function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceMonthly = '€7,99';
  const priceYearly = '€59,99';
  const priceYearlyMonthly = '€5,00';

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await getClient().auth.getSession();
      if (!session) {
        setError('Devi essere autenticato per procedere.');
        return;
      }

      const priceId = billing === 'monthly'
        ? import.meta.env.VITE_STRIPE_PRICE_MONTHLY
        : import.meta.env.VITE_STRIPE_PRICE_YEARLY;

      if (!priceId || priceId.startsWith('price_YOUR_')) {
        setError('Configurazione pagamento non disponibile. Riprova più tardi.');
        return;
      }

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            price_id: priceId,
            success_url: `${window.location.origin}/?checkout=success`,
            cancel_url: `${window.location.origin}/?checkout=cancelled`,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Errore nel creare la sessione di pagamento.');
      }

      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
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
              <button
                onClick={onClose}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
                <Sparkles size={24} className="text-primary" />
              </div>

              {/* Titolo */}
              <h2 className="text-2xl font-bold text-white mb-1">Solvy Pro</h2>
              <p className="text-slate-400 text-sm mb-6">Sblocca tutte le funzionalità premium</p>

              {/* Toggle mensile / annuale */}
              <div className="flex items-center bg-white/5 rounded-2xl p-1 mb-6">
                <button
                  onClick={() => setBilling('monthly')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    billing === 'monthly'
                      ? 'bg-primary text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Mensile
                </button>
                <button
                  onClick={() => setBilling('yearly')}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all relative ${
                    billing === 'yearly'
                      ? 'bg-primary text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Annuale
                  <span className="absolute -top-2 -right-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    -37%
                  </span>
                </button>
              </div>

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
              <div className="mb-6">
                {billing === 'monthly' ? (
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">{priceMonthly}</span>
                    <span className="text-slate-400 text-sm mb-1">/mese</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold text-white">{priceYearly}</span>
                      <span className="text-slate-400 text-sm mb-1">/anno</span>
                    </div>
                    <p className="text-green-400 text-sm mt-1">
                      Solo {priceYearlyMonthly}/mese — risparmi €35,88
                    </p>
                  </div>
                )}
              </div>

              {/* Errore */}
              {error && (
                <p className="text-red-400 text-xs mb-4 text-center">{error}</p>
              )}

              {/* CTA */}
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-primary font-bold text-white text-sm shadow-xl shadow-primary/30 active:scale-[0.98] transition-all hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Reindirizzamento…
                  </>
                ) : (
                  'Passa a Pro'
                )}
              </button>
              <p className="text-center text-xs text-slate-500 mt-3">
                Pagamento sicuro via Stripe · Cancella quando vuoi
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
