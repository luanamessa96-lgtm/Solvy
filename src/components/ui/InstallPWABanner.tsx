import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, Share, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DISMISSED_KEY = 'pwa_banner_dismissed';

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

function isMobileOrTablet() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export default function InstallPWABanner() {
  const { i18n } = useTranslation();
  const isES = i18n.language?.startsWith('es');
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const deferredPrompt = useRef<any>(null);

  useEffect(() => {
    if (isStandaloneMode()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (!isMobileOrTablet()) return;

    if (isIOSDevice()) {
      setVisible(true);
    } else {
      const handler = (e: Event) => {
        e.preventDefault();
        deferredPrompt.current = e;
        setVisible(true);
      };
      window.addEventListener('beforeinstallprompt', handler as EventListener);
      return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  const handleInstall = async () => {
    if (isIOSDevice()) {
      setShowModal(true);
    } else if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      deferredPrompt.current = null;
      if (outcome === 'accepted') {
        dismiss();
      }
    }
  };

  const t = {
    bannerTitle: isES ? 'Instala Solvy en tu móvil' : 'Installa Solvy sul telefono',
    bannerSub: isES ? 'Úsala como una app nativa' : "Usala come un'app nativa",
    modalTitle: isES ? 'Instalar en iPhone / iPad' : 'Installa su iPhone / iPad',
    step1title: isES ? 'Toca el botón Compartir ↑' : 'Tocca il tasto Condividi ↑',
    step1sub: isES ? 'En la barra inferior del navegador' : 'Nella barra in basso del browser',
    step2title: isES ? 'Toca "Añadir a pantalla de inicio"' : 'Tocca "Aggiungi a Home"',
    step2sub: isES ? 'Desplázate por el menú hacia abajo' : 'Scorri il menu verso il basso',
    step3title: isES ? 'Toca "Añadir"' : 'Tocca "Aggiungi"',
    step3sub: isES ? '¡Solvy aparecerá en tu pantalla!' : 'Solvy apparirà nella tua schermata Home',
    cta: isES ? '¡Entendido!' : 'Capito!',
  };

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="px-4 pb-8 pt-2"
          >
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer"
              style={{
                background: 'white',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
              }}
              onClick={handleInstall}
            >
              <div
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #C060A0, #4CD9D0)' }}
              >
                <Smartphone size={16} color="white" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{t.bannerTitle}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t.bannerSub}</p>
              </div>

              <button
                type="button"
                onClick={e => { e.stopPropagation(); dismiss(); }}
                aria-label="Chiudi"
                className="shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center"
              >
                <X size={13} className="text-slate-500" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS step-by-step modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full max-w-md rounded-t-[28px] p-6 pb-10"
              style={{ backgroundColor: '#f8fafc' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center mb-5">
                <div className="w-10 h-1 rounded-full bg-slate-300" />
              </div>

              <h2 className="text-lg font-bold text-slate-900 mb-6 text-center">{t.modalTitle}</h2>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <Share size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{t.step1title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.step1sub}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center">
                    <Plus size={18} className="text-violet-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{t.step2title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.step2sub}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #C060A0, #4CD9D0)' }}
                  >
                    <span className="text-white font-bold text-base">✓</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{t.step3title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.step3sub}</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setShowModal(false); dismiss(); }}
                className="w-full py-4 rounded-2xl font-bold text-white"
                style={{ background: 'linear-gradient(to right, #C060A0, #4CD9D0)' }}
              >
                {t.cta}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
