import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Profile } from '../types';

interface OnboardingViewProps {
  profile: Profile;
  onComplete: (p: Profile) => void;
}

const CATEGORIE: { label: string; value: number }[] = [
  { label: 'Professionisti (consulenti, designer, sviluppatori…)', value: 78 },
  { label: 'Costruzioni e attività immobiliari', value: 86 },
  { label: 'Artigiani e altri servizi', value: 67 },
  { label: 'Intermediari del commercio', value: 62 },
  { label: 'Commercio e ristorazione', value: 40 },
];

const TOTAL_STEPS = 4;

export default function OnboardingView({ profile, onComplete }: OnboardingViewProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const [name, setName] = useState('');
  const [jobType, setJobType] = useState('');
  const [regime, setRegime] = useState<'forfettario' | 'ordinario'>('forfettario');
  const [coefficiente, setCoefficiente] = useState<number | undefined>(undefined);
  const [annoInizioAttivita, setAnnoInizioAttivita] = useState('');
  const [piva, setPiva] = useState('');
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [address, setAddress] = useState('');

  const goNext = () => { setDirection(1); setStep(s => s + 1); };
  const goBack = () => { setDirection(-1); setStep(s => s - 1); };

  const handleComplete = () => {
    const updated: Profile = {
      ...profile,
      name: name || profile.name,
      jobType: jobType || profile.jobType,
      regime,
      coefficiente,
      annoInizioAttivita: annoInizioAttivita ? parseInt(annoInizioAttivita) : undefined,
      piva: piva || undefined,
      codiceFiscale: codiceFiscale || undefined,
      address: address || undefined,
    };
    localStorage.setItem('onboardingComplete', 'true');
    onComplete(updated);
  };

  const inputClass = 'w-full px-4 py-3.5 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400';
  const currentYear = new Date().getFullYear();

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col max-w-md mx-auto">
      {/* Progress bar */}
      {step > 0 && (
        <div className="px-6 pt-6">
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i < step ? 'bg-primary' : 'bg-slate-100'}`} />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence custom={direction} mode="wait">
          {step === 0 && (
            <motion.div key="welcome" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-8">
              {/* Logo placeholder */}
              <div className="space-y-4">
                <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-primary/30">
                  <span className="text-white text-3xl font-black">F</span>
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-black text-slate-900">Benvenuto</h1>
                  <p className="text-slate-500 text-base leading-relaxed">Il tuo assistente fiscale per freelance italiani. Fatture, scadenze e tasse — tutto in un posto.</p>
                </div>
              </div>
              <button onClick={goNext} className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-xl shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                Inizia <ChevronRight size={20} />
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute inset-0 flex flex-col p-8 pt-10 space-y-8">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Passo 1 di {TOTAL_STEPS}</p>
                <h2 className="text-2xl font-bold text-slate-900">Chi sei?</h2>
                <p className="text-sm text-slate-500">Iniziamo con le informazioni base del tuo profilo.</p>
              </div>
              <div className="space-y-4 flex-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome e Cognome</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Es. Mario Rossi" className={inputClass} autoFocus />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo di Lavoro</label>
                  <input type="text" value={jobType} onChange={e => setJobType(e.target.value)} placeholder="Es. Freelance Designer" className={inputClass} />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={goBack} className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 active:scale-95 transition-all shrink-0">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={goNext} disabled={!name.trim()} className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Continua
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute inset-0 flex flex-col p-8 pt-10 space-y-8 overflow-y-auto">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Passo 2 di {TOTAL_STEPS}</p>
                <h2 className="text-2xl font-bold text-slate-900">Regime fiscale</h2>
                <p className="text-sm text-slate-500">Seleziona il tuo regime per calcolare le tasse correttamente.</p>
              </div>
              <div className="space-y-4 flex-1">
                <div className="p-1 rounded-2xl flex gap-1 bg-slate-100">
                  {(['forfettario', 'ordinario'] as const).map(r => (
                    <button key={r} onClick={() => setRegime(r)} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all capitalize ${regime === r ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-500'}`}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>

                {regime === 'forfettario' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoria Attività</label>
                      <select value={coefficiente ?? ''} onChange={e => setCoefficiente(e.target.value ? Number(e.target.value) : undefined)} className={inputClass}>
                        <option value="">Seleziona categoria...</option>
                        {CATEGORIE.map(c => (
                          <option key={c.value} value={c.value}>{c.label} — {c.value}%</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Anno Inizio Attività</label>
                      <input type="number" min="2000" max={currentYear} value={annoInizioAttivita} onChange={e => setAnnoInizioAttivita(e.target.value)} placeholder={`Es. ${currentYear - 2}`} className={inputClass} />
                    </div>
                    {annoInizioAttivita && parseInt(annoInizioAttivita) >= currentYear - 4 && (
                      <div className="px-4 py-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <p className="text-xs font-bold text-emerald-700">Sei nei primi 5 anni → aliquota agevolata al 5% 🎉</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={goBack} className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 active:scale-95 transition-all shrink-0">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={goNext} className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all">
                  Continua
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute inset-0 flex flex-col p-8 pt-10 space-y-8">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Passo 3 di {TOTAL_STEPS}</p>
                <h2 className="text-2xl font-bold text-slate-900">Dati fiscali</h2>
                <p className="text-sm text-slate-500">Opzionale — puoi aggiungerli in seguito dal profilo.</p>
              </div>
              <div className="space-y-4 flex-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Partita IVA</label>
                  <input type="text" value={piva} onChange={e => setPiva(e.target.value)} placeholder="Es. IT12345678901" className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Codice Fiscale</label>
                  <input type="text" value={codiceFiscale} onChange={e => setCodiceFiscale(e.target.value.toUpperCase())} placeholder="Es. RSSMRA80A01H501Z" className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Indirizzo</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Via Roma 1, 20100 Milano" className={inputClass} />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={goBack} className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 active:scale-95 transition-all shrink-0">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={goNext} className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all">
                  Continua
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="done" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-8">
              <div className="space-y-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }} className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
                  <span className="text-white text-4xl">✓</span>
                </motion.div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900">Tutto pronto, {name.split(' ')[0] || 'benvenuto'}!</h2>
                  <p className="text-slate-500 text-sm leading-relaxed">Il tuo profilo è configurato. Puoi iniziare ad aggiungere fatture e scadenze.</p>
                </div>
              </div>
              <button onClick={handleComplete} className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-xl shadow-primary/30 active:scale-[0.98] transition-all">
                Vai alla Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
