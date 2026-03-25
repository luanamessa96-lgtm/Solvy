import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Globe, CreditCard, Briefcase, FileEdit, CheckCircle2, MapPin, Receipt, User, Lock } from 'lucide-react';
import { Profile } from '../types';
import PaywallModal from '../components/modals/PaywallModal';
import { CountryBadge } from '../components/CountryBadge';
import { setLanguageByCountry } from '../lib/i18n';
import { profileStorage } from '../lib/supabase';

// Fields that exist in the Supabase profiles table schema
const DB_PROFILE_FIELDS: (keyof Profile)[] = [
  'id', 'name', 'email', 'jobType', 'country', 'currency', 'avatar',
  'address', 'piva', 'codiceFiscale', 'iban', 'regime', 'coefficiente',
  'annoInizioAttivita', 'isPro',
];

interface ProfileViewProps {
  activeProfile: Profile;
  profiles: Profile[];
  onSwitchProfile: (p: Profile) => void;
  onUpdateProfile: (p: Profile) => Promise<void> | void;
  onAddProfile?: () => void;
  darkMode?: boolean;
  key?: string;
}

// ─── Validatori ───────────────────────────────────────────────────────────────
const NIF_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

function validateNIF(nif: string): boolean {
  if (!nif) return false;
  const cleaned = nif.toUpperCase().trim();
  if (!/^\d{8}[A-Z]$/.test(cleaned)) return false;
  const number = parseInt(cleaned.slice(0, 8), 10);
  const letter = cleaned[8];
  return letter === NIF_LETTERS[number % 23];
}

function validateNIE(nie: string): boolean {
  if (!nie) return false;
  const cleaned = nie.toUpperCase().trim();
  if (!/^[XYZ]\d{7}[A-Z]$/.test(cleaned)) return false;
  const prefix = cleaned[0];
  const replacement = prefix === 'X' ? '0' : prefix === 'Y' ? '1' : '2';
  return validateNIF(replacement + cleaned.slice(1));
}

function validateIBAN_ES(iban: string): boolean {
  if (!iban) return false;
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  return cleaned.startsWith('ES') && cleaned.length === 24;
}

function validateIBAN(v: string): string | null {
  if (!v) return null;
  const clean = v.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(clean)) return 'Formato non valido (es. IT60X054281...)';
  const lengths: Record<string, number> = { IT: 27, DE: 22, FR: 27, GB: 22, ES: 24 };
  const expected = lengths[clean.slice(0, 2)];
  if (expected && clean.length !== expected) return `Lunghezza errata: attesi ${expected} caratteri`;
  return null;
}

function validatePiva(v: string): string | null {
  if (!v) return null;
  const clean = v.replace(/\s+/g, '');
  if (!/^\d{11}$/.test(clean)) return 'Deve contenere esattamente 11 cifre';
  return null;
}

function validateCF(v: string): string | null {
  if (!v) return null;
  const clean = v.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(clean)) return 'Formato non valido (16 caratteri alfanumerici)';
  return null;
}

const ProfileView = ({ activeProfile, profiles, onSwitchProfile, onUpdateProfile, onAddProfile, darkMode }: ProfileViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [taxIdType, setTaxIdType] = useState<'nif' | 'nie'>(() =>
    profileStorage.get(`nie_${activeProfile.id}`) ? 'nie' : 'nif'
  );
  const [editData, setEditData] = useState({
    name: activeProfile.name,
    email: activeProfile.email,
    jobType: activeProfile.jobType,
    country: activeProfile.country,
    currency: activeProfile.currency,
    address: activeProfile.address || '',
    piva: activeProfile.piva || '',
    codiceFiscale: activeProfile.codiceFiscale || '',
    iban: activeProfile.iban || '',
    regime: activeProfile.regime || 'forfettario' as 'forfettario' | 'ordinario',
    coefficiente: activeProfile.coefficiente?.toString() || '',
    annoInizioAttivita: activeProfile.annoInizioAttivita?.toString() || '',
    nie: profileStorage.get(`nie_${activeProfile.id}`) || '',
    retaMensile: profileStorage.get(`reta_${activeProfile.id}`) || '500',
  });

  const isSpain = editData.country === 'Spain';

  const errors = {
    iban: isSpain
      ? (editData.iban && !validateIBAN_ES(editData.iban) ? 'IBAN spagnolo non valido (ES + 22 cifre)' : null)
      : validateIBAN(editData.iban),
    // Valida solo il campo attivo nel toggle NIF/NIE
    piva: isSpain
      ? (taxIdType === 'nif' && editData.piva.length > 0 && !validateNIF(editData.piva) ? 'NIF non valido (8 cifre + lettera)' : null)
      : validatePiva(editData.piva),
    codiceFiscale: isSpain ? null : validateCF(editData.codiceFiscale),
    nie: isSpain && taxIdType === 'nie' && editData.nie.length > 0
      ? (!validateNIE(editData.nie) ? 'NIE non valido (X/Y/Z + 7 cifre + lettera)' : null)
      : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const handleSaveEdit = async () => {
    if (hasErrors) return;
    setIsSaving(true);
    try {
      // Save localStorage-only fields separately (not in Supabase schema)
      if (isSpain) {
        if (editData.retaMensile) profileStorage.set(`reta_${activeProfile.id}`, editData.retaMensile);
        if (taxIdType === 'nie' && editData.nie) {
          profileStorage.set(`nie_${activeProfile.id}`, editData.nie);
        } else {
          // Se si salva con NIF, pulisci il NIE dal localStorage
          localStorage.removeItem(`nie_${activeProfile.id}`);
        }
      }

      // Build a clean profile object with only valid DB fields (no nie, no retaMensile)
      const updatedProfile: Profile = {
        ...activeProfile,
        name: editData.name,
        email: editData.email,
        jobType: editData.jobType,
        country: editData.country,
        currency: editData.currency,
        address: editData.address || undefined,
        piva: isSpain ? (taxIdType === 'nif' ? editData.piva || undefined : undefined) : editData.piva || undefined,
        codiceFiscale: editData.codiceFiscale || undefined,
        iban: editData.iban || undefined,
        regime: editData.regime,
        coefficiente: editData.coefficiente ? parseFloat(editData.coefficiente) : undefined,
        annoInizioAttivita: editData.annoInizioAttivita ? parseInt(editData.annoInizioAttivita) : undefined,
      };

      // Safety: ensure no non-DB keys sneak in
      const safeProfile = Object.fromEntries(
        Object.entries(updatedProfile).filter(([k]) => DB_PROFILE_FIELDS.includes(k as keyof Profile))
      ) as Profile;

      await onUpdateProfile(safeProfile);
      setLanguageByCountry(editData.country);
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); setIsEditing(false); }, 1000);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = (error?: string | null) =>
    `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${
      error
        ? 'border-red-400 bg-red-50 text-red-900 focus:ring-red-200 placeholder:text-red-300'
        : darkMode
        ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:ring-primary/20'
        : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400 focus:ring-primary/20'
    }`;

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 20, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

  const hasFiscalData = activeProfile.piva || activeProfile.codiceFiscale || activeProfile.address;

  const CATEGORIE_COEFFICIENTE: Record<number, string> = {
    86: 'Costruzioni / Immobiliare',
    78: 'Professionisti',
    67: 'Artigiani / Servizi',
    62: 'Intermediari commercio',
    40: 'Commercio / Ristorazione',
  };

  return (
    <>
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditing(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}>
              <div className="overflow-y-auto max-h-[90vh] p-8 space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Modifica Profilo</h2>
                    <p className="text-sm text-slate-500">Dati personali e fiscali</p>
                  </div>
                  <button onClick={() => setIsEditing(false)} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}><Plus className="rotate-45" size={24} /></button>
                </div>

                {/* Dati personali */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dati Personali</p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Nome e Cognome', key: 'name', placeholder: 'Es. Mario Rossi' },
                    { label: 'Email', key: 'email', placeholder: 'La tua email' },
                    { label: 'Tipo Lavoro', key: 'jobType', placeholder: 'Es. Freelance Designer' },
                    { label: 'Indirizzo', key: 'address', placeholder: 'Via Roma 1, 20100 Milano' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
                      <input
                        type="text"
                        value={editData[key as keyof typeof editData] as string}
                        onChange={e => setEditData({ ...editData, [key]: e.target.value })}
                        placeholder={placeholder}
                        className={inputClass()}
                      />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Paese</label>
                      {/* Country — read only, immutable after creation */}
                      <div className={`${inputClass()} flex items-center gap-2 opacity-70 cursor-not-allowed`}>
                        <span>{editData.country === 'Spain' ? '🇪🇸' : '🇮🇹'}</span>
                        <span>{editData.country === 'Spain' ? 'Spagna' : 'Italia'}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valuta</label>
                      <select value={editData.currency} onChange={e => setEditData({ ...editData, currency: e.target.value as import('../types').Currency })} className={inputClass()}>
                        <option>EUR</option><option>USD</option><option>GBP</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dati fiscali */}
                <div className="space-y-1 pt-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dati Fiscali</p>
                </div>
                <div className="space-y-3">
                  {isSpain ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Documento fiscal</label>
                        <div className={`flex rounded-xl p-1 gap-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                          <button type="button" onClick={() => { setTaxIdType('nif'); setEditData({ ...editData, nie: '' }); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${taxIdType === 'nif' ? 'bg-primary text-white shadow' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>NIF</button>
                          <button type="button" onClick={() => { setTaxIdType('nie'); setEditData({ ...editData, piva: '' }); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${taxIdType === 'nie' ? 'bg-primary text-white shadow' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>NIE</button>
                        </div>
                        {taxIdType === 'nif' ? (
                          <div>
                            <input type="text" value={editData.piva} onChange={e => setEditData({ ...editData, piva: e.target.value.toUpperCase() })} placeholder="Es. 12345678A" className={inputClass(errors.piva)} />
                            {errors.piva && <p className="text-xs text-red-500 ml-1 flex items-center gap-1 mt-1">⚠ {errors.piva}</p>}
                          </div>
                        ) : (
                          <div>
                            <input type="text" value={editData.nie} onChange={e => setEditData({ ...editData, nie: e.target.value.toUpperCase() })} placeholder="Es. X1234567A" className={inputClass(errors.nie)} />
                            {errors.nie && <p className="text-xs text-red-500 ml-1 flex items-center gap-1 mt-1">⚠ {errors.nie}</p>}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">IBAN</label>
                        <input type="text" value={editData.iban} onChange={e => setEditData({ ...editData, iban: e.target.value.replace(/\s+/g, '').toUpperCase() })} placeholder="Es. ES9121000418450200051332" className={inputClass(errors.iban)} />
                        {errors.iban && <p className="text-xs text-red-500 ml-1 flex items-center gap-1">⚠ {errors.iban}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Régimen Fiscal</label>
                        <div className={`px-4 py-3 border rounded-xl text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                          Estimación directa simplificada
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cuota RETA mensual</label>
                        <select value={editData.retaMensile} onChange={e => setEditData({ ...editData, retaMensile: e.target.value })} className={inputClass()}>
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
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Año inicio actividad</label>
                        <input type="number" min="2000" max={new Date().getFullYear()} value={editData.annoInizioAttivita} onChange={e => setEditData({ ...editData, annoInizioAttivita: e.target.value })} placeholder="Es. 2022" className={inputClass()} />
                        <p className="text-[10px] text-slate-400 ml-1">Usato per calcolare la Tarifa Plana RETA (€80/mes primo anno)</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Partita IVA</label>
                        <input type="text" value={editData.piva} onChange={e => setEditData({ ...editData, piva: e.target.value })} placeholder="Es. 12345678901" className={inputClass(errors.piva)} />
                        {errors.piva && <p className="text-xs text-red-500 ml-1 flex items-center gap-1">⚠ {errors.piva}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Codice Fiscale</label>
                        <input type="text" value={editData.codiceFiscale} onChange={e => setEditData({ ...editData, codiceFiscale: e.target.value.toUpperCase() })} placeholder="Es. RSSMRA80A01H501Z" className={inputClass(errors.codiceFiscale)} />
                        {errors.codiceFiscale && <p className="text-xs text-red-500 ml-1 flex items-center gap-1">⚠ {errors.codiceFiscale}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">IBAN</label>
                        <input type="text" value={editData.iban} onChange={e => setEditData({ ...editData, iban: e.target.value.replace(/\s+/g, '').toUpperCase() })} placeholder="Es. IT60X0542811101000000123456" className={inputClass(errors.iban)} />
                        {errors.iban && <p className="text-xs text-red-500 ml-1 flex items-center gap-1">⚠ {errors.iban}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Regime Fiscale</label>
                        <div className={`p-1 rounded-2xl flex gap-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                          {(['forfettario', 'ordinario'] as const).map(r => (
                            <button key={r} type="button" onClick={() => setEditData({ ...editData, regime: r })} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${editData.regime === r ? 'bg-primary text-white shadow-lg shadow-primary/30' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Categoria Attività</label>
                        <select
                          value={editData.coefficiente}
                          onChange={e => setEditData({ ...editData, coefficiente: e.target.value })}
                          className={inputClass()}
                        >
                          <option value="">Seleziona categoria...</option>
                          <option value="86">Costruzioni e attività immobiliari — 86%</option>
                          <option value="78">Professionisti (consulenti, designer, sviluppatori…) — 78%</option>
                          <option value="67">Artigiani e altri servizi — 67%</option>
                          <option value="62">Intermediari del commercio — 62%</option>
                          <option value="40">Commercio e ristorazione — 40%</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Anno Inizio Attività</label>
                        <input type="number" min="2000" max={new Date().getFullYear()} value={editData.annoInizioAttivita} onChange={e => setEditData({ ...editData, annoInizioAttivita: e.target.value })} placeholder="Es. 2022" className={inputClass()} />
                      </div>
                    </>
                  )}
                </div>

                <button onClick={handleSaveEdit} disabled={hasErrors || isSaving} className={`w-full py-4 rounded-2xl font-bold shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${hasErrors ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed' : saveSuccess ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-primary text-white shadow-primary/30'}`}>
                  {isSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  {hasErrors ? 'Correggi gli errori per salvare' : saveSuccess ? '✓ Salvato!' : isSaving ? 'Salvataggio…' : 'Salva Modifiche'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-8 pb-24">
        <motion.div variants={item} className="flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            <div className={`w-24 h-24 rounded-3xl border-4 shadow-xl overflow-hidden transition-all group-hover:shadow-primary/20 ${darkMode ? 'border-slate-800' : 'border-white'}`}>
              <img src={activeProfile.avatar} alt={activeProfile.name} className="w-full h-full object-cover" />
            </div>
            <button onClick={() => setIsEditing(true)} className={`absolute -bottom-2 -right-2 w-8 h-8 bg-primary text-white rounded-xl flex items-center justify-center border-2 shadow-lg transition-all active:scale-90 hover:shadow-primary/40 ${darkMode ? 'border-slate-900' : 'border-white'}`}>
              <FileEdit size={14} />
            </button>
          </div>
          <div className="space-y-1.5">
            <h2 className={`text-xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{activeProfile.name}</h2>
            <p className="text-sm text-slate-500">{activeProfile.jobType}</p>
            <div className="flex justify-center">
              <CountryBadge country={activeProfile.country} size="md" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Impostazioni Profilo</h3>
          <div className={`rounded-2xl border overflow-hidden transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            {[
              { icon: Globe, label: 'Paese', value: activeProfile.country },
              { icon: CreditCard, label: 'Valuta', value: activeProfile.currency },
              { icon: Briefcase, label: 'Tipo Lavoro', value: activeProfile.jobType },
            ].map(({ icon: Icon, label, value }, i, arr) => (
              <div key={label} className={`w-full p-4 flex items-center justify-between ${i < arr.length - 1 ? (darkMode ? 'border-b border-slate-800' : 'border-b border-slate-50') : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}><Icon size={18} /></div>
                  <span className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{label}</span>
                </div>
                <span className="text-sm text-slate-400">{value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Dati fiscali */}
        <motion.div variants={item} className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dati Fiscali</h3>
            {!hasFiscalData && (
              <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-primary uppercase tracking-wider">Aggiungi</button>
            )}
          </div>
          <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            {[
              { icon: Receipt, label: activeProfile.country === 'Spain' ? 'NIF' : 'Partita IVA', value: activeProfile.piva || '—' },
              ...(activeProfile.country !== 'Spain' ? [{ icon: User, label: 'Codice Fiscale', value: activeProfile.codiceFiscale || '—' }] : []),
              { icon: MapPin, label: 'Indirizzo', value: activeProfile.address || '—' },
              { icon: CreditCard, label: 'IBAN', value: activeProfile.iban || '—' },
              { icon: Briefcase, label: activeProfile.country === 'Spain' ? 'Régimen' : 'Regime', value: activeProfile.country === 'Spain' ? 'Estimación directa simplificada' : (activeProfile.regime ? activeProfile.regime.charAt(0).toUpperCase() + activeProfile.regime.slice(1) : 'Forfettario') },
              ...(activeProfile.country !== 'Spain' && activeProfile.coefficiente ? [{ icon: Receipt, label: 'Categoria', value: `${CATEGORIE_COEFFICIENTE[activeProfile.coefficiente] || activeProfile.coefficiente + '%'} (${activeProfile.coefficiente}%)` }] : []),
              ...(activeProfile.country === 'Spain' ? [{ icon: Receipt, label: 'RETA mensual', value: `€${profileStorage.get(`reta_${activeProfile.id}`) || '500'}/mes` }] : []),
            ].map(({ icon: Icon, label, value }, i, arr) => (
              <div key={label} className={`w-full p-4 flex items-center justify-between ${i < arr.length - 1 ? (darkMode ? 'border-b border-slate-800' : 'border-b border-slate-50') : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}><Icon size={18} /></div>
                  <span className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{label}</span>
                </div>
                <span className={`text-sm ${value === '—' ? 'text-slate-300' : 'text-slate-400'}`}>{value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={item} className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Cambia Profilo</h3>
          <div className="space-y-3">
            {profiles.map(p => (
              <button key={p.id} onClick={() => onSwitchProfile(p)} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${activeProfile.id === p.id ? (darkMode ? 'bg-primary/10 border-primary shadow-xl shadow-primary/20' : 'bg-primary/5 border-primary shadow-lg shadow-primary/10') : (darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5')}`}>
                <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-lg" />
                <div className="flex-1 text-left">
                  <p className={`text-sm font-bold ${activeProfile.id === p.id ? 'text-primary' : (darkMode ? 'text-white' : 'text-slate-900')}`}>{p.name}</p>
                  <p className="text-xs text-slate-500">{p.jobType}</p>
                </div>
                {activeProfile.id === p.id && <CheckCircle2 size={20} className="text-primary" />}
              </button>
            ))}
            {activeProfile.isPro ? (
              <button onClick={onAddProfile} className={`w-full p-4 rounded-2xl border border-dashed flex items-center gap-2 text-sm font-bold transition-all active:scale-[0.98] ${darkMode ? 'border-primary/40 text-primary hover:bg-primary/10' : 'border-primary/30 text-primary hover:bg-primary/5'}`}>
                <Plus size={18} />
                Aggiungi Profilo
              </button>
            ) : (
              <button onClick={() => setIsPaywallOpen(true)} className={`w-full p-4 rounded-2xl border border-dashed flex items-center justify-between gap-2 text-sm font-bold transition-all active:scale-[0.98] ${darkMode ? 'border-slate-800 text-slate-600 hover:border-primary/30' : 'border-slate-200 text-slate-300 hover:border-primary/30'}`}>
                <div className="flex items-center gap-2">
                  <Plus size={18} />
                  Aggiungi Profilo
                </div>
                <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded-full">
                  <Lock size={11} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Pro</span>
                </div>
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
      <PaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} darkMode={darkMode} />
    </>
  );
};

export default ProfileView;
