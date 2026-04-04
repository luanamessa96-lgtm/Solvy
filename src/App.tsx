/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { MOCK_PROFILES, MOCK_DOCUMENTS, MOCK_DEADLINES, MOCK_ACCOUNTANT } from './constants';
import { getDocuments, addDocument, updateDocument, deleteDocument, getDeadlines, addDeadline, updateDeadline, deleteDeadline, getProfiles, createProfile, updateProfile, getAccountant, updateAccountant, uploadFile } from './lib/db';
import { supabaseReady, getClient } from './lib/supabase';
import { Profile, Document, Deadline, Accountant } from './types';
import { setLanguageByCountry } from './lib/i18n';
import { parseLocalDate, getLocalYear } from './utils/date';
import { getItDeductibilityRate } from './lib/it/deductibility';
import { getEsDeductibilityRate } from './lib/es/deductibility';
import AuthView from './views/AuthView';

import { ToastProvider, useToast } from './components/ui/Toast';
import DashboardSkeleton from './components/DashboardSkeleton';

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
const NotificationsPanel = lazy(() => import('./components/layout/NotificationsPanel'));
import { UpdateBanner } from './components/ui/UpdateBanner';

const DashboardView = lazy(() => import('./views/DashboardView'));
const DocumentsView = lazy(() => import('./views/DocumentsView'));
const CalendarView = lazy(() => import('./views/CalendarView'));
const ProfileView = lazy(() => import('./views/ProfileView'));
const SettingsView = lazy(() => import('./views/SettingsView'));
const AccountantView = lazy(() => import('./views/AccountantView'));
const FiscalView = lazy(() => import('./views/FiscalView'));
const MediaLibraryView = lazy(() => import('./views/MediaLibraryView'));
const MenuView = lazy(() => import('./views/MenuView'));
const OnboardingView = lazy(() => import('./views/OnboardingView'));
const GuidaFiscaleView = lazy(() => import('./views/GuidaFiscaleView'));
const GuiaFiscalESView = lazy(() => import('./views/GuiaFiscalESView'));

// Migra i temi base al loro equivalente Pro (T31: Free ottiene la UI Pro)
function migrateTheme(t: string | null | undefined): string {
  if (!t || t === 'light') return 'pro-light';
  if (t === 'dark') return 'pro-dark';
  return t;
}

function AppInner() {
  const [activeTab, setActiveTab] = useState('home');
  const [docChoiceTrigger, setDocChoiceTrigger] = useState(0);
  const [calAddTrigger, setCalAddTrigger] = useState(0);
  const [activeProfile, setActiveProfile] = useState<Profile>(MOCK_PROFILES[0]);
  const [isProfilePage, setIsProfilePage] = useState(false);
  const [isSettingsPage, setIsSettingsPage] = useState(false);
  const [isAccountantPage, setIsAccountantPage] = useState(false);
  const [isFiscalPage, setIsFiscalPage] = useState(false);
  const [isMediaLibraryPage, setIsMediaLibraryPage] = useState(false);
  const [isGuidaFiscalePage, setIsGuidaFiscalePage] = useState(false);
  const [isGuiaFiscalESPage, setIsGuiaFiscalESPage] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState<string>(() => {
    const saved = localStorage.getItem('theme');
    const base = saved || (JSON.parse(localStorage.getItem('darkMode') || 'false') ? 'dark' : null);
    return migrateTheme(base);
  });

  const setProfileTheme = (newTheme: string, profileId?: string) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    const id = profileId ?? activeProfile.id;
    if (id) localStorage.setItem(`theme_${id}`, newTheme);
  };
  const darkMode = theme === 'dark' || theme === 'pro-dark';

  // Sync data-theme on <html> for CSS variable theming (themes.css)
  useEffect(() => {
    const rootTheme = theme === 'light' ? 'free-light' : theme === 'dark' ? 'free-dark' : theme;
    document.documentElement.setAttribute('data-theme', rootTheme);
  }, [theme]);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !localStorage.getItem('onboardingComplete'));
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileShell, setNewProfileShell] = useState<Profile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [accountant, setAccountant] = useState<Accountant>(MOCK_ACCOUNTANT);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const activeProfileRef = useRef(activeProfile);
  const mainRef = useRef<HTMLElement>(null);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const profileCache = useRef<Record<string, { documents: Document[], deadlines: Deadline[], accountant: Accountant | null }>>({});
  const { showToast } = useToast();

  // Auth: controlla sessione e ascolta eventi
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    supabaseReady.then(sb => {
      sb.auth.getSession().then(({ data: { session } }) => {
        setIsAuthenticated(!!session);
        // Rimuovi splash screen quando la sessione è nota
        const splash = document.getElementById('splash');
        if (splash) { splash.classList.add('hide'); setTimeout(() => splash.remove(), 280); }
      });

      const { data } = sb.auth.onAuthStateChange((event, session) => {
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
      subscription = data.subscription;
    });

    return () => { subscription?.unsubscribe(); };
  }, []);

  // PWA update detection
  useEffect(() => {
    // Pick up registration if event fired before React mounted (race condition on PWA reopen)
    const pending = (window as { __swPendingReg?: ServiceWorkerRegistration }).__swPendingReg;
    if (pending) setSwRegistration(pending);

    const handler = (e: Event) => setSwRegistration((e as CustomEvent).detail.registration);
    window.addEventListener('swUpdateReady', handler);
    return () => window.removeEventListener('swUpdateReady', handler);
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
    setIsLoading(true);
    getClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const data = await getProfiles(user.id, user.email ?? undefined).catch(() => null);

      // Profili completi = onboarding già completato (country impostato dal trigger+onboarding)
      // country=NULL significa profilo creato dal trigger ma onboarding non ancora fatto
      const completeProfiles = data
        ? data.filter(p => !!(p as { country: string | null }).country)
        : null;

      if (completeProfiles && completeProfiles.length > 0) {
        // Utente esistente con onboarding completato → dashboard
        localStorage.setItem('onboardingComplete', 'true');
        setShowOnboarding(false);
        setProfiles(completeProfiles);
        const savedId = localStorage.getItem('activeProfileId') || document.cookie.match(/activeProfileId=([^;]+)/)?.[1];
        const profile = completeProfiles.find(p => p.id === savedId) || completeProfiles[0];
        setActiveProfile(profile);
        setLanguageByCountry(profile.country);
        const profileTheme = migrateTheme(localStorage.getItem(`theme_${profile.id}`) || localStorage.getItem('theme'));
        setProfileTheme(profileTheme, profile.id);
        // Carica subito solo i documenti (critici per il Dashboard)
        getDocuments(profile.id)
          .catch(() => MOCK_DOCUMENTS)
          .then(docs => {
            const freshDocs = markOverdue(docs ?? []);
            setDocuments(freshDocs);
            profileCache.current[profile.id] = { documents: freshDocs, deadlines: [], accountant: null };

            // Background: scadenze e commercialista (non bloccano il Dashboard)
            getDeadlines(profile.id).catch(() => MOCK_DEADLINES).then(dl => {
              setDeadlines(dl);
              profileCache.current[profile.id].deadlines = dl;
            });
            getAccountant(profile.id).catch(() => null).then(acc => {
              if (acc) setAccountant(acc);
              profileCache.current[profile.id].accountant = acc;
            });

            // Pre-fetch degli altri profili in background per cache istantanea al switch
            completeProfiles.filter(p => p.id !== profile.id).forEach(p => {
              Promise.all([
                getDocuments(p.id).catch(() => []),
                getDeadlines(p.id).catch(() => []),
                getAccountant(p.id).catch(() => null),
              ]).then(([d, dl, a]) => {
                profileCache.current[p.id] = { documents: markOverdue(d), deadlines: dl, accountant: a };
              });
            });
          })
          .finally(() => {
            setIsLoading(false); // ← Dashboard visibile appena arrivano i documenti (o in caso di errore)
          });
      } else if (data !== null) {
        // Nuovo utente: trigger ha creato profilo con country=NULL (o trigger fallito).
        // Non scrivere nulla nel DB — sarà handleOnboardingComplete a farlo dopo la scelta paese.
        const triggerProfileId = data.length > 0 ? data[0].id : user.id;
        const shell: Profile = {
          id: triggerProfileId,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Utente',
          email: user.email || '',
          jobType: '',
          country: 'Italy' as Profile['country'], // placeholder UI — verrà sovrascritto in onboarding
          currency: 'EUR' as Profile['currency'],
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
          regime: 'forfettario',
        };
        setProfiles([shell]);
        setActiveProfile(shell);
        setDocuments([]);
        setDeadlines([]);
        localStorage.removeItem('onboardingComplete');
        setShowOnboarding(true);
        setIsLoading(false);
      } else {
        // Errore di rete: usa dati mock
        setShowOnboarding(false);
        setProfiles(MOCK_PROFILES);
        setDocuments(MOCK_DOCUMENTS);
        setDeadlines(MOCK_DEADLINES);
        setIsLoading(false);
      }
    });
  }, [isAuthenticated]);

  // Real-time sync: ascolta cambiamenti da Supabase
  useEffect(() => {
    if (!isAuthenticated) return;
    const pid = activeProfileRef.current.id;

    const mapDoc = (d: Record<string, unknown>): Document => ({
      id: d.id as string, type: d.type as Document['type'], title: d.title as string,
      amount: d.amount as number, date: d.date as string, status: d.status as Document['status'],
      client: d.client as string | undefined, category: d.category as string | undefined,
      imageData: d.image_data as string | undefined, fileName: d.file_name as string | undefined,
      invoiceNumber: d.invoice_number as string | undefined, clientAddress: d.client_address as string | undefined,
      clientPiva: d.client_piva as string | undefined, clientCf: d.client_cf as string | undefined,
      ritenuta: d.ritenuta as boolean | undefined, marcaBollo: d.marca_bollo as boolean | undefined,
      ivaRate: d.iva_rate as number | undefined, rivalsaInps: d.rivalsa_inps as boolean | undefined,
      docRegime: d.doc_regime as 'forfettario' | 'ordinario' | undefined,
    });

    const sb = getClient();
    const docsChannel = sb
      .channel(`docs-${pid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents', filter: `profile_id=eq.${pid}` }, payload => {
        if (payload.eventType === 'INSERT') {
          const doc = mapDoc(payload.new as Record<string, unknown>);
          setDocuments(prev => prev.find(d => d.id === doc.id) ? prev : markOverdue([doc, ...prev]));
        } else if (payload.eventType === 'UPDATE') {
          const doc = mapDoc(payload.new as Record<string, unknown>);
          setDocuments(prev => prev.map(d => d.id === doc.id ? doc : d));
        } else if (payload.eventType === 'DELETE') {
          setDocuments(prev => prev.filter(d => d.id !== (payload.old as { id: string }).id));
        }
      })
      .subscribe();

    const deadlinesChannel = sb
      .channel(`deadlines-${pid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deadlines', filter: `profile_id=eq.${pid}` }, payload => {
        if (payload.eventType === 'INSERT') {
          const d = { ...payload.new, completed: payload.new.completed ?? false } as Deadline;
          setDeadlines(prev => prev.find(x => x.id === d.id) ? prev : [...prev, d].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        } else if (payload.eventType === 'UPDATE') {
          const d = { ...payload.new, completed: payload.new.completed ?? false } as Deadline;
          setDeadlines(prev => prev.map(x => x.id === d.id ? d : x));
        } else if (payload.eventType === 'DELETE') {
          setDeadlines(prev => prev.filter(x => x.id !== (payload.old as { id: string }).id));
        }
      })
      .subscribe();

    return () => {
      sb.removeChannel(docsChannel);
      sb.removeChannel(deadlinesChannel);
    };
  }, [isAuthenticated, activeProfile.id]);

  // Realtime: ascolta UPDATE su profiles → aggiorna is_pro senza refresh
  // Risolve la race condition Stripe: webhook può arrivare dopo il redirect
  useEffect(() => {
    if (!isAuthenticated || !userId) return;

    const sb = getClient();
    const profilesChannel = sb
      .channel(`profiles-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` }, async (payload) => {
        const updatedId = (payload.new as Record<string, unknown>).id as string;
        try {
          const fresh = await getProfiles(userId);
          const fp = fresh.find(p => p.id === updatedId);
          if (fp) {
            setProfiles(prev => prev.map(p => p.id === updatedId ? fp : p));
            setActiveProfile(prev => prev.id === updatedId ? fp : prev);
          }
        } catch {
          // fallback: aggiorna solo isPro
          const isPro = ((payload.new as Record<string, unknown>).is_pro as boolean) ?? false;
          setProfiles(prev => prev.map(p => p.id === updatedId ? { ...p, isPro } : p));
          setActiveProfile(prev => prev.id === updatedId ? { ...prev, isPro } : prev);
        }
      })
      .subscribe();

    return () => { sb.removeChannel(profilesChannel); };
  }, [isAuthenticated, userId]);

  // Mostra feedback dopo redirect Stripe
  useEffect(() => {
    if (isLoading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      showToast('Benvenuto in Solvy Pro! Il tuo abbonamento è attivo.', 'success');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('checkout') === 'cancelled') {
      showToast('Pagamento annullato.', 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [isLoading]);

  useEffect(() => { localStorage.setItem('theme', theme); }, [theme]);
  useEffect(() => {
    localStorage.setItem('activeProfileId', activeProfile.id);
    document.cookie = `activeProfileId=${activeProfile.id}; path=/; max-age=31536000; SameSite=Lax`;
    activeProfileRef.current = activeProfile;
  }, [activeProfile]);

  const markOverdue = (docs: Document[]) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return docs.map(d => {
      if (d.type === 'invoice' && d.status === 'pending' && parseLocalDate(d.date) < thirtyDaysAgo) {
        const updated = { ...d, status: 'overdue' as const };
        updateDocument(updated).catch(() => {});
        return updated;
      }
      return d;
    });
  };

  const handleAddDocument = async (doc: Document) => {
    setDocuments(prev => markOverdue([doc, ...prev]));
    showToast(doc.type === 'invoice' ? 'Fattura aggiunta' : doc.type === 'credit_note' ? 'Nota di credito aggiunta' : doc.type === 'factura_rectificativa' ? 'Factura rectificativa creada' : 'Spesa aggiunta');

    let docToSave = doc;

    if (doc.imageData?.startsWith('data:')) {
      try {
        const name = doc.fileName || `image_${doc.id}.jpg`;
        const url = await uploadFile(doc.imageData, name);
        docToSave = { ...doc, imageData: url };
        setDocuments(prev => prev.map(d => d.id === doc.id ? docToSave : d));
      } catch (e) {
        // Upload allegato fallito: salva il documento senza file
        console.error('[handleAddDocument] Upload allegato fallito:', e);
        docToSave = { ...doc, imageData: undefined };
        showToast('Allegato non caricato — documento salvato senza file', 'error');
      }
    }

    try {
      await addDocument(docToSave, activeProfile.id);
    } catch (e) { console.error('[handleAddDocument] Salvataggio fallito:', e); showToast('Errore nel salvataggio', 'error'); }
  };

  const handleDeleteDocument = async (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    showToast('Documento eliminato', 'error');
    try { await deleteDocument(id); } catch (e) { showToast(dbError(e), 'error'); }
  };

  const handleUpdateDocument = async (doc: Document) => {
    setDocuments(prev => prev.map(d => d.id === doc.id ? doc : d));
    showToast('Documento aggiornato');
    try { await updateDocument(doc); } catch (e) { console.error('[handleUpdateDocument] Salvataggio fallito:', e); showToast('Errore nel salvataggio', 'error'); }
  };

  const handleAddDeadline = async (d: Deadline) => {
    setDeadlines(prev => [...prev, d].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    showToast('Scadenza aggiunta');
    try { await addDeadline(d, activeProfile.id); } catch (e) { console.error('[handleAddDeadline] Salvataggio fallito:', e); showToast('Errore nel salvataggio', 'error'); }
  };

  const handleUpdateDeadline = async (d: Deadline) => {
    setDeadlines(prev => prev.map(x => x.id === d.id ? d : x));
    showToast(d.completed ? 'Scadenza completata' : 'Scadenza aggiornata');
    try { await updateDeadline(d); } catch (e) { console.error('[handleUpdateDeadline] Salvataggio fallito:', e); showToast('Errore nel salvataggio', 'error'); }
  };

  const handleDeleteDeadline = async (id: string) => {
    setDeadlines(prev => prev.filter(d => d.id !== id));
    showToast('Scadenza eliminata', 'error');
    try { await deleteDeadline(id); } catch (e) { showToast(dbError(e), 'error'); }
  };

  const totalIncome = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const paid = documents.filter(doc => doc.type === 'invoice' && doc.status === 'paid' && getLocalYear(doc.date) === currentYear).reduce((sum, doc) => sum + doc.amount, 0);
    const credited = documents.filter(doc => (doc.type === 'credit_note' || doc.type === 'factura_rectificativa') && getLocalYear(doc.date) === currentYear).reduce((sum, doc) => sum + doc.amount, 0);
    return paid - credited;
  }, [documents]);

  const totalExpenses = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const applyItDeductibility = activeProfile.country === 'Italy' && activeProfile.regime === 'ordinario';
    const applyEsDeductibility = activeProfile.country === 'Spain';
    return documents
      .filter(doc => doc.type === 'expense' && getLocalYear(doc.date) === currentYear)
      .reduce((sum, doc) => {
        let rate = 1;
        if (applyItDeductibility) rate = getItDeductibilityRate(doc.category);
        else if (applyEsDeductibility) rate = getEsDeductibilityRate(doc.category);
        return sum + doc.amount * rate;
      }, 0);
  }, [documents, activeProfile.country, activeProfile.regime]);

  const paidPercentage = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearDocs = documents.filter(doc => doc.type === 'invoice' && getLocalYear(doc.date) === currentYear);
    if (yearDocs.length === 0) return 0;
    return Math.round((yearDocs.filter(doc => doc.status === 'paid').length / yearDocs.length) * 100);
  }, [documents]);

  const notificationCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadlines.filter(d => {
      if (d.completed) return false;
      const date = parseLocalDate(d.date);
      date.setHours(0, 0, 0, 0);
      const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 30;
    }).length;
  }, [deadlines]);

  const viewTitle = useMemo(() => {
    if (isProfilePage) return 'Profilo';
    if (isSettingsPage) return 'Impostazioni';
    if (isAccountantPage) return 'Commercialista';
    if (isFiscalPage) return 'Fiscalità';
    if (isMediaLibraryPage) return 'Libreria';
    if (isGuidaFiscalePage) return 'Guida Fiscale';
    if (isGuiaFiscalESPage) return 'Guía Fiscal';
    switch (activeTab) {
      case 'home': return 'Dashboard';
      case 'docs': return 'Documenti';
      case 'calendar': return 'Calendario';
      case 'menu': return 'Menu';
      default: return 'Dashboard';
    }
  }, [activeTab, isProfilePage, isSettingsPage, isAccountantPage, isFiscalPage, isMediaLibraryPage, isGuidaFiscalePage, isGuiaFiscalESPage]);

  // Hide BottomNav on scroll down, show on scroll up
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let lastY = 0;
    const onScroll = () => {
      const y = el.scrollTop;
      if (y - lastY > 8) setIsNavHidden(true);
      else if (lastY - y > 8) setIsNavHidden(false);
      lastY = y;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isAuthenticated, isLoading]); // re-attach when main element mounts (after loading)

  const resetSubPages = () => { setIsProfilePage(false); setIsSettingsPage(false); setIsAccountantPage(false); setIsFiscalPage(false); setIsMediaLibraryPage(false); setIsGuidaFiscalePage(false); setIsGuiaFiscalESPage(false); };
  const handleProfileClick = () => { resetSubPages(); setIsProfilePage(true); setActiveTab('menu'); };
  const handleSettingsClick = () => { resetSubPages(); setIsSettingsPage(true); setActiveTab('menu'); };
  const handleAccountantClick = () => { resetSubPages(); setIsAccountantPage(true); setActiveTab('menu'); };
  const handleFiscalClick = () => { resetSubPages(); setIsFiscalPage(true); setActiveTab('menu'); };
  const handleMediaLibraryClick = () => { resetSubPages(); setIsMediaLibraryPage(true); setActiveTab('docs'); };
  const handleGuidaFiscaleClick = () => { resetSubPages(); setIsGuidaFiscalePage(true); setActiveTab('menu'); };
  const handleGuiaFiscalESClick = () => { resetSubPages(); setIsGuiaFiscalESPage(true); setActiveTab('menu'); };
  const handleTabChange = (tab: string) => { resetSubPages(); setActiveTab(tab); setIsNavHidden(false); };

  const handlePlusPress = () => {
    if (activeTab === 'docs') setDocChoiceTrigger(n => n + 1);
    else if (activeTab === 'calendar') setCalAddTrigger(n => n + 1);
  };
  const handleSwitchProfile = (p: Profile) => {
    // Mostra dati dalla cache se disponibili, altrimenti vuoto
    const cached = profileCache.current[p.id];
    setActiveProfile(p);
    setLanguageByCountry(p.country);
    setDocuments(cached ? cached.documents : []);
    setDeadlines(cached ? cached.deadlines : []);
    setAccountant(cached?.accountant || MOCK_ACCOUNTANT);
    resetSubPages();
    setActiveTab('home');
    const profileTheme = migrateTheme(localStorage.getItem(`theme_${p.id}`) || localStorage.getItem('theme'));
    setTheme(profileTheme);
    localStorage.setItem('theme', profileTheme);
    localStorage.setItem(`theme_${p.id}`, profileTheme);
    // Aggiorna in background e salva in cache
    Promise.all([
      getDocuments(p.id).catch(() => MOCK_DOCUMENTS),
      getDeadlines(p.id).catch(() => MOCK_DEADLINES),
      getAccountant(p.id).catch(() => null),
    ]).then(([docs, deadlines, acc]) => {
      const freshDocs = markOverdue(docs);
      setDocuments(freshDocs);
      setDeadlines(deadlines);
      if (acc) setAccountant(acc);
      profileCache.current[p.id] = { documents: freshDocs, deadlines, accountant: acc };
    });
  };
  const handleBack = () => { resetSubPages(); };

  const handleUpdateProfile = async (p: Profile) => {
    setActiveProfile(p);
    setProfiles(prev => prev.map(x => x.id === p.id ? p : x));
    try {
      await updateProfile(p);
      showToast('Profilo salvato');
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? 'errore sconosciuto';
      console.error('[handleUpdateProfile] Salvataggio fallito:', e);
      showToast(`Save error: ${msg}`, 'error');
    }
  };

  const handleLogout = async () => {
    await getClient().auth.signOut().catch(() => {});
    localStorage.removeItem('onboardingComplete');
    localStorage.removeItem('activeProfileId');
    window.location.reload();
  };

  const handleOnboardingComplete = async (p: Profile): Promise<void> => {
    const normalized: Profile = {
      ...p,
      regime: p.country === 'Spain' ? 'autonomo' : (p.regime ?? 'forfettario'),
    };
    setActiveProfile(normalized);
    setProfiles(prev => prev.map(x => x.id === normalized.id ? normalized : x));
    // Refresh session before saving — previene 401 se la sessione è scaduta durante l'onboarding
    const { data: { session } } = await getClient().auth.refreshSession().catch(() => ({ data: { session: null } }));
    try {
      await updateProfile(normalized);
    } catch (e) {
      showToast(dbError(e), 'error');
      throw e;
    }
    setLanguageByCountry(normalized.country);
    localStorage.setItem('onboardingComplete', 'true');
    setShowOnboarding(false);

    // Email di benvenuto (fire-and-forget — non blocca l'onboarding)
    if (session?.access_token) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const lang = normalized.country === 'Spain' ? 'es' : 'it';
      fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'welcome',
          email: normalized.email,
          name: normalized.name,
          lang,
        }),
      }).catch(() => {}); // silent — la mancata email non impatta l'UX
    }
  };

  const handleAddProfile = () => {
    const shell: Profile = {
      id: crypto.randomUUID(),
      name: '',
      email: activeProfile.email,
      jobType: '',
      country: 'Italy' as Profile['country'],
      currency: 'EUR' as Profile['currency'],
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
      regime: 'forfettario',
      isPro: activeProfile.isPro ?? false,
    };
    setNewProfileShell(shell);
    setIsAddingProfile(true);
  };

  const handleNewProfileComplete = async (p: Profile): Promise<void> => {
    const normalized: Profile = {
      ...p,
      regime: p.country === 'Spain' ? 'autonomo' : (p.regime ?? 'forfettario'),
    };
    try {
      // INSERT esplicito — mai toccare profili esistenti con upsert
      await createProfile(normalized);
    } catch (e) {
      console.error('[handleNewProfileComplete] Salvataggio fallito:', e);
      showToast(dbError(e), 'error');
      throw e; // Tieni l'utente nell'onboarding per riprovare
    }
    setLanguageByCountry(normalized.country);
    setProfiles(prev => [...prev, normalized]);
    setActiveProfile(normalized);
    setDocuments([]);
    setDeadlines([]);
    setAccountant(MOCK_ACCOUNTANT);
    profileCache.current[normalized.id] = { documents: [], deadlines: [], accountant: null };
    setNewProfileShell(null);
    setIsAddingProfile(false);
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

  const proGradient = theme === 'pro-light'
    ? 'linear-gradient(135deg, #ddd6fe 0%, #bfdbfe 55%, #a5f3fc 100%)'
    : undefined;
  const proBgStyle = theme === 'pro-dark'
    ? { backgroundColor: '#08080f' }
    : proGradient
    ? { background: proGradient }
    : undefined;
  const isProLight = theme === 'pro-light';

  if (isLoading) {
    // Se sappiamo già che andremo all'onboarding (nuovo utente o localStorage cleared),
    // mostriamo uno spinner neutro invece dello skeleton dashboard per evitare il flash
    if (showOnboarding) {
      return (
        <div className={`max-w-md mx-auto min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950' : 'bg-white'}`}>
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30">
            <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        </div>
      );
    }
    return (
      <div
        data-theme={theme}
        style={proBgStyle}
        className={`max-w-md mx-auto min-h-screen flex flex-col shadow-2xl relative overflow-hidden ${darkMode ? 'bg-slate-950 text-white' : isProLight ? 'text-slate-900' : 'bg-slate-50 text-slate-900'}`}
      >
        <Header
          title="Dashboard"
          activeProfile={activeProfile}
          onProfileClick={handleProfileClick}
          onBellClick={() => {}}
          notificationCount={0}
          showBack={false}
          onBack={() => {}}
          darkMode={darkMode}
        />
        <main className={`flex-1 overflow-y-auto ${darkMode ? 'bg-slate-950' : ''}`}>
          <DashboardSkeleton darkMode={darkMode} />
        </main>
        <BottomNav activeTab="home" setActiveTab={() => {}} darkMode={darkMode} theme={theme} />
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingView profile={activeProfile} onComplete={handleOnboardingComplete} darkMode={darkMode} />;
  }

  if (isAddingProfile && newProfileShell) {
    return <OnboardingView profile={newProfileShell} onComplete={handleNewProfileComplete} darkMode={darkMode} onCancel={() => { setIsAddingProfile(false); setNewProfileShell(null); }} />;
  }

  return (
    <>
    <div
      data-theme={theme}
      style={proBgStyle}
      className={`max-w-md mx-auto min-h-screen flex flex-col shadow-2xl relative overflow-hidden transition-colors duration-500 ${darkMode ? 'bg-slate-950 text-white' : isProLight ? 'text-slate-900' : 'bg-slate-50 text-slate-900'}`}
    >
      {isProLight && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(100, 80, 140, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}
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
        showBack={isProfilePage || isSettingsPage || isAccountantPage || isFiscalPage || isMediaLibraryPage || isGuidaFiscalePage || isGuiaFiscalESPage}
        onBack={handleBack}
        darkMode={darkMode}
      />

      <Suspense fallback={null}>
        <NotificationsPanel isOpen={isNotificationsOpen} deadlines={deadlines} onClose={() => setIsNotificationsOpen(false)} onUpdateDeadline={handleUpdateDeadline} darkMode={darkMode} />
      </Suspense>

      <main ref={mainRef} className={`flex-1 overflow-y-auto ${darkMode ? 'bg-slate-950' : ''}`}>
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
          {isProfilePage ? (
            <ProfileView
              activeProfile={activeProfile}
              profiles={profiles}
              onSwitchProfile={handleSwitchProfile}
              onUpdateProfile={handleUpdateProfile}
              onAddProfile={handleAddProfile}
              darkMode={darkMode}
            />
          ) : isSettingsPage ? (
            <SettingsView theme={theme} setTheme={(t) => setProfileTheme(t, activeProfile.id)} profile={activeProfile} onUpdateProfile={handleUpdateProfile} profilesCount={profiles.length} documents={documents} deadlines={deadlines} />
          ) : isFiscalPage ? (
            <Suspense fallback={null}><FiscalView profile={activeProfile} onUpdateProfile={handleUpdateProfile} darkMode={darkMode} documents={documents} /></Suspense>
          ) : isAccountantPage ? (
            <AccountantView
              accountant={accountant}
              onSave={async a => { setAccountant(a); try { await updateAccountant(a, activeProfile.id); showToast('Commercialista salvato'); } catch (e) { showToast(dbError(e), 'error'); } }}
              darkMode={darkMode}
            />
          ) : isMediaLibraryPage ? (
            <MediaLibraryView documents={documents} onAddDocument={handleAddDocument} onDeleteDocument={handleDeleteDocument} onUpdateDocument={handleUpdateDocument} darkMode={darkMode} />
          ) : isGuidaFiscalePage ? (
            <Suspense fallback={null}><GuidaFiscaleView darkMode={darkMode} /></Suspense>
          ) : isGuiaFiscalESPage ? (
            <Suspense fallback={null}><GuiaFiscalESView darkMode={darkMode} /></Suspense>
          ) : (
            <>
              <div style={{ display: activeTab === 'home' ? 'block' : 'none' }}><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}><DashboardView profile={activeProfile} onProfileClick={handleProfileClick} onAddDocumentClick={() => handleTabChange('docs')} income={totalIncome} expenses={totalExpenses} paidPercentage={paidPercentage} documents={documents} darkMode={darkMode} theme={theme} /></Suspense></div>
              <div style={{ display: activeTab === 'docs' ? 'block' : 'none' }}><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}><DocumentsView documents={documents} onAddDocument={handleAddDocument} onDeleteDocument={handleDeleteDocument} onUpdateDocument={handleUpdateDocument} onUpdateProfile={handleUpdateProfile} accountant={accountant} profile={activeProfile} darkMode={darkMode} theme={theme} onMediaLibraryClick={handleMediaLibraryClick} onNavigateToProfile={handleProfileClick} openChoiceTrigger={docChoiceTrigger} /></Suspense></div>
              <div style={{ display: activeTab === 'calendar' ? 'block' : 'none' }}><Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}><CalendarView deadlines={deadlines} onAddDeadline={handleAddDeadline} onUpdateDeadline={handleUpdateDeadline} onDeleteDeadline={handleDeleteDeadline} darkMode={darkMode} profile={activeProfile} openAddTrigger={calAddTrigger} income={totalIncome} expenses={totalExpenses} documents={documents} /></Suspense></div>
              <div style={{ display: activeTab === 'menu' ? 'block' : 'none' }}><Suspense fallback={null}><MenuView activeProfile={activeProfile} onProfileClick={handleProfileClick} onSettingsClick={handleSettingsClick} onAccountantClick={handleAccountantClick} onFiscalClick={handleFiscalClick} onGuidaFiscaleClick={handleGuidaFiscaleClick} onGuiaFiscalESClick={handleGuiaFiscalESClick} onLogout={handleLogout} darkMode={darkMode} /></Suspense></div>
            </>
          )}
        </Suspense>
      </main>

    </div>
    <BottomNav activeTab={(isProfilePage || isSettingsPage || isAccountantPage || isFiscalPage || isGuidaFiscalePage || isGuiaFiscalESPage) ? 'menu' : isMediaLibraryPage ? 'docs' : activeTab} setActiveTab={handleTabChange} darkMode={darkMode} theme={theme} onPlusPress={handlePlusPress} isNavHidden={isNavHidden} />
    <AnimatePresence>
      {swRegistration && (
        <UpdateBanner
          key="update-banner"
          darkMode={darkMode}
          onUpdate={() => {
            swRegistration.waiting?.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }}
          onDismiss={() => setSwRegistration(null)}
        />
      )}
    </AnimatePresence>
    {import.meta.env.DEV && (
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('swUpdateReady', { detail: { registration: { waiting: { postMessage: () => {} } } } }))}
        className="fixed bottom-4 right-4 z-[999] text-[10px] font-bold bg-yellow-400 text-black px-2 py-1 rounded opacity-60 hover:opacity-100"
      >
        TEST SW
      </button>
    )}
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
