import { Share } from 'lucide-react';
import { detectBrowserContext } from '../lib/installGate';

const browser = detectBrowserContext(navigator.userAgent);

export default function InstallGateScreen() {
  if (!browser.canInstall) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center px-8 text-center bg-white">
        <div className="mb-8">
          <h1 style={{ fontWeight: 300, letterSpacing: '0.15em', color: '#1a1a2e', fontSize: '2rem' }}>
            SOLVY
          </h1>
        </div>
        <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30">
          <span className="text-white text-4xl">✓</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Account confermato!</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          Per installare Solvy devi aprire il link in <strong>Safari</strong>.
        </p>
        <div className="w-full max-w-xs space-y-4 text-left">
          {[
            <>Tocca <strong>···</strong> in basso a destra</>,
            <>&quot;Apri in Safari&quot; o &quot;Apri nel browser&quot;</>,
            <>Segui le istruzioni per installare <strong>Solvy</strong></>,
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <p className="text-sm text-slate-600 leading-snug pt-1.5">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-xs text-slate-400">
          Il tuo account è già pronto — non devi registrarti di nuovo.
        </p>
      </div>
    );
  }

  if (browser.isAndroid) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center px-8 text-center bg-white">
        <div className="mb-8">
          <h1 style={{ fontWeight: 300, letterSpacing: '0.15em', color: '#1a1a2e', fontSize: '2rem' }}>
            SOLVY
          </h1>
        </div>
        <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30">
          <span className="text-white text-4xl">✓</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Account confermato!</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          Hai già Solvy installata? <strong>Aprila dalla schermata Home.</strong>
        </p>
        <div className="w-full max-w-xs space-y-4 text-left mb-8">
          {[
            'Tocca il menu ⋮ in alto a destra nel browser',
            '"Aggiungi a schermata Home" o "Installa app"',
            <>Apri <span className="font-bold text-slate-900">Solvy</span> dalla schermata Home e accedi</>,
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <p className="text-sm text-slate-600 leading-snug pt-1.5">{text}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Il tuo account è già pronto — non devi registrarti di nuovo.
        </p>
      </div>
    );
  }

  // iOS Safari — flusso principale
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-8 text-center bg-white">
      <div className="mb-8">
        <h1 style={{ fontWeight: 300, letterSpacing: '0.15em', color: '#1a1a2e', fontSize: '2rem' }}>
          SOLVY
        </h1>
      </div>
      <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30">
        <span className="text-white text-4xl">✓</span>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Account confermato!</h2>

      <div className="w-full max-w-xs bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
        <p className="text-sm text-amber-800 font-medium">
          Hai già Solvy installata?
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          Chiudi Safari e aprila dalla schermata Home.
        </p>
      </div>

      <p className="text-slate-500 text-sm leading-relaxed mb-8">
        Per usare Solvy devi installarla sul tuo iPhone.
      </p>

      <div className="w-full max-w-xs space-y-4 text-left">
        {[
          { text: <>Tocca l'icona <Share size={14} className="inline mb-0.5 text-primary" /> in basso nel browser</> },
          { text: <>"Aggiungi a schermata Home"</> },
          { text: <>Apri <span className="font-bold text-slate-900">Solvy</span> dalla schermata Home e accedi</> },
        ].map(({ text }, i) => (
          <div key={i} className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
              {i + 1}
            </div>
            <p className="text-sm text-slate-600 leading-snug pt-1.5">{text}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-xs text-slate-400 leading-relaxed">
        Il tuo account è già pronto — non devi registrarti di nuovo.
      </p>
    </div>
  );
}
