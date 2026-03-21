import { useState } from 'react';
import { motion } from 'motion/react';
import { Accountant } from '../types';

interface AccountantViewProps {
  accountant: Accountant;
  onSave: (a: Accountant) => Promise<void> | void;
  darkMode?: boolean;
  key?: string;
}

const AccountantView = ({ accountant, onSave, darkMode }: AccountantViewProps) => {
  const [formData, setFormData] = useState({ ...accountant });
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const fields = [
    { label: 'Nome', key: 'firstName', placeholder: 'Nome del commercialista' },
    { label: 'Cognome', key: 'lastName', placeholder: 'Cognome' },
    { label: 'Email', key: 'email', placeholder: 'email@studio.it' },
    { label: 'Telefono', key: 'phone', placeholder: '+39 02 1234567' },
    { label: 'Studio / Sede', key: 'office', placeholder: 'Studio e indirizzo' },
    { label: 'Contratto', key: 'contractDetails', placeholder: 'Tipo di contratto e scadenza' },
    { label: 'Istruzioni Invio Fatture', key: 'sendingInstructions', placeholder: 'Come e quando inviare i documenti' },
  ];

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-6 pb-24">
      <motion.div variants={item} className={`flex items-center gap-4 p-5 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary/20">
          {formData.firstName[0]}{formData.lastName[0]}
        </div>
        <div>
          <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formData.firstName} {formData.lastName}</p>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Commercialista</p>
        </div>
      </motion.div>

      <div className="space-y-4">
        {fields.map(({ label, key, placeholder }) => (
          <motion.div key={key} variants={item} className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            {key === 'sendingInstructions' ? (
              <textarea value={formData[key as keyof typeof formData]} onChange={e => setFormData({ ...formData, [key]: e.target.value })} placeholder={placeholder} rows={3} className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none ${darkMode ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-600' : 'bg-white border-slate-100 text-slate-900 placeholder:text-slate-400'}`} />
            ) : (
              <input type="text" value={formData[key as keyof typeof formData]} onChange={e => setFormData({ ...formData, [key]: e.target.value })} placeholder={placeholder} className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-600' : 'bg-white border-slate-100 text-slate-900 placeholder:text-slate-400'}`} />
            )}
          </motion.div>
        ))}
      </div>

      <motion.button variants={item} onClick={handleSave} disabled={isSaving} className={`w-full py-4 rounded-2xl font-bold shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 ${saved ? 'bg-emerald-500 shadow-emerald-500/30 text-white' : 'bg-primary shadow-primary/30 text-white'}`}>
        {isSaving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {saved ? '✓ Salvato!' : isSaving ? 'Salvataggio…' : 'Salva Modifiche'}
      </motion.button>
    </motion.div>
  );
};

export default AccountantView;
