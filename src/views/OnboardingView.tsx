import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Info } from 'lucide-react';
import { IT_PROVINCE, getRegionFromProvince } from '../lib/it/province';
import { useKeyboardPadding, scrollFieldIntoView } from '../hooks/useKeyboardPadding';
import { Profile } from '../types';
import { profileStorage } from '../lib/supabase';
import AtecoSelector from '../components/AtecoSelector';

interface OnboardingViewProps {
  profile: Profile;
  onComplete: (p: Profile) => Promise<void>;
  onCancel?: () => void;
  darkMode?: boolean;
}


// Steps vary by country: 0=welcome, 'country'=country selection, 1-N=data steps, 'done'=done
type OnboardingStep = 0 | 'country' | 1 | 2 | 3 | 'done';

export default function OnboardingView({ profile, onComplete, onCancel, darkMode }: OnboardingViewProps) {
  const keyboardPadding = useKeyboardPadding();
  const [step, setStep] = useState<OnboardingStep>(0);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Country selection
  const [selectedCountry, setSelectedCountry] = useState<'Italy' | 'Spain'>('Italy');

  // Common fields
  const [name, setName] = useState('');
  const [jobType, setJobType] = useState('');

  // Italy fields
  const [regime, setRegime] = useState<'forfettario' | 'ordinario'>('forfettario');
  const [coefficiente, setCoefficiente] = useState<number | undefined>(undefined);
  const [annoInizioAttivita, setAnnoInizioAttivita] = useState('');
  const [piva, setPiva] = useState('');
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [street, setStreet] = useState('');
  const [cap, setCap] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');

  // Spain fields
  const [taxIdType, setTaxIdType] = useState<'nif' | 'nie'>('nif');
  const [nif, setNif] = useState('');
  const [nie, setNie] = useState('');
  const [retaMensile, setRetaMensile] = useState('500');
  const [annoInizioSpagna, setAnnoInizioSpagna] = useState('');
  const [streetEs, setStreetEs] = useState('');
  const [capEs, setCapEs] = useState('');
  const [cityEs, setCityEs] = useState('');
  const [regimenFiscal, setRegimenFiscal] = useState<'simplificada' | 'normal' | 'modulos'>('simplificada');
  const [ivaHabitual, setIvaHabitual] = useState<'21' | '10' | '4'>('21');

  const goNext = (nextStep: OnboardingStep) => { setDirection(1); setStep(nextStep); };
  const goBack = (prevStep: OnboardingStep) => { setDirection(-1); setStep(prevStep); };

  const handleComplete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const isSpain = selectedCountry === 'Spain';
    const updated: Profile = {
      ...profile,
      name: name || profile.name,
      jobType: jobType || profile.jobType,
      country: selectedCountry,
      currency: 'EUR',
      ...(isSpain ? {
        piva: nif || undefined,
        regime: undefined,
        coefficiente: undefined,
        annoInizioAttivita: annoInizioSpagna ? parseInt(annoInizioSpagna) : undefined,
        street: streetEs || undefined,
        cap: capEs || undefined,
        city: cityEs || undefined,
        address: [streetEs, capEs && cityEs ? `${capEs} ${cityEs}` : cityEs].filter(Boolean).join(', ') || undefined,
        regimenFiscal,
        ivaHabitual: parseInt(ivaHabitual) as 21 | 10 | 4,
      } : {
        regime,
        coefficiente,
        annoInizioAttivita: annoInizioAttivita ? parseInt(annoInizioAttivita) : undefined,
        piva: piva || undefined,
        codiceFiscale: codiceFiscale || undefined,
        street: street || undefined,
        cap: cap || undefined,
        city: city || undefined,
        province: province || undefined,
        region: getRegionFromProvince(province) || undefined,
        address: [street, cap && city ? `${cap} ${city}` : city].filter(Boolean).join(', ') || undefined,
      }),
    };
    if (isSpain && nie) {
      profileStorage.set(`nie_${profile.id}`, nie);
    }
    if (isSpain && retaMensile) {
      profileStorage.set(`reta_${profile.id}`, retaMensile);
    }
    localStorage.setItem('onboardingComplete', 'true');
    try {
      await onComplete(updated);
    } catch {
      setIsSubmitting(false);
    }
  };

  const ic = `w-full px-4 py-3.5 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`;
  const lc = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1';
  const currentYear = new Date().getFullYear();

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  const HelpText = ({ text }: { text: string }) => (
    <div className="flex items-start gap-1.5 mt-1.5 ml-1">
      <Info size={11} className="text-slate-400 mt-0.5 shrink-0" />
      <p className="text-[11px] text-slate-400 leading-relaxed">{text}</p>
    </div>
  );

  // Progress bar logic: for Italy steps 1-3, for Spain steps 1-2
  const getProgressInfo = () => {
    if (step === 0 || step === 'country') return null;
    if (step === 'done') return null;
    const isSpain = selectedCountry === 'Spain';
    const total = isSpain ? 2 : 3;
    const current = step as number;
    return { current, total };
  };

  const stepLabels: Record<string, Record<number, string>> = {
    Italy: { 1: 'Chi sei', 2: 'Regime fiscale', 3: 'Dati fiscali' },
    Spain: { 1: 'Chi sei', 2: 'Dati fiscali' },
  };

  const progressInfo = getProgressInfo();

  return (
    <div className="fixed inset-0 z-[200] flex flex-col max-w-md mx-auto transition-colors" style={{ backgroundColor: 'var(--color-card)' }}>

      {/* Progress bar */}
      {progressInfo && (
        <div className="px-6 pt-6 space-y-2">
          <div className="flex gap-1.5">
            {Array.from({ length: progressInfo.total }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i < progressInfo.current ? 'bg-primary' : (darkMode ? 'bg-slate-800' : 'bg-slate-100')}`} />
            ))}
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {progressInfo.current} di {progressInfo.total} — {stepLabels[selectedCountry][progressInfo.current]}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence custom={direction} mode="wait">

          {/* WELCOME */}
          {step === 0 && (
            <motion.div key="welcome" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute inset-0 flex flex-col items-center justify-center px-8 py-12 text-center gap-16">
              {/* Brand */}
              <div className="space-y-2">
                <h1 style={{ fontWeight: 300, letterSpacing: '0.15em', color: darkMode ? '#ffffff' : '#1a1a2e', fontSize: '2.75rem', lineHeight: 1 }}>
                  SOLVY
                </h1>
                <p className="text-slate-400 text-sm">il tuo studio fiscale in tasca</p>
              </div>
              {/* Pills + bottone */}
              <div className="w-full space-y-6">
                <div className={`flex justify-center gap-6 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {['🧾 Fatture', '📅 Scadenze', '📊 Tasse'].map(item => (
                    <span key={item} className="font-medium">{item}</span>
                  ))}
                </div>
                <div className="space-y-3">
                  <button onClick={() => goNext('country')} className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-xl shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    Inizia <ChevronRight size={20} />
                  </button>
                  <p className="text-[11px] text-slate-400">pochi passaggi · meno di 2 minuti</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* COUNTRY SELECTION */}
          {step === 'country' && (
            <motion.div key="country" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute inset-0 flex flex-col items-center justify-center p-8 space-y-8">
              <div className="w-full space-y-3 text-center">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Scegli il paese fiscale</h2>
                <p className="text-sm text-slate-500">Determina le regole fiscali, le scadenze e il formato delle fatture.</p>
              </div>
              <div className="w-full space-y-4">
                <button
                  onClick={() => { setSelectedCountry('Italy'); goNext(1); }}
                  className="w-full p-6 rounded-3xl border-2 flex items-center gap-5 transition-all active:scale-[0.98] hover:border-primary shadow-sm hover:shadow-lg hover:shadow-primary/10"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  <span className="text-4xl">🇮🇹</span>
                  <div className="text-left">
                    <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Italia</p>
                    <p className="text-sm text-slate-400">Regime forfettario / ordinario</p>
                  </div>
                  <ChevronRight size={20} className="ml-auto text-slate-300" />
                </button>
                <button
                  onClick={() => { setSelectedCountry('Spain'); goNext(1); }}
                  className="w-full p-6 rounded-3xl border-2 flex items-center gap-5 transition-all active:scale-[0.98] hover:border-primary shadow-sm hover:shadow-lg hover:shadow-primary/10"
                  style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  <span className="text-4xl">🇪🇸</span>
                  <div className="text-left">
                    <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Spagna</p>
                    <p className="text-sm text-slate-400">Estimación directa simplificada</p>
                  </div>
                  <ChevronRight size={20} className="ml-auto text-slate-300" />
                </button>
              </div>
              <div className="flex items-start gap-2 px-1">
                <span className="text-slate-400 mt-0.5 shrink-0">🔒</span>
                <p className="text-xs text-slate-400 leading-relaxed">Il paese fiscale non potrà essere modificato dopo la creazione. Puoi sempre creare un secondo profilo per un altro paese.</p>
              </div>
              {onCancel && (
                <button onClick={onCancel} className="text-sm text-slate-400 underline underline-offset-2 active:opacity-60">
                  Annulla
                </button>
              )}
            </motion.div>
          )}

          {/* STEP 1 — Chi sei (common) */}
          {step === 1 && (
            <motion.div key="step1" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute inset-0 flex flex-col p-8 pt-6 space-y-6 overflow-y-auto" style={{ paddingBottom: Math.max(32, keyboardPadding + 32) }} onFocus={scrollFieldIntoView}>
              {/* Country badge */}
              <div className="flex items-center gap-2">
                <span className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Chi sei?</span>
                <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${selectedCountry === 'Spain' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                  {selectedCountry === 'Spain' ? '🇪🇸 Spagna' : '🇮🇹 Italia'}
                </span>
              </div>
              <p className="text-sm text-slate-500 -mt-4">Iniziamo con le informazioni base del tuo profilo.</p>
              <div className="space-y-5 flex-1">
                <div className="space-y-1.5">
                  <label className={lc}>Nome e Cognome *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Es. Mario Rossi" className={ic} autoFocus />
                  <HelpText text="Il nome apparirà su tutte le fatture che generi." />
                </div>
                <div className="space-y-1.5">
                  <label className={lc}>Tipo di Lavoro</label>
                  <input type="text" value={jobType} onChange={e => setJobType(e.target.value)} placeholder="Es. Freelance Designer" className={ic} />
                  <HelpText text="Usato solo per personalizzare la tua dashboard. Puoi cambiarlo in qualsiasi momento." />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => goBack('country')} className={`w-12 h-12 rounded-2xl flex items-center justify-center active:scale-95 transition-all shrink-0 text-slate-400`} style={{ backgroundColor: 'var(--color-card-bg)' }}>
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => goNext(2)} disabled={!name.trim()} className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Continua
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2 — Regime fiscale (Italy) OR Dati fiscali (Spain) */}
          {step === 2 && selectedCountry === 'Italy' && (
            <motion.div key="step2-italy" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute inset-0 flex flex-col p-8 pt-6 space-y-6 overflow-y-auto" style={{ paddingBottom: Math.max(32, keyboardPadding + 32) }} onFocus={scrollFieldIntoView}>
              <div className="space-y-1">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Regime fiscale</h2>
                <p className="text-sm text-slate-500">Usato per calcolare correttamente le tue tasse.</p>
              </div>
              <div className="space-y-4 flex-1">
                {/* Toggle */}
                <div className={`p-1 rounded-2xl flex gap-1 `} style={{ backgroundColor: 'var(--color-card-bg)' }}>
                  {(['forfettario', 'ordinario'] as const).map(r => (
                    <button key={r} onClick={() => setRegime(r)} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all capitalize ${regime === r ? 'bg-primary text-white shadow-lg shadow-primary/30' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Spiegazione regime */}
                <div className="p-4 rounded-2xl border space-y-1" style={{ backgroundColor: 'var(--color-card-bg)', borderColor: 'var(--color-border)' }}>
                  {regime === 'forfettario' ? (
                    <>
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Regime Forfettario</p>
                      <p className="text-xs text-slate-500 leading-relaxed">Aliquota fissa 15% (o 5% nei primi 5 anni). Senza IVA. Ideale se il tuo fatturato annuo è sotto €85.000. Il regime più comune per freelance.</p>
                    </>
                  ) : (
                    <>
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Regime Ordinario</p>
                      <p className="text-xs text-slate-500 leading-relaxed">IRPEF a scaglioni (23%–43%) + IVA sulle fatture. Per chi supera €85.000 annui o ha costi elevati da dedurre.</p>
                    </>
                  )}
                </div>

                {regime === 'forfettario' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className={lc}>Categoria Attività (Codice ATECO)</label>
                      <AtecoSelector value={coefficiente} onChange={setCoefficiente} darkMode={darkMode} />
                      <HelpText text="Il coefficiente di redditività corrisponde al tuo codice ATECO. Non sai quale scegliere? Seleziona 'Professionisti' se sei designer, sviluppatore o consulente." />
                    </div>
                    <div className="space-y-1.5">
                      <label className={lc}>Anno Inizio Attività</label>
                      <input type="number" min="2000" max={currentYear} value={annoInizioAttivita} onChange={e => setAnnoInizioAttivita(e.target.value)} placeholder={`Es. ${currentYear - 2}`} className={ic} />
                      <HelpText text="Nei primi 5 anni di attività si applica l'aliquota agevolata del 5% invece del 15%." />
                    </div>
                    {annoInizioAttivita && parseInt(annoInizioAttivita) >= currentYear - 4 && (
                      <div className={`px-4 py-3 rounded-2xl border ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                        <p className="text-xs font-bold text-emerald-600">Sei nei primi 5 anni → aliquota agevolata al 5% 🎉</p>
                      </div>
                    )}
                  </div>
                )}

                {regime === 'ordinario' && (
                  <div className="space-y-1.5">
                    <label className={lc}>Anno Inizio Attività</label>
                    <input type="number" min="2000" max={currentYear} value={annoInizioAttivita} onChange={e => setAnnoInizioAttivita(e.target.value)} placeholder={`Es. ${currentYear - 2}`} className={ic} />
                    <HelpText text="Usato per tracciare l'anzianità della tua attività e calcolare correttamente le imposte." />
                  </div>
                )}
              </div>

              {/* IT-19 — Limiti app */}
              <div className={`flex gap-2 p-3 rounded-2xl ${darkMode ? 'bg-slate-800/60' : 'bg-slate-100'}`}>
                <Info size={13} className="text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  I calcoli di Solvy sono ottimizzati per i casi più comuni (forfettari e ordinari senza situazioni particolari). Se hai redditi da lavoro dipendente, immobili, investimenti o situazioni familiari complesse, i calcoli potrebbero non essere accurati. Consulta sempre il tuo commercialista per la dichiarazione definitiva.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => goBack(1)} className={`w-12 h-12 rounded-2xl flex items-center justify-center active:scale-95 transition-all shrink-0 text-slate-400`} style={{ backgroundColor: 'var(--color-card-bg)' }}>
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => goNext(3)} className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all">
                  Continua
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2 — Dati fiscali (Spain) */}
          {step === 2 && selectedCountry === 'Spain' && (
            <motion.div key="step2-spain" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute inset-0 flex flex-col p-8 pt-6 space-y-6 overflow-y-auto" style={{ paddingBottom: Math.max(32, keyboardPadding + 32) }} onFocus={scrollFieldIntoView}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Dati fiscali</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>OPZIONALE</span>
                </div>
                <p className="text-sm text-slate-500">Appariranno sulle tue fatture. Puoi aggiungerli in seguito dal Profilo.</p>
              </div>
              <div className="space-y-4 flex-1">
                <div className="space-y-2">
                  <label className={lc}>Tipo documento fiscale</label>
                  <div className={`flex rounded-xl p-1 gap-1 `} style={{ backgroundColor: 'var(--color-card-bg)' }}>
                    <button type="button" onClick={() => setTaxIdType('nif')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${taxIdType === 'nif' ? 'bg-primary text-white shadow' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>NIF</button>
                    <button type="button" onClick={() => setTaxIdType('nie')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${taxIdType === 'nie' ? 'bg-primary text-white shadow' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>NIE</button>
                  </div>
                  {taxIdType === 'nif' ? (
                    <div className="space-y-1.5">
                      <input type="text" value={nif} onChange={e => { setNif(e.target.value.toUpperCase()); setNie(''); }} placeholder="Es. 12345678A" className={ic} />
                      <HelpText text="8 cifre + lettera. Per cittadini spagnoli." />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <input type="text" value={nie} onChange={e => { setNie(e.target.value.toUpperCase()); setNif(''); }} placeholder="Es. X1234567A" className={ic} />
                      <HelpText text="X/Y/Z + 7 cifre + lettera. Per stranieri residenti in Spagna." />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className={lc}>Régimen fiscal</label>
                  <select value={regimenFiscal} onChange={e => setRegimenFiscal(e.target.value as typeof regimenFiscal)} className={ic}>
                    <option value="simplificada">Estimación Directa Simplificada</option>
                    <option value="normal">Estimación Directa Normal</option>
                    <option value="modulos">Estimación Objetiva / Módulos</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={lc}>Tipo IVA habitual</label>
                  <select value={ivaHabitual} onChange={e => setIvaHabitual(e.target.value as typeof ivaHabitual)} className={ic}>
                    <option value="21">21%</option>
                    <option value="10">10%</option>
                    <option value="4">4%</option>
                  </select>
                  <HelpText text="La retención IRPF se calcula automáticamente: 7% los primeros 3 años, 15% a partir del 4º." />
                </div>
                <div className="space-y-1.5">
                  <label className={lc}>Cuota RETA mensual</label>
                  <select value={retaMensile} onChange={e => setRetaMensile(e.target.value)} className={ic}>
                    <option value="80">€ 80/mes — Tarifa Plana (1er/2º año)</option>
                    <option value="230">€ 230/mes</option>
                    <option value="260">€ 260/mes</option>
                    <option value="275">€ 275/mes</option>
                    <option value="294">€ 294/mes</option>
                    <option value="320">€ 320/mes</option>
                    <option value="350">€ 350/mes</option>
                    <option value="370">€ 370/mes</option>
                    <option value="390">€ 390/mes</option>
                    <option value="500">€ 500+/mes</option>
                  </select>
                  <HelpText text="Cuota mensual del Régimen Especial de Trabajadores Autónomos." />
                </div>
                <div className="space-y-1.5">
                  <label className={lc}>Año inicio actividad</label>
                  <input type="number" min="2000" max={currentYear} value={annoInizioSpagna} onChange={e => setAnnoInizioSpagna(e.target.value)} placeholder={`Es. ${currentYear - 2}`} className={ic} />
                </div>
                <div className="space-y-1.5">
                  <label className={lc}>Calle / Dirección</label>
                  <input type="text" value={streetEs} onChange={e => setStreetEs(e.target.value)} placeholder="Calle Gran Vía 1" className={ic} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={lc}>Código Postal</label>
                    <input type="text" inputMode="numeric" value={capEs} onChange={e => setCapEs(e.target.value)} placeholder="28013" className={ic} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={lc}>Ciudad</label>
                    <input type="text" value={cityEs} onChange={e => setCityEs(e.target.value)} placeholder="Madrid" className={ic} />
                  </div>
                </div>
              </div>

              {/* ES-13 — Límites app */}
              <div className={`flex gap-2 p-3 rounded-2xl ${darkMode ? 'bg-slate-800/60' : 'bg-slate-100'}`}>
                <Info size={13} className="text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Solvy calcula tus impuestos de forma automática basándose en los datos que introduces. Los cálculos están optimizados para los casos más comunes (autónomos en Estimación Directa sin situaciones especiales). Si tienes rentas del trabajo, inmuebles, inversiones o situaciones familiares complejas, los cálculos podrían no ser precisos. Consulta a tu gestor para una declaración exacta.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex gap-3">
                  <button onClick={() => goBack(1)} className={`w-12 h-12 rounded-2xl flex items-center justify-center active:scale-95 transition-all shrink-0 text-slate-400`} style={{ backgroundColor: 'var(--color-card-bg)' }}>
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => goNext('done')} className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all">
                    Continua
                  </button>
                </div>
                <button onClick={() => goNext('done')} className="w-full py-3 text-sm font-semibold text-slate-400 active:scale-[0.98] transition-all">
                  Omitir por ahora
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3 — Dati fiscali (Italy only) */}
          {step === 3 && selectedCountry === 'Italy' && (
            <motion.div key="step3" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute inset-0 flex flex-col p-8 pt-6 space-y-6 overflow-y-auto" style={{ paddingBottom: Math.max(32, keyboardPadding + 32) }} onFocus={scrollFieldIntoView}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Dati fiscali</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>OPZIONALE</span>
                </div>
                <p className="text-sm text-slate-500">Appariranno sulle tue fatture. Puoi aggiungerli in seguito dal Profilo.</p>
              </div>
              <div className="space-y-4 flex-1">
                <div className="space-y-1.5">
                  <label className={lc}>Partita IVA</label>
                  <input type="text" value={piva} onChange={e => setPiva(e.target.value)} placeholder="Es. 12345678901" className={ic} />
                  <HelpText text="11 cifre numeriche, senza prefisso IT." />
                </div>
                <div className="space-y-1.5">
                  <label className={lc}>Codice Fiscale</label>
                  <input type="text" value={codiceFiscale} onChange={e => setCodiceFiscale(e.target.value.toUpperCase())} placeholder="Es. RSSMRA80A01H501Z" className={ic} />
                  <HelpText text="16 caratteri alfanumerici. Lo trovi sulla tua tessera sanitaria." />
                </div>
                <div className="space-y-1.5">
                  <label className={lc}>Via / Indirizzo</label>
                  <input type="text" value={street} onChange={e => setStreet(e.target.value)} placeholder="Via Roma 1" className={ic} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={lc}>CAP</label>
                    <input type="text" inputMode="numeric" value={cap} onChange={e => setCap(e.target.value)} placeholder="20100" className={ic} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={lc}>Città</label>
                    <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Milano" className={ic} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={lc}>Provincia</label>
                  <select value={province} onChange={e => setProvince(e.target.value)} className={ic}>
                    <option value="">Seleziona provincia…</option>
                    {IT_PROVINCE.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {province && (
                    <p className="text-[10px] text-emerald-600 font-bold ml-1">Regione: {getRegionFromProvince(province)}</p>
                  )}
                  <HelpText text="La regione si compila automaticamente dalla provincia — usata per il calcolo addizionali IRPEF." />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex gap-3">
                  <button onClick={() => goBack(2)} className={`w-12 h-12 rounded-2xl flex items-center justify-center active:scale-95 transition-all shrink-0 text-slate-400`} style={{ backgroundColor: 'var(--color-card-bg)' }}>
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => goNext('done')} className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all">
                    Continua
                  </button>
                </div>
                <button onClick={() => goNext('done')} className="w-full py-3 text-sm font-semibold text-slate-400 active:scale-[0.98] transition-all">
                  Salta per ora
                </button>
              </div>
            </motion.div>
          )}

          {/* DONE */}
          {step === 'done' && (
            <motion.div key="done" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-8">
              <div className="space-y-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }} className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
                  <span className="text-white text-4xl">✓</span>
                </motion.div>
                <div className="space-y-2">
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Tutto pronto, {name.split(' ')[0] || 'benvenuto'}!</h2>
                  <p className="text-slate-500 text-sm leading-relaxed">Il tuo profilo è configurato. Puoi iniziare ad aggiungere fatture e gestire le scadenze.</p>
                </div>
                <div className={`flex flex-col gap-2 pt-2 text-sm text-left ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {['Crea la tua prima fattura in pochi secondi', 'Monitora le scadenze fiscali automatiche', 'Calcolo tasse sempre aggiornato'].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-[10px] font-black shrink-0">✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleComplete} disabled={isSubmitting} className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {isSubmitting ? 'Salvataggio…' : 'Vai alla Dashboard'}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
