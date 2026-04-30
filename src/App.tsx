/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
const AnimatePresence = lazy(() =>
  import('motion/react').then(m => ({ default: m.AnimatePresence }))
);
import { MOCK_PROFILES, MOCK_ACCOUNTANT } from './constants';
import { getDocuments, addDocument, updateDocument, deleteDocument, getDeadlines, addDeadline, updateDeadline, deleteDeadline, getProfiles, createProfile, updateProfile, getAccountant, updateAccountant, uploadFile } from './lib/db';
import { supabaseReady, getClient } from './lib/supabase';
import { themeStorage } from './lib/themeStorage';
import { Profile, Document, Deadline, Accountant } from './types';
import { setLanguageByCountry } from './lib/i18n';
import { useTranslation } from 'react-i18next';
import { parseLocalDate, getLocalYear } from './utils/date';
import { getItDeductibilityRate } from './lib/it/deductibility';
import { getEsDeductibilityRate } from './lib/es/deductibility';
const AuthView = lazy(() => import('./views/AuthView'));

import { ToastProvider, useToast } from './components/ui/Toast';
import DashboardSkeleton from './components/DashboardSkeleton';
import Spinner from './components/ui/Spinner';

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
const SubscriptionView = lazy(() => import('./views/SubscriptionView'));
const AccountantView = lazy(() => import('./views/AccountantView'));
const FiscalView = lazy(() => import('./views/FiscalView'));
const MediaLibraryView = lazy(() => import('./views/MediaLibraryView'));
const MenuView = lazy(() => import('./views/MenuView'));
const OnboardingView = lazy(() => import('./views/OnboardingView'));
const GuidaFiscaleView = lazy(() => import('./views/GuidaFiscaleView'));
const GuiaFiscalESView = lazy(() => import('./views/GuiaFiscalESView'));

// Migra i temi base al loro equivalente Pro (T31: Free ottiene la UI Pro)
function migrateTheme(t: string | null | undefined): string {
  if (!t || t === 'light') return 'free-light';
  if (t === 'dark') return 'free-dark';
  return t;
}

// Imposta data-theme su <html> in modo sincrono prima del primo render
{
  const savedTheme = themeStorage.getItem('theme');
  let _legacyDark = false;
  try { _legacyDark = JSON.parse(localStorage.getItem('darkMode') || 'false'); } catch {}
  const base = savedTheme || (_legacyDark ? 'dark' : null);
  const initialTheme = migrateTheme(base);
  const initialRootTheme = initialTheme === 'light' ? 'free-light' : initialTheme === 'dark' ? 'free-dark' : initialTheme;
  document.documentElement.setAttribute('data-theme', initialRootTheme);
}

function AppInner() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('home');
  const lastTabChangeRef = useRef<number>(0);
  const [docChoiceTrigger, setDocChoiceTrigger] = useState(0);
  const [calAddTrigger, setCalAddTrigger] = useState(0);
  const [mediaLibAddTrigger, setMediaLibAddTrigger] = useState(0);
  const [activeProfile, setActiveProfile] = useState<Profile>(MOCK_PROFILES[0]);
  const [isProfilePage, setIsProfilePage] = useState(false);
  const [isSettingsPage, setIsSettingsPage] = useState(false);
  const [isSubscriptionPage, setIsSubscriptionPage] = useState(false);
  const [isAccountantPage, setIsAccountantPage] = useState(false);
  const [isFiscalPage, setIsFiscalPage] = useState(false);
  const [isMediaLibraryPage, setIsMediaLibraryPage] = useState(false);
  const [isGuidaFiscalePage, setIsGuidaFiscalePage] = useState(false);
  const [isGuiaFiscalESPage, setIsGuiaFiscalESPage] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState<string>(() => {
    const saved = themeStorage.getItem('theme');
    let legacyDark = false;
    try { legacyDark = JSON.parse(localStorage.getItem('darkMode') || 'false'); } catch {}
    const base = saved || (legacyDark ? 'dark' : null);
    return migrateTheme(base);
  });

  const setProfileTheme = (newTheme: string, profileId?: string) => {
    setTheme(newTheme);
    themeStorage.setItem('theme', newTheme);
    const id = profileId ?? activeProfile.id;
    if (id) themeStorage.setItem(`theme_${id}`, newTheme);
  };
  const darkMode = theme === 'dark' || theme === 'free-dark' || theme === 'pro-dark';

  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    if (localStorage.getItem('onboardingComplete')) return false;
    // Fallback: cookie sopravvive al reinstall PWA (localStorage viene svuotato)
    if (/onboardingComplete=true/.test(document.cookie)) {
      localStorage.setItem('onboardingComplete', 'true');
      return false;
    }
    return true;
  });
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
  const dismissedWaiting = useRef<ServiceWorker | null>(null);
  const activeProfileRef = useRef(activeProfile);
  const mainRef = useRef<HTMLElement>(null);
  const [isNavHidden, setIsNavHidden] = useState(false);
  const profileCache = useRef<Record<string, { documents: Document[], deadlines: Deadline[], accountant: Accountant | null }>>({});
  const { showToast } = useToast();

  // Sync data-theme su <html>: auth/onboarding → pro-light; app → tema utente
  // Guard: se isAuthenticated è null l'auth è ancora in loading — theme-init.js
  // ha già impostato il tema corretto da localStorage, non sovrascrivere.
  useEffect(() => {
    if (isAuthenticated === null) return; // auth in caricamento
    if (!isAuthenticated) {
      document.documentElement.setAttribute('data-theme', 'pro-light');
      return;
    }
    if (isLoading) return; // profilo ancora in caricamento — l'inline script mantiene il tema corretto
    if (showOnboarding) {
      document.documentElement.setAttribute('data-theme', 'pro-light');
      return;
    }
    const rootTheme = theme === 'light' ? 'free-light' : theme === 'dark' ? 'free-dark' : theme;
    document.documentElement.setAttribute('data-theme', rootTheme);
  }, [theme, isAuthenticated, showOnboarding, isLoading]);

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
          // Loops last_active — fire-and-forget
          if (session?.user?.email) {
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/loops-sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ action: 'update_active', email: session.user.email }),
            }).catch(() => {});
          }
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
    const shouldShow = (reg: ServiceWorkerRegistration) =>
      reg.waiting != null && reg.waiting !== dismissedWaiting.current;

    // Pick up registration if event fired before React mounted (race condition on PWA reopen)
    const pending = (window as { __swPendingReg?: ServiceWorkerRegistration }).__swPendingReg;
    if (pending && shouldShow(pending)) setSwRegistration(pending);

    const handler = (e: Event) => {
      const reg = (e as CustomEvent).detail.registration as ServiceWorkerRegistration;
      if (shouldShow(reg)) setSwRegistration(reg);
    };
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
    setDocuments([]);
    setProfiles([]);
    setDeadlines([]);
    getClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const data = await getProfiles(user.id, user.email ?? undefined).catch(() => null);

      // Profilo primario (id === user.id): creato dal trigger DB → completo solo se jobType valorizzato
      // Profili secondari (UUID diverso): creati da handleNewProfileComplete → basta il nome (obbligatorio)
      const completeProfiles = data
        ? data.filter(p => p.id === user.id ? !!(p.jobType) : !!(p.name))
        : null;

      if (completeProfiles && completeProfiles.length > 0) {
        // Utente esistente con onboarding completato → dashboard
        localStorage.setItem('onboardingComplete', 'true');
        document.cookie = 'onboardingComplete=true; path=/; max-age=31536000; SameSite=Lax';
        setShowOnboarding(false);
        setProfiles(completeProfiles);
        const savedId = localStorage.getItem('activeProfileId') || document.cookie.match(/activeProfileId=([^;]+)/)?.[1];
        const profile = completeProfiles.find(p => p.id === savedId) || completeProfiles[0];
        setActiveProfile(profile);
        setLanguageByCountry(profile.country);
        const savedProfileTheme = themeStorage.getItem(`theme_${profile.id}`);
        const savedGlobalTheme = themeStorage.getItem('theme');
        let profileTheme = migrateTheme(savedProfileTheme || savedGlobalTheme);
        // Guard write distruttivo (Scenario B — ITP Safari): se storage è completamente vuoto
        // (cookie per-profilo scaduto dopo 7gg + globale mancante) ma React state ha un tema
        // valido letto correttamente al mount, usa lo state come fonte di verità invece di
        // sovrascrivere tutto con 'free-light' (il default di migrateTheme(null)).
        if (!savedProfileTheme && !savedGlobalTheme && theme !== 'free-light') {
          profileTheme = theme;
        }
        // Se localStorage ha ancora un tema Pro ma l'utente non è più Pro (es. cancellazione),
        // declassa subito il tema per evitare il flash pro-light al reload
        if (!profile.isPro && (profileTheme === 'pro-light' || profileTheme === 'pro-dark')) {
          profileTheme = profileTheme === 'pro-light' ? 'free-light' : 'free-dark';
        }
        setProfileTheme(profileTheme, profile.id);
        // Carica subito solo i documenti (critici per il Dashboard)
        getDocuments(profile.id)
          .catch(() => [])
          .then(docs => {
            const freshDocs = markOverdue(docs ?? []);
            setDocuments(freshDocs);
            profileCache.current[profile.id] = { documents: freshDocs, deadlines: [], accountant: null };

            // Background: scadenze e commercialista (non bloccano il Dashboard)
            getDeadlines(profile.id).catch(() => []).then(dl => {
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
        // Errore di rete: mostra dashboard vuota
        setShowOnboarding(false);
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
        // is_pro può essere assente nel payload se updateProfile non lo include (upsert senza is_pro).
        // Usare ?? false causerebbe un falso downgrade del tema ad ogni salvataggio profilo.
        const rawIsPro = (payload.new as Record<string, unknown>).is_pro;
        const newIsPro = rawIsPro === true; // true solo se esplicitamente true nel payload
        try {
          const fresh = await getProfiles(userId);
          const fp = fresh.find(p => p.id === updatedId);
          if (fp) {
            setProfiles(prev => prev.map(p => p.id === updatedId ? fp : p));
            setActiveProfile(prev => prev.id === updatedId ? fp : prev);
          }
        } catch {
          // fallback: aggiorna solo isPro se il campo era presente nel payload
          if (rawIsPro !== undefined) {
            setProfiles(prev => prev.map(p => p.id === updatedId ? { ...p, isPro: newIsPro } : p));
            setActiveProfile(prev => prev.id === updatedId ? { ...prev, isPro: newIsPro } : prev);
          }
        }
        // Declassa il tema pro → free solo quando is_pro è esplicitamente false nel payload
        // (cambio reale da Pro a Free via Stripe webhook), non quando il campo è assente.
        if (rawIsPro === false) {
          setTheme(prev => {
            if (prev !== 'pro-light' && prev !== 'pro-dark') return prev;
            const next = prev === 'pro-light' ? 'free-light' : 'free-dark';
            themeStorage.setItem('theme', next);
            themeStorage.setItem(`theme_${updatedId}`, next);
            return next;
          });
        }
      })
      .subscribe();

    return () => { sb.removeChannel(profilesChannel); };
  }, [isAuthenticated, userId]);

  // Dopo redirect Stripe: polling is_pro finché webhook non aggiorna il DB (max 20s)
  useEffect(() => {
    if (isLoading || !userId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      window.gtag?.('event', 'purchase', { currency: 'EUR' });
      window.history.replaceState({}, '', window.location.pathname);
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const fresh = await getProfiles(userId);
          const updated = fresh.find(p => p.isPro);
          if (updated) {
            clearInterval(poll);
            setProfiles(fresh);
            setActiveProfile(prev => fresh.find(p => p.id === prev.id) ?? prev);
            showToast('Benvenuto in Solvy Pro! Il tuo abbonamento è attivo.', 'success');
            return;
          }
        } catch { /* ignora errori transitori */ }
        if (attempts >= 10) {
          clearInterval(poll);
          showToast('Benvenuto in Solvy Pro! Il tuo abbonamento è attivo.', 'success');
        }
      }, 2000);
      return () => clearInterval(poll);
    } else if (params.get('checkout') === 'cancelled') {
      showToast('Pagamento annullato.', 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [isLoading, userId]);

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
    showToast(doc.type === 'invoice' ? t('documents.toast_invoice_added') : doc.type === 'credit_note' ? t('documents.toast_credit_note_added') : doc.type === 'factura_rectificativa' ? t('documents.toast_factura_rectificativa_added') : t('documents.toast_expense_added'));

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
        showToast(t('documents.toast_attachment_error'), 'error');
      }
    }

    try {
      await addDocument(docToSave, activeProfile.id);
      // Loops fatture_count — fire-and-forget (conta solo fatture e note di credito)
      if (activeProfile.email) {
        const fattureCount = documents.filter(d =>
          d.type === 'invoice' || d.type === 'credit_note' || d.type === 'factura_rectificativa'
        ).length + (
          doc.type === 'invoice' || doc.type === 'credit_note' || doc.type === 'factura_rectificativa' ? 1 : 0
        );
        getClient().auth.getSession().then(({ data: { session } }) => {
          if (!session) return;
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/loops-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ action: 'update_fatture', email: activeProfile.email, fattureCount, isPro: activeProfile.isPro ?? false }),
          }).catch(() => {});
        }).catch(() => {});
      }
    } catch (e) { console.error('[handleAddDocument] Salvataggio fallito:', e); showToast(t('documents.toast_save_error'), 'error'); }
  };

  const handleDeleteDocument = async (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    showToast(t('documents.toast_deleted'), 'error');
    try { await deleteDocument(id); } catch (e) { showToast(dbError(e), 'error'); }
  };

  const handleUpdateDocument = async (doc: Document) => {
    setDocuments(prev => prev.map(d => d.id === doc.id ? doc : d));
    showToast(t('documents.toast_updated'));
    try { await updateDocument(doc); } catch (e) { console.error('[handleUpdateDocument] Salvataggio fallito:', e); showToast('Errore nel salvataggio', 'error'); }
  };

  const handleAddDeadline = async (d: Deadline) => {
    setDeadlines(prev => [...prev, d].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    showToast(t('calendar.toast_deadline_added'));
    try { await addDeadline(d, activeProfile.id); } catch (e) { console.error('[handleAddDeadline] Salvataggio fallito:', e); showToast('Errore nel salvataggio', 'error'); }
  };

  const handleUpdateDeadline = async (d: Deadline) => {
    setDeadlines(prev => prev.map(x => x.id === d.id ? d : x));
    showToast(d.completed ? t('calendar.toast_deadline_completed') : t('calendar.toast_deadline_updated'));
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

  // Filtra le scadenze INPS per mostrare solo la categoria corrente del profilo IT
  // (rimuove scadenze stantie di categorie precedenti salvate nel DB)
  const notifDeadlines = useMemo(() => {
    if (activeProfile?.country !== 'Italy') return deadlines;
    const coeff = activeProfile?.coefficiente;
    const inpsType =
      coeff === 67 ? 'artigiani' :
      coeff === 86 ? 'costruzioni' :
      coeff === 40 ? 'ristorazione' :
      coeff === 62 ? 'intermediari' : 'professionisti';
    const ALL_INPS_TITLES = new Set([
      '1° acconto INPS gestione separata', '2° acconto INPS gestione separata',
      '1° rata INPS artigiani', '2° rata INPS artigiani', '3° rata INPS artigiani', 'Saldo INPS artigiani',
      '1° rata INPS costruzioni', '2° rata INPS costruzioni', '3° rata INPS costruzioni', 'Saldo INPS costruzioni',
      '1° rata INPS commercianti', '2° rata INPS commercianti', '3° rata INPS commercianti', 'Saldo INPS commercianti',
      '1° rata INPS ristorazione', '2° rata INPS ristorazione', '3° rata INPS ristorazione', 'Saldo INPS ristorazione',
    ]);
    const currentTitles = new Set(
      inpsType === 'professionisti' || inpsType === 'intermediari'
        ? ['1° acconto INPS gestione separata', '2° acconto INPS gestione separata']
        : [`1° rata INPS ${inpsType}`, `2° rata INPS ${inpsType}`, `3° rata INPS ${inpsType}`, `Saldo INPS ${inpsType}`]
    );
    return deadlines.filter(d => !ALL_INPS_TITLES.has(d.title) || currentTitles.has(d.title));
  }, [deadlines, activeProfile]);

  const notificationCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return notifDeadlines.filter(d => {
      if (d.completed) return false;
      const date = parseLocalDate(d.date);
      date.setHours(0, 0, 0, 0);
      const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 30;
    }).length;
  }, [notifDeadlines]);

  const viewTitle = useMemo(() => {
    if (isProfilePage) return t('page_titles.profile');
    if (isSettingsPage) return t('page_titles.settings');
    if (isSubscriptionPage) return t('page_titles.subscription');
    if (isAccountantPage) return t('page_titles.accountant');
    if (isFiscalPage) return t('page_titles.fiscal');
    if (isMediaLibraryPage) return t('page_titles.media_library');
    if (isGuidaFiscalePage) return t('page_titles.fiscal_guide_it');
    if (isGuiaFiscalESPage) return t('page_titles.fiscal_guide_es');
    switch (activeTab) {
      case 'home': return t('page_titles.dashboard');
      case 'docs': return t('page_titles.documents');
      case 'calendar': return t('page_titles.calendar');
      case 'menu': return t('page_titles.menu');
      default: return t('page_titles.dashboard');
    }
  }, [activeTab, isProfilePage, isSettingsPage, isSubscriptionPage, isAccountantPage, isFiscalPage, isMediaLibraryPage, isGuidaFiscalePage, isGuiaFiscalESPage, t, i18n.language]);

  // Hide BottomNav on scroll down, show on scroll up
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y - lastY > 8) setIsNavHidden(true);
      else if (lastY - y > 8) setIsNavHidden(false);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const resetSubPages = () => { setIsProfilePage(false); setIsSettingsPage(false); setIsSubscriptionPage(false); setIsAccountantPage(false); setIsFiscalPage(false); setIsMediaLibraryPage(false); setIsGuidaFiscalePage(false); setIsGuiaFiscalESPage(false); };
  const handleProfileClick = () => { resetSubPages(); setIsProfilePage(true); setActiveTab('menu'); };
  const handleSettingsClick = () => { resetSubPages(); setIsSettingsPage(true); setActiveTab('menu'); };
  const handleSubscriptionClick = () => { resetSubPages(); setIsSubscriptionPage(true); setActiveTab('menu'); };
  const handleAccountantClick = () => { resetSubPages(); setIsAccountantPage(true); setActiveTab('menu'); };
  const handleFiscalClick = () => { resetSubPages(); setIsFiscalPage(true); setActiveTab('menu'); };
  const handleMediaLibraryClick = () => { resetSubPages(); setIsMediaLibraryPage(true); setActiveTab('docs'); };
  const handleGuidaFiscaleClick = () => { resetSubPages(); setIsGuidaFiscalePage(true); setActiveTab('menu'); };
  const handleGuiaFiscalESClick = () => { resetSubPages(); setIsGuiaFiscalESPage(true); setActiveTab('menu'); };
  const handleTabChange = (tab: string) => { lastTabChangeRef.current = Date.now(); resetSubPages(); setActiveTab(tab); setIsNavHidden(false); };

  const handlePlusPress = () => {
    // Guard: ignora press accidentali durante navigazione tab (touch target overlap + button / tab)
    if (Date.now() - lastTabChangeRef.current < 300) return;
    if (isMediaLibraryPage) setMediaLibAddTrigger(n => n + 1);
    else if (activeTab === 'docs') setDocChoiceTrigger(n => n + 1);
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
    const profileTheme = migrateTheme(themeStorage.getItem(`theme_${p.id}`) || themeStorage.getItem('theme'));
    setTheme(profileTheme);
    themeStorage.setItem('theme', profileTheme);
    themeStorage.setItem(`theme_${p.id}`, profileTheme);
    // Aggiorna in background e salva in cache
    Promise.all([
      getDocuments(p.id).catch(() => []),
      getDeadlines(p.id).catch(() => []),
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
    document.cookie = 'activeProfileId=; path=/; max-age=0';
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

    // Email di benvenuto via Loops + notifica Telegram — solo al primo signup
    const loopsEmail = normalized.email || session?.user?.email;
    if (loopsEmail && session) {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/loops-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          action: 'signup',
          email: loopsEmail,
          name: normalized.name || '',
          paese: normalized.country === 'Spain' ? 'Spain' : 'Italy',
        }),
      }).catch(() => {});

      getClient().functions.invoke('telegram-alert', {
        body: {
          type: 'new_user',
          email: loopsEmail,
          name: normalized.name || '',
          country: normalized.country === 'Spain' ? 'Spain' : 'Italy',
        },
      }).catch(() => {});
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
        <Spinner size={40} />
      </div>
    );
  }

  // Non autenticato → schermata login (sempre pro-light, gestito dall'useEffect tema)
  if (!isAuthenticated) {
    return <Suspense fallback={null}><AuthView darkMode={darkMode} /></Suspense>;
  }

  // Recupero password → schermata nuova password (sempre pro-light, gestito dall'useEffect tema)
  if (isPasswordRecovery) {
    return <Suspense fallback={null}><AuthView darkMode={darkMode} initialScreen="reset" onResetPassword={() => setIsPasswordRecovery(false)} /></Suspense>;
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
          <Spinner size={40} />
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
          isLoading={true}
        />
        <main className={`flex-1 overflow-y-auto ${darkMode ? 'bg-slate-950' : ''}`}>
          <DashboardSkeleton darkMode={darkMode} />
        </main>
        <BottomNav activeTab="home" setActiveTab={() => {}} darkMode={darkMode} theme={theme} />
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingView
      profile={activeProfile}
      onComplete={handleOnboardingComplete}
      darkMode={false}
      onCancel={async () => {
        await supabaseReady.then(sb => sb.auth.signOut());
        setIsAuthenticated(false);
        setShowOnboarding(false);
      }}
    />;
  }

  if (isAddingProfile && newProfileShell) {
    return <OnboardingView profile={newProfileShell} onComplete={handleNewProfileComplete} darkMode={darkMode} onCancel={() => { setIsAddingProfile(false); setNewProfileShell(null); }} />;
  }

  return (
    <>
    <div
      data-theme={theme}
      style={proBgStyle}
      className={`max-w-md mx-auto min-h-screen flex flex-col shadow-2xl relative overflow-hidden ${darkMode ? 'bg-slate-950 text-white' : isProLight ? 'text-slate-900' : 'bg-slate-50 text-slate-900'}`}
    >
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
        showBack={isProfilePage || isSettingsPage || isSubscriptionPage || isAccountantPage || isFiscalPage || isMediaLibraryPage || isGuidaFiscalePage || isGuiaFiscalESPage}
        onBack={handleBack}
        darkMode={darkMode}
      />

      <Suspense fallback={null}>
        <NotificationsPanel isOpen={isNotificationsOpen} deadlines={notifDeadlines} onClose={() => setIsNotificationsOpen(false)} onUpdateDeadline={handleUpdateDeadline} darkMode={darkMode} theme={theme} isPro={activeProfile?.isPro ?? false} />
      </Suspense>

      <main ref={mainRef} className="flex-1 overflow-y-auto min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Spinner size={36} /></div>}>
          {isProfilePage ? (
            <ProfileView
              activeProfile={activeProfile}
              profiles={profiles}
              onSwitchProfile={handleSwitchProfile}
              onUpdateProfile={handleUpdateProfile}
              onAddProfile={handleAddProfile}
              darkMode={darkMode}
              theme={theme}
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
            <MediaLibraryView documents={documents} onAddDocument={handleAddDocument} onDeleteDocument={handleDeleteDocument} onUpdateDocument={handleUpdateDocument} darkMode={darkMode} addTrigger={mediaLibAddTrigger} />
          ) : isGuidaFiscalePage ? (
            <Suspense fallback={null}><GuidaFiscaleView darkMode={darkMode} /></Suspense>
          ) : isGuiaFiscalESPage ? (
            <Suspense fallback={null}><GuiaFiscalESView darkMode={darkMode} /></Suspense>
          ) : isSubscriptionPage ? (
            <Suspense fallback={null}><SubscriptionView profile={activeProfile} darkMode={darkMode} /></Suspense>
          ) : (
            <>
              <div style={{ display: activeTab === 'home' ? 'block' : 'none' }}><Suspense fallback={<div className="flex items-center justify-center h-64"><Spinner size={32} /></div>}><DashboardView profile={activeProfile} onProfileClick={handleProfileClick} onAddDocumentClick={() => handleTabChange('docs')} income={totalIncome} expenses={totalExpenses} paidPercentage={paidPercentage} documents={documents} darkMode={darkMode} theme={theme} /></Suspense></div>
              <div style={{ display: activeTab === 'docs' ? 'block' : 'none' }}><Suspense fallback={<div className="flex items-center justify-center h-64"><Spinner size={32} /></div>}><DocumentsView documents={documents} onAddDocument={handleAddDocument} onDeleteDocument={handleDeleteDocument} onUpdateDocument={handleUpdateDocument} onUpdateProfile={handleUpdateProfile} accountant={accountant} profile={activeProfile} darkMode={darkMode} theme={theme} onMediaLibraryClick={handleMediaLibraryClick} onNavigateToProfile={handleProfileClick} openChoiceTrigger={docChoiceTrigger} /></Suspense></div>
              <div style={{ display: activeTab === 'calendar' ? 'block' : 'none' }}><Suspense fallback={<div className="flex items-center justify-center h-64"><Spinner size={32} /></div>}><CalendarView deadlines={deadlines} onAddDeadline={handleAddDeadline} onUpdateDeadline={handleUpdateDeadline} onDeleteDeadline={handleDeleteDeadline} darkMode={darkMode} profile={activeProfile} openAddTrigger={calAddTrigger} income={totalIncome} expenses={totalExpenses} documents={documents} /></Suspense></div>
              <div style={{ display: activeTab === 'menu' ? 'block' : 'none' }}><Suspense fallback={null}><MenuView activeProfile={activeProfile} onProfileClick={handleProfileClick} onSettingsClick={handleSettingsClick} onSubscriptionClick={handleSubscriptionClick} onAccountantClick={handleAccountantClick} onFiscalClick={handleFiscalClick} onGuidaFiscaleClick={handleGuidaFiscaleClick} onGuiaFiscalESClick={handleGuiaFiscalESClick} onLogout={handleLogout} darkMode={darkMode} /></Suspense></div>
            </>
          )}
        </Suspense>
      </main>

    </div>
    <BottomNav activeTab={(isProfilePage || isSettingsPage || isSubscriptionPage || isAccountantPage || isFiscalPage || isGuidaFiscalePage || isGuiaFiscalESPage) ? 'menu' : isMediaLibraryPage ? 'docs' : activeTab} setActiveTab={handleTabChange} darkMode={darkMode} theme={theme} onPlusPress={handlePlusPress} isNavHidden={isNavHidden} />
    <Suspense fallback={null}>
      <AnimatePresence>
        {swRegistration && (
          <UpdateBanner
            key="update-banner"
            darkMode={darkMode}
            onUpdate={() => {
              swRegistration.waiting?.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }}
            onDismiss={() => {
              dismissedWaiting.current = swRegistration?.waiting ?? null;
              setSwRegistration(null);
            }}
          />
        )}
      </AnimatePresence>
    </Suspense>
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
