import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getClient } from '../lib/supabase';


type Screen = 'login' | 'register' | 'forgot' | 'forgot-sent' | 'reset' | 'register-sent';

interface AuthViewProps {
  darkMode?: boolean;
  onResetPassword?: () => void;
  initialScreen?: Screen;
}

export default function AuthView({ darkMode, onResetPassword, initialScreen }: AuthViewProps) {
  const { t, i18n } = useTranslation();
  const isES = i18n.language?.startsWith('es');
  const [screen, setScreen] = useState<Screen>(initialScreen ?? 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ricordami, setRicordami] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  // Rate limiting: 5 tentativi falliti → blocco 15 minuti
  const [failCount, setFailCount] = useState(() => {
    const locked = parseInt(localStorage.getItem('auth_locked_until') || '0', 10);
    if (locked && Date.now() >= locked) {
      localStorage.removeItem('auth_fail_count');
      localStorage.removeItem('auth_locked_until');
      return 0;
    }
    return parseInt(localStorage.getItem('auth_fail_count') || '0', 10);
  });
  const [lockedUntil, setLockedUntil] = useState(() => {
    const ts = parseInt(localStorage.getItem('auth_locked_until') || '0', 10);
    return ts > Date.now() ? ts : 0;
  });
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!lockedUntil) { setCountdown(0); return; }
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(0);
        setFailCount(0);
        setCountdown(0);
        localStorage.removeItem('auth_fail_count');
        localStorage.removeItem('auth_locked_until');
      } else {
        setCountdown(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const isLocked = countdown > 0;
  const formatCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const clearError = () => setError('');

  const handleLogin = async () => {
    if (isLocked) return;
    setLoading(true);
    clearError();
    const { error } = await getClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (error) {
      const newCount = failCount + 1;
      if (newCount >= 5) {
        const lockTime = Date.now() + 15 * 60 * 1000;
        setFailCount(newCount);
        setLockedUntil(lockTime);
        localStorage.setItem('auth_fail_count', String(newCount));
        localStorage.setItem('auth_locked_until', String(lockTime));
        setError(isES ? 'Demasiados intentos. Bloqueado 15 minutos.' : 'Troppi tentativi. Bloccato per 15 minuti.');
      } else {
        setFailCount(newCount);
        localStorage.setItem('auth_fail_count', String(newCount));
        if (error.message.includes('Invalid login') || error.message.includes('invalid_grant') || error.message.includes('Invalid credentials')) setError(t('auth.error_invalid_credentials'));
        else if (error.message.includes('Email not confirmed')) setError(t('auth.error_email_not_confirmed'));
        else setError(`Errore: ${error.message}`);
      }
    } else {
      // Login riuscito — reset tentativi
      setFailCount(0);
      setLockedUntil(0);
      localStorage.removeItem('auth_fail_count');
      localStorage.removeItem('auth_locked_until');
      if (!ricordami) {
        document.cookie.split(';').forEach(c => {
          const key = c.trim().split('=')[0];
          if (key.startsWith('sb-')) document.cookie = `${key}=;max-age=0;path=/;SameSite=Lax`;
        });
      }
    }
  };

  const handleRegister = async () => {
    if (!termsAccepted) { setError(t('auth.error_terms')); return; }
    if (password.length < 8) { setError(t('auth.error_password_length')); return; }
    setLoading(true);
    clearError();
    const { data, error } = await getClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/confirmed` },
    });
    setLoading(false);
    if (error) {
      if (error.message.includes('already registered')) setError(t('auth.error_already_registered'));
      else setError(`Errore: ${error.message}`);
    } else if (data.user?.identities?.length === 0) {
      // Supabase returns 200 but sends no email when the address is already registered
      await getClient().auth.signOut();
      setError(t('auth.error_already_registered'));
    } else {
      window.gtag?.('event', 'sign_up', { method: 'email' });
      await getClient().auth.signOut();
      setScreen('register-sent');
    }
  };

  const handleForgot = async () => {
    setLoading(true);
    clearError();
    const { error } = await getClient().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) { setError(t('auth.error_forgot_send')); return; }
    setScreen('forgot-sent');
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) { setError(t('auth.error_password_length')); return; }
    setLoading(true);
    clearError();
    const { error } = await getClient().auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { setError(t('auth.error_reset_save')); return; }
    onResetPassword?.();
  };

  // AuthView is always light — ignora il tema dell'app
  const inputClass = `w-full px-4 py-3.5 rounded-2xl text-sm font-medium outline-none transition-all border-2 bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary`;

  const btnPrimary = `w-full py-4 rounded-2xl font-bold text-white bg-primary shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60`;

  return (
    <div data-theme="pro-light" className="max-w-md mx-auto min-h-screen flex flex-col" style={{ backgroundColor: '#f8fafc' }}>
      <div className="flex-1 flex flex-col justify-center px-8 py-12">

        {/* Brand */}
        <div className="mb-10 text-center">
          <h1 style={{ fontWeight: 300, letterSpacing: '0.15em', color: '#1a1a2e', fontSize: '2.75rem', lineHeight: 1, marginBottom: '0.5rem' }}>
            SOLVY
          </h1>
          <AnimatePresence mode="wait">
            {screen === 'login' && (
              <motion.p key="login-tag" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-slate-400 text-sm">
                {isES ? 'tu gestoría fiscal en el bolsillo' : 'il tuo studio fiscale in tasca'}
              </motion.p>
            )}
            {screen === 'register' && (
              <motion.p key="register-tag" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-slate-400 text-sm">
                {isES ? 'tu gestoría fiscal en el bolsillo' : 'il tuo studio fiscale in tasca'}
              </motion.p>
            )}
            {screen === 'forgot' && (
              <motion.div key="forgot-tag" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                <p className={`text-xl font-bold text-slate-900`}>{t('auth.forgot_title')}</p>
                <p className="text-slate-400 text-sm mt-0.5">{t('auth.forgot_subtitle')}</p>
              </motion.div>
            )}
            {screen === 'forgot-sent' && (
              <motion.div key="sent-tag" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                <p className={`text-xl font-bold text-slate-900`}>{t('auth.forgot_sent_title')}</p>
              </motion.div>
            )}
            {screen === 'register-sent' && (
              <motion.div key="register-sent-tag" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                <p className={`text-xl font-bold text-slate-900`}>{t('auth.register_sent_title')}</p>
              </motion.div>
            )}
            {screen === 'reset' && (
              <motion.div key="reset-tag" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                <p className={`text-xl font-bold text-slate-900`}>{t('auth.reset_title')}</p>
                <p className="text-slate-400 text-sm mt-0.5">{t('auth.reset_subtitle')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Forms */}
        <AnimatePresence mode="wait">

          {/* LOGIN */}
          {screen === 'login' && (
            <motion.div key="login-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-3">
                <div className="relative">
                  <label htmlFor="login-email" className="sr-only">Email</label>
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input id="login-email" type="email" placeholder="Email" value={email} onChange={e => { setEmail(e.target.value); clearError(); }} autoComplete="email" autoCorrect="off" autoCapitalize="none" spellCheck={false} className={`${inputClass} pl-11`} />
                </div>
                <div className="relative">
                  <label htmlFor="login-password" className="sr-only">Password</label>
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input id="login-password" type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => { setPassword(e.target.value); clearError(); }} autoComplete="current-password" autoCorrect="off" autoCapitalize="none" spellCheck={false} className={`${inputClass} pl-11 pr-11`} />
                  <button type="button" onClick={() => setShowPassword(v => !v)} aria-label="Mostra/nascondi password" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-500 font-medium px-1">{error}</p>}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={ricordami} onChange={e => setRicordami(e.target.checked)} className="w-4 h-4 rounded accent-primary cursor-pointer" />
                  <span className={`text-sm font-medium text-slate-600`}>{t('auth.remember_me')}</span>
                </label>
                <button type="button" onClick={() => { clearError(); setScreen('forgot'); }} className="text-sm text-primary font-semibold">
                  {t('auth.forgot_link')}
                </button>
              </div>

              <button type="button" onClick={handleLogin} disabled={loading || isLocked} className={btnPrimary}>
                {loading
                  ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  : isLocked
                    ? `${isES ? 'Bloqueado' : 'Bloccato'} · ${formatCountdown(countdown)}`
                    : t('auth.login_btn')}
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
                <span className="text-xs text-slate-500 font-medium">{t('auth.or')}</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
              </div>

              <button
                type="button"
                onClick={() => { clearError(); setScreen('register'); }}
                className="w-full py-4 rounded-2xl font-bold transition-all active:scale-[0.98]"
                style={{
                  border: '2px solid transparent',
                  background: `linear-gradient(#f8fafc 0 0) padding-box, linear-gradient(to right, #C060A0, #4CD9D0) border-box`,
                }}
              >
                <span style={{ background: 'linear-gradient(to right, #C060A0, #4CD9D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {t('auth.create_account_btn')}
                </span>
              </button>
            </motion.div>
          )}

          {/* REGISTER */}
          {screen === 'register' && (
            <motion.div key="register-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-3">
                <div className="relative">
                  <label htmlFor="register-email" className="sr-only">Email</label>
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input id="register-email" type="email" placeholder="Email" value={email} onChange={e => { setEmail(e.target.value); clearError(); }} autoComplete="email" autoCorrect="off" autoCapitalize="none" spellCheck={false} className={`${inputClass} pl-11`} />
                </div>
                <div className="relative">
                  <label htmlFor="register-password" className="sr-only">Password</label>
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input id="register-password" type={showPassword ? 'text' : 'password'} placeholder={t('auth.password_placeholder')} value={password} onChange={e => { setPassword(e.target.value); clearError(); }} autoComplete="new-password" autoCorrect="off" autoCapitalize="none" spellCheck={false} className={`${inputClass} pl-11 pr-11`} />
                  <button type="button" onClick={() => setShowPassword(v => !v)} aria-label="Mostra/nascondi password" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-500 font-medium px-1">{error}</p>}

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => { setTermsAccepted(e.target.checked); clearError(); }}
                  className="w-4 h-4 mt-0.5 rounded accent-primary cursor-pointer shrink-0"
                />
                <span className={`text-xs leading-relaxed text-slate-500`}>
                  {t('auth.terms_text')}
                  <button type="button" onClick={() => setLegalModal('privacy')} className="text-primary font-semibold hover:underline">{t('auth.privacy_policy')}</button>
                  {t('auth.terms_and')}
                  <button type="button" onClick={() => setLegalModal('terms')} className="text-primary font-semibold hover:underline">{t('auth.terms_of_service')}</button>
                </span>
              </label>

              <button type="button" onClick={handleRegister} disabled={loading || !termsAccepted} className={btnPrimary}>
                {loading ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : t('auth.register_btn')}
              </button>

              <button type="button" onClick={() => { clearError(); setScreen('login'); }} className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-slate-500`}>
                <ArrowLeft size={14} /> {t('auth.back_to_login')}
              </button>
            </motion.div>
          )}

          {/* FORGOT PASSWORD */}
          {screen === 'forgot' && (
            <motion.div key="forgot-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" placeholder={t('auth.your_email_placeholder')} value={email} onChange={e => { setEmail(e.target.value); clearError(); }} autoComplete="email" autoCorrect="off" autoCapitalize="none" spellCheck={false} className={`${inputClass} pl-11`} />
              </div>

              {error && <p className="text-sm text-red-500 font-medium px-1">{error}</p>}

              <button type="button" onClick={handleForgot} disabled={loading} className={btnPrimary}>
                {loading ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : t('auth.send_reset_link')}
              </button>

              <button type="button" onClick={() => { clearError(); setScreen('login'); }} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-slate-500">
                <ArrowLeft size={14} /> {t('auth.back_to_login')}
              </button>
            </motion.div>
          )}

          {/* REGISTER SENT */}
          {screen === 'register-sent' && (
            <motion.div key="register-sent-form" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <div className="p-6 rounded-3xl text-center space-y-3" style={{ backgroundColor: '#ffffff' }}>
                <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
                <p className={`text-sm font-semibold text-slate-900`}>
                  {t('auth.register_sent_body')}<span className="text-primary">{email}</span>
                </p>
                <p className="text-xs text-slate-500">{t('auth.register_sent_spam')}</p>
              </div>
              <button type="button" onClick={() => { clearError(); setScreen('login'); }} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-slate-500">
                <ArrowLeft size={14} /> {t('auth.back_to_login')}
              </button>
            </motion.div>
          )}

          {/* EMAIL SENT */}
          {screen === 'forgot-sent' && (
            <motion.div key="sent-form" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <div className="p-6 rounded-3xl text-center space-y-3" style={{ backgroundColor: '#ffffff' }}>
                <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
                <p className={`text-sm font-semibold text-slate-900`}>
                  {t('auth.forgot_sent_body')}<span className="text-primary">{email}</span>
                </p>
                <p className="text-xs text-slate-500">{t('auth.forgot_sent_spam')}</p>
              </div>
              <button type="button" onClick={() => { clearError(); setScreen('login'); }} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-slate-500">
                <ArrowLeft size={14} /> {t('auth.back_to_login')}
              </button>
            </motion.div>
          )}

          {/* RESET PASSWORD */}
          {screen === 'reset' && (
            <motion.div key="reset-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showNewPassword ? 'text' : 'password'} placeholder={t('auth.new_password_placeholder')} value={newPassword} onChange={e => { setNewPassword(e.target.value); clearError(); }} autoComplete="new-password" autoCorrect="off" autoCapitalize="none" spellCheck={false} className={`${inputClass} pl-11 pr-11`} />
                <button type="button" onClick={() => setShowNewPassword(v => !v)} aria-label="Mostra/nascondi password" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && <p className="text-sm text-red-500 font-medium px-1">{error}</p>}

              <button type="button" onClick={handleResetPassword} disabled={loading} className={btnPrimary}>
                {loading ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : t('auth.save_new_password')}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>


      {/* Legal modal — privacy / terms in-app, no navigazione */}
      <AnimatePresence>
        {legalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setLegalModal(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="mt-auto w-full rounded-t-[28px] overflow-hidden flex flex-col"
              style={{ height: '90dvh', backgroundColor: '#f8fafc' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-300" />
              </div>
              {/* Close button */}
              <div className="flex justify-end px-4 pb-2 shrink-0">
                <button
                  onClick={() => setLegalModal(null)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}
                >
                  Chiudi
                </button>
              </div>
              {/* Iframe content */}
              <iframe
                src={`/${legalModal}.html`}
                className="flex-1 w-full border-0"
                title={legalModal === 'privacy' ? 'Privacy Policy' : 'Termini di Servizio'}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
