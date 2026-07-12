# Solvy — Executive Overview

Solvy è un asset software pronto per essere acquisito, dedicato alla gestione fiscale di freelance e liberi professionisti in Italia e Spagna.

*Questo documento è pensato per essere letto da solo, in 10 minuti, senza bisogno di aprire altro. Se ti servono i dettagli tecnici, il documento di riferimento è `architecture-overview.md`; per i limiti noti, `known-limitations.md`; per l'elenco completo dei documenti disponibili, `data-room-index.md`.*

## Cos'è Solvy

Solvy è un'applicazione web (PWA) che aiuta liberi professionisti e freelance in Italia e Spagna a gestire i propri obblighi fiscali: calcolo di imposte e contributi, scadenze, fatture e spese, in un'unica interfaccia mobile-first. È live in produzione su [solvyapp.com](https://solvyapp.com).

## Quale problema risolve

Un libero professionista in regime forfettario (IT) o come autónomo (ES) deve calcolare a mano — o pagando un commercialista/gestor per ogni verifica — quanto accantonare per imposte e contributi, quando scadono i pagamenti, e come tenere traccia di fatture e spese. Solvy automatizza questi calcoli e li rende visibili in tempo reale, riducendo il tempo e l'incertezza di questa gestione, senza sostituirsi alla consulenza professionale.

## Per chi è stato costruito

Freelance e liberi professionisti in due mercati:
- **Italia**: regime forfettario e regime ordinario
- **Spagna**: Estimación Directa Simplificada, incluso il regime speciale delle Canarie (IGIC anziché IVA)

## Posizionamento

Solvy si posiziona come **strumento di gestione e calcolo fiscale**, non come software di fatturazione certificato né come sostituto di un commercialista. Ogni calcolo è etichettato come stima soggetta a verifica professionale — una scelta di posizionamento deliberata che evita obblighi normativi non necessari (vedi `known-limitations.md` per il dettaglio su VeriFactu ES).

## Funzionalità principali

- Calcolo automatico di imposte e contributi (imposta sostitutiva, INPS, IRPEF a scaglioni per l'Italia; IRPF/Modelo 130, RETA, IVA/Modelo 303 e 390 per la Spagna, incluso IGIC per le Canarie)
- Gestione multi-profilo (un utente può avere più profili fiscali)
- Fatture e spese, con esportazione PDF
- Fatturazione elettronica diretta al Sistema di Interscambio (Italia) tramite integrazione A-Cube
- Calendario scadenze fiscali specifico per paese e regime
- Gestione contatto commercialista/gestor
- Piano Free e piano Pro (abbonamento mensile/annuale via Stripe)
- App installabile (PWA), interfaccia in italiano e spagnolo

## Architettura ad alto livello

Frontend React a pagina singola (nessun router: un unico stato applicativo che mostra una delle viste in base al contesto utente). Ogni logica di calcolo fiscale è isolata in moduli per paese (`it`, `es`) dietro un'interfaccia comune — aggiungere un nuovo paese non richiede toccare il resto dell'applicazione. Il backend è interamente su Supabase: database Postgres con Row Level Security su ogni tabella, autenticazione, storage file, e 12 funzioni serverless che gestiscono pagamenti, fatturazione elettronica e notifiche. Il dettaglio completo è in `architecture-overview.md`.

## Tecnologie utilizzate

React 19, TypeScript, Vite, TailwindCSS 4 — frontend. Supabase (Postgres 17, Auth, Realtime, Storage, Edge Functions su Deno) — backend. Stripe — pagamenti. Vercel — hosting e deploy.

## Servizi esterni

Oltre allo stack sopra, il prodotto si appoggia a: **A-Cube** (intermediario fatturazione elettronica IT), **Loops** (email transazionali), **Telegram** (notifiche interne di monitoraggio, non user-facing). Elenco completo, uso e modalità di trasferimento in `credential-transfer-plan.md`.

## Cosa è incluso nella vendita

Questa è una cessione di asset tecnologico, non un'acquisizione societaria. L'operazione riguarda il software, il codice sorgente, la documentazione e l'infrastruttura concordata, non una società con clienti, dipendenti o quote da trasferire.

Codice sorgente completo, architettura e design system, schema del database con relative policy di sicurezza, le 12 funzioni serverless, la suite di test (161 test unitari sulla logica fiscale + 9 suite end-to-end), tutta la documentazione di questa Data Room, e — se le parti concordano il trasferimento — l'infrastruttura live (progetto Supabase, dominio, account Vercel).

Un asset raramente presente in un'acquisizione software di questa scala: 6 skill Claude Code che codificano la conoscenza fiscale italiana e spagnola verificata da fonti ufficiali, non solo il codice che la implementa — dettaglio in `ai-development-methodology.md`.

**Cosa non è incluso**: una base utenti commerciale. Il prodotto è stato usato da un piccolo gruppo chiuso durante lo sviluppo per validare flussi e individuare bug — un test reale, non una validazione di mercato. Il valore dell'asset è nel codice, nell'architettura e nel tempo di sviluppo risparmiato, non in un portafoglio clienti esistente.

## Limiti noti

Due gap di prodotto sono dichiarati esplicitamente, con contesto completo, in `known-limitations.md`: l'assenza di conformità VeriFactu per la Spagna (non ancora obbligatoria) e lo stato sandbox (non production) dell'integrazione A-Cube per la fatturazione elettronica italiana.

---

L'obiettivo della Data Room è permettere a un potenziale acquirente di comprendere rapidamente il prodotto, valutarne l'architettura e stimare il costo di presa in carico senza dover analizzare direttamente il codice sorgente.
