import { Share } from 'lucide-react';

export default function InstallGateScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-8 text-center bg-white">
      {/* Logo */}
      <div className="mb-8 space-y-1">
        <h1 style={{ fontWeight: 300, letterSpacing: '0.15em', color: '#1a1a2e', fontSize: '2rem' }}>
          SOLVY
        </h1>
      </div>

      {/* Check */}
      <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30">
        <span className="text-white text-4xl">✓</span>
      </div>

      {/* Titolo */}
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Account confermato!</h2>
      <p className="text-slate-500 text-sm leading-relaxed mb-10">
        Per completare la registrazione installa Solvy sul tuo iPhone, poi accedi dall'app.
      </p>

      {/* Steps */}
      <div className="w-full max-w-xs space-y-4 text-left">
        {[
          { n: 1, text: <>Tocca l'icona <Share size={14} className="inline mb-0.5 text-primary" /> in basso nel browser</> },
          { n: 2, text: <>"Aggiungi a schermata Home"</> },
          { n: 3, text: <>Apri <span className="font-bold text-slate-900">Solvy</span> dalla schermata Home e accedi</> },
        ].map(({ n, text }) => (
          <div key={n} className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
              {n}
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
