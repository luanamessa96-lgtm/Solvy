# Solvy — Security Overview

*Questo documento risponde a una sola domanda: un'organizzazione che gestisce dati fiscali di terzi può fidarsi di questo sistema? È leggibile da solo. Per l'elenco dei servizi terzi e come si trasferiscono vedi `credential-transfer-plan.md`; per i gap di prodotto (non di sicurezza) vedi `known-limitations.md`; per come sono strutturate le funzioni serverless vedi `architecture-overview.md`.*

## 1. Isolamento dei dati (Row Level Security)

Tutte e 4 le tabelle del database (`profiles`, `documents`, `deadlines`, `accountant`) hanno **Row Level Security abilitata**, verificato tramite dump autentico del database di produzione (non dedotto dal codice delle migration). Ogni policy è scoping-isolata per utente: l'accesso passa sempre da `auth.uid() = profiles.user_id`, direttamente sulla tabella `profiles` o tramite join per le tabelle collegate. Nessuna policy permissiva (del tipo `USING (true)`) è presente. Un utente autenticato non può leggere o modificare dati di un altro utente, indipendentemente da come viene costruita la query lato client — il controllo è imposto dal database, non dall'applicazione.

## 2. Autenticazione

Gestita interamente da Supabase Auth, con login email/password. Non sono presenti provider di accesso social/OAuth.

## 3. Gestione dei secret

Nessun secret (chiave API, password, token) è presente nel codice sorgente committato — verificato sull'intera cronologia dei file tracciati, non solo sullo stato attuale. Le chiavi con privilegi elevati (`SUPABASE_SERVICE_ROLE_KEY`, chiavi Stripe/A-Cube/Loops/Telegram) vivono esclusivamente nella configurazione server-side delle Edge Function e non sono mai esposte al client. Il frontend usa solo chiavi pubblicabili per design (URL Supabase, chiave anonima, chiave pubblica Stripe).

## 4. Sicurezza delle funzioni serverless

Delle 12 Edge Function, **solo `stripe-webhook` verifica una firma crittografica** della richiesta in arrivo (`constructEvent` di Stripe) prima di elaborarla. Le altre funzioni raggiungibili da servizi esterni — `sdi-webhook` (A-Cube) e `telegram-webhook` (Telegram) — non implementano una verifica di firma equivalente: si affidano ai meccanismi di autenticazione previsti dai rispettivi provider e alla segretezza dell'endpoint. Le funzioni chiamate dal frontend si affidano invece all'autenticazione dell'utente (sessione Supabase). Questo è un fatto architetturale, non un giudizio — il dettaglio della sua rilevanza è in sezione 10.

## 5. Dipendenze

Verifica formale eseguita (`npm audit`): risolte 4 vulnerabilità note su 5 (bump non-breaking, test e build confermati integri dopo l'intervento). La vulnerabilità residua è di severità bassa, riguarda esclusivamente il dev-server in ambiente Windows (non applicabile alla piattaforma di sviluppo del team, non presente nella build di produzione), ed è stata accettata consapevolmente anziché forzata con un aggiornamento a rischio di breaking change.

## 6. Trasporto e header HTTP

Traffico interamente su HTTPS, con `Strict-Transport-Security` (HSTS, incluso `preload`) configurato. Header aggiuntivi attivi su tutte le risposte: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` che disabilita camera/microfono/geolocalizzazione non utilizzati dall'app.

È presente una Content-Security-Policy che limita le origini consentite per script, stili, font, immagini e connessioni ai soli domini realmente usati (Supabase, Google Tag Manager/Analytics, Google Fonts, Sentry) e blocca esplicitamente `frame-src` e `object-src`. **Nota onesta**: la policy consente `unsafe-inline` su `script-src` e `style-src` — una concessione reale che riduce parzialmente l'efficacia della CSP come mitigazione XSS. Approfondito in sezione 10.

## 7. Monitoraggio

Sentry (`@sentry/react`) è integrato per il tracciamento degli errori in produzione, con boundary dedicato lato applicazione. Fornisce visibilità su eccezioni ed errori runtime non altrimenti osservabili.

## 8. Natura dei dati trattati

Solvy tratta dati fiscali e identificativi (nome, P.IVA/NIF, indirizzo, importi di fatture e spese, contatto del commercialista/gestor). **Non tratta né memorizza dati di pagamento**: il flusso di checkout è interamente gestito da Stripe, nessun numero di carta transita o viene salvato lato Solvy. La privacy policy pubblicata (verificata in una fase precedente di questa preparazione) elenca correttamente i sub-processor reali e non contiene claim di conformità non supportati dall'implementazione.

## 9. Diritto alla cancellazione

La cancellazione account (`delete-account`) rimuove a cascata i dati su tutte le tabelle collegate al profilo (`documents`, `deadlines`, `accountant`, `profiles`) oltre all'utente Auth — il diritto all'oblio è implementato funzionalmente, non solo dichiarato in policy.

## 10. Cosa non è stato ancora fatto

**Rischi reali (già valutati e documentati), di entità contenuta:**
- `sdi-webhook` e `telegram-webhook` non verificano una firma crittografica della richiesta: se l'URL dell'endpoint venisse esposto (log, condivisione accidentale), un terzo potrebbe inviare payload falsi. Impatto limitato dal fatto che gli effetti di questi endpoint sono circoscritti (aggiornamento di uno stato di consegna, invio di un alert interno), non accesso o modifica di dati arbitrari.
- La CSP consente `unsafe-inline` su script e style, riducendo (senza azzerare) la sua efficacia come mitigazione XSS.
- Nessun rate-limiting applicativo sulle Edge Function esposte pubblicamente — nessuna evidenza di abuso ad oggi, ma il controllo non è presente.

**Miglioramenti futuri, non urgenti:**
- Introdurre un meccanismo di verifica più robusto per i webhook che oggi si affidano alla sola segretezza dell'URL.
- Restringere la CSP eliminando `unsafe-inline`, dove tecnicamente possibile.
- Aggiungere rate-limiting sulle Edge Function pubbliche.

**Attività volutamente rimandate, non necessarie per questa vendita:**
- Penetration test esterno formale — tipicamente richiesto dall'acquirente stesso in una due diligence avanzata, non da anticipare a preventivo.
- Documento formale di data retention/GDPR dedicato — i diritti essenziali (trasparenza via privacy policy, cancellazione funzionante) sono già coperti; un documento più formale è utile solo se richiesto da un acquirente regolamentato specifico.
- Certificazioni di sicurezza formali (SOC2, ISO 27001) — fuori scope per un asset di questa dimensione, da valutare solo se richieste esplicitamente in trattativa.
