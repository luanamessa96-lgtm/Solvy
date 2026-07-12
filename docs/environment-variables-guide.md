# Solvy — Environment Variables Guide

Riferimento delle variabili d'ambiente e dei secret letti dall'applicazione (frontend ed Edge Function).

## Variabili frontend (`.env`, prefisso `VITE_`)

Lette a build-time e incluse nel bundle client (chiavi pubblicabili, non segrete).

| Variabile | Obbligatoria | Scopo | Dove si trova |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Sì | URL del progetto Supabase | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_KEY` | Sì | Chiave anonima Supabase | Supabase Dashboard → Settings → API |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Sì | Chiave pubblica Stripe per il checkout | Stripe Dashboard → Developers → API keys |
| `VITE_STRIPE_PRICE_MONTHLY` | Sì | Price ID del piano Pro mensile | Stripe Dashboard → Products |
| `VITE_STRIPE_PRICE_YEARLY` | Sì | Price ID del piano Pro annuale | Stripe Dashboard → Products |
| `VITE_SENTRY_DSN` | No | Tracciamento errori Sentry | Sentry → Project Settings → Client Keys |
| `VITE_SUPABASE_URL_DEV` | No | Punta l'ambiente locale a un progetto Supabase separato (fallback a `VITE_SUPABASE_URL` se assente) | Supabase Dashboard del progetto di sviluppo |
| `VITE_SUPABASE_KEY_DEV` | No | Chiave anonima del progetto di sviluppo (fallback a `VITE_SUPABASE_KEY` se assente) | Supabase Dashboard del progetto di sviluppo |

## Secret lato server (Supabase Edge Functions Secrets)

Configurati nel dashboard Supabase (Edge Functions → Secrets) o via CLI. Non presenti nel repository, non raggiungono il client.

| Secret | Usato da | Dove si trova |
|---|---|---|
| `SUPABASE_URL` | Tutte le funzioni tranne quelle solo-Telegram/Loops | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Tutte le funzioni che leggono/scrivono su tabelle con privilegi elevati | Supabase Dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | `create-checkout-session`, `cancel-subscription`, `cancel-subscription-end-period`, `send-email` | Supabase Dashboard → Settings → API |
| `SUPABASE_JWT_SECRET` | `delete-account` | Supabase Dashboard → Settings → API |
| `STRIPE_SECRET_KEY` | Tutte le funzioni Stripe (checkout, portale, cancellazioni, webhook) | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | Stripe Dashboard → Developers → Webhooks (dopo la creazione dell'endpoint) |
| `ACUBE_EMAIL` / `ACUBE_PASSWORD` | `sdi-send` | Account A-Cube |
| `ACUBE_SANDBOX` | `sdi-send` | `true`/`false`, impostata manualmente |
| `LOOPS_API_KEY` | `loops-sync` | Loops Dashboard → API Settings |
| `TELEGRAM_BOT_TOKEN` | `sdi-webhook`, `telegram-alert`, `telegram-webhook` | BotFather (Telegram) |
| `TELEGRAM_CHAT_ID` | `sdi-webhook`, `telegram-alert` | ID della chat/canale Telegram di destinazione |

## Variabili di test (`.env.test.example`)

Richieste per la suite end-to-end (`npx playwright test`). Puntano a due account già presenti nel progetto Supabase collegato (uno Pro, uno Free).

| Variabile | Scopo |
|---|---|
| `TEST_PRO_EMAIL` / `TEST_PRO_PASSWORD` | Credenziali account di test Pro |
| `TEST_FREE_EMAIL` / `TEST_FREE_PASSWORD` | Credenziali account di test Free |
