# Solvy — Data Room Index

Questo documento collega i 12 documenti della Data Room in un percorso coerente. Non introduce contenuto nuovo — è il punto da cui partire e a cui tornare tra un documento e l'altro. Per un primo contatto rapido con il progetto, parti comunque da `executive-overview.md`.

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
- [`operations-manual.md`](./operations-manual.md) — gestione quotidiana, troubleshooting, backup & restore

**Transazione**
- [`credential-transfer-plan.md`](./credential-transfer-plan.md) — gli 8 servizi terzi da trasferire, metodo e priorità

## Percorsi di lettura per profilo

**Hai 10 minuti** → `executive-overview.md`

**Devi decidere se investire tempo in una due diligence tecnica** → aggiungi `architecture-overview.md` e `security-overview.md`

**Stai per chiudere l'operazione** → aggiungi `credential-transfer-plan.md` e `operations-manual.md`

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
| Procedura di deploy | `docs/deployment-guide.md` |
| Gestione operativa quotidiana | `docs/operations-manual.md` |

## Stato della Data Room

Completata il 2026-07-12. Riflette lo stato del prodotto a questa data — in caso di sviluppi successivi alla stesura, i documenti tecnici (schema, funzioni, variabili d'ambiente) restano la fonte più affidabile perché verificati direttamente nel codice, non ricostruiti a memoria.
