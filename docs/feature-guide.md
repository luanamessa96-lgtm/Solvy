# Solvy — Feature Guide

*Questo documento elenca cosa fa Solvy oggi, funzione per funzione, per chi deve capire lo scope esatto del prodotto senza aprire il codice. È leggibile da solo. Per il contesto generale vedi `executive-overview.md`; per come le funzioni sono costruite vedi `architecture-overview.md`; per i gap noti vedi `known-limitations.md`.*

## Nota di scope

Questo documento descrive le **capacità** del prodotto — cosa calcola, cosa gestisce, cosa automatizza — non le aliquote o i valori normativi correnti (percentuali INPS, scaglioni IRPEF, soglie di regime, ecc.). Le regole fiscali cambiano ogni anno per legge; il codice le implementa e le aggiorna, ma elencarle qui le renderebbe datate rapidamente. Chi ha bisogno dei valori esatti attualmente implementati li trova nel codice sorgente (moduli `src/lib/countries/it.ts` e `es.ts`).

## Onboarding & gestione profili

Un utente crea uno o più **profili fiscali**, ciascuno associato a un singolo paese e regime (Italia forfettario, Italia ordinario, Spagna Estimación Directa — incluso il regime Canarie/IGIC). Un profilo raccoglie i dati identificativi necessari (P.IVA/NIF, codice ATECO, data di inizio attività, indirizzo) usati poi da tutti i calcoli e i documenti generati. Il cambio di paese su un profilo esistente non è previsto per design: il paese è immutabile dopo la creazione, un nuovo mercato richiede un nuovo profilo.

## Free vs Pro

Il prodotto ha un piano gratuito e un abbonamento Pro (mensile o annuale, via Stripe). La seguente tabella è verificata direttamente nel codice sorgente e rappresenta il comportamento reale del prodotto alla data di questo documento:

| Funzionalità | Free | Pro |
|---|---|---|
| Profili fiscali | 1 | Illimitati |
| Fatture | Fino a 8 | Illimitate |
| Clienti ricorrenti | ❌ | ✅ |
| Preventivi convertibili in fattura (proforma) | ❌ | ✅ |
| Export PDF fattura | ❌ | ✅ |
| Export completo per il commercialista/gestor (riepilogo trimestrale, libri IVA, riepiloghi annuali) | ❌ | ✅ |
| Report avanzati in dashboard (sezione "Tasse") | ❌ | ✅ |
| Calcolo "Metti da parte" (rateizzazione mensile suggerita dell'importo da accantonare, solo profili IT) | ❌ | ✅ |
| Promemoria pagamento automatici | ❌ | ✅ |
| OCR scontrini | ❌ | ✅ |
| Temi Pro (Pro Light / Pro Dark) | ❌ | ✅ |

Calcoli fiscali di base, calendario scadenze e gestione spese restano disponibili nel piano Free senza limitazioni.

## Fatture & spese

Creazione e gestione di fatture e spese per ciascun profilo: importo, cliente/fornitore, categoria, stato (pagata, in attesa, scaduta, bozza). Le fatture italiane supportano ritenuta d'acconto e marca da bollo dove applicabile; le fatture spagnole supportano retención IRPF e operazioni intracomunitarie. Filtro e ricerca su entrate/uscite, numerazione automatica progressiva con possibilità di annullo numero.

## Calcoli fiscali

Per ciascun regime supportato, Solvy calcola in automatico, a partire da fatturato e spese inserite:

- **Italia — Forfettario**: imposta sostitutiva, contributi INPS gestione separata, proiezione del netto disponibile
- **Italia — Ordinario**: imposta IRPEF a scaglioni, contributi INPS gestione separata, liquidazione IVA trimestrale, proiezione del netto disponibile
- **Spagna — Estimación Directa** (incluse le Canarie): IRPF trimestrale, quota RETA, IVA o IGIC a seconda del territorio

Ogni calcolo è mostrato come stima soggetta a verifica professionale, mai come valore definitivo (scelta di posizionamento, vedi `executive-overview.md`).

## Calendario scadenze

Calendario delle scadenze fiscali specifico per paese e regime (versamenti, dichiarazioni periodiche e annuali), con vista mensile e promemoria. Le date e le voci mostrate si adattano automaticamente al profilo attivo.

## Fatturazione elettronica (Italia)

Per i profili italiani, invio diretto delle fatture al Sistema di Interscambio tramite l'integrazione A-Cube, con stato di consegna/scarto visibile in app. Questa funzione è tecnicamente completa e coperta da test end-to-end dedicati — lo stato dell'account A-Cube utilizzato (sandbox, non ancora production) è documentato in `known-limitations.md`.

## Gestione commercialista/gestor

Ogni profilo può avere un contatto commercialista (IT) o gestor (ES) associato, con dati di contratto e istruzioni di invio. L'export dei dati per il commercialista (riepilogo trimestrale, libri IVA) è una funzionalità Pro (vedi sopra).

## Notifiche

Email transazionali all'utente per benvenuto, upgrade a Pro e cancellazione abbonamento. Non rientrano qui gli alert Telegram, che sono un canale di monitoraggio interno non visibile all'utente (dettaglio in `architecture-overview.md`).

## PWA & multi-dispositivo

App installabile su mobile e desktop come Progressive Web App, con banner di installazione e notifica di aggiornamento disponibile. I profili, i documenti e le scadenze si sincronizzano in tempo reale tra dispositivi collegati allo stesso account. Interfaccia disponibile in italiano e spagnolo, tema chiaro/scuro (più le due varianti Pro).

---

Le funzionalità descritte rappresentano lo stato attuale del prodotto al momento della redazione di questo documento. Eventuali evoluzioni future sono documentate separatamente e non fanno parte dell'oggetto di questa vendita.
