/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { MOCK_PROFILES, MOCK_DOCUMENTS, MOCK_DEADLINES, MOCK_ACCOUNTANT } from './constants';
import { getDocuments, addDocument, updateDocument, deleteDocument, getDeadlines, addDeadline, updateDeadline, deleteDeadline, getProfiles, updateProfile, getAccountant, updateAccountant } from './lib/db';
import { supabase } from './lib/supabase';
import { Profile, Document, Deadline, Accountant } from './types';
import AuthView from './views/AuthView';

import { ToastProvider, useToast } from './components/ui/Toast';

function dbError(err: unknown): string {
  if (!navigator.onLine) return 'Nessuna connessione internet';
  const msg = (err as { message?: string })?.message ?? '';
  if (msg.includes('JWT') || msg.includes('token') || msg.includes('auth')) return 'Sessione scaduta, rieffettua il login';
  if (msg.includes('network') || msg.includes('fetch')) return 'Controlla la tua connessione';
  if (msg.includes('duplicate') || msg.includes('unique')) return 'Elemento già presente';
  if (msg.includes('permission') || msg.includes('policy')) return 'Permesso negato';
  return 'Errore temporaneo, riprova';
}
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import NotificationsPanel from './components/layout/NotificationsPanel';

import DashboardView from './views/DashboardView';
import DocumentsView from './views/DocumentsView';
import CalendarView from './views/CalendarView';
import ProfileView from './views/ProfileView';
import SettingsView from './views/SettingsView';
import AccountantView from './views/AccountantView';
import MenuView from './views/MenuView';
import MediaLibraryView from './views/MediaLibraryView';
import OnboardingView from './views/OnboardingView';

function AppInner() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeProfile, setActiveProfile] = useState<Profile>(MOCK_PROFILES[0]);
  const [isProfilePage, setIsProfilePage] = useState(false);
  const [isSettingsPage, setIsSettingsPage] = useState(false);
  const [isAccountantPage, setIsAccountantPage] = useState(false);
  const [isMediaLibraryPage, setIsMediaLibraryPage] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => JSON.parse(localStorage.getItem('darkMode') || 'false'));
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !localStorage.getItem('onboardingComplete'));
  const [documents, setDocuments] = useState<Document[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [accountant, setAccountant] = useState<Accountant>(MOCK_ACCOUNTANT);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const activeProfileRef = useRef(activeProfile);
  const { showToast } = useToast();

  // Auth: controlla sessione e ascolta eventi
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_IN') {
        setIsPasswordRecovery(false);
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Stato connessione — al rientro online, risincronizza i dati
  useEffect(() => {
    const onOnline = () => {
      setIsOffline(false);
      showToast('Connessione ripristinata — sincronizzazione in corso…', 'success');
      const profileId = activeProfileRef.current.id;
      Promise.all([
        getDocuments(profileId).catch(() => null),
        getDeadlines(profileId).catch(() => null),
      ]).then(([docs, deadlines]) => {
        if (docs) setDocuments(markOverdue(docs));
        if (deadlines) setDeadlines(deadlines);
      });
    };
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    getAccountant().then(data => { if (data) setAccountant(data); });
    getProfiles()
      .then(data => {
        if (data.length > 0) {
          setProfiles(data);
          const savedId = localStorage.getItem('activeProfileId');
          const profile = data.find(p => p.id === savedId) || data[0];
          setActiveProfile(profile);
          Promise.all([
            getDocuments(profile.id).catch(() => MOCK_DOCUMENTS),
            getDeadlines(profile.id).catch(() => MOCK_DEADLINES),
          ]).then(([docs, deadlines]) => {
            setDocuments(markOverdue(docs));
            setDeadlines(deadlines);
            setIsLoading(false);
          });
        } else {
          setProfiles(MOCK_PROFILES);
          Promise.all([
            getDocuments(MOCK_PROFILES[0].id).catch(() => MOCK_DOCUMENTS),
            getDeadlines(MOCK_PROFILES[0].id).catch(() => MOCK_DEADLINES),
          ]).then(([docs, deadlines]) => {
            setDocuments(markOverdue(docs));
            setDeadlines(deadlines);
            setIsLoading(false);
          });
        }
      })
      .catch(() => {
        setProfiles(MOCK_PROFILES);
        setDocuments(MOCK_DOCUMENTS);
        setDeadlines(MOCK_DEADLINES);
        setIsLoading(false);
      });
  }, [isAuthenticated]);

  useEffect(() => { localStorage.setItem('darkMode', JSON.stringify(darkMode)); }, [darkMode]);
  useEffect(() => {
    localStorage.setItem('activeProfileId', activeProfile.id);
    activeProfileRef.current = activeProfile;
  }, [activeProfile]);

  const markOverdue = (docs: Document[]) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return docs.map(d => {
      if (d.type === 'invoice' && d.status === 'pending' && new Date(d.date) < thirtyDaysAgo) {
        const updated = { ...d, status: 'overdue' as const };
        updateDocument(updated).catch(() => {});
        return updated;
      }
      return d;
    });
  };

  const handleAddDocument = async (doc: Document) => {
    setDocuments(prev => markOverdue([doc, ...prev]));
    showToast(doc.type === 'invoice' ? 'Fattura aggiunta' : 'Spesa aggiunta');
    try { await addDocument(doc, activeProfile.id); } catch { showToast('Errore nel salvataggio', 'error'); }
  };

  const handleDeleteDocument = async (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    showToast('Documento eliminato', 'error');
    try { await deleteDocument(id); } catch (e) { showToast(dbError(e), 'error'); }
  };

  const handleUpdateDocument = async (doc: Document) => {
    setDocuments(prev => prev.map(d => d.id === doc.id ? doc : d));
    showToast('Documento aggiornato');
    try { await updateDocument(doc); } catch { showToast('Errore nel salvataggio', 'error'); }
  };

  const handleAddDeadline = async (d: Deadline) => {
    setDeadlines(prev => [...prev, d].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    showToast('Scadenza aggiunta');
    try { await addDeadline(d, activeProfile.id); } catch { showToast('Errore nel salvataggio', 'error'); }
  };

  const handleUpdateDeadline = async (d: Deadline) => {
    setDeadlines(prev => prev.map(x => x.id === d.id ? d : x));
    showToast(d.completed ? 'Scadenza completata' : 'Scadenza aggiornata');
    try { await updateDeadline(d); } catch { showToast('Errore nel salvataggio', 'error'); }
  };

  const handleDeleteDeadline = async (id: string) => {
    setDeadlines(prev => prev.filter(d => d.id !== id));
    showToast('Scadenza eliminata', 'error');
    try { await deleteDeadline(id); } catch (e) { showToast(dbError(e), 'error'); }
  };

  const totalIncome = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return documents.filter(doc => doc.type === 'invoice' && doc.status === 'paid' && new Date(doc.date).getFullYear() === currentYear).reduce((sum, doc) => sum + doc.amount, 0);
  }, [documents]);

  const totalExpenses = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return documents.filter(doc => doc.type === 'expense' && new Date(doc.date).getFullYear() === currentYear).reduce((sum, doc) => sum + doc.amount, 0);
  }, [documents]);

  const paidPercentage = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearDocs = documents.filter(doc => doc.type === 'invoice' && new Date(doc.date).getFullYear() === currentYear);
    if (yearDocs.length === 0) return 0;
    return Math.round((yearDocs.filter(doc => doc.status === 'paid').length / yearDocs.length) * 100);
  }, [documents]);

  const notificationCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadlines.filter(d => {
      if (d.completed) return false;
      const date = new Date(d.date);
      date.setHours(0, 0, 0, 0);
      const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 30;
    }).length;
  }, [deadlines]);

  const viewTitle = useMemo(() => {
    if (isProfilePage) return 'Profilo';
    if (isSettingsPage) return 'Impostazioni';
    if (isAccountantPage) return 'Commercialista';
    if (isMediaLibraryPage) return 'Libreria';
    switch (activeTab) {
      case 'home': return 'Dashboard';
      case 'docs': return 'Documenti';
      case 'calendar': return 'Calendario';
      case 'menu': return 'Menu';
      default: return 'Dashboard';
    }
  }, [activeTab, isProfilePage, isSettingsPage, isAccountantPage, isMediaLibraryPage]);

  const resetSubPages = () => { setIsProfilePage(false); setIsSettingsPage(false); setIsAccountantPage(false); setIsMediaLibraryPage(false); };
  const handleProfileClick = () => { resetSubPages(); setIsProfilePage(true); setActiveTab('menu'); };
  const handleSettingsClick = () => { resetSubPages(); setIsSettingsPage(true); setActiveTab('menu'); };
  const handleAccountantClick = () => { resetSubPages(); setIsAccountantPage(true); setActiveTab('menu'); };
  const handleMediaLibraryClick = () => { resetSubPages(); setIsMediaLibraryPage(true); setActiveTab('docs'); };
  const handleTabChange = (tab: string) => { resetSubPages(); setActiveTab(tab); };
  const handleSwitchProfile = (p: Profile) => {
    setActiveProfile(p);
    resetSubPages();
    setActiveTab('home');
    getDocuments(p.id).then(docs => setDocuments(markOverdue(docs))).catch(() => setDocuments(MOCK_DOCUMENTS));
    getDeadlines(p.id).then(setDeadlines).catch(() => setDeadlines(MOCK_DEADLINES));
  };
  const handleBack = () => { resetSubPages(); };

  const handleUpdateProfile = async (p: Profile) => {
    setActiveProfile(p);
    setProfiles(prev => prev.map(x => x.id === p.id ? p : x));
    try {
      await updateProfile(p);
      showToast('Profilo salvato');
    } catch {
      showToast('Errore nel salvataggio del profilo', 'error');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    localStorage.removeItem('onboardingComplete');
    localStorage.removeItem('activeProfileId');
    window.location.reload();
  };

  const handleOnboardingComplete = async (p: Profile) => {
    setActiveProfile(p);
    setProfiles(prev => prev.map(x => x.id === p.id ? p : x));
    try { await updateProfile(p); } catch (e) { showToast(dbError(e), 'error'); }
    setShowOnboarding(false);
  };

  // Schermata di caricamento auth iniziale
  if (isAuthenticated === null) {
    return (
      <div className={`max-w-md mx-auto min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30">
          <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      </div>
    );
  }

  // Non autenticato → schermata login
  if (!isAuthenticated) {
    return <AuthView darkMode={darkMode} />;
  }

  // Recupero password → schermata nuova password
  if (isPasswordRecovery) {
    return <AuthView darkMode={darkMode} initialScreen="reset" onResetPassword={() => setIsPasswordRecovery(false)} />;
  }

  if (showOnboarding) {
    return <OnboardingView profile={activeProfile} onComplete={handleOnboardingComplete} darkMode={darkMode} />;
  }

  if (isLoading) {
    return (
      <div className={`max-w-md mx-auto min-h-screen flex flex-col items-center justify-center gap-4 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30">
          <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
        <p className={`text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Caricamento in corso…</p>
      </div>
    );
  }

  return (
    <div className={`max-w-md mx-auto min-h-screen flex flex-col shadow-2xl relative overflow-hidden transition-colors duration-500 ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs font-bold text-center py-2 px-4 flex items-center justify-center gap-2 z-50">
          <span>⚠️</span> Nessuna connessione — le modifiche verranno salvate quando torni online
        </div>
      )}
      <Header
        title={viewTitle}
        activeProfile={activeProfile}
        onProfileClick={handleProfileClick}
        onBellClick={() => setIsNotificationsOpen(true)}
        notificationCount={notificationCount}
        showBack={isProfilePage || isSettingsPage || isAccountantPage || isMediaLibraryPage}
        onBack={handleBack}
        darkMode={darkMode}
      />

      {isNotificationsOpen && (
        <NotificationsPanel deadlines={deadlines} onClose={() => setIsNotificationsOpen(false)} onUpdateDeadline={handleUpdateDeadline} darkMode={darkMode} />
      )}

      <main className={`flex-1 overflow-y-auto ${darkMode ? 'bg-slate-950' : ''}`}>
        <AnimatePresence mode="wait">
          {isProfilePage ? (
            <ProfileView
              key="profile"
              activeProfile={activeProfile}
              profiles={profiles}
              onSwitchProfile={handleSwitchProfile}
              onUpdateProfile={handleUpdateProfile}
              darkMode={darkMode}
            />
          ) : isSettingsPage ? (
            <SettingsView key="settings" darkMode={darkMode} setDarkMode={setDarkMode} />
          ) : isAccountantPage ? (
            <AccountantView
              key="accountant"
              accountant={accountant}
              onSave={async a => { setAccountant(a); try { await updateAccountant(a); showToast('Commercialista salvato'); } catch (e) { showToast(dbError(e), 'error'); } }}
              darkMode={darkMode}
            />
          ) : isMediaLibraryPage ? (
            <MediaLibraryView documents={documents} onAddDocument={handleAddDocument} onDeleteDocument={handleDeleteDocument} onUpdateDocument={handleUpdateDocument} darkMode={darkMode} />
          ) : (
            <>
              {activeTab === 'home' && <DashboardView key="home" profile={activeProfile} onProfileClick={handleProfileClick} onAddDocumentClick={() => handleTabChange('docs')} income={totalIncome} expenses={totalExpenses} paidPercentage={paidPercentage} documents={documents} darkMode={darkMode} />}
              {activeTab === 'docs' && <DocumentsView key="docs" documents={documents} onAddDocument={handleAddDocument} onDeleteDocument={handleDeleteDocument} onUpdateDocument={handleUpdateDocument} onUpdateProfile={handleUpdateProfile} accountant={accountant} profile={activeProfile} darkMode={darkMode} onMediaLibraryClick={handleMediaLibraryClick} />}
              {activeTab === 'calendar' && <CalendarView key="calendar" deadlines={deadlines} onAddDeadline={handleAddDeadline} onUpdateDeadline={handleUpdateDeadline} onDeleteDeadline={handleDeleteDeadline} darkMode={darkMode} />}
              {activeTab === 'menu' && <MenuView key="menu" activeProfile={activeProfile} onProfileClick={handleProfileClick} onSettingsClick={handleSettingsClick} onAccountantClick={handleAccountantClick} onLogout={handleLogout} darkMode={darkMode} />}
            </>
          )}
        </AnimatePresence>
      </main>

      <BottomNav activeTab={(isProfilePage || isSettingsPage || isAccountantPage) ? 'menu' : isMediaLibraryPage ? 'docs' : activeTab} setActiveTab={handleTabChange} darkMode={darkMode} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
