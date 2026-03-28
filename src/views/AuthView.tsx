import { useState } from 'react';
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
  const { t } = useTranslation();
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

  const clearError = () => setError('');

  const handleLogin = async () => {
    setLoading(true);
    clearError();
    const { error } = await getClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (error) {
      if (error.message.includes('Invalid login') || error.message.includes('invalid_grant') || error.message.includes('Invalid credentials')) setError(t('auth.error_invalid_credentials'));
      else if (error.message.includes('Email not confirmed')) setError(t('auth.error_email_not_confirmed'));
      else setError(`Errore: ${error.message}`);
    } else if (!ricordami) {
      document.cookie.split(';').forEach(c => {
        const key = c.trim().split('=')[0];
        if (key.startsWith('sb-')) document.cookie = `${key}=;max-age=0;path=/;SameSite=Lax`;
      });
    }
  };

  const handleRegister = async () => {
    if (!termsAccepted) { setError(t('auth.error_terms')); return; }
    if (password.length < 8) { setError(t('auth.error_password_length')); return; }
    setLoading(true);
    clearError();
    const { error } = await getClient().auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.includes('already registered')) setError(t('auth.error_already_registered'));
      else setError(`Errore: ${error.message}`);
    } else {
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

  const inputClass = `w-full px-4 py-3.5 rounded-2xl text-sm font-medium outline-none transition-all border-2 ${
    darkMode
      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-primary'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary'
  }`;

  const btnPrimary = `w-full py-4 rounded-2xl font-bold text-white bg-primary shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60`;

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-card-bg)' }}>
      <div className="flex-1 flex flex-col justify-center px-8 py-12">

        {/* Logo / Brand */}
        <div className="mb-10">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>

          <AnimatePresence mode="wait">
            {screen === 'login' && (
              <motion.div key="login-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('auth.login_title')}</h1>
                <p className="text-slate-500 mt-1 text-sm">{t('auth.login_subtitle')}</p>
              </motion.div>
            )}
            {screen === 'register' && (
              <motion.div key="register-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('auth.register_title')}</h1>
                <p className="text-slate-500 mt-1 text-sm">{t('auth.register_subtitle')}</p>
              </motion.div>
            )}
            {screen === 'forgot' && (
              <motion.div key="forgot-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('auth.forgot_title')}</h1>
                <p className="text-slate-500 mt-1 text-sm">{t('auth.forgot_subtitle')}</p>
              </motion.div>
            )}
            {(screen === 'forgot-sent') && (
              <motion.div key="sent-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('auth.forgot_sent_title')}</h1>
                <p className="text-slate-500 mt-1 text-sm">{t('auth.forgot_sent_subtitle')}</p>
              </motion.div>
            )}
            {screen === 'register-sent' && (
              <motion.div key="register-sent-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('auth.register_sent_title')}</h1>
                <p className="text-slate-500 mt-1 text-sm">{t('auth.register_sent_subtitle')}</p>
              </motion.div>
            )}
            {screen === 'reset' && (
              <motion.div key="reset-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('auth.reset_title')}</h1>
                <p className="text-slate-500 mt-1 text-sm">{t('auth.reset_subtitle')}</p>
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
                  <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('auth.remember_me')}</span>
                </label>
                <button type="button" onClick={() => { clearError(); setScreen('forgot'); }} className="text-sm text-primary font-semibold">
                  {t('auth.forgot_link')}
                </button>
              </div>

              <button type="button" onClick={handleLogin} disabled={loading} className={btnPrimary}>
                {loading ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : t('auth.login_btn')}
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
                <span className="text-xs text-slate-500 font-medium">{t('auth.or')}</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
              </div>

              <button type="button" onClick={() => { clearError(); setScreen('register'); }} className="w-full py-4 rounded-2xl font-bold transition-all active:scale-[0.98] border-2" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                {t('auth.create_account_btn')}
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
                <span className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('auth.terms_text')}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">{t('auth.privacy_policy')}</a>
                  {t('auth.terms_and')}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">{t('auth.terms_of_service')}</a>
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
              <div className="p-6 rounded-3xl text-center space-y-3" style={{ backgroundColor: 'var(--color-card)' }}>
                <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
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
              <div className="p-6 rounded-3xl text-center space-y-3" style={{ backgroundColor: 'var(--color-card)' }}>
                <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
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
    </div>
  );
}
