import { useState } from 'react';
import { motion } from 'motion/react';
import { Info } from 'lucide-react';
import { Profile } from '../types';
import { IT_ADDIZIONALI_REGIONALI } from '../lib/it/addizionali';
import AtecoSelector from '../components/AtecoSelector';

interface FiscalViewProps {
  profile: Profile;
  onUpdateProfile?: (p: Profile) => void;
  darkMode?: boolean;
}

const FiscalView = ({ profile, onUpdateProfile, darkMode }: FiscalViewProps) => {
  const [redditoN1Input, setRedditoN1Input] = useState(
    profile.redditoN1 != null ? String(profile.redditoN1) : ''
  );
  const [redditoN1Saved, setRedditoN1Saved] = useState(false);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } };
  const item = { hidden: { opacity: 0 }, show: { opacity: 1 } };

  if (profile.country !== 'Italy') {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="p-6 pb-40">
        <motion.div variants={item} className={`p-6 rounded-3xl border text-center space-y-2 transition-colors`} style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <p className={`text-sm font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Sezione disponibile per profili italiani</p>
          <p className="text-xs text-slate-400">Le impostazioni fiscali italiane (ATECO, regione, acconti) sono disponibili solo per profili con paese impostato su Italia.</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-4 pb-40">

      {/* Regione fiscale */}
      <motion.div variants={item} className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Regione fiscale</p>
        <div className={`p-4 rounded-3xl border space-y-2 transition-colors`} style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <p className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Regione fiscale</p>
          {profile.region ? (
            <>
              <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{profile.region}</span>
                {IT_ADDIZIONALI_REGIONALI[profile.region] && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${profile.regime === 'ordinario' ? 'bg-primary/10 text-primary' : (darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500')}`}>
                    {(IT_ADDIZIONALI_REGIONALI[profile.region] * 100).toFixed(2)}%
                  </span>
                )}
              </div>
              {profile.regime === 'forfettario' ? (
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Nel regime forfettario le addizionali non si applicano — salvata per eventuale passaggio all&apos;ordinario.
                </p>
              ) : (
                <p className="text-[10px] text-emerald-600 font-bold">
                  Addizionale regionale applicata al calcolo IRPEF
                </p>
              )}
            </>
          ) : (
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Imposta la provincia nel tuo <span className="font-bold text-primary">Profilo → Modifica</span> per calcolare le addizionali regionali reali.
            </p>
          )}
        </div>
      </motion.div>

      {/* Reddito anno precedente */}
      <motion.div variants={item} className="space-y-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Acconti</p>
        <div className={`p-4 rounded-3xl border space-y-3 transition-colors`} style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <div>
            <p className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Reddito anno precedente</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Per calcolo acconti più preciso</p>
          </div>
          <div className="flex gap-2">
            <div className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>€</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={redditoN1Input}
                onChange={e => { setRedditoN1Input(e.target.value); setRedditoN1Saved(false); }}
                placeholder="es. 28000"
                className={`flex-1 text-sm font-bold bg-transparent focus:outline-none ${darkMode ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`}
              />
            </div>
            <button
              onClick={() => {
                const val = redditoN1Input.trim() ? Number(redditoN1Input) : undefined;
                onUpdateProfile?.({ ...profile, redditoN1: val });
                setRedditoN1Saved(true);
                setTimeout(() => setRedditoN1Saved(false), 2000);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${redditoN1Saved ? 'bg-emerald-500 text-white' : 'bg-primary text-white'}`}
            >
              {redditoN1Saved ? '✓' : 'Salva'}
            </button>
          </div>
          {profile.annoInizioAttivita === new Date().getFullYear() && !redditoN1Input.trim() && (
            <p className="text-[10px] text-blue-500 font-bold">
              Primo anno — nessun acconto dovuto nel calendario
            </p>
          )}
        </div>
      </motion.div>

      {/* Categoria ATECO — solo forfettario */}
      {profile.regime === 'forfettario' && (
        <motion.div variants={item} className="space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoria ATECO</p>
          <div className={`p-4 rounded-3xl border space-y-3 transition-colors`} style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div>
              <p className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Categoria Attività (Codice ATECO)</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Determina il coefficiente di redditività</p>
            </div>
            <AtecoSelector
              value={profile.coefficiente}
              onChange={coeff => onUpdateProfile?.({ ...profile, coefficiente: coeff })}
              darkMode={darkMode}
            />
          </div>
        </motion.div>
      )}

      {/* Banner INPS artigiani/commercianti */}
      {(profile.coefficiente === 67 || profile.coefficiente === 40) && (
        <motion.div variants={item}>
          <div className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border ${darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
            <Info size={16} className="mt-0.5 shrink-0" />
            <p className="text-xs font-bold leading-relaxed">
              La tua categoria potrebbe richiedere INPS {profile.coefficiente === 67 ? 'artigiani' : 'commercianti'} invece della gestione separata. Verifica con il tuo commercialista.
            </p>
          </div>
        </motion.div>
      )}

    </motion.div>
  );
};

export default FiscalView;
