import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Globe, CreditCard, Briefcase, FileEdit, CheckCircle2, MapPin, Receipt, User, Lock, Info, ChevronDown } from 'lucide-react';
import { IT_PROVINCE, getRegionFromProvince } from '../lib/it/province';
import { useKeyboardPadding, scrollFieldIntoView } from '../hooks/useKeyboardPadding';
import { Profile } from '../types';
import PaywallModal from '../components/modals/PaywallModal';
import { CountryBadge } from '../components/CountryBadge';
import DiceBearAvatar from '../components/ui/DiceBearAvatar';
import { setLanguageByCountry } from '../lib/i18n';
import { profileStorage } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

// Fields that exist in the Supabase profiles table schema
const DB_PROFILE_FIELDS: (keyof Profile)[] = [
  'id', 'name', 'email', 'jobType', 'country', 'currency', 'avatar',
  'address', 'piva', 'nie', 'codiceFiscale', 'iban', 'regime', 'coefficiente',
  'annoInizioAttivita', 'isPro', 'regimenFiscal', 'ivaHabitual',
  'street', 'cap', 'city', 'province', 'region', 'hasOstativaCause',
];

interface ProfileViewProps {
  activeProfile: Profile;
  profiles: Profile[];
  onSwitchProfile: (p: Profile) => void;
  onUpdateProfile: (p: Profile) => Promise<void> | void;
  onAddProfile?: () => void;
  darkMode?: boolean;
  theme?: string;
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

const ProfileView = ({ activeProfile, profiles, onSwitchProfile, onUpdateProfile, onAddProfile, darkMode, theme }: ProfileViewProps) => {
  const isProLight = theme === 'pro-light';
  const { t } = useTranslation();
  const keyboardPadding = useKeyboardPadding();
  const [isEditing, setIsEditing] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isIT19Expanded, setIsIT19Expanded] = useState(false);
  const [isES13Expanded, setIsES13Expanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [taxIdType, setTaxIdType] = useState<'nif' | 'nie'>(() =>
    activeProfile.nie ? 'nie' : 'nif'
  );
  const [editData, setEditData] = useState({
    name: activeProfile.name,
    email: activeProfile.email,
    jobType: activeProfile.jobType,
    country: activeProfile.country,
    currency: activeProfile.currency,
    address: activeProfile.address || '',
    street: activeProfile.street || activeProfile.address || '',
    cap: activeProfile.cap || '',
    city: activeProfile.city || '',
    province: activeProfile.province || '',
    piva: activeProfile.piva || '',
    codiceFiscale: activeProfile.codiceFiscale || '',
    iban: activeProfile.iban || '',
    regime: activeProfile.regime || 'forfettario' as 'forfettario' | 'ordinario',
    coefficiente: activeProfile.coefficiente?.toString() || '',
    annoInizioAttivita: activeProfile.annoInizioAttivita?.toString() || '',
    nie: activeProfile.nie || '',
    retaMensile: profileStorage.get(`reta_${activeProfile.id}`) || '500',
    regimenFiscal: activeProfile.regimenFiscal || 'simplificada',
    ivaHabitual: activeProfile.ivaHabitual?.toString() || '21',
    hasOstativaCause: activeProfile.hasOstativaCause || false,
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
      // Save localStorage-only fields (RETA — no DB column)
      if (isSpain && editData.retaMensile) {
        profileStorage.set(`reta_${activeProfile.id}`, editData.retaMensile);
      }
      // Migrate any old NIE from localStorage to DB
      localStorage.removeItem(`nie_${activeProfile.id}`);

      // Build a clean profile object with only valid DB fields (no nie, no retaMensile)
      const derivedRegion = editData.country === 'Italy' && editData.province
        ? getRegionFromProvince(editData.province)
        : activeProfile.region;
      const derivedAddress = [editData.street, editData.cap && editData.city ? `${editData.cap} ${editData.city}` : editData.city].filter(Boolean).join(', ') || editData.address || undefined;

      const updatedProfile: Profile = {
        ...activeProfile,
        name: editData.name,
        email: editData.email,
        jobType: editData.jobType,
        country: editData.country,
        currency: editData.currency,
        address: derivedAddress,
        street: editData.street || undefined,
        cap: editData.cap || undefined,
        city: editData.city || undefined,
        province: editData.country === 'Italy' ? (editData.province || undefined) : undefined,
        region: derivedRegion || undefined,
        piva: isSpain ? (taxIdType === 'nif' ? editData.piva || undefined : undefined) : editData.piva || undefined,
        nie: isSpain && taxIdType === 'nie' ? editData.nie || undefined : undefined,
        codiceFiscale: editData.codiceFiscale || undefined,
        iban: editData.iban || undefined,
        regime: isSpain ? undefined : editData.regime,
        coefficiente: editData.coefficiente ? parseFloat(editData.coefficiente) : undefined,
        annoInizioAttivita: editData.annoInizioAttivita ? parseInt(editData.annoInizioAttivita) : undefined,
        regimenFiscal: isSpain ? (editData.regimenFiscal as 'simplificada' | 'normal' | 'modulos') : undefined,
        ivaHabitual: isSpain && editData.ivaHabitual ? parseInt(editData.ivaHabitual) as 21 | 10 | 4 : undefined,
        hasOstativaCause: !isSpain && editData.regime === 'forfettario' ? editData.hasOstativaCause : undefined,
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
  const item = { hidden: { opacity: 0, y: 20, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } } };

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
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl" style={{ backgroundColor: 'var(--color-card)' }}>
              <div className="overflow-y-auto max-h-[90vh] p-8 space-y-5" style={{ paddingBottom: Math.max(32, keyboardPadding + 32) }} onFocus={scrollFieldIntoView}>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('profile.edit_title')}</h2>
                    <p className="text-sm text-slate-500">{t('profile.edit_subtitle')}</p>
                  </div>
                  <button onClick={() => setIsEditing(false)} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}><Plus className="rotate-45" size={24} /></button>
                </div>

                {/* Dati personali */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('profile.personal_data')}</p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: t('profile.field_name'), key: 'name', placeholder: t('profile.field_name_placeholder') },
                    { label: t('profile.field_email'), key: 'email', placeholder: t('profile.field_email_placeholder') },
                    { label: t('profile.field_job_type'), key: 'jobType', placeholder: t('profile.field_job_type_placeholder') },
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
                  {/* Indirizzo strutturato */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{isSpain ? 'Calle / Dirección' : 'Via / Indirizzo'}</label>
                    <input type="text" value={editData.street} onChange={e => setEditData({ ...editData, street: e.target.value })} placeholder={isSpain ? 'Calle Gran Vía 1' : 'Via Roma 1'} className={inputClass()} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{isSpain ? 'Código Postal' : 'CAP'}</label>
                      <input type="text" inputMode="numeric" value={editData.cap} onChange={e => setEditData({ ...editData, cap: e.target.value })} placeholder={isSpain ? '28013' : '20100'} className={inputClass()} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{isSpain ? 'Ciudad' : 'Città'}</label>
                      <input type="text" value={editData.city} onChange={e => setEditData({ ...editData, city: e.target.value })} placeholder={isSpain ? 'Madrid' : 'Milano'} className={inputClass()} />
                    </div>
                  </div>
                  {!isSpain && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Provincia</label>
                      <select value={editData.province} onChange={e => setEditData({ ...editData, province: e.target.value })} className={inputClass()}>
                        <option value="">Seleziona provincia…</option>
                        {IT_PROVINCE.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  )}
                  {!isSpain && editData.province && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                      <span>🗺️</span>
                      <span>Regione: {getRegionFromProvince(editData.province) ?? '—'}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('profile.country_label')}</label>
                      {/* Country — read only, immutable after creation */}
                      <div className={`${inputClass()} flex items-center gap-2 opacity-70 cursor-not-allowed`}>
                        <span>{editData.country === 'Spain' ? '🇪🇸' : '🇮🇹'}</span>
                        <span>{editData.country === 'Spain' ? t('profile.country_spain') : t('profile.country_italy')}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('profile.currency_label')}</label>
                      <select value={editData.currency} onChange={e => setEditData({ ...editData, currency: e.target.value as import('../types').Currency })} className={inputClass()}>
                        <option>EUR</option><option>USD</option><option>GBP</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dati fiscali */}
                <div className="space-y-1 pt-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('profile.fiscal_data')}</p>
                </div>
                <div className="space-y-3">
                  {isSpain ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Documento fiscal</label>
                        <div className="flex rounded-xl p-1 gap-1" style={{ backgroundColor: 'var(--color-card-bg)' }}>
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
                        <select value={editData.regimenFiscal} onChange={e => setEditData({ ...editData, regimenFiscal: e.target.value as Profile['regimenFiscal'] })} className={inputClass()}>
                          <option value="simplificada">Estimación Directa Simplificada</option>
                          <option value="normal">Estimación Directa Normal</option>
                          <option value="modulos">Estimación Objetiva / Módulos</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo IVA habitual</label>
                        <select value={editData.ivaHabitual} onChange={e => setEditData({ ...editData, ivaHabitual: e.target.value })} className={inputClass()}>
                          <option value="21">21%</option>
                          <option value="10">10%</option>
                          <option value="4">4%</option>
                        </select>
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
                        <input type="number" min="2000" max={new Date().getFullYear()} value={editData.annoInizioAttivita} onChange={e => setEditData({ ...editData, annoInizioAttivita: e.target.value })} placeholder="ej. 2023" className={inputClass()} />
                        <p className="text-[10px] text-slate-400 ml-1">{t('profile.reta_note')}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('profile.piva_label')}</label>
                        <input type="text" value={editData.piva} onChange={e => setEditData({ ...editData, piva: e.target.value })} placeholder="Es. 12345678901" className={inputClass(errors.piva)} />
                        {errors.piva && <p className="text-xs text-red-500 ml-1 flex items-center gap-1">⚠ {errors.piva}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('profile.cf_label')}</label>
                        <input type="text" value={editData.codiceFiscale} onChange={e => setEditData({ ...editData, codiceFiscale: e.target.value.toUpperCase() })} placeholder="Es. RSSMRA80A01H501Z" className={inputClass(errors.codiceFiscale)} />
                        {errors.codiceFiscale && <p className="text-xs text-red-500 ml-1 flex items-center gap-1">⚠ {errors.codiceFiscale}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">IBAN</label>
                        <input type="text" value={editData.iban} onChange={e => setEditData({ ...editData, iban: e.target.value.replace(/\s+/g, '').toUpperCase() })} placeholder="Es. IT60X0542811101000000123456" className={inputClass(errors.iban)} />
                        {errors.iban && <p className="text-xs text-red-500 ml-1 flex items-center gap-1">⚠ {errors.iban}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('profile.regime_label')}</label>
                        <div className="p-1 rounded-2xl flex gap-1" style={{ backgroundColor: 'var(--color-card-bg)' }}>
                          {(['forfettario', 'ordinario'] as const).map(r => (
                            <button key={r} type="button" onClick={() => setEditData({ ...editData, regime: r })} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${editData.regime === r ? 'bg-primary text-white shadow-lg shadow-primary/30' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('profile.activity_category')}</label>
                        <select
                          value={editData.coefficiente}
                          onChange={e => setEditData({ ...editData, coefficiente: e.target.value })}
                          className={inputClass()}
                        >
                          <option value="">{t('profile.select_category')}</option>
                          <option value="86">{t('profile.cat_construction')}</option>
                          <option value="78">{t('profile.cat_professionals')}</option>
                          <option value="67">{t('profile.cat_artisans')}</option>
                          <option value="62">{t('profile.cat_commerce_intermediaries')}</option>
                          <option value="40">{t('profile.cat_commerce')}</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('profile.activity_start_year')}</label>
                        <input type="number" min="2000" max={new Date().getFullYear()} value={editData.annoInizioAttivita} onChange={e => setEditData({ ...editData, annoInizioAttivita: e.target.value })} placeholder="Es. 2022" className={inputClass()} />
                      </div>
                      {editData.regime === 'forfettario' && (
                        <div className="space-y-2">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editData.hasOstativaCause}
                              onChange={e => setEditData({ ...editData, hasOstativaCause: e.target.checked })}
                              className="mt-0.5 w-4 h-4 rounded accent-primary flex-shrink-0"
                            />
                            <span className="text-xs text-slate-500 leading-relaxed">{t('profile.ostativa_label')}</span>
                          </label>
                          {editData.hasOstativaCause && (
                            <div className="rounded-xl p-3 bg-amber-50 border border-amber-200 flex gap-2">
                              <span className="text-amber-500 text-sm flex-shrink-0">⚠️</span>
                              <p className="text-xs text-amber-700 leading-relaxed">{t('profile.ostativa_warning')}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <button onClick={handleSaveEdit} disabled={hasErrors || isSaving} className={`w-full py-4 rounded-2xl font-bold shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${hasErrors ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed' : saveSuccess ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-primary text-white shadow-primary/30'}`}>
                  {isSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                  {hasErrors ? t('profile.save_error') : saveSuccess ? t('profile.save_success') : isSaving ? t('profile.saving') : t('profile.save_btn')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-8 pb-24">
        <motion.div variants={item} className="flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            <DiceBearAvatar name={activeProfile.name} email={activeProfile.email} size={96} borderWidth={3} className="shadow-xl" />
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
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">{t('profile.profile_settings')}</h3>
          <div className="rounded-2xl border overflow-hidden transition-colors" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            {[
              { icon: Globe, label: t('profile.label_country'), value: activeProfile.country },
              { icon: CreditCard, label: t('profile.label_currency'), value: activeProfile.currency },
              { icon: Briefcase, label: t('profile.label_job_type'), value: activeProfile.jobType },
            ].map(({ icon: Icon, label, value }, i, arr) => (
              <div key={label} className={`w-full p-4 flex items-center justify-between ${i < arr.length - 1 ? 'border-b' : ''}`} style={i < arr.length - 1 ? { borderColor: 'var(--color-border)' } : undefined}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400" style={{ backgroundColor: 'var(--color-card-bg)' }}><Icon size={18} /></div>
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
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('profile.fiscal_data')}</h3>
            {!hasFiscalData && (
              <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-primary uppercase tracking-wider">{t('profile.add_fiscal')}</button>
            )}
          </div>
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            {[
              { icon: Receipt, label: activeProfile.country === 'Spain' ? (taxIdType === 'nie' ? 'NIE' : 'NIF') : t('profile.piva_label'), value: activeProfile.country === 'Spain' ? (taxIdType === 'nie' ? (activeProfile.nie || '—') : (activeProfile.piva || '—')) : (activeProfile.piva || '—') },
              ...(activeProfile.country !== 'Spain' ? [{ icon: User, label: t('profile.label_cf'), value: activeProfile.codiceFiscale || '—' }] : []),
              { icon: MapPin, label: t('profile.label_address'), value: activeProfile.address || '—' },
              { icon: CreditCard, label: 'IBAN', value: activeProfile.iban || '—' },
              { icon: Briefcase, label: t('profile.label_regime'), value: activeProfile.country === 'Spain' ? ({ simplificada: 'Est. Directa Simplificada', normal: 'Est. Directa Normal', modulos: 'Est. Objetiva / Módulos' }[activeProfile.regimenFiscal || 'simplificada']) : (activeProfile.regime ? activeProfile.regime.charAt(0).toUpperCase() + activeProfile.regime.slice(1) : 'Forfettario') },
              ...(activeProfile.country !== 'Spain' && activeProfile.coefficiente ? [{ icon: Receipt, label: t('profile.label_category'), value: `${CATEGORIE_COEFFICIENTE[activeProfile.coefficiente] || activeProfile.coefficiente + '%'} (${activeProfile.coefficiente}%)` }] : []),
              ...(activeProfile.country !== 'Spain' && activeProfile.annoInizioAttivita ? [{ icon: Receipt, label: 'Anno inizio attività', value: activeProfile.annoInizioAttivita.toString() }] : []),
              ...(activeProfile.country === 'Spain' ? [{ icon: Receipt, label: 'IVA habitual', value: `${activeProfile.ivaHabitual ?? 21}%` }] : []),
              ...(activeProfile.country === 'Spain' ? [{ icon: Receipt, label: 'Año inicio actividad', value: activeProfile.annoInizioAttivita ? activeProfile.annoInizioAttivita.toString() : '—' }] : []),
              ...(activeProfile.country === 'Spain' ? [{ icon: Receipt, label: 'Ret. IRPF (auto)', value: (() => { const y = activeProfile.annoInizioAttivita ? new Date().getFullYear() - activeProfile.annoInizioAttivita : 10; return `${y <= 3 ? 7 : 15}%`; })() }] : []),
              ...(activeProfile.country === 'Spain' ? [{ icon: Receipt, label: 'RETA mensual', value: `€${profileStorage.get(`reta_${activeProfile.id}`) || '500'}/mes` }] : []),
            ].map(({ icon: Icon, label, value }, i, arr) => (
              <div key={label} className={`w-full p-4 flex items-center justify-between ${i < arr.length - 1 ? 'border-b' : ''}`} style={i < arr.length - 1 ? { borderColor: 'var(--color-border)' } : undefined}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400" style={{ backgroundColor: 'var(--color-card-bg)' }}><Icon size={18} /></div>
                  <span className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{label}</span>
                </div>
                <span className={`text-sm ${value === '—' ? 'text-slate-300' : 'text-slate-400'}`}>{value}</span>
              </div>
            ))}
          </div>
          {/* Disclaimer IT-18 / ES-12 */}
          <p className="text-[10px] text-slate-400 leading-relaxed px-1">
            {activeProfile.country === 'Spain'
              ? 'Los cálculos mostrados son estimaciones basadas en los datos introducidos y los tipos fiscales estándar. No constituyen asesoramiento fiscal profesional. Consulta siempre con tu gestor o asesor fiscal.'
              : 'I calcoli mostrati sono stime indicative basate sui dati inseriti e sulle aliquote fiscali standard. Non costituiscono consulenza fiscale professionale. Consulta sempre il tuo commercialista.'}
          </p>

          {/* IT-19 — Limiti app */}
          {activeProfile.country !== 'Spain' && (
            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-slate-800' : 'border-slate-100'}`} style={isProLight ? { backgroundColor: '#ffffff', border: '1.5px solid rgba(200,85,247,0.35)' } : { backgroundColor: 'var(--color-card-bg)' }}>
              <button
                onClick={() => setIsIT19Expanded(v => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <Info size={14} className="text-slate-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-400">Limiti dei calcoli di Solvy</span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isIT19Expanded ? 'rotate-180' : ''}`} />
              </button>
              {isIT19Expanded && (
                <div className={`px-4 pb-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`} style={isProLight ? { borderColor: 'rgba(200,85,247,0.15)' } : undefined}>
                  <p className="text-[10px] text-slate-400 leading-relaxed pt-3">
                    I calcoli di Solvy sono ottimizzati per i casi più comuni (forfettari e ordinari senza situazioni particolari). Se hai redditi da lavoro dipendente, immobili, investimenti o situazioni familiari complesse, i calcoli potrebbero non essere accurati. Consulta sempre il tuo commercialista per la dichiarazione definitiva.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ES-13 — Límites app */}
          {activeProfile.country === 'Spain' && (
            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-slate-800' : 'border-slate-100'}`} style={isProLight ? { backgroundColor: '#ffffff', border: '1.5px solid rgba(200,85,247,0.35)' } : { backgroundColor: 'var(--color-card-bg)' }}>
              <button
                onClick={() => setIsES13Expanded(v => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <Info size={14} className="text-slate-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-400">Límites de los cálculos de Solvy</span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isES13Expanded ? 'rotate-180' : ''}`} />
              </button>
              {isES13Expanded && (
                <div className={`px-4 pb-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <p className="text-[10px] text-slate-400 leading-relaxed pt-3">
                    Solvy calcula tus impuestos de forma automática basándose en los datos que introduces. Los cálculos están optimizados para los casos más comunes (autónomos en Estimación Directa sin situaciones especiales). Si tienes rentas del trabajo, inmuebles, inversiones o situaciones familiares complejas, los cálculos podrían no ser precisos. Consulta a tu gestor para una declaración exacta.
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        <motion.div variants={item} className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">{t('profile.change_profile')}</h3>
          <div className="space-y-3">
            {profiles.map(p => (
              <button key={p.id} onClick={() => onSwitchProfile(p)} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${activeProfile.id === p.id ? (darkMode ? 'bg-primary/10 border-primary shadow-xl shadow-primary/20' : 'bg-primary/5 border-primary shadow-lg shadow-primary/10') : (darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5')}`}>
                <DiceBearAvatar name={p.name} email={p.email} size={40} borderWidth={2} />
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
                {t('profile.add_profile')}
              </button>
            ) : (
              <button onClick={() => setIsPaywallOpen(true)} className={`w-full p-4 rounded-2xl border border-dashed flex items-center justify-between gap-2 text-sm font-bold transition-all active:scale-[0.98] ${darkMode ? 'border-slate-800 text-slate-600 hover:border-primary/30' : 'border-slate-200 text-slate-300 hover:border-primary/30'}`}>
                <div className="flex items-center gap-2">
                  <Plus size={18} />
                  {t('profile.add_profile')}
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
