# Solvy — Data Room Index

Questo documento collega i 19 documenti della Data Room in un percorso coerente. Non introduce contenuto nuovo — è il punto da cui partire e a cui tornare tra un documento e l'altro. Per un primo contatto rapido con il progetto, parti comunque da `executive-overview.md`.

## Indice per categoria

**Panoramica**
- [`executive-overview.md`](./executive-overview.md) — cos'è Solvy, per chi, posizionamento, cosa è incluso nella vendita — leggibile in 10 minuti
- [`faq-acquirente.md`](./faq-acquirente.md) — risposte brevi alle domande trasversali su deal, prodotto, presa in carico, sicurezza

**Prodotto**
- [`feature-guide.md`](./feature-guide.md) — elenco completo delle funzionalità, verificato nel codice, incluso il confine esatto Free/Pro
- [`known-limitations.md`](./known-limitations.md) — i due gap noti dichiarati esplicitamente (VeriFactu ES, A-Cube sandbox)

**Tecnico**
- [`architecture-overview.md`](./architecture-overview.md) — come è costruito il sistema, il pattern modulo-paese, il flusso dati
- [`repository-structure.md`](./repository-structure.md) — mappa di navigazione del codice sorgente
- [`security-overview.md`](./security-overview.md) — RLS, gestione dei secret, dipendenze, cosa non è stato ancora fatto

**Operativo**
- [`environment-variables-guide.md`](./environment-variables-guide.md) — ogni variabile e secret richiesto, verificato nel codice
- [`deployment-guide.md`](./deployment-guide.md) — sequenza per portare Solvy online da zero
- [`installation-guide.md`](./installation-guide.md) — far girare Solvy in locale per valutarlo
- [`operations-manual.md`](./operations-manual.md) — gestione quotidiana, troubleshooting, backup & restore (testato con un restore reale, non solo documentato)

**Valore e know-how**
- [`ai-development-methodology.md`](./ai-development-methodology.md) — le 6 skill di dominio fiscale codificate, cosa trasferiscono, perché aumentano il valore dell'acquisizione
- [`buyer-value-analysis.md`](./buyer-value-analysis.md) — per ogni asset chiave: perché un CTO pagherebbe per averlo, quale rischio riduce

**Transazione e proprietà**
- [`credential-transfer-plan.md`](./credential-transfer-plan.md) — gli 8 servizi terzi da trasferire, metodo e priorità
- [`ip-ownership-licensing.md`](./ip-ownership-licensing.md) — proprietà del codice, licenze open source, disclosure marchio
- [`trademark-analysis.md`](./trademark-analysis.md) — stato del marchio "Solvy", analisi costo/beneficio della registrazione, precedente EUIPO verificato
- [`analytics-search-console-transfer.md`](./analytics-search-console-transfer.md) — piano di trasferimento Google Analytics 4 e Search Console
- [`gap-analysis.md`](./gap-analysis.md) — cosa resta aperto oggi, verificato, non un riepilogo del lavoro svolto

## Percorsi di lettura per profilo

**Hai 10 minuti** → `executive-overview.md`

**Devi decidere se investire tempo in una due diligence tecnica** → aggiungi `architecture-overview.md` e `security-overview.md`

**Stai valutando il valore reale dell'operazione** → aggiungi `buyer-value-analysis.md` e `ai-development-methodology.md`

**Stai per chiudere l'operazione** → aggiungi `credential-transfer-plan.md`, `ip-ownership-licensing.md` e `gap-analysis.md`

## Documenti di riferimento (Single Source of Truth)

Quando due documenti si richiamano a vicenda su uno stesso argomento, questa tabella dice quale considerare la fonte ufficiale:

| Argomento | Fonte autoritativa |
|---|---|
| Schema del database | `supabase/schema_production.sql` |
| Dettaglio tecnico delle Edge Function | `supabase/functions/README.md` |
| Cronologia e convenzioni delle migration | `supabase/migrations/README.md` |
| Variabili d'ambiente e secret | `docs/environment-variables-guide.md` |
| Funzionalità di prodotto e confine Free/Pro | `docs/feature-guide.md` |
| Postura di sicurezza | `docs/security-overview.md` |
| Architettura di sistema | `docs/architecture-overview.md` |
| Trasferimento di servizi e credenziali | `docs/credential-transfer-plan.md` |
| Limiti noti di prodotto | `docs/known-limitations.md` |
| Proprietà IP e stato del marchio | `docs/ip-ownership-licensing.md`, `docs/trademark-analysis.md` |
| Procedura di deploy | `docs/deployment-guide.md` |
| Gestione operativa quotidiana e backup/restore | `docs/operations-manual.md` |
| Stato residuo del pacchetto | `docs/gap-analysis.md` |

## Stato della Data Room

Ultima revisione strutturale: 2026-07-12 — pacchetto unificato in un solo indice (in precedenza un secondo layer di documenti, "Acquisition Package", duplicava parte di questo indice; è stato eliminato o assorbito qui dopo una revisione critica basata su casi reali di asset sale software). Riflette lo stato del prodotto a questa data — in caso di sviluppi successivi alla stesura, i documenti tecnici (schema, funzioni, variabili d'ambiente) restano la fonte più affidabile perché verificati direttamente nel codice, non ricostruiti a memoria.
