import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Globe, CreditCard, Briefcase, FileEdit, CheckCircle2 } from 'lucide-react';
import { Profile } from '../types';

interface ProfileViewProps {
  activeProfile: Profile;
  profiles: Profile[];
  onSwitchProfile: (p: Profile) => void;
  onUpdateProfile: (p: Profile) => void;
  darkMode?: boolean;
  key?: string;
}

const ProfileView = ({ activeProfile, profiles, onSwitchProfile, onUpdateProfile, darkMode }: ProfileViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: activeProfile.name, email: activeProfile.email, jobType: activeProfile.jobType, country: activeProfile.country, currency: activeProfile.currency });

  const handleSaveEdit = () => {
    onUpdateProfile({ ...activeProfile, ...editData });
    setIsEditing(false);
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 20, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

  return (
    <>
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditing(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className={`relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}>
              <div className="p-8 space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Modifica Profilo</h2>
                    <p className="text-sm text-slate-500">Aggiorna i tuoi dati personali</p>
                  </div>
                  <button onClick={() => setIsEditing(false)} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}><Plus className="rotate-45" size={24} /></button>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Nome', key: 'name', placeholder: 'Il tuo nome' },
                    { label: 'Email', key: 'email', placeholder: 'La tua email' },
                    { label: 'Tipo Lavoro', key: 'jobType', placeholder: 'Es. Freelance Designer' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
                      <input type="text" value={editData[key as keyof typeof editData]} onChange={e => setEditData({ ...editData, [key]: e.target.value })} placeholder={placeholder} className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`} />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Paese</label>
                      <select value={editData.country} onChange={e => setEditData({ ...editData, country: e.target.value as any })} className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}>
                        <option>Italy</option><option>USA</option><option>UK</option><option>Germany</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valuta</label>
                      <select value={editData.currency} onChange={e => setEditData({ ...editData, currency: e.target.value as any })} className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}>
                        <option>EUR</option><option>USD</option><option>GBP</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button onClick={handleSaveEdit} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all">Salva Modifiche</button>
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
          <div>
            <h2 className={`text-xl font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{activeProfile.name}</h2>
            <p className="text-sm text-slate-500">{activeProfile.jobType}</p>
          </div>
        </motion.div>

        <motion.div variants={item} className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Impostazioni Profilo</h3>
          <div className={`rounded-2xl border overflow-hidden transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <button className={`w-full p-4 flex items-center justify-between border-b transition-all active:bg-slate-800/10 group ${darkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-50 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 transition-colors ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}><Globe size={18} /></div>
                <span className={`text-sm font-semibold transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Paese</span>
              </div>
              <span className="text-sm text-slate-400">{activeProfile.country}</span>
            </button>
            <button className={`w-full p-4 flex items-center justify-between border-b transition-all active:bg-slate-800/10 group ${darkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-50 hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 transition-colors ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}><CreditCard size={18} /></div>
                <span className={`text-sm font-semibold transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Valuta</span>
              </div>
              <span className="text-sm text-slate-400">{activeProfile.currency}</span>
            </button>
            <button className={`w-full p-4 flex items-center justify-between transition-all active:bg-slate-800/10 group ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 transition-colors ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}><Briefcase size={18} /></div>
                <span className={`text-sm font-semibold transition-colors ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>Tipo Lavoro</span>
              </div>
              <span className="text-sm text-slate-400">{activeProfile.jobType}</span>
            </button>
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
            <button className={`w-full p-4 rounded-2xl border border-dashed text-slate-400 flex items-center justify-center gap-2 text-sm font-bold transition-all active:scale-[0.98] hover:shadow-lg ${darkMode ? 'border-slate-800 hover:bg-slate-900 hover:border-primary/40 hover:shadow-primary/10' : 'border-slate-200 hover:bg-slate-50 hover:border-primary/20 hover:shadow-primary/5'}`}>
              <Plus size={18} />
              Aggiungi Profilo
            </button>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default ProfileView;
