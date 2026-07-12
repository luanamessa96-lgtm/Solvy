# Solvy — Deployment Guide

Procedura di deployment su infrastruttura nuova (nuovo progetto Supabase, account Vercel e Stripe dedicati).

Se l'infrastruttura esistente viene trasferita nell'ambito dell'operazione, i passi seguenti risultano già completati; il documento vale allora come riferimento di verifica (vedi `credential-transfer-plan.md`).

Elenco completo delle variabili citate: `environment-variables-guide.md`. Dettaglio delle Edge Function: `supabase/functions/README.md`.

## Prerequisiti

- Account: **Supabase**, **Vercel**, **Stripe** (necessari per una versione funzionante).
- Account opzionali, collegabili in seguito: **A-Cube**, **Loops**, **Telegram** (vedi "Integrazioni opzionali").
- **Supabase CLI** autenticata e collegata al progetto, per il deploy delle Edge Function.
- Accesso al repository GitHub del progetto.

## 1 — Database

1. Creare un nuovo progetto Supabase.
2. Nell'SQL Editor, eseguire per intero `supabase/schema_production.sql`: ricrea schema, tabelle, RLS e permessi in un unico passaggio.
3. Non rigiocare le migration storiche in `supabase/migrations/` (vedi `supabase/migrations/README.md`).

## 2 — Storage

1. **Storage → New bucket** → nome `uploads`, visibilità **Public**.

Utilizzato per PDF e immagini allegate a fatture/spese.

## 3 — Edge Functions

1. Configurare i secret in **Edge Functions → Secrets** (o `supabase secrets set`). Elenco completo in `environment-variables-guide.md`.
2. Deployare le 12 funzioni in `supabase/functions/`.
3. Deployare `stripe-webhook` con il flag `--no-verify-jwt`:
   ```
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
   Senza il flag, Supabase applica il controllo JWT di default e le richieste Stripe ricevono `401` prima dell'esecuzione della funzione. Il flag va ripetuto a ogni redeploy della funzione (vedi `supabase/functions/README.md` e `operations-manual.md`).

Nota: `STRIPE_WEBHOOK_SECRET` è generato al passo 4.2 e va inserito tra i secret dopo la creazione dell'endpoint webhook.

## 4 — Stripe

1. Creare i due prezzi dell'abbonamento Pro (mensile, annuale). I Price ID vanno nelle variabili frontend `VITE_STRIPE_PRICE_MONTHLY` / `VITE_STRIPE_PRICE_YEARLY`.
2. Creare un endpoint webhook puntato all'URL della funzione `stripe-webhook`, selezionando gli eventi di abbonamento (creazione, rinnovo, cancellazione).
3. Copiare il signing secret dell'endpoint in `STRIPE_WEBHOOK_SECRET` (passo 3.1).

## 5 — Frontend (Vercel)

1. Collegare il repository GitHub a un nuovo progetto Vercel.
2. Impostare le variabili `VITE_*` (elenco in `environment-variables-guide.md`).
3. Avviare il deploy. Il routing multi-pagina (landing/app) e gli header di sicurezza sono definiti in `vercel.json`.

## 6 — Dominio (opzionale)

1. **Project Settings → Domains** su Vercel.
2. Aggiornare i record DNS presso il registrar secondo le istruzioni mostrate.

## 7 — Verifica

- Registrazione e login.
- Creazione di un profilo fiscale (IT o ES).
- Creazione di una fattura/spesa con aggiornamento dei calcoli fiscali.
- Checkout Stripe in modalità test: redirect corretto e passaggio a stato Pro dopo il pagamento.

## Integrazioni opzionali

- **A-Cube** (fatturazione elettronica IT): richiede account e credenziali dedicati. Stato dell'account attuale: sandbox (vedi `known-limitations.md`). Non blocca il resto del prodotto se non configurato.
- **Loops** (email transazionali): richiede `LOOPS_API_KEY`.
- **Telegram** (monitoraggio interno, non user-facing): non incide sul funzionamento del prodotto.
