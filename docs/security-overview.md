# Solvy — Security Overview

Postura di sicurezza del prodotto. Le voci sono verificabili sul codice sorgente e sulla configurazione di produzione.

## Autenticazione

Gestita da Supabase Auth, con login email/password. Non sono configurati provider di accesso social/OAuth.

## Autorizzazione e isolamento dei dati (Row Level Security)

Tutte e 4 le tabelle (`profiles`, `documents`, `deadlines`, `accountant`) hanno Row Level Security abilitata, verificata sul dump dello schema di produzione. Ogni policy è vincolata all'utente tramite `auth.uid() = profiles.user_id`, direttamente sulla tabella `profiles` o tramite join per le tabelle collegate. Non sono presenti policy permissive (`USING (true)`). Il controllo è applicato dal database.

## Gestione dei secret

Nessun secret è presente nel codice sorgente committato, verificato sull'intera cronologia dei file tracciati. Le chiavi con privilegi elevati (`SUPABASE_SERVICE_ROLE_KEY`, chiavi Stripe/A-Cube/Loops/Telegram) risiedono esclusivamente nella configurazione server-side delle Edge Function. Il frontend utilizza solo chiavi pubblicabili (URL Supabase, chiave anonima, chiave pubblica Stripe).

## Sicurezza delle funzioni serverless

Delle 12 Edge Function, `stripe-webhook` verifica la firma crittografica della richiesta (Stripe `constructEvent`) prima dell'elaborazione. `sdi-webhook` (A-Cube) e `telegram-webhook` (Telegram) non implementano verifica di firma e si affidano ai meccanismi di autenticazione dei rispettivi provider e alla segretezza dell'endpoint. Le funzioni invocate dal frontend si affidano all'autenticazione dell'utente (sessione Supabase).

## Trasporto e header HTTP

Traffico su HTTPS con `Strict-Transport-Security` (HSTS, incluso `preload`). Header attivi su tutte le risposte:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`: camera, microfono e geolocalizzazione disabilitati

È presente una Content-Security-Policy che limita le origini per script, stili, font, immagini e connessioni ai domini utilizzati (Supabase, Google Tag Manager/Analytics, Google Fonts, Sentry) e blocca `frame-src` e `object-src`. La policy consente `unsafe-inline` su `script-src` e `style-src`.

## Sicurezza delle dipendenze

`npm audit`: risolte 4 vulnerabilità su 5 (aggiornamenti non-breaking, build e test verificati dopo l'intervento). La vulnerabilità residua è di severità bassa, relativa al dev-server in ambiente Windows, non presente nella build di produzione.

## Monitoraggio

Sentry (`@sentry/react`) integrato per il tracciamento degli errori runtime in produzione, con error boundary dedicato.

## Dati trattati

Dati fiscali e identificativi: nome, P.IVA/NIF, indirizzo, importi di fatture e spese, contatto del commercialista/gestor. Non sono trattati né memorizzati dati di pagamento: il checkout è gestito da Stripe. La privacy policy pubblicata elenca i sub-processor utilizzati.

## Cancellazione dell'account

La funzione `delete-account` rimuove a cascata i dati collegati al profilo (`documents`, `deadlines`, `accountant`, `profiles`) e l'utente Auth.

## Open Security Items

- `sdi-webhook` e `telegram-webhook` non verificano una firma crittografica della richiesta.
- La Content-Security-Policy consente `unsafe-inline` su `script-src` e `style-src`.
- Assenza di rate-limiting applicativo sulle Edge Function esposte pubblicamente.

## Verifiche e certificazioni non eseguite

- Penetration test esterno.
- Documento formale di data retention / GDPR.
- Certificazioni di sicurezza (SOC 2, ISO 27001).
