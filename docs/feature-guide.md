# Solvy — Feature Guide

Descrizione del perimetro funzionale del prodotto, organizzata per aree. Le funzionalità soggette al piano Pro sono indicate come tali; la matrice completa di entitlement è nella sezione "Piani di abbonamento".

I valori normativi correnti (aliquote, scaglioni, soglie, importi contributivi) non sono elencati in questo documento: risiedono nei moduli per paese (`src/lib/countries/it.ts`, `src/lib/countries/es.ts`) e sono soggetti a variazione legislativa.

## Gestione account e profili

Ogni utente gestisce uno o più **profili fiscali**. Ciascun profilo è associato a un singolo paese e regime tra quelli supportati (vedi "Supporto multi-paese"). Il paese è immutabile dopo la creazione del profilo: un mercato diverso richiede un nuovo profilo.

Un profilo raccoglie i dati identificativi utilizzati dai calcoli e dai documenti generati: P.IVA/NIF, codice ATECO, data di inizio attività, indirizzo. Il piano Free consente un solo profilo; il piano Pro un numero illimitato.

## Gestione e calcolo fiscale

A partire da fatturato e spese registrati, il prodotto calcola imposte e contributi per il regime del profilo attivo, con proiezione del netto disponibile:

- **Italia — Forfettario**: imposta sostitutiva, contributi INPS gestione separata.
- **Italia — Ordinario**: IRPEF a scaglioni, contributi INPS gestione separata, liquidazione IVA trimestrale.
- **Spagna — Estimación Directa Simplificada** (incluse le Canarie): IRPF trimestrale, quota RETA, IVA o IGIC secondo il territorio.

I risultati sono presentati come stime soggette a verifica professionale.

Per i profili italiani è disponibile la funzione **"Metti da parte"** (Pro): rateizzazione mensile suggerita dell'importo da accantonare.

## Fatture e spese

Registrazione e gestione di fatture e spese per profilo, con importo, controparte (cliente/fornitore), categoria e stato (pagata, in attesa, scaduta, bozza). Numerazione progressiva automatica, con possibilità di annullamento di un numero. Filtro e ricerca su entrate e uscite.

Specificità per paese:

- **Italia**: ritenuta d'acconto e marca da bollo, dove applicabili.
- **Spagna**: retención IRPF e operazioni intracomunitarie.

Funzionalità Pro dell'area:

- Gestione clienti ricorrenti.
- Preventivi/proforma convertibili in fattura.
- Riconoscimento OCR degli scontrini per l'inserimento delle spese.

## Fatturazione elettronica (Italia)

Per i profili italiani, invio delle fatture al Sistema di Interscambio tramite l'integrazione A-Cube, con stato di consegna/scarto visibile in applicazione. L'account A-Cube attualmente configurato è in modalità sandbox (vedi `known-limitations.md`).

## Calendario fiscale

Calendario delle scadenze fiscali (versamenti, dichiarazioni periodiche e annuali) specifico per paese e regime, con vista mensile e promemoria. Le voci e le date si adattano al profilo attivo.

## Reportistica ed esportazioni

- Esportazione PDF delle fatture (Pro).
- Esportazione per commercialista/gestor: riepilogo trimestrale, libri IVA, riepiloghi annuali (Pro).
- Report avanzati in dashboard, sezione "Tasse" (Pro).

## Gestione commercialista/gestor

Ogni profilo può includere un contatto commercialista (IT) o gestor (ES), con dati di contratto e istruzioni di invio. L'esportazione dei dati destinati al professionista è parte delle funzionalità Pro (vedi "Reportistica ed esportazioni").

## Notifiche

- Email transazionali all'utente: benvenuto, upgrade a Pro, cancellazione dell'abbonamento.
- Promemoria di pagamento automatici (Pro).

Le notifiche Telegram sono un canale di monitoraggio interno, non visibile all'utente finale (vedi `architecture-overview.md`).

## Piani di abbonamento

Piano Free e piano Pro (abbonamento mensile o annuale via Stripe). Calcoli fiscali di base, calendario delle scadenze e gestione spese sono disponibili nel piano Free senza limitazioni.

| Funzionalità | Free | Pro |
|---|---|---|
| Profili fiscali | 1 | Illimitati |
| Fatture | Fino a 8 | Illimitate |
| Clienti ricorrenti | — | ✓ |
| Preventivi convertibili in fattura (proforma) | — | ✓ |
| Export PDF fattura | — | ✓ |
| Export per commercialista/gestor (riepilogo trimestrale, libri IVA, riepiloghi annuali) | — | ✓ |
| Report avanzati in dashboard (sezione "Tasse") | — | ✓ |
| Calcolo "Metti da parte" (solo profili IT) | — | ✓ |
| Promemoria di pagamento automatici | — | ✓ |
| OCR scontrini | — | ✓ |
| Temi Pro (Pro Light / Pro Dark) | — | ✓ |

## Progressive Web App e multi-dispositivo

Applicazione installabile su mobile e desktop come Progressive Web App, con banner di installazione e notifica di aggiornamento disponibile. Profili, documenti e scadenze si sincronizzano tra i dispositivi collegati allo stesso account.

## Supporto multi-paese e localizzazione

Mercati e regimi supportati:

- **Italia**: regime forfettario, regime ordinario.
- **Spagna**: Estimación Directa Simplificada, incluso il regime speciale delle Canarie (IGIC anziché IVA).

Interfaccia disponibile in italiano e spagnolo. Temi chiaro e scuro, con due varianti aggiuntive nel piano Pro (Pro Light, Pro Dark).
