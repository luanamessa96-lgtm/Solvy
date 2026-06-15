# PWA Session Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the bootstrap effect in `App.tsx` from mistaking a stale iOS-PWA session for a brand-new user. A stale/expiring access token must be refreshed transparently, or — if refresh fails or the backend returns zero profiles for a device that has already onboarded — the app must sign the user out with a reassuring "session expired, your data is safe" toast, instead of showing the onboarding shell (which looks like data loss).

**Architecture:** Two new pure, unit-tested modules:
- `src/lib/sessionGuard.ts` — `ensureFreshSession(sb)` checks/refreshes the Supabase session token before any profile fetch.
- `src/lib/profileBootstrap.ts` — `resolveBootstrapState(params)` is a pure function that replaces the inline `completeProfiles` / if-else logic in `App.tsx`'s bootstrap effect, adding a new `session-expired` outcome.

`App.tsx`'s bootstrap effect (`~L238-358`) is restructured to call both, in order, and switch on `resolveBootstrapState`'s `kind`. The three existing outcomes (`dashboard`, `existing-incomplete`, `onboarding`) keep their exact current behavior; `session-expired` is new and triggers sign-out + toast.

**Tech Stack:** React 18 + TypeScript + Vite, Supabase JS v2, Vitest 4 (`npm test`), `tsc --noEmit` (`npm run lint`), react-i18next.

Reference spec: `docs/superpowers/specs/2026-06-15-pwa-session-recovery-design.md`

---

### Task 1: `ensureFreshSession` session guard

**Files:**
- Create: `src/lib/sessionGuard.ts`
- Test: `src/__tests__/sessionGuard.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/sessionGuard.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { ensureFreshSession, SessionAuthClient } from '../lib/sessionGuard';

function makeClient(overrides: Partial<SessionAuthClient['auth']> = {}): SessionAuthClient {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: null }, error: { message: 'not implemented' } }),
      ...overrides,
    },
  };
}

describe('ensureFreshSession', () => {
  it('returns true when the session is still valid for more than 60s', async () => {
    const now = Math.floor(Date.now() / 1000);
    const sb = makeClient({
      getSession: vi.fn().mockResolvedValue({ data: { session: { expires_at: now + 3600 } } }),
    });

    expect(await ensureFreshSession(sb)).toBe(true);
    expect(sb.auth.refreshSession).not.toHaveBeenCalled();
  });

  it('refreshes and returns true when the session is about to expire and refresh succeeds', async () => {
    const now = Math.floor(Date.now() / 1000);
    const sb = makeClient({
      getSession: vi.fn().mockResolvedValue({ data: { session: { expires_at: now + 10 } } }),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: { expires_at: now + 3600 } }, error: null }),
    });

    expect(await ensureFreshSession(sb)).toBe(true);
    expect(sb.auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('returns false when the session is about to expire and refresh fails', async () => {
    const now = Math.floor(Date.now() / 1000);
    const sb = makeClient({
      getSession: vi.fn().mockResolvedValue({ data: { session: { expires_at: now - 10 } } }),
      refreshSession: vi.fn().mockResolvedValue({ data: { session: null }, error: { message: 'invalid refresh token' } }),
    });

    expect(await ensureFreshSession(sb)).toBe(false);
  });

  it('returns false when there is no local session at all', async () => {
    const sb = makeClient({
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    });

    expect(await ensureFreshSession(sb)).toBe(false);
    expect(sb.auth.refreshSession).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/sessionGuard.test.ts`
Expected: FAIL — `Cannot find module '../lib/sessionGuard'` (file does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/sessionGuard.ts`:

```ts
export interface SessionAuthClient {
  auth: {
    getSession: () => Promise<{ data: { session: { expires_at?: number } | null } }>;
    refreshSession: () => Promise<{ data: { session: unknown | null }; error: { message: string } | null }>;
  };
}

export async function ensureFreshSession(sb: SessionAuthClient): Promise<boolean> {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return false;

  const expiresAt = session.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt - now > 60) return true;

  const { data, error } = await sb.auth.refreshSession();
  return !error && !!data.session;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/sessionGuard.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit and push**

```bash
git add src/lib/sessionGuard.ts src/__tests__/sessionGuard.test.ts
git commit -m "feat(auth): add ensureFreshSession to refresh stale PWA sessions"
git push origin develop
git push origin develop:main
```

---

### Task 2: `resolveBootstrapState` profile bootstrap logic

**Files:**
- Create: `src/lib/profileBootstrap.ts`
- Test: `src/__tests__/profileBootstrap.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/profileBootstrap.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveBootstrapState } from '../lib/profileBootstrap';
import { Profile } from '../types';

const USER_ID = 'user-123';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-abc',
    name: 'Mario Rossi',
    email: 'mario@example.com',
    country: 'Italy',
    currency: 'EUR',
    jobType: 'Consulente',
    regime: 'forfettario',
    ...overrides,
  };
}

describe('resolveBootstrapState', () => {
  it('returns dashboard when at least one profile is complete', () => {
    const profile = makeProfile();
    const result = resolveBootstrapState({
      profiles: [profile],
      userId: USER_ID,
      userName: 'Mario',
      userEmail: 'mario@example.com',
      onboardingComplete: true,
      hasLocalProfileTrace: true,
    });

    expect(result).toEqual({ kind: 'dashboard', profiles: [profile] });
  });

  it('returns existing-incomplete when onboarding is done but no profile passes the filter', () => {
    const incomplete = makeProfile({ id: USER_ID, jobType: '', name: '' });
    const result = resolveBootstrapState({
      profiles: [incomplete],
      userId: USER_ID,
      userName: 'Mario',
      userEmail: 'mario@example.com',
      onboardingComplete: true,
      hasLocalProfileTrace: true,
    });

    expect(result).toEqual({ kind: 'existing-incomplete', profile: incomplete });
  });

  it('returns session-expired when 0 profiles come back but the device has used the app before', () => {
    const result = resolveBootstrapState({
      profiles: [],
      userId: USER_ID,
      userName: 'Mario',
      userEmail: 'mario@example.com',
      onboardingComplete: false,
      hasLocalProfileTrace: true,
    });

    expect(result).toEqual({ kind: 'session-expired' });
  });

  it('returns onboarding for a genuinely new user (0 profiles, no local trace)', () => {
    const result = resolveBootstrapState({
      profiles: [],
      userId: USER_ID,
      userName: 'Mario',
      userEmail: 'mario@example.com',
      onboardingComplete: false,
      hasLocalProfileTrace: false,
    });

    expect(result).toEqual({
      kind: 'onboarding',
      shell: {
        id: USER_ID,
        name: 'Mario',
        email: 'mario@example.com',
        jobType: '',
        country: 'Italy',
        currency: 'EUR',
        regime: 'forfettario',
      },
    });
  });

  it('returns onboarding (not session-expired) when profiles exist but none are complete and there is no local trace', () => {
    const incomplete = makeProfile({ id: 'other-profile', jobType: '', name: '' });
    const result = resolveBootstrapState({
      profiles: [incomplete],
      userId: USER_ID,
      userName: 'Mario',
      userEmail: 'mario@example.com',
      onboardingComplete: false,
      hasLocalProfileTrace: false,
    });

    expect(result).toEqual({
      kind: 'onboarding',
      shell: {
        id: 'other-profile',
        name: 'Mario',
        email: 'mario@example.com',
        jobType: '',
        country: 'Italy',
        currency: 'EUR',
        regime: 'forfettario',
      },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/profileBootstrap.test.ts`
Expected: FAIL — `Cannot find module '../lib/profileBootstrap'` (file does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/profileBootstrap.ts`:

```ts
import { Profile } from '../types';

export type BootstrapResult =
  | { kind: 'dashboard'; profiles: Profile[] }
  | { kind: 'existing-incomplete'; profile: Profile }
  | { kind: 'onboarding'; shell: Profile }
  | { kind: 'session-expired' };

export interface ResolveBootstrapParams {
  profiles: Profile[];
  userId: string;
  userName: string;
  userEmail: string;
  onboardingComplete: boolean;
  hasLocalProfileTrace: boolean;
}

export function resolveBootstrapState(params: ResolveBootstrapParams): BootstrapResult {
  const { profiles, userId, userName, userEmail, onboardingComplete, hasLocalProfileTrace } = params;

  const completeProfiles = profiles.filter(p =>
    p.id === userId ? !!p.jobType : !!p.name
  );

  if (completeProfiles.length > 0) {
    return { kind: 'dashboard', profiles: completeProfiles };
  }

  if (onboardingComplete && profiles.length > 0) {
    return { kind: 'existing-incomplete', profile: profiles[0] };
  }

  if (profiles.length === 0 && hasLocalProfileTrace) {
    return { kind: 'session-expired' };
  }

  const triggerProfileId = profiles.length > 0 ? profiles[0].id : userId;
  return {
    kind: 'onboarding',
    shell: {
      id: triggerProfileId,
      name: userName,
      email: userEmail,
      jobType: '',
      country: 'Italy',
      currency: 'EUR',
      regime: 'forfettario',
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/profileBootstrap.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit and push**

```bash
git add src/lib/profileBootstrap.ts src/__tests__/profileBootstrap.test.ts
git commit -m "feat(auth): add resolveBootstrapState for profile bootstrap decisions"
git push origin develop
git push origin develop:main
```

---

### Task 3: i18n key for the session-expired toast

**Files:**
- Modify: `src/locales/it.json` (inside the `auth` object, currently starting at line 306)
- Modify: `src/locales/es.json` (inside the `auth` object, currently starting at line 300)

- [ ] **Step 1: Add the IT string**

In `src/locales/it.json`, the `auth` object starts with:

```json
  "auth": {
    "login_title": "Bentornato",
    "login_subtitle": "Accedi al tuo account",
```

Add a new key right after `"login_title"`:

```json
  "auth": {
    "login_title": "Bentornato",
    "session_expired_toast": "La sessione è scaduta. Accedi di nuovo — i tuoi dati sono al sicuro.",
    "login_subtitle": "Accedi al tuo account",
```

- [ ] **Step 2: Add the ES string**

In `src/locales/es.json`, the `auth` object starts with:

```json
  "auth": {
    "login_title": "Bienvenido de nuevo",
    "login_subtitle": "Accede a tu cuenta",
```

Add a new key right after `"login_title"`:

```json
  "auth": {
    "login_title": "Bienvenido de nuevo",
    "session_expired_toast": "La sesión ha caducado. Vuelve a iniciar sesión — tus datos están a salvo.",
    "login_subtitle": "Accede a tu cuenta",
```

- [ ] **Step 3: Verify both files are still valid JSON**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('src/locales/it.json','utf8')); JSON.parse(require('fs').readFileSync('src/locales/es.json','utf8')); console.log('ok')"
```

Expected: prints `ok` (no `SyntaxError`).

- [ ] **Step 4: Commit and push**

```bash
git add src/locales/it.json src/locales/es.json
git commit -m "i18n: add auth.session_expired_toast (IT/ES)"
git push origin develop
git push origin develop:main
```

---

### Task 4: Wire `ensureFreshSession` + `resolveBootstrapState` into `App.tsx`

**Files:**
- Modify: `src/App.tsx:11-22` (imports)
- Modify: `src/App.tsx:238-358` (bootstrap effect)

- [ ] **Step 1: Add the new imports**

In `src/App.tsx`, the import block currently reads (lines 11-22):

```ts
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
import InstallGateScreen from './components/InstallGateScreen';
import { isConfirmedRoute, needsInstall, detectBrowserContext } from './lib/installGate';
```

Add two new imports after the `installGate` import:

```ts
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
import InstallGateScreen from './components/InstallGateScreen';
import { isConfirmedRoute, needsInstall, detectBrowserContext } from './lib/installGate';
import { ensureFreshSession } from './lib/sessionGuard';
import { resolveBootstrapState } from './lib/profileBootstrap';
```

- [ ] **Step 2: Replace the bootstrap effect**

In `src/App.tsx`, the bootstrap effect currently reads (lines 238-358):

```tsx
  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setDocuments([]);
    setProfiles([]);
    setDeadlines([]);
    getClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        // Sessione in localStorage ma utente eliminato dal DB — forza logout
        await getClient().auth.signOut().catch(() => {});
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
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
        const alreadyCompleted = !!localStorage.getItem('onboardingComplete') || /onboardingComplete=true/.test(document.cookie);
        if (alreadyCompleted && data.length > 0) {
          // Utente che ha già completato l'onboarding ma il profilo non supera il filtro jobType.
          // Non mandare mai un utente già onboardato all'inizio — usa il profilo com'è.
          const existingProfile = data[0];
          setProfiles([existingProfile]);
          setActiveProfile(existingProfile);
          setLanguageByCountry(existingProfile.country);
          setDocuments([]);
          setDeadlines([]);
          setShowOnboarding(false);
          setIsLoading(false);
        } else {
          // Nuovo utente: trigger ha creato profilo con country=NULL (o trigger fallito).
          const triggerProfileId = data.length > 0 ? data[0].id : user.id;
          const shell: Profile = {
            id: triggerProfileId,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Utente',
            email: user.email || '',
            jobType: '',
            country: 'Italy' as Profile['country'],
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
        }
      } else {
        // Errore di rete: mostra dashboard vuota
        setShowOnboarding(false);
        setIsLoading(false);
      }
    });
  }, [isAuthenticated]);
```

Replace it with:

```tsx
  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setDocuments([]);
    setProfiles([]);
    setDeadlines([]);
    const sb = getClient();
    (async () => {
      const sessionOk = await ensureFreshSession(sb);
      if (!sessionOk) {
        // Token scaduto e refresh fallito (es. PWA iOS rimasta a lungo in background)
        await sb.auth.signOut().catch(() => {});
        showToast(t('auth.session_expired_toast'), 'error');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        // Sessione in localStorage ma utente eliminato dal DB — forza logout
        await sb.auth.signOut().catch(() => {});
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      setUserId(user.id);
      const data = await getProfiles(user.id, user.email ?? undefined).catch(() => null);

      if (data === null) {
        // Errore di rete: mostra dashboard vuota
        setShowOnboarding(false);
        setIsLoading(false);
        return;
      }

      const onboardingComplete = !!localStorage.getItem('onboardingComplete') || /onboardingComplete=true/.test(document.cookie);
      const hasLocalProfileTrace = onboardingComplete
        || !!localStorage.getItem('activeProfileId')
        || /activeProfileId=/.test(document.cookie);

      const bootstrap = resolveBootstrapState({
        profiles: data,
        userId: user.id,
        userName: user.user_metadata?.name || user.email?.split('@')[0] || 'Utente',
        userEmail: user.email || '',
        onboardingComplete,
        hasLocalProfileTrace,
      });

      if (bootstrap.kind === 'session-expired') {
        // 0 profili da RLS ma il dispositivo aveva già completato l'onboarding → token non valido, non "utente nuovo"
        await sb.auth.signOut().catch(() => {});
        showToast(t('auth.session_expired_toast'), 'error');
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      if (bootstrap.kind === 'dashboard') {
        const completeProfiles = bootstrap.profiles;
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
        return;
      }

      if (bootstrap.kind === 'existing-incomplete') {
        // Utente che ha già completato l'onboarding ma il profilo non supera il filtro jobType.
        // Non mandare mai un utente già onboardato all'inizio — usa il profilo com'è.
        const existingProfile = bootstrap.profile;
        setProfiles([existingProfile]);
        setActiveProfile(existingProfile);
        setLanguageByCountry(existingProfile.country);
        setDocuments([]);
        setDeadlines([]);
        setShowOnboarding(false);
        setIsLoading(false);
        return;
      }

      // bootstrap.kind === 'onboarding' — nuovo utente: trigger ha creato profilo con country=NULL (o trigger fallito)
      const shell = bootstrap.shell;
      setProfiles([shell]);
      setActiveProfile(shell);
      setDocuments([]);
      setDeadlines([]);
      localStorage.removeItem('onboardingComplete');
      setShowOnboarding(true);
      setIsLoading(false);
    })();
  }, [isAuthenticated]);
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: no TypeScript errors (exit code 0).

- [ ] **Step 4: Run the full unit test suite**

Run: `npm test`
Expected: all existing tests plus the new `sessionGuard.test.ts` and `profileBootstrap.test.ts` PASS.

- [ ] **Step 5: Manual smoke test**

```bash
npm run dev
```

Open the app in a browser, log in with a test account (e.g. `TEST_PRO_EMAIL` from `.env.test`), and confirm:
- The dashboard loads normally with the existing profiles (no onboarding shell, no "session expired" toast on a fresh, valid login).
- No new console errors appear during the bootstrap flow.

Stop the dev server afterwards.

- [ ] **Step 6: Commit and push**

```bash
git add src/App.tsx
git commit -m "fix(App): use ensureFreshSession + resolveBootstrapState to avoid phantom onboarding on stale PWA session"
git push origin develop
git push origin develop:main
```

---

## Self-review notes

- **Spec coverage**: `ensureFreshSession` (Task 1), `resolveBootstrapState` with `session-expired` restricted to `profiles.length === 0 && hasLocalProfileTrace` (Task 2), i18n strings for both locales (Task 3), `App.tsx` wiring preserving the three existing branches verbatim and adding the pre-check + new branch (Task 4) — all spec sections covered. The `data === null` network-error branch is left untouched, as required.
- **Placeholders**: none — every step has complete code, exact file paths, and exact commands.
- **Type consistency**: `BootstrapResult['kind']` values (`dashboard`, `existing-incomplete`, `onboarding`, `session-expired`) are identical across `profileBootstrap.ts` (Task 2) and the `App.tsx` switch (Task 4). `SessionAuthClient` (Task 1) matches the shape of `getClient()`'s `.auth` (`getSession`/`refreshSession`), which is a structural subtype of the real Supabase client — `sb` from `getClient()` satisfies it without casts.
