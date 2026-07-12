# Piano di trasferimento — servizi terzi e credenziali

Elenco completo dei servizi esterni da cui Solvy dipende operativamente. Nessuna di queste credenziali è presente nel codice sorgente (verificato in Fase 0/1 — zero secret committati); tutte vivono nei rispettivi dashboard o nelle variabili d'ambiente di Vercel/Supabase.

| Servizio | Uso in Solvy | Dove vive la configurazione | Come si trasferisce |
|---|---|---|---|
| **Supabase** | Database Postgres, Auth, Edge Functions, Realtime, Storage. Progetto: `feotobojhzywgylqzkyu` (North EU / Stockholm) | Dashboard Supabase, secret delle edge function nel progetto stesso | Trasferimento progetto a una nuova organizzazione (funzione nativa Supabase: Project Settings → Transfer project), oppure aggiunta dell'acquirente come owner e rimozione accesso founder |
| **Stripe** | Abbonamenti Pro, checkout, customer portal, webhook (`stripe-webhook`) | Chiavi API e webhook secret nei secret delle edge function Supabase; `VITE_STRIPE_PUBLISHABLE_KEY` in Vercel | Stripe supporta il trasferimento ufficiale della proprietà account; in alternativa, l'acquirente crea un proprio account Stripe e si rigenerano le chiavi (richiede poi remap dei prodotti/prezzi esistenti) |
| **A-Cube** | Intermediario per la fatturazione elettronica SdI (Italia) — funzione `sdi-send`/`sdi-webhook` | `ACUBE_EMAIL`/`ACUBE_PASSWORD` nei secret edge function | **Nota**: l'account è attualmente in modalità sandbox (vedi `docs/known-limitations.md`) — non è mai stato attivato un account di produzione. Il trasferimento coincide quindi con il primo onboarding production, da fare direttamente con A-Cube (`support@a-cube.io`) a nome del nuovo proprietario |
| **Loops** | Email transazionali (signup, upgrade, cancellazione) | `LOOPS_API_KEY` nei secret edge function | Trasferimento workspace Loops, oppure nuovo account + re-sync contatti dal DB Supabase |
| **Telegram** (bot `@Solvy_Alerts_Bot`) | Notifiche interne di monitoraggio (nuovo utente, nuovo Pro, errori SdI) — solo per uso della fondatrice, non user-facing | `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` nei secret edge function | **Opzionale**: non è funzionalità di prodotto. L'acquirente può ignorarlo, disattivarlo, o creare un proprio bot con un nuovo token (5 minuti via BotFather) |
| **Vercel** | Hosting, build, deploy, variabili d'ambiente frontend (`VITE_*`) | Progetto Vercel collegato al repository GitHub | Trasferimento progetto a un nuovo team/account Vercel (funzione nativa) |
| **Dominio** (`solvyapp.com`) | Dominio di produzione | Registrar attuale (da confermare con la fondatrice al momento della trattativa) | Transfer-out del dominio verso il registrar dell'acquirente, o cambio DNS verso l'infrastruttura Vercel dell'acquirente |
| **GitHub** | Repository sorgente (`luanamessa96-lgtm/Solvy`) | Account GitHub della fondatrice | Trasferimento repository nativo GitHub (Settings → Transfer ownership), preserva issue/PR/history |

## Google Analytics 4 e Search Console

Non incluse nella tabella sopra perché non sono credenziali infrastrutturali (nessuna API key nel codice) ma accessi ad account Google della fondatrice — categoria diversa, con proprie verifiche manuali richieste prima del closing. Piano di trasferimento dedicato in `docs/analytics-search-console-transfer.md`.

## Cosa NON richiede trasferimento
I 4 dati sensibili in `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, prezzi Stripe) sono chiavi pubblicabili lato client per design — si rigenerano automaticamente non appena Supabase/Stripe vengono trasferiti, non richiedono un passaggio separato.

## Priorità di trasferimento in una trattativa reale
1. GitHub (repo) e Supabase (dati + auth utenti) — sono il cuore dell'asset
2. Vercel + dominio — necessari per mantenere il servizio online senza interruzioni
3. Stripe — critico se si vogliono mantenere gli abbonamenti attivi esistenti, altrimenti rimandabile a dopo il closing
4. Loops, A-Cube, Telegram — possono essere ricollegati anche dopo il closing senza bloccare la continuità del servizio
