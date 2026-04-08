import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, Building2, FileText, MessageSquare, Pencil, ChevronDown, Plus } from 'lucide-react';
import { Accountant } from '../types';

interface AccountantViewProps {
  accountant: Accountant;
  onSave: (a: Accountant) => Promise<void> | void;
  darkMode?: boolean;
  key?: string;
}

const EXPANDABLE_KEYS = new Set(['office', 'contractDetails', 'sendingInstructions']);

const AccountantView = ({ accountant, onSave, darkMode }: AccountantViewProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...accountant });
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modal, setModal] = useState<{ title: string; text: string } | null>(null);

  const handleEdit = () => {
    setFormData({ ...accountant });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setSaved(true);
      setTimeout(() => { setSaved(false); setIsEditing(false); }, 1500);
    } finally {
      setIsSaving(false);
    }
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } };
  const item = { hidden: { opacity: 0 }, show: { opacity: 1 } };

  const readOnlyRows = [
    { icon: Mail,          key: 'email',               label: t('accountant_view.field_email'),        value: accountant.email },
    { icon: Phone,         key: 'phone',               label: t('accountant_view.field_phone'),        value: accountant.phone },
    { icon: Building2,     key: 'office',              label: t('accountant_view.field_office'),       value: accountant.office },
    { icon: FileText,      key: 'contractDetails',     label: t('accountant_view.field_contract'),     value: accountant.contractDetails },
    { icon: MessageSquare, key: 'sendingInstructions', label: t('accountant_view.field_instructions'), value: accountant.sendingInstructions },
  ];

  const editFields = [
    { label: t('accountant_view.field_firstname'),    key: 'firstName',           placeholder: t('accountant_view.ph_firstname') },
    { label: t('accountant_view.field_lastname'),     key: 'lastName',            placeholder: t('accountant_view.ph_lastname') },
    { label: t('accountant_view.field_email'),        key: 'email',               placeholder: 'email@studio.it' },
    { label: t('accountant_view.field_phone'),        key: 'phone',               placeholder: t('accountant_view.ph_phone') },
    { label: t('accountant_view.field_office'),       key: 'office',              placeholder: t('accountant_view.ph_office') },
    { label: t('accountant_view.field_contract'),     key: 'contractDetails',     placeholder: t('accountant_view.ph_contract') },
    { label: t('accountant_view.field_instructions'), key: 'sendingInstructions', placeholder: t('accountant_view.ph_instructions') },
  ];

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-4 pb-24">

        {/* Header card */}
        <motion.div variants={item} className={`flex items-center justify-between gap-4 p-5 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-primary/20 shrink-0">
              {accountant.firstName[0]}{accountant.lastName[0]}
            </div>
            <div className="min-w-0">
              <p className={`text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{accountant.firstName} {accountant.lastName}</p>
              <p className={`text-sm truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('accountant_view.role')}</p>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={handleEdit}
              className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}
            >
              <Pencil size={16} />
            </button>
          )}
        </motion.div>

        {/* READ-ONLY */}
        {!isEditing && (
          <motion.div variants={item} className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            {readOnlyRows.map(({ icon: Icon, key, label, value }, i, arr) => {
              const expandable = EXPANDABLE_KEYS.has(key);
              return (
                <div
                  key={key}
                  className={i < arr.length - 1 ? 'border-b' : ''}
                  style={i < arr.length - 1 ? { borderColor: 'var(--color-border)' } : undefined}
                >
                  <div
                    className={`w-full px-4 py-3.5 flex items-center justify-between gap-3 ${expandable && value ? 'cursor-pointer active:opacity-70' : ''}`}
                    onClick={() => expandable && value && setModal({ title: label, text: value })}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 shrink-0" style={{ backgroundColor: 'var(--color-card-bg)' }}>
                        <Icon size={16} />
                      </div>
                      <span className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-900'}`}>{label}</span>
                    </div>
                    {expandable ? (
                      value ? (
                        <ChevronDown size={16} className="text-slate-400 shrink-0" />
                      ) : (
                        <span className={`text-sm ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>—</span>
                      )
                    ) : (
                      <span className={`text-sm ${value ? (darkMode ? 'text-slate-400' : 'text-slate-500') : (darkMode ? 'text-slate-600' : 'text-slate-300')}`}>
                        {value || '—'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* EDIT FORM */}
        {isEditing && (
          <div className="space-y-4">
            {editFields.map(({ label, key, placeholder }) => (
              <motion.div key={key} variants={item} className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
                {key === 'sendingInstructions' ? (
                  <textarea
                    value={formData[key as keyof typeof formData] as string}
                    onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                    placeholder={placeholder}
                    rows={3}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none ${darkMode ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-600' : 'bg-white border-slate-100 text-slate-900 placeholder:text-slate-400'}`}
                  />
                ) : (
                  <input
                    type="text"
                    value={formData[key as keyof typeof formData] as string}
                    onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                    placeholder={placeholder}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-600' : 'bg-white border-slate-100 text-slate-900 placeholder:text-slate-400'}`}
                  />
                )}
              </motion.div>
            ))}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsEditing(false)}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
              >
                {t('common.cancel')}
              </button>
              <motion.button
                onClick={handleSave}
                disabled={isSaving}
                className={`flex-1 py-4 rounded-2xl font-bold shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 ${saved ? 'bg-emerald-500 shadow-emerald-500/30 text-white' : 'bg-primary shadow-primary/30 text-white'}`}
              >
                {isSaving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saved ? t('accountant_view.saved') : isSaving ? t('accountant_view.saving') : t('accountant_view.save_btn')}
              </motion.button>
            </div>
          </div>
        )}

      </motion.div>

      {/* Text detail modal */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden"
              style={{ backgroundColor: 'var(--color-card)' }}
            >
              <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between gap-4">
                  <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{modal.title}</h2>
                  <button
                    onClick={() => setModal(null)}
                    className={`shrink-0 p-2 rounded-full transition-all active:scale-90 ${darkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                  >
                    <Plus className="rotate-45" size={20} />
                  </button>
                </div>
                <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {modal.text}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AccountantView;
