# Solvy — Environment Variables Guide

*Questo documento elenca ogni variabile d'ambiente e secret letto dall'applicazione, verificato direttamente nel codice sorgente — non solo quanto dichiarato in `.env.example`. È leggibile da solo. Per chi possiede/come si trasferisce ciascun servizio vedi `credential-transfer-plan.md`; per il dettaglio funzione-per-funzione vedi `supabase/functions/README.md`.*

## Variabili frontend (`.env`, prefisso `VITE_`)

Lette a build-time, incluse nel bundle client — non sono segrete per design (chiavi pubblicabili).

| Variabile | Obbligatoria | Scopo | Dove si trova |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Sì | URL del progetto Supabase | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_KEY` | Sì | Chiave anonima Supabase | Supabase Dashboard → Settings → API |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Sì | Chiave pubblica Stripe per il checkout | Stripe Dashboard → Developers → API keys |
| `VITE_STRIPE_PRICE_MONTHLY` | Sì | Price ID del piano Pro mensile | Stripe Dashboard → Products |
| `VITE_STRIPE_PRICE_YEARLY` | Sì | Price ID del piano Pro annuale | Stripe Dashboard → Products |
| `VITE_SENTRY_DSN` | No | Attiva il tracciamento errori Sentry — l'app funziona normalmente se assente | Sentry → Project Settings → Client Keys |
| `VITE_SUPABASE_URL_DEV` | No | Punta l'ambiente locale a un progetto Supabase separato invece che a produzione (fallback automatico a `VITE_SUPABASE_URL` se assente) | Supabase Dashboard del progetto di sviluppo |
| `VITE_SUPABASE_KEY_DEV` | No | Come sopra, per la chiave | Supabase Dashboard del progetto di sviluppo |

## Secret lato server (Supabase Edge Functions Secrets)

Non presenti in nessun file del repository — configurati esclusivamente nel dashboard Supabase (Edge Functions → Secrets) o via CLI. Non raggiungono mai il client.

| Secret | Usato da | Dove si trova |
|---|---|---|
| `SUPABASE_URL` | Tutte le funzioni tranne quelle solo-Telegram/Loops | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Tutte le funzioni che leggono/scrivono su tabelle con privilegi elevati | Supabase Dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | `create-checkout-session`, `cancel-subscription`, `cancel-subscription-end-period`, `send-email` | Supabase Dashboard → Settings → API |
| `SUPABASE_JWT_SECRET` | `delete-account` | Supabase Dashboard → Settings → API |
| `STRIPE_SECRET_KEY` | Tutte le funzioni Stripe (checkout, portale, cancellazioni, webhook) | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | Stripe Dashboard → Developers → Webhooks (dopo aver creato l'endpoint) |
| `ACUBE_EMAIL` / `ACUBE_PASSWORD` | `sdi-send` | Account A-Cube (vedi stato sandbox in `known-limitations.md`) |
| `ACUBE_SANDBOX` | `sdi-send` | `true`/`false` — impostata manualmente, non generata da A-Cube |
| `LOOPS_API_KEY` | `loops-sync` | Loops Dashboard → API Settings |
| `TELEGRAM_BOT_TOKEN` | `sdi-webhook`, `telegram-alert`, `telegram-webhook` | BotFather (Telegram) — vedi nota su carattere opzionale in `credential-transfer-plan.md` |
| `TELEGRAM_CHAT_ID` | `sdi-webhook`, `telegram-alert` | ID della chat/canale Telegram di destinazione |

## Variabili di test (`.env.test.example`)

Solo per chi esegue la suite end-to-end (`npx playwright test`): credenziali di due account di test già esistenti (uno Pro, uno Free) — `TEST_PRO_EMAIL`, `TEST_PRO_PASSWORD`, `TEST_FREE_EMAIL`, `TEST_FREE_PASSWORD`. Non generano nulla di nuovo, puntano ad account già presenti nel progetto Supabase collegato.

## Nota su verifica e allineamento

Questo elenco è stato ottenuto cercando ogni occorrenza di lettura di variabili d'ambiente nel codice sorgente (frontend e Edge Function), non copiato da `.env.example`. Il file `.env.example` è stato aggiornato in questa stessa fase per includere le tre variabili opzionali (`VITE_SENTRY_DSN`, `VITE_SUPABASE_URL_DEV`, `VITE_SUPABASE_KEY_DEV`) che risultavano lette dal codice ma non ancora documentate — i due file sono ora coerenti.
