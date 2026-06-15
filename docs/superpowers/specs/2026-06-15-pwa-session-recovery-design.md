# PWA session recovery — design

## Problema

Su iOS, dopo che la PWA è stata in background, la sessione salvata (via
`hybridStorage` in `src/lib/supabase.ts`) può avere un access token scaduto.
Oggi:

1. `getSession()` (App.tsx ~L166) ritorna la sessione "vecchia" e basta che
   esista per impostare `isAuthenticated = true`, senza verificare se il
   token è ancora valido.
2. L'effetto di bootstrap (App.tsx ~L238-358) chiama `getUser()` e poi
   `getProfiles(user.id)`. Se il token è scaduto, la query RLS
   (`auth.uid() = user_id`) può tornare **0 righe senza errore** invece di
   un 401.
3. Con `data = []` e senza il flag `onboardingComplete`, l'app entra nel
   ramo "utente nuovo" (~L332-351): crea un profilo shell (nome dall'email,
   country=Italy, regime=forfettario, nessun documento) e mostra
   l'onboarding.

Risultato per l'utente: sembra che tutti i dati salvati siano spariti,
mentre sul server sono intatti (verificato il 2026-06-15 per l'account
`luanamessa96@gmail.com`: 4 profili completi, tutti Pro, presenti e
corretti — il problema è stato risolto da un semplice re-login).

## Obiettivi

- Se il token è scaduto ma il refresh token è valido, rinnovare la sessione
  in modo trasparente — l'utente non nota nulla.
- Se il refresh fallisce, o se Supabase torna 0 profili per un dispositivo
  che ha già completato l'onboarding in passato, **non mostrare mai
  l'onboarding/profilo shell** — fare logout pulito e mostrare la schermata
  di login con un messaggio rassicurante ("sessione scaduta, i tuoi dati
  sono al sicuro").
- Non cambiare il comportamento per utenti davvero nuovi (nessun profilo,
  nessuna traccia locale di un onboarding precedente).

## Non-goal

- Refresh generale dell'app al rientro dalla background (`visibilitychange`)
  — possibile miglioramento futuro, non incluso qui.
- Modifiche a RLS/migrazioni Supabase — il backend è stato verificato sano,
  il problema è solo client-side.
- Gestione errori di documenti/scadenze oltre a quanto già esiste.

## Design

### 1. `ensureFreshSession()` — nuovo file `src/lib/sessionGuard.ts`

```ts
export async function ensureFreshSession(sb: SupabaseClient): Promise<boolean> {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return false;

  const expiresAt = session.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt - now > 60) return true; // token ancora valido

  const { data, error } = await sb.auth.refreshSession();
  return !error && !!data.session;
}
```

Ritorna `true` se al termine c'è una sessione utilizzabile (valida o
rinnovata con successo), `false` altrimenti.

### 2. `resolveBootstrapState()` — nuovo file `src/lib/profileBootstrap.ts`

Estrae in una funzione pura e testabile la logica che oggi decide cosa
mostrare dopo `getProfiles()`. Aggiunge un nuovo esito `session-expired`
come rete di sicurezza, **solo quando `profiles.length === 0`** (la firma
esatta del bug: query RLS tornata vuota per token non valido). Il caso
"profili presenti ma nessuno completo" mantiene il comportamento attuale
(onboarding shell), per evitare loop infiniti di "sessione scaduta" su
profili con dati realmente incompleti.

```ts
export type BootstrapResult =
  | { kind: 'dashboard'; profiles: Profile[] }
  | { kind: 'existing-incomplete'; profile: Profile }
  | { kind: 'onboarding'; shell: Profile }
  | { kind: 'session-expired' };

export function resolveBootstrapState(params: {
  profiles: Profile[];        // risultato di getProfiles (mai null qui)
  userId: string;
  userName: string;   // già risolto dal chiamante: user.user_metadata?.name || email.split('@')[0] || 'Utente'
  userEmail: string;
  onboardingComplete: boolean; // flag locale esistente
  hasLocalProfileTrace: boolean; // activeProfileId o onboardingComplete in storage
}): BootstrapResult {
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

### 3. Integrazione in `App.tsx` (~L238)

All'inizio dell'effetto di bootstrap, dopo aver ottenuto `sb`:

```ts
const sessionOk = await ensureFreshSession(sb);
if (!sessionOk) {
  await sb.auth.signOut().catch(() => {});
  showToast(t('auth.session_expired_toast'), 'error');
  setIsAuthenticated(false);
  setIsLoading(false);
  return;
}
```

Poi, solo nel ramo `data !== null` (cioè quando `getProfiles` non ha
lanciato), sostituire il blocco `completeProfiles` / if-else attuale con
una chiamata a `resolveBootstrapState` e uno switch sui `kind`. Il ramo
`data === null` (errore di rete, righe 352-356 attuali — "dashboard vuota")
resta invariato e non passa per `resolveBootstrapState`.

- `dashboard` → ramo attuale "utente esistente" (righe 261-318), invariato
- `existing-incomplete` → ramo attuale (righe 321-331), invariato
- `onboarding` → ramo attuale (righe 332-351), invariato (usa lo `shell`
  restituito)
- `session-expired` (NUOVO) →
  ```ts
  await sb.auth.signOut().catch(() => {});
  showToast(t('auth.session_expired_toast'), 'error');
  setIsAuthenticated(false);
  setIsLoading(false);
  return;
  ```

`hasLocalProfileTrace` si calcola così:

```ts
const hasLocalProfileTrace =
  !!localStorage.getItem('activeProfileId') ||
  /activeProfileId=/.test(document.cookie) ||
  !!localStorage.getItem('onboardingComplete') ||
  /onboardingComplete=true/.test(document.cookie);
```

### 4. Messaggio utente

Nuove chiavi i18n in `src/locales/it.json` e `src/locales/es.json`:

- `auth.session_expired_toast`
  - IT: "La sessione è scaduta. Accedi di nuovo — i tuoi dati sono al sicuro."
  - ES: "La sesión ha caducado. Vuelve a iniciar sesión — tus datos están a salvo."

Mostrato via `showToast(t('auth.session_expired_toast'), 'error')` prima
del re-render che porta alla schermata di login.

## Testing (TDD)

- `src/__tests__/sessionGuard.test.ts` — `ensureFreshSession` con client
  Supabase mockato:
  - sessione valida (expires_at lontano) → `true`, `refreshSession` non
    chiamato
  - sessione quasi scaduta + `refreshSession` ok → `true`
  - sessione quasi scaduta + `refreshSession` con errore → `false`
  - nessuna sessione → `false`
- `src/__tests__/profileBootstrap.test.ts` — `resolveBootstrapState`:
  - profili completi → `dashboard`
  - `onboardingComplete=true` + profili presenti ma incompleti →
    `existing-incomplete`
  - 0 profili + `hasLocalProfileTrace=true` → `session-expired`
  - 0 profili + `hasLocalProfileTrace=false` → `onboarding` (utente nuovo,
    comportamento invariato)
  - profili presenti ma nessuno completo + nessun trace → `onboarding`
    (comportamento invariato, niente loop di sessione scaduta)

Nessun nuovo test E2E: la suite Playwright esistente copre login/dashboard
"happy path"; simulare un token scaduto in produzione non è praticabile.
Gap noto, accettato.

## File coinvolti

- Nuovi: `src/lib/sessionGuard.ts`, `src/lib/profileBootstrap.ts`,
  `src/__tests__/sessionGuard.test.ts`,
  `src/__tests__/profileBootstrap.test.ts`
- Modificati: `src/App.tsx` (wiring), `src/locales/it.json`,
  `src/locales/es.json`

## Rollout

- Branch `develop`, push su `develop` + `main` dopo il commit (convenzione
  di progetto).
- Nessuna migrazione DB, nessuna modifica a Supabase.
