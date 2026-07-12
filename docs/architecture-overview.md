# Solvy — Architecture Overview

*Questo documento descrive come è costruito Solvy dal punto di vista tecnico, per un CTO o un team di sviluppo che deve valutare se e come prenderlo in carico. È leggibile da solo, senza aprire il codice. Per il contesto di prodotto vedi `executive-overview.md`; per la sicurezza vedi `security-overview.md`; per il dettaglio di ogni funzione serverless vedi `supabase/functions/README.md`; per il DDL esatto del database vedi `supabase/schema_production.sql`.*

## 1. Diagramma d'insieme

```
┌────────────────────────────────────────────┐
│           CLIENT (browser / PWA)            │
│   React 19 SPA — installabile, mobile-first │
└────────────────────┬─────────────────────────┘
                      │ supabase-js (HTTPS + WebSocket)
                      ▼
┌──────────────────────────────────────────────┐
│                   SUPABASE                     │
│  Postgres + RLS │ Auth │ Realtime │ Storage    │
│  ────────────────────────────────────────────  │
│              12 Edge Functions (Deno)          │
└──────┬───────────┬───────────┬────────────┬───┘
       │            │            │            │
       ▼            ▼            ▼            ▼
   ┌───────┐    ┌────────┐   ┌───────┐   ┌──────────┐
   │Stripe │    │ A-Cube │   │ Loops │   │ Telegram │
   │pagam. │    │SdI (IT)│   │ email │   │alert int.│
   └───────┘    └────────┘   └───────┘   └──────────┘
```

Hosting statico e build: **Vercel**. Nessun server applicativo proprio — tutta la logica server-side vive nelle Edge Function di Supabase.

## 2. Pattern modulo-paese

Ogni calcolo fiscale passa attraverso `getCountryModule(country)`, che restituisce il modulo `it` o `es`. Entrambi implementano la stessa interfaccia (`CountryModule`, definita in `types.ts`) — stesso contratto, logica di calcolo completamente diversa dentro.

**Perché conta per chi valuta l'acquisizione**: aggiungere un nuovo paese fiscale non richiede toccare dashboard, form, export PDF o calendario — richiede scrivere un nuovo file che implementa l'interfaccia esistente. È il meccanismo che rende Solvy estendibile ad altri mercati senza riscrivere l'applicazione, ed è probabilmente l'asset architetturale di maggior valore per un acquirente che vuole espandere l'offerta oltre IT/ES.

## 3. Architettura frontend

Il dominio `solvyapp.com` serve due cose distinte tramite rewrite a livello Vercel: una landing page marketing statica (`index.html`) e l'applicazione vera e propria (`app.html`) — sono build separate, non la stessa SPA con routing interno.

Dentro `app.html`, Solvy è una **single-page application senza router**: un unico componente (`App.tsx`) tiene lo stato applicativo e mostra una delle viste in base al contesto (utente loggato, profilo selezionato, azione in corso). Non è un'omissione — è una scelta coerente con un'app mobile-first dove la navigazione è quasi sempre lineare (login → profilo → dashboard) e non servono URL profondi per la maggior parte dei flussi.

Struttura concettuale delle cartelle sotto `src/`:
- `views/` — le schermate principali (dashboard, fatture, calendario, ecc.)
- `components/` — elementi riutilizzabili, in maggioranza modali (azioni come creare una fattura, modificare un profilo)
- `lib/` — logica di dominio, incluso il pattern modulo-paese (sezione 2) e l'i18n (sezione 8)
- `hooks/`, `services/`, `data/` — supporto: hook React condivisi, chiamate a Supabase, costanti/dati statici (es. codici ATECO)

## 4. Flusso dati e calcoli fiscali

Il profilo dell'utente (paese, regime, codice ATECO) viene caricato da Supabase al login e passato come prop ai componenti. Tutti i calcoli fiscali sono **funzioni pure**: stesso input, stesso output, nessuna chiamata di rete o effetto collaterale dentro la funzione di calcolo stessa. Questo è ciò che rende possibile testare la logica fiscale in isolamento (sezione 9) senza dover simulare un intero ambiente applicativo.

## 5. Backend Supabase

Supabase fornisce quattro servizi, tutti usati attivamente:
- **Postgres** con Row Level Security abilitata su ogni tabella (dettaglio delle policy in `security-overview.md`)
- **Auth** — gestione utenti e sessioni
- **Realtime** — sincronizzazione live su `profiles`, `documents`, `deadlines` (utile per lo stato multi-dispositivo)
- **Storage** — un bucket pubblico (`uploads`) per PDF e immagini allegate a fatture/spese

Le **12 Edge Function** (Deno, TypeScript) sono l'unico punto in cui gira logica server-side. Sono raggruppabili per area:

| Area | Funzioni |
|---|---|
| Abbonamento (Stripe) | `create-checkout-session`, `create-customer-portal-session`, `cancel-subscription`, `cancel-subscription-end-period`, `stripe-webhook` |
| Fatturazione elettronica IT | `sdi-send`, `sdi-webhook` |
| Comunicazioni | `send-email`, `loops-sync`, `telegram-alert`, `telegram-webhook` |
| Account | `delete-account` |

Il dettaglio di ciascuna (trigger, tabelle toccate, secret richiesti) è in `supabase/functions/README.md` — qui conta solo la mappa: **nessuna logica di pagamento, fatturazione o invio email gira mai lato client**, il frontend chiama sempre una di queste funzioni. Questo mantiene il client privo di logica sensibile e concentra le integrazioni esterne e le operazioni privilegiate in un unico livello applicativo.

## 6. Schema dati

Quattro tabelle in totale:

- **`profiles`** — un profilo fiscale per utente (un utente può averne più di uno: es. un profilo IT e uno ES). Contiene paese, regime, dati identificativi, stato abbonamento.
- **`documents`** — fatture e spese, collegate a un profilo (`profile_id`). Include i campi per lo stato di invio SdI (`sdi_status`, `sdi_id`).
- **`deadlines`** — scadenze fiscali, collegate a un profilo.
- **`accountant`** — contatto del commercialista/gestor associato a un profilo.

Ogni tabella è scoping-isolata per utente: l'accesso passa sempre da `profiles.user_id = auth.uid()`, direttamente su `profiles` o tramite join per le tabelle collegate. Il DDL esatto, verificato contro il database di produzione, è in `supabase/schema_production.sql`.

## 7. Integrazioni esterne

- **Stripe** — il frontend crea una sessione di Checkout tramite `create-checkout-session` e reindirizza l'utente al checkout ospitato da Stripe. Gli eventi post-pagamento (attivazione, rinnovo, cancellazione) arrivano a `stripe-webhook`, che verifica la firma della richiesta prima di aggiornare `profiles`.
- **A-Cube** — intermediario per la fatturazione elettronica italiana. `sdi-send` invia la fattura, A-Cube la inoltra al Sistema di Interscambio; `sdi-webhook` riceve lo stato di consegna/scarto e aggiorna `documents`.
- **Loops** — `loops-sync` sincronizza contatti ed eventi (signup, upgrade, cancellazione) per l'invio di email transazionali.
- **Telegram** — canale di monitoraggio interno (non user-facing): `telegram-alert` notifica eventi rilevanti (nuovo utente, nuovo abbonamento Pro), `telegram-webhook` riceve comandi dal bot.

Per l'elenco di chi possiede/come si trasferisce ciascuno di questi servizi, vedi `credential-transfer-plan.md` — qui interessa solo il *come comunicano* tra loro.

## 8. Internazionalizzazione e PWA

Tutto il testo visibile passa da un unico punto (`src/lib/i18n.ts`) più due file di traduzione (IT/ES, circa 280 chiavi ciascuno) — nessuna stringa hardcoded nei componenti. Aggiungere una lingua richiede un nuovo file di traduzione, non modifiche sparse nel codice.

L'app è una PWA installabile: banner di installazione, aggiornamento automatico con notifica quando è disponibile una nuova versione, funzionamento offline per le schermate già visitate.

## 9. Testing

Due livelli, entrambi attivi:
- **Unit test (Vitest)** — 161 test, concentrati sulla logica fiscale pura (calcoli IT/ES, arrotondamenti, scaglioni) e su alcuni percorsi critici (bootstrap profilo, gestione sessione, gate di installazione)
- **End-to-end (Playwright)** — 9 suite. Le suite end-to-end vengono eseguite contro l'ambiente di produzione per verificare il comportamento del sistema realmente distribuito: autenticazione, onboarding per ciascun regime (IT forfettario, IT ordinario, ES incluse Canarie), fatture/spese, funzionalità Pro vs Free, fatturazione elettronica SdI

La combinazione copre sia la correttezza dei calcoli sia i flussi utente end-to-end, non solo l'uno o l'altro.
