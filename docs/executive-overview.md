# Solvy — Executive Overview

## Descrizione

Solvy è un'applicazione web progressiva (PWA) per la gestione fiscale di freelance e liberi professionisti in Italia e Spagna. Copre il calcolo di imposte e contributi, le scadenze fiscali, e la gestione di fatture e spese, in un'interfaccia mobile-first. Il prodotto è in produzione su [solvyapp.com](https://solvyapp.com).

## Classificazione funzionale

Solvy è uno strumento di gestione e calcolo fiscale, non un software di fatturazione certificato né un sostituto della consulenza professionale. I calcoli sono presentati come stime soggette a verifica professionale. Questa classificazione determina il perimetro normativo del prodotto (vedi `known-limitations.md`, VeriFactu ES).

## Utenti e mercati

- **Italia**: regime forfettario e regime ordinario.
- **Spagna**: Estimación Directa Simplificada, incluso il regime speciale delle Canarie (IGIC anziché IVA).

## Funzionalità principali

- Calcolo di imposte e contributi: imposta sostitutiva, INPS, IRPEF a scaglioni (Italia); IRPF/Modelo 130, RETA, IVA/Modelo 303 e 390, IGIC per le Canarie (Spagna).
- Gestione multi-profilo (più profili fiscali per utente).
- Fatture e spese, con esportazione PDF.
- Fatturazione elettronica al Sistema di Interscambio (Italia) tramite integrazione A-Cube.
- Calendario delle scadenze fiscali per paese e regime.
- Gestione del contatto commercialista/gestor.
- Piano Free e piano Pro (abbonamento mensile/annuale via Stripe).
- Applicazione installabile (PWA), interfaccia in italiano e spagnolo.

Dettaglio completo delle funzionalità e del confine Free/Pro in `feature-guide.md`.

## Architettura ad alto livello

Frontend React a pagina singola, senza router: un unico stato applicativo seleziona la vista in base al contesto utente. La logica di calcolo fiscale è isolata in moduli per paese (`it`, `es`) che implementano un'interfaccia comune; l'aggiunta di un paese è confinata a un nuovo modulo. Il backend è su Supabase: database Postgres con Row Level Security su ogni tabella, autenticazione, storage file e 12 funzioni serverless (pagamenti, fatturazione elettronica, notifiche). Dettaglio in `architecture-overview.md`.

## Stack tecnologico

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS 4.
- **Backend**: Supabase (Postgres 17, Auth, Realtime, Storage, Edge Functions su Deno).
- **Pagamenti**: Stripe.
- **Hosting e deploy**: Vercel.

## Servizi esterni

- **A-Cube** — intermediario per la fatturazione elettronica italiana.
- **Loops** — email transazionali.
- **Telegram** — notifiche interne di monitoraggio (non user-facing).

Uso, titolarità e modalità di trasferimento in `credential-transfer-plan.md`.

## Oggetto della vendita

L'operazione è una cessione di asset tecnologico, non un'acquisizione societaria: riguarda il software e gli asset associati, non una società con clienti, dipendenti o quote.

Incluso:

- Codice sorgente completo, architettura e design system.
- Schema del database e relative policy di sicurezza.
- Le 12 funzioni serverless.
- Suite di test: 161 test unitari sulla logica fiscale e 8 suite end-to-end.
- Documentazione della Data Room.
- 6 skill Claude Code (`.claude/skills/`): 3 dedicate alla logica fiscale IT/ES con riferimento a fonti ufficiali (`fiscale-it`, `fiscale-es`, `fiscale-avanzata`), più `sicurezza` (postura di sicurezza del prodotto), `i18n` (regole di traduzione IT/ES) e `ui-solvy` (design system). Il repository non contiene altre skill: strumenti non direttamente collegati al prodotto sono stati esclusi dal perimetro della cessione.
- Infrastruttura live (progetto Supabase, dominio, account Vercel), se le parti ne concordano il trasferimento.

## Elementi non inclusi

Non è inclusa una base utenti commerciale. Durante lo sviluppo il prodotto è stato utilizzato da un gruppo chiuso a fini di test; non esiste validazione di mercato né portafoglio clienti.

## Limiti noti

Due limitazioni di prodotto sono documentate in `known-limitations.md`:

- Assenza di conformità VeriFactu per la Spagna (non ancora obbligatoria).
- Integrazione A-Cube per la fatturazione elettronica italiana in stato sandbox (non production).
