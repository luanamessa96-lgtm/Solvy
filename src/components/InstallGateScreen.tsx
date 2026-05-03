import { Share } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { detectBrowserContext } from '../lib/installGate';

const browser = detectBrowserContext(navigator.userAgent);

const SOLVY_GRADIENT = 'linear-gradient(135deg, #2DD4BF 0%, #C060A0 50%, #7B5EA7 100%)';
const SOLVY_PURPLE = '#7B5EA7';
const SOLVY_BG = '#EAE8F5';

function StepList({ steps }: { steps: React.ReactNode[] }) {
  return (
    <div className="w-full max-w-xs space-y-3 text-left">
      {steps.map((text, i) => (
        <div key={i} className="flex items-start gap-4">
          <div
            className="w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center shrink-0 text-white"
            style={{ background: SOLVY_GRADIENT }}
          >
            {i + 1}
          </div>
          <p className="text-sm leading-snug pt-1.5" style={{ color: '#3D3D5C' }}>{text}</p>
        </div>
      ))}
    </div>
  );
}

function SolvyLogo() {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: SOLVY_GRADIENT }}>
        <span className="text-white font-black text-xl">S</span>
      </div>
      <span style={{ fontWeight: 700, letterSpacing: '0.12em', color: '#1a1a2e', fontSize: '1.5rem' }}>SOLVY</span>
    </div>
  );
}

function GateShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center" style={{ background: SOLVY_BG }}>
      <SolvyLogo />
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: SOLVY_GRADIENT, boxShadow: `0 12px 32px ${SOLVY_PURPLE}40` }}
      >
        <span className="text-white text-4xl font-bold">✓</span>
      </div>
      <div className="w-full max-w-xs bg-white rounded-2xl p-6 shadow-sm" style={{ border: '1px solid #E0D9F0' }}>
        {children}
      </div>
    </div>
  );
}

export default function InstallGateScreen() {
  const { t } = useTranslation();

  // Vero in-app browser senza Share sheet (Facebook, Instagram, WhatsApp, WeChat)
  if (!browser.canInstall) {
    return (
      <GateShell>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a1a2e' }}>{t('install_gate.title')}</h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: '#6B6B8A' }}>{t('install_gate.inapp_subtitle')}</p>
        <StepList steps={[
          t('install_gate.inapp_step1'),
          t('install_gate.inapp_step2'),
          t('install_gate.inapp_step3'),
        ]} />
        <p className="mt-6 text-xs" style={{ color: '#9B9BAA' }}>{t('install_gate.account_ready')}</p>
      </GateShell>
    );
  }

  if (browser.isAndroid) {
    return (
      <GateShell>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a1a2e' }}>{t('install_gate.title')}</h2>
        <p className="text-sm leading-relaxed mb-5" style={{ color: '#6B6B8A' }}>
          {t('install_gate.already_installed')} <strong>{t('install_gate.already_installed_chrome')}</strong>
        </p>
        <StepList steps={[
          t('install_gate.android_step1'),
          t('install_gate.android_step2'),
          t('install_gate.android_step3'),
        ]} />
        <p className="mt-6 text-xs" style={{ color: '#9B9BAA' }}>{t('install_gate.account_ready')}</p>
      </GateShell>
    );
  }

  if (browser.isChromeiOS) {
    return (
      <GateShell>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a1a2e' }}>{t('install_gate.title')}</h2>
        <div className="w-full bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 mb-6">
          <p className="text-sm font-medium" style={{ color: SOLVY_PURPLE }}>{t('install_gate.already_installed')}</p>
          <p className="text-xs mt-0.5 text-violet-600">{t('install_gate.already_installed_chrome')}</p>
        </div>
        <p className="text-sm leading-relaxed mb-6" style={{ color: '#6B6B8A' }}>{t('install_gate.subtitle')}</p>
        <StepList steps={[
          <><Share size={14} className="inline mr-1 mb-0.5 text-primary" />{t('install_gate.chrome_step1')}</>,
          <strong>{t('install_gate.chrome_step2')}</strong>,
          <strong>{t('install_gate.chrome_step3')}</strong>,
          t('install_gate.chrome_step4'),
        ]} />
        <p className="mt-6 text-xs" style={{ color: '#9B9BAA' }}>{t('install_gate.account_ready')}</p>
      </GateShell>
    );
  }

  // iOS Safari
  return (
    <GateShell>
      <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a1a2e' }}>{t('install_gate.title')}</h2>
      <div className="w-full bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 mb-6">
        <p className="text-sm font-medium" style={{ color: SOLVY_PURPLE }}>{t('install_gate.already_installed')}</p>
        <p className="text-xs mt-0.5 text-violet-600">{t('install_gate.already_installed_safari')}</p>
      </div>
      <p className="text-sm leading-relaxed mb-6" style={{ color: '#6B6B8A' }}>{t('install_gate.subtitle')}</p>
      <StepList steps={[
        <><Share size={14} className="inline mr-1 mb-0.5 text-primary" />{t('install_gate.safari_step1')}</>,
        <strong>{t('install_gate.safari_step2')}</strong>,
        t('install_gate.safari_step3'),
      ]} />
      <p className="mt-6 text-xs" style={{ color: '#9B9BAA' }}>{t('install_gate.account_ready')}</p>
    </GateShell>
  );
}
