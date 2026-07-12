# Solvy — Data Room Index

Indice dei documenti della Data Room. Per gli argomenti trattati in più documenti, la fonte autoritativa è indicata nella tabella finale.

## Indice per categoria

**Panoramica**
- [`executive-overview.md`](./executive-overview.md) — descrizione del prodotto, mercati serviti e perimetro della vendita

**Prodotto**
- [`feature-guide.md`](./feature-guide.md) — funzionalità del prodotto e distinzione Free/Pro, verificate nel codice
- [`known-limitations.md`](./known-limitations.md) — limitazioni note a livello di prodotto (VeriFactu ES, account A-Cube in sandbox)

**Tecnico**
- [`architecture-overview.md`](./architecture-overview.md) — architettura del sistema, pattern modulo-paese, flusso dei dati
- [`repository-structure.md`](./repository-structure.md) — struttura del codice sorgente
- [`security-overview.md`](./security-overview.md) — Row Level Security, gestione dei secret, dipendenze, aree non coperte

**Operativo**
- [`environment-variables-guide.md`](./environment-variables-guide.md) — variabili d'ambiente e secret, verificati nel codice
- [`deployment-guide.md`](./deployment-guide.md) — procedura di deploy su infrastruttura nuova
- [`developer-installation-guide.md`](./developer-installation-guide.md) — esecuzione in locale dal codice sorgente, a scopo di valutazione
- [`operations-manual.md`](./operations-manual.md) — gestione operativa, troubleshooting, backup e restore

**Proprietà e trasferimento**
- [`credential-transfer-plan.md`](./credential-transfer-plan.md) — servizi terzi e credenziali da trasferire, metodo e priorità, incluso Google Analytics/Search Console
- [`ip-ownership-licensing.md`](./ip-ownership-licensing.md) — titolarità del codice, licenze delle dipendenze, stato del marchio
- [`trademark-analysis.md`](./trademark-analysis.md) — stato del marchio "Solvy", analisi di registrazione, precedente EUIPO

## Documenti di riferimento (Single Source of Truth)

Per gli argomenti trattati in più documenti, la fonte autoritativa è la seguente:

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

## Stato del documento

Ultimo aggiornamento: 2026-07-12.
