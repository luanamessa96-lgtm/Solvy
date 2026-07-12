# Solvy — Deployment Guide

*Questo documento è una sequenza operativa per portare Solvy online da zero, su infrastruttura nuova. È leggibile da solo, ma è pensato per essere seguito passo-passo, non solo letto. Per l'elenco completo delle variabili richieste in ogni passaggio vedi `environment-variables-guide.md`; per il dettaglio di ogni Edge Function vedi `supabase/functions/README.md`; per chi possiede/come si eredita l'infrastruttura esistente vedi `credential-transfer-plan.md`.*

## Nota di scope

Questa guida presume che si stia impostando un'infrastruttura nuova (nuovo progetto Supabase, nuovo account Stripe, ecc.). Se invece l'infrastruttura esistente viene trasferita come parte dell'acquisizione, gran parte di questi passaggi sono già fatti — in quel caso questo documento serve solo per capire cosa esiste e verificarlo, non per ricrearlo.

## Prerequisiti

Account necessari prima di iniziare: **Supabase**, **Vercel**, **Stripe** (obbligatori per una versione funzionante). **A-Cube**, **Loops**, **Telegram** sono opzionali e possono essere collegati in un secondo momento (sezione 10).

## Passo 1 — Database

1. Crea un nuovo progetto su Supabase.
2. Apri l'SQL Editor del progetto ed esegui per intero `supabase/schema_production.sql` — è un dump autentico e aggiornato, ricrea schema, tabelle, RLS e permessi in un solo passaggio. Non è necessario rigiocare le migration storiche in `supabase/migrations/` (motivo spiegato in `supabase/migrations/README.md`).

## Passo 2 — Storage

Nel dashboard Supabase: **Storage → New bucket** → nome `uploads` → visibilità **Public**. Usato per PDF e immagini allegate a fatture/spese.

## Passo 3 — Edge Functions

1. Configura i secret in **Edge Functions → Secrets** (o via CLI `supabase secrets set`) — l'elenco completo, variabile per variabile, è in `environment-variables-guide.md`.
2. Fai il deploy delle 12 funzioni in `supabase/functions/`.
3. **Attenzione**: il deploy di `stripe-webhook` richiede sempre il flag `--no-verify-jwt` (`supabase functions deploy stripe-webhook --no-verify-jwt`). Senza questo flag, Supabase reintroduce il controllo JWT di default e Stripe riceve 401 su ogni evento — un problema già verificatosi due volte in produzione (dettaglio in `supabase/functions/README.md`).

## Passo 4 — Stripe

1. Crea i due prodotti/prezzi dell'abbonamento Pro (mensile, annuale) nel dashboard Stripe — i Price ID vanno nelle variabili frontend (`VITE_STRIPE_PRICE_MONTHLY`/`YEARLY`).
2. Crea un endpoint webhook puntato all'URL della funzione `stripe-webhook`, seleziona gli eventi di abbonamento rilevanti (creazione, rinnovo, cancellazione).
3. Copia il signing secret generato in `STRIPE_WEBHOOK_SECRET` (Passo 3).

## Passo 5 — Frontend (Vercel)

1. Collega il repository GitHub a un nuovo progetto Vercel.
2. Imposta le variabili `VITE_*` richieste (elenco in `environment-variables-guide.md`).
3. Deploy. `vercel.json` gestisce già il routing multi-pagina (landing/app) e gli header di sicurezza — nessuna configurazione aggiuntiva necessaria.

## Passo 6 — Dominio (opzionale)

Se si vuole un dominio personalizzato invece del dominio Vercel di default: **Project Settings → Domains** su Vercel, poi aggiornare i record DNS presso il registrar secondo le istruzioni mostrate.

## Passo 7 — Verifica finale

Checklist minima prima di considerare il deploy completo:
- Registrazione e login funzionano
- Creazione di un profilo fiscale (IT o ES) va a buon fine
- Creazione di una fattura/spesa e i calcoli fiscali si aggiornano correttamente
- Il checkout Stripe (in modalità test) reindirizza correttamente e aggiorna lo stato Pro dopo il pagamento

## Integrazioni opzionali

- **A-Cube** (fatturazione elettronica IT): richiede account e credenziali proprie. Lo stato dell'account usato in produzione è sandbox, non production — dettaglio in `known-limitations.md`. Non blocca il resto del prodotto se non configurato.
- **Loops** (email transazionali): richiede solo `LOOPS_API_KEY`.
- **Telegram** (monitoraggio interno, non user-facing): opzionale, ignorabile senza impatto sul prodotto.

## Tempo stimato di deploy

Ordine di grandezza, non una promessa — dipende da familiarità con Supabase/Vercel e velocità di risposta dei fornitori terzi (es. verifica account Stripe):

- **Infrastruttura minima** (Supabase + Vercel, senza pagamenti funzionanti): ~30–60 minuti
- **Con Stripe configurato** (abbonamenti funzionanti): ~1–2 ore
- **Con tutte le integrazioni** (A-Cube, Loops, Telegram): ~2–4 ore
