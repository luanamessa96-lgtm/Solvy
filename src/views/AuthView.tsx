import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Screen = 'login' | 'register' | 'forgot' | 'forgot-sent' | 'reset' | 'register-sent';

interface AuthViewProps {
  darkMode?: boolean;
  onResetPassword?: () => void;
  initialScreen?: Screen;
}

export default function AuthView({ darkMode, onResetPassword, initialScreen }: AuthViewProps) {
  const [screen, setScreen] = useState<Screen>(initialScreen ?? 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ricordami, setRicordami] = useState(true);

  const clearError = () => setError('');

  const handleLogin = async () => {
    setLoading(true);
    clearError();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (error) {
      if (error.message.includes('Invalid login') || error.message.includes('invalid_grant')) setError('Email o password non corretti. Controlla i dati e riprova.');
      else if (error.message.includes('Email not confirmed')) setError('Conferma prima la tua email — controlla la casella di posta.');
      else setError('Errore di accesso. Riprova.');
    } else if (!ricordami) {
      document.cookie.split(';').forEach(c => {
        const key = c.trim().split('=')[0];
        if (key.startsWith('sb-')) document.cookie = `${key}=;max-age=0;path=/;SameSite=Lax`;
      });
    }
  };

  const handleRegister = async () => {
    if (password.length < 8) { setError('La password deve essere di almeno 8 caratteri.'); return; }
    setLoading(true);
    clearError();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.includes('already registered')) setError('Questa email è già registrata. Accedi.');
      else setError('Errore nella registrazione. Riprova.');
    } else {
      setScreen('register-sent');
    }
  };

  const handleForgot = async () => {
    setLoading(true);
    clearError();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) { setError('Errore nell\'invio. Controlla l\'email.'); return; }
    setScreen('forgot-sent');
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) { setError('La password deve essere di almeno 8 caratteri.'); return; }
    setLoading(true);
    clearError();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { setError('Errore nel salvataggio. Riprova.'); return; }
    onResetPassword?.();
  };

  const inputClass = `w-full px-4 py-3.5 rounded-2xl text-sm font-medium outline-none transition-all border-2 ${
    darkMode
      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-primary'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary'
  }`;

  const btnPrimary = `w-full py-4 rounded-2xl font-bold text-white bg-primary shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60`;

  return (
    <div className={`max-w-md mx-auto min-h-screen flex flex-col ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
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
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Bentornato</h1>
                <p className="text-slate-400 mt-1 text-sm">Accedi al tuo account</p>
              </motion.div>
            )}
            {screen === 'register' && (
              <motion.div key="register-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Crea account</h1>
                <p className="text-slate-400 mt-1 text-sm">Inizia a gestire le tue finanze</p>
              </motion.div>
            )}
            {screen === 'forgot' && (
              <motion.div key="forgot-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Password dimenticata?</h1>
                <p className="text-slate-400 mt-1 text-sm">Ti mandiamo un link per reimpostarla</p>
              </motion.div>
            )}
            {(screen === 'forgot-sent') && (
              <motion.div key="sent-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Email inviata!</h1>
                <p className="text-slate-400 mt-1 text-sm">Controlla la tua casella di posta</p>
              </motion.div>
            )}
            {screen === 'register-sent' && (
              <motion.div key="register-sent-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Controlla la email!</h1>
                <p className="text-slate-400 mt-1 text-sm">Abbiamo inviato un link di conferma</p>
              </motion.div>
            )}
            {screen === 'reset' && (
              <motion.div key="reset-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Nuova password</h1>
                <p className="text-slate-400 mt-1 text-sm">Scegli una password sicura</p>
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
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" placeholder="Email" value={email} onChange={e => { setEmail(e.target.value); clearError(); }} required className={`${inputClass} pl-11`} />
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => { setPassword(e.target.value); clearError(); }} required className={`${inputClass} pl-11 pr-11`} />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-500 font-medium px-1">{error}</p>}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={ricordami} onChange={e => setRicordami(e.target.checked)} className="w-4 h-4 rounded accent-primary cursor-pointer" />
                  <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Ricordami</span>
                </label>
                <button type="button" onClick={() => { clearError(); setScreen('forgot'); }} className="text-sm text-primary font-semibold">
                  Password dimenticata?
                </button>
              </div>

              <button type="button" onClick={handleLogin} disabled={loading} className={btnPrimary}>
                {loading ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : 'Accedi'}
              </button>

              <div className="flex items-center gap-3 py-1">
                <div className={`flex-1 h-px ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                <span className="text-xs text-slate-400 font-medium">oppure</span>
                <div className={`flex-1 h-px ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
              </div>

              <button type="button" onClick={() => { clearError(); setScreen('register'); }} className={`w-full py-4 rounded-2xl font-bold transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 border-2 border-slate-200'}`}>
                Crea un account
              </button>
            </motion.div>
          )}

          {/* REGISTER */}
          {screen === 'register' && (
            <motion.div key="register-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="space-y-3">
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" placeholder="Email" value={email} onChange={e => { setEmail(e.target.value); clearError(); }} required className={`${inputClass} pl-11`} />
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={showPassword ? 'text' : 'password'} placeholder="Password (min. 8 caratteri)" value={password} onChange={e => { setPassword(e.target.value); clearError(); }} required className={`${inputClass} pl-11 pr-11`} />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-500 font-medium px-1">{error}</p>}

              <button type="button" onClick={handleRegister} disabled={loading} className={btnPrimary}>
                {loading ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : 'Registrati'}
              </button>

              <button type="button" onClick={() => { clearError(); setScreen('login'); }} className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-slate-400`}>
                <ArrowLeft size={14} /> Torna al login
              </button>
            </motion.div>
          )}

          {/* FORGOT PASSWORD */}
          {screen === 'forgot' && (
            <motion.div key="forgot-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" placeholder="La tua email" value={email} onChange={e => { setEmail(e.target.value); clearError(); }} required className={`${inputClass} pl-11`} />
              </div>

              {error && <p className="text-sm text-red-500 font-medium px-1">{error}</p>}

              <button type="button" onClick={handleForgot} disabled={loading} className={btnPrimary}>
                {loading ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : 'Invia link di reset'}
              </button>

              <button type="button" onClick={() => { clearError(); setScreen('login'); }} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-slate-400">
                <ArrowLeft size={14} /> Torna al login
              </button>
            </motion.div>
          )}

          {/* REGISTER SENT */}
          {screen === 'register-sent' && (
            <motion.div key="register-sent-form" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <div className={`p-6 rounded-3xl text-center space-y-3 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Abbiamo inviato un link di conferma a <span className="text-primary">{email}</span>
                </p>
                <p className="text-xs text-slate-400">Clicca il link nell'email per attivare il tuo account. Controlla anche la cartella spam.</p>
              </div>
              <button type="button" onClick={() => { clearError(); setScreen('login'); }} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-slate-400">
                <ArrowLeft size={14} /> Torna al login
              </button>
            </motion.div>
          )}

          {/* EMAIL SENT */}
          {screen === 'forgot-sent' && (
            <motion.div key="sent-form" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <div className={`p-6 rounded-3xl text-center space-y-3 ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Abbiamo inviato un link a <span className="text-primary">{email}</span>
                </p>
                <p className="text-xs text-slate-400">Clicca il link nell'email per scegliere una nuova password. Controlla anche la cartella spam.</p>
              </div>
              <button type="button" onClick={() => { clearError(); setScreen('login'); }} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-slate-400">
                <ArrowLeft size={14} /> Torna al login
              </button>
            </motion.div>
          )}

          {/* RESET PASSWORD */}
          {screen === 'reset' && (
            <motion.div key="reset-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showNewPassword ? 'text' : 'password'} placeholder="Nuova password (min. 8 caratteri)" value={newPassword} onChange={e => { setNewPassword(e.target.value); clearError(); }} required className={`${inputClass} pl-11 pr-11`} />
                <button type="button" onClick={() => setShowNewPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && <p className="text-sm text-red-500 font-medium px-1">{error}</p>}

              <button type="button" onClick={handleResetPassword} disabled={loading} className={btnPrimary}>
                {loading ? <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : 'Salva nuova password'}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
