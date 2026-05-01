import { Share } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { detectBrowserContext } from '../lib/installGate';

const browser = detectBrowserContext(navigator.userAgent);

function StepList({ steps }: { steps: React.ReactNode[] }) {
  return (
    <div className="w-full max-w-xs space-y-4 text-left">
      {steps.map((text, i) => (
        <div key={i} className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
            {i + 1}
          </div>
          <p className="text-sm text-slate-600 leading-snug pt-1.5">{text}</p>
        </div>
      ))}
    </div>
  );
}

function GateShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-8 text-center bg-white">
      <div className="mb-8">
        <h1 style={{ fontWeight: 300, letterSpacing: '0.15em', color: '#1a1a2e', fontSize: '2rem' }}>SOLVY</h1>
      </div>
      <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30">
        <span className="text-white text-4xl">✓</span>
      </div>
      {children}
    </div>
  );
}

export default function InstallGateScreen() {
  const { t } = useTranslation();

  // Vero in-app browser senza Share sheet (Facebook, Instagram, WhatsApp, WeChat)
  if (!browser.canInstall) {
    return (
      <GateShell>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('install_gate.title')}</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">{t('install_gate.inapp_subtitle')}</p>
        <StepList steps={[
          t('install_gate.inapp_step1'),
          t('install_gate.inapp_step2'),
          t('install_gate.inapp_step3'),
        ]} />
        <p className="mt-10 text-xs text-slate-400">{t('install_gate.account_ready')}</p>
      </GateShell>
    );
  }

  if (browser.isAndroid) {
    return (
      <GateShell>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('install_gate.title')}</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          {t('install_gate.already_installed')} <strong>{t('install_gate.already_installed_chrome')}</strong>
        </p>
        <StepList steps={[
          t('install_gate.android_step1'),
          t('install_gate.android_step2'),
          t('install_gate.android_step3'),
        ]} />
        <p className="mt-10 text-xs text-slate-400">{t('install_gate.account_ready')}</p>
      </GateShell>
    );
  }

  if (browser.isChromeiOS) {
    return (
      <GateShell>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('install_gate.title')}</h2>
        <div className="w-full max-w-xs bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
          <p className="text-sm text-amber-800 font-medium">{t('install_gate.already_installed')}</p>
          <p className="text-xs text-amber-700 mt-0.5">{t('install_gate.already_installed_chrome')}</p>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">{t('install_gate.subtitle')}</p>
        <StepList steps={[
          <><Share size={14} className="inline mr-1 mb-0.5 text-primary" />{t('install_gate.chrome_step1')}</>,
          <strong>{t('install_gate.chrome_step2')}</strong>,
          <strong>{t('install_gate.chrome_step3')}</strong>,
          t('install_gate.chrome_step4'),
        ]} />
        <p className="mt-10 text-xs text-slate-400">{t('install_gate.account_ready')}</p>
      </GateShell>
    );
  }

  // iOS Safari
  return (
    <GateShell>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('install_gate.title')}</h2>
      <div className="w-full max-w-xs bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
        <p className="text-sm text-amber-800 font-medium">{t('install_gate.already_installed')}</p>
        <p className="text-xs text-amber-700 mt-0.5">{t('install_gate.already_installed_safari')}</p>
      </div>
      <p className="text-slate-500 text-sm leading-relaxed mb-8">{t('install_gate.subtitle')}</p>
      <StepList steps={[
        <><Share size={14} className="inline mr-1 mb-0.5 text-primary" />{t('install_gate.safari_step1')}</>,
        <strong>{t('install_gate.safari_step2')}</strong>,
        t('install_gate.safari_step3'),
      ]} />
      <p className="mt-10 text-xs text-slate-400">{t('install_gate.account_ready')}</p>
    </GateShell>
  );
}
