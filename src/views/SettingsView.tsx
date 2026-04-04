import { useState } from 'react';
import JSZip from 'jszip';
import { todayLocalISO } from '../utils/date';
import { motion } from 'motion/react';
import { Sun, Moon, Languages, Trash2, RotateCcw, Loader2, CheckCircle2, AlertCircle, Sparkles, Lock, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getClient } from '../lib/supabase';
import PaywallModal from '../components/modals/PaywallModal';
import DeleteAccountModal from '../components/modals/DeleteAccountModal';
import { useProStatus } from '../hooks/useProStatus';
import { Profile, Document, Deadline } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface SettingsViewProps {
  theme: string;
  setTheme: (t: string) => void;
  profile: Profile;
  onUpdateProfile?: (p: Profile) => void;
  profilesCount?: number;
  key?: string;
  documents?: Document[];
  deadlines?: Deadline[];
}

const SettingsView = ({ theme, setTheme, profile, onUpdateProfile, profilesCount = 1, documents = [], deadlines = [] }: SettingsViewProps) => {
  const { t } = useTranslation();
  const isPro = useProStatus(profile);
  const darkMode = theme === 'dark' || theme === 'pro-dark';
  const isProLight = theme === 'pro-light';
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Refund flow state: idle → confirming → loading → success | error
  type RefundStep = 'idle' | 'confirming' | 'loading' | 'success' | 'error';
  const [refundStep, setRefundStep] = useState<RefundStep>('idle');
  const [refundError, setRefundError] = useState('');

  // Calcola giorni rimasti nel periodo di recesso
  const daysLeft = (() => {
    if (!profile.subscriptionStartedAt) return null;
    const started = new Date(profile.subscriptionStartedAt).getTime();
    const elapsed = (Date.now() - started) / (1000 * 60 * 60 * 24);
    const remaining = 14 - elapsed;
    return remaining > 0 ? Math.ceil(remaining) : null;
  })();

  const handleRefund = async () => {
    setRefundStep('loading');
    setRefundError('');
    try {
      const { data: { session } } = await getClient().auth.getSession();
      if (!session) throw new Error('Sessione non trovata');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t('settings.subscription_refund_error'));

      setRefundStep('success');
    } catch (err) {
      setRefundError((err as Error).message);
      setRefundStep('error');
    }
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } };
  const item = { hidden: { opacity: 0 }, show: { opacity: 1 } };

  const themes = [
    { id: 'light', label: 'Light', icon: Sun, locked: false },
    { id: 'dark', label: 'Dark', icon: Moon, locked: false },
    { id: 'pro-light', label: 'Pro Light', icon: Sun, locked: !isPro },
    { id: 'pro-dark', label: 'Pro Dark', icon: Moon, locked: !isPro },
  ];

  const handleGdprExportES = async () => {
    setIsExporting(true);
    const today = todayLocalISO();
    const zip = new JSZip();

    zip.file('perfil.json', JSON.stringify(profile, null, 2));

    const facturasCsvRows = [
      ['ID', 'Tipo', 'Número', 'Fecha', 'Cliente', 'Importe', 'Estado', 'Categoría'],
      ...documents.map(d => [
        d.id,
        d.type,
        d.invoiceNumber ?? '',
        d.date,
        d.clientName ?? '',
        d.amount.toString(),
        d.status ?? '',
        d.category ?? '',
      ]),
    ];
    zip.file('facturas.csv', facturasCsvRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'));

    const plazosCsvRows = [
      ['ID', 'Título', 'Fecha', 'Tipo', 'Importe', 'Completado'],
      ...deadlines.map(d => [
        d.id,
        d.title,
        d.date,
        d.type,
        d.amount != null ? d.amount.toString() : '',
        d.completed ? 'sí' : 'no',
      ]),
    ];
    zip.file('plazos.csv', plazosCsvRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'));

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solvy_datos_personales_${today}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const handleGdprExport = async () => {
    setIsExporting(true);
    const today = todayLocalISO();
    const zip = new JSZip();

    // profilo.json
    zip.file('profilo.json', JSON.stringify(profile, null, 2));

    // fatture.csv
    const invoiceCsvRows = [
      ['ID', 'Tipo', 'Numero', 'Data', 'Cliente', 'Importo', 'Stato', 'Categoria'],
      ...documents.map(d => [
        d.id,
        d.type,
        d.invoiceNumber ?? '',
        d.date,
        d.clientName ?? '',
        d.amount.toString(),
        d.status ?? '',
        d.category ?? '',
      ]),
    ];
    zip.file('fatture.csv', invoiceCsvRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'));

    // scadenze.csv
    const deadlineCsvRows = [
      ['ID', 'Titolo', 'Data', 'Tipo', 'Importo', 'Completata'],
      ...deadlines.map(d => [
        d.id,
        d.title,
        d.date,
        d.type,
        d.amount != null ? d.amount.toString() : '',
        d.completed ? 'sì' : 'no',
      ]),
    ];
    zip.file('scadenze.csv', deadlineCsvRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'));

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solvy_dati_personali_${today}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const legalItems = [
    { label: t('settings.privacy_policy'), href: '/privacy' },
    { label: t('settings.terms_of_service'), href: '/terms' },
    { label: t('settings.cookie_policy'), href: '/cookies' },
  ];

  return (
    <>
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-8 pb-40">
      <motion.div variants={item} className="space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('settings.appearance')}</p>
        <div className="rounded-3xl p-2 border grid grid-cols-2 gap-2 transition-colors" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          {themes.map(themeItem => {
            const Icon = themeItem.icon;
            const isActive = theme === themeItem.id;
            return (
              <button
                key={themeItem.id}
                onClick={() => { if (themeItem.locked) { setIsPaywallOpen(true); return; } setTheme(themeItem.id); }}
                className={`relative flex items-center justify-center gap-2 py-3 rounded-2xl transition-all active:scale-95 ${
                  isActive
                    ? darkMode
                      ? 'bg-slate-700 text-white shadow-lg shadow-slate-900/40'
                      : 'bg-white text-slate-900 shadow-lg shadow-slate-200'
                    : darkMode
                    ? 'text-slate-500 hover:text-slate-300'
                    : 'text-slate-400 hover:text-slate-600'
                } ${themeItem.locked ? 'opacity-60' : ''}`}
              >
                <Icon size={16} />
                <span className="text-sm font-bold">{themeItem.label}</span>
                {themeItem.locked && <Lock size={10} className="absolute top-1.5 right-2 text-slate-400" />}
                {!themeItem.locked && themeItem.id.startsWith('pro') && <Sparkles size={10} className="absolute top-1.5 right-2 text-primary" />}
              </button>
            );
          })}
        </div>
        {!isPro && <p className="text-[10px] text-slate-400 text-center">{t('settings.pro_themes_hint')}</p>}
      </motion.div>

      <motion.div variants={item} className="space-y-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('settings.language')}</p>
        <div className="p-4 rounded-3xl border flex items-center gap-4 transition-colors" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}><Languages size={20} /></div>
          <div>
            <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('settings.language_current')}</p>
            <p className="text-xs text-slate-400">{t('settings.language_future')}</p>
          </div>
        </div>
      </motion.div>


      {isPro && (
        <motion.div variants={item} className="rounded-3xl border overflow-hidden transition-colors" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('settings.subscription_management')}</p>
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">{t('settings.subscription_active')}</span>
          </div>

          <div className="px-5 pb-5 space-y-3">
            {refundStep === 'success' ? (
              <div className={`flex items-start gap-3 p-4 rounded-2xl ${darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
                <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
                <p className={`text-sm font-medium ${darkMode ? 'text-green-300' : 'text-green-800'}`}>{t('settings.subscription_refund_success')}</p>
              </div>
            ) : refundStep === 'error' ? (
              <div className={`flex items-start gap-3 p-4 rounded-2xl ${darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className={`text-sm font-medium ${darkMode ? 'text-red-300' : 'text-red-800'}`}>{refundError || t('settings.subscription_refund_error')}</p>
              </div>
            ) : daysLeft !== null ? (
              <>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('settings.subscription_refund_eligible', { days: daysLeft })}
                </p>

                {refundStep === 'confirming' ? (
                  <div className={`p-4 rounded-2xl space-y-3 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <p className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('settings.subscription_refund_confirm_title')}</p>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('settings.subscription_refund_confirm_text')}</p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleRefund}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500 active:scale-95 transition-all"
                      >
                        <RotateCcw size={12} />
                        {t('settings.subscription_refund_confirm_btn')}
                      </button>
                      <button
                        onClick={() => setRefundStep('idle')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all ${darkMode ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-600 border border-slate-200'}`}
                      >
                        {t('settings.subscription_refund_cancel_btn')}
                      </button>
                    </div>
                  </div>
                ) : refundStep === 'loading' ? (
                  <div className="flex items-center justify-center gap-2 py-3">
                    <Loader2 size={16} className="text-primary animate-spin" />
                    <span className="text-sm text-slate-500">Elaborazione rimborso…</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setRefundStep('confirming')}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-red-500 border active:scale-[0.98] transition-all ${darkMode ? 'border-red-900 hover:bg-red-900/20' : 'border-red-200 hover:bg-red-50'}`}
                  >
                    <RotateCcw size={14} />
                    {t('settings.subscription_refund_btn')}
                  </button>
                )}
              </>
            ) : null}
          </div>
        </motion.div>
      )}

      <motion.div variants={item} className="p-6 rounded-3xl space-y-2 transition-colors" style={isProLight ? { backgroundColor: '#ffffff', border: '1.5px solid rgba(200,85,247,0.35)' } : { backgroundColor: 'var(--color-card-bg)' }}>
        <p className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('settings.app_version')}</p>
        <p className="text-xs text-slate-500">v2.5.0 (Build 2026.03)</p>
        <div className="pt-4 flex gap-4">
          <button className="text-[10px] font-bold text-primary uppercase tracking-wider active:scale-90 transition-all hover:drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]">{t('settings.release_notes')}</button>
          <button className="text-[10px] font-bold text-primary uppercase tracking-wider active:scale-90 transition-all hover:drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]">{t('settings.support')}</button>
        </div>
      </motion.div>

      {profile.country !== 'Spain' ? (
        <motion.div variants={item} className="space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Privacy & GDPR</p>
          <button
            onClick={handleGdprExport}
            disabled={isExporting}
            className={`w-full flex items-center gap-4 p-4 rounded-3xl border transition-all active:scale-[0.98] disabled:opacity-60 ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40' : 'bg-white border-slate-100 hover:border-primary/20'}`}
            style={isProLight ? { backgroundColor: '#ffffff', border: '1.5px solid rgba(200,85,247,0.35)' } : undefined}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${darkMode ? 'bg-slate-800 text-primary' : 'bg-primary/10 text-primary'}`}>
              {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            </div>
            <div className="text-left flex-1">
              <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{isExporting ? 'Generazione ZIP…' : 'Esporta dati personali'}</p>
              <p className="text-xs text-slate-400">profilo.json · fatture.csv · scadenze.csv (art. 20 GDPR)</p>
            </div>
          </button>
        </motion.div>
      ) : (
        <motion.div variants={item} className="space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Privacidad & GDPR</p>
          <button
            onClick={handleGdprExportES}
            disabled={isExporting}
            className={`w-full flex items-center gap-4 p-4 rounded-3xl border transition-all active:scale-[0.98] disabled:opacity-60 ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40' : 'bg-white border-slate-100 hover:border-primary/20'}`}
            style={isProLight ? { backgroundColor: '#ffffff', border: '1.5px solid rgba(200,85,247,0.35)' } : undefined}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${darkMode ? 'bg-slate-800 text-primary' : 'bg-primary/10 text-primary'}`}>
              {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            </div>
            <div className="text-left flex-1">
              <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{isExporting ? 'Generando ZIP…' : 'Descargar mis datos'}</p>
              <p className="text-xs text-slate-400">perfil.json · facturas.csv · plazos.csv (art. 20 RGPD)</p>
            </div>
          </button>
        </motion.div>
      )}

      <motion.div variants={item} className="rounded-3xl border overflow-hidden transition-colors" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-5 pt-5 pb-3">{t('settings.legal')}</p>
        {legalItems.map(({ label, href }, i, arr) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between px-5 py-3.5 active:bg-primary/5 transition-colors ${i < arr.length - 1 ? (darkMode ? 'border-b border-slate-800' : 'border-b border-slate-50') : ''}`}
          >
            <span className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{label}</span>
            <span className="text-slate-400 text-xs">↗</span>
          </a>
        ))}
      </motion.div>
      <motion.div variants={item} className="pt-2">
        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-red-500 border active:scale-[0.98] transition-all ${darkMode ? 'border-red-900 hover:bg-red-900/20' : 'border-red-200 hover:bg-red-50'}`}
        >
          <Trash2 size={15} />
          {t('settings.delete_account')}
        </button>
      </motion.div>
    </motion.div>
    <PaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} darkMode={darkMode} />
    <DeleteAccountModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} darkMode={darkMode} profile={profile} profilesCount={profilesCount} />
    </>
  );
};

export default SettingsView;
