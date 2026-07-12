# Solvy — Repository Structure

*Questo documento è una mappa di navigazione, non una spiegazione architetturale: dice dove sono le cose, non perché sono organizzate così. Per il "perché" vedi `architecture-overview.md`. È leggibile da solo.*

## Flusso di lettura consigliato

| Obiettivo | Documento |
|---|---|
| Capire il prodotto | `executive-overview.md` |
| Capire l'architettura | `architecture-overview.md` |
| Vedere le funzionalità | `feature-guide.md` |
| Valutare la sicurezza | `security-overview.md` |
| Orientarsi nel codice | Questo documento |
| Capire il database | `supabase/schema_production.sql` |
| Capire le Edge Function | `supabase/functions/README.md` |

## Vista d'insieme della root

| Cartella/file | Cosa contiene |
|---|---|
| `src/` | Codice sorgente dell'applicazione React |
| `supabase/` | Migration, schema, Edge Function |
| `e2e/` | Suite di test end-to-end (Playwright) |
| `docs/` | Questa Data Room |
| `public/` | Asset statici e pagine legali (privacy, termini, cookie) |
| `future/` | Note di roadmap/prodotto non ancora implementate |
| `index.html` / build config | Entry point e configurazione build (vedi sezione "File di configurazione") |

## Dentro `src/` (82 file .ts/.tsx)

| Cartella | File | Cosa contiene |
|---|---|---|
| `views/` | 16 | Le schermate principali (dashboard, fatture, calendario, profilo, ecc.) |
| `components/modals/` | 18 | Modali di azione (creare fattura, modificare profilo, paywall, ecc.) |
| `components/ui/` | 6 | Componenti UI di base riutilizzabili |
| `components/layout/` | 3 | Elementi di struttura (navigazione, header) |
| `components/` (diretti) | 6 | Componenti condivisi non specifici di un'area |
| `lib/countries/` | 4 | Pattern modulo-paese (interfaccia comune + moduli `it`/`es`) — vedi `architecture-overview.md` |
| `lib/it/` | 3 | Logica di calcolo fiscale italiana |
| `lib/es/` | 2 | Logica di calcolo fiscale spagnola |
| `lib/` (diretti) | 8 | Utility di dominio condivise (i18n, formattazione, ecc.) |
| `hooks/` | 3 | Hook React condivisi (es. `useProStatus`) |
| `services/` | 2 | Chiamate a Supabase e generazione documenti (es. `modelosES`) |
| `data/` | 2 | Dati statici (es. codici ATECO) |
| `locales/` | 2 | Traduzioni IT/ES (~280 chiavi ciascuna) |
| `styles/` | 1 | Design tokens (CSS variables) |
| `utils/` | 1 | Funzioni di utilità generiche |
| `__tests__/` | 4 | Test unitari (vedi sezione Test) |

## Dentro `supabase/`

- `migrations/` — 17 file SQL. Cronologia e convenzioni spiegate in `supabase/migrations/README.md` — **da leggere prima di toccare qualsiasi migration**, spiega un disallineamento storico noto tra file locali e registro remoto.
- `functions/` — 12 Edge Function. Scopo, trigger, tabelle toccate e secret richiesti per ciascuna in `supabase/functions/README.md`.
- `schema_production.sql` — dump autentico e aggiornato dello schema di produzione, fonte di riferimento per ricreare il database da zero.
- `email-templates/` — template delle email transazionali.

## Test

- `e2e/` — 9 suite Playwright eseguite contro l'ambiente di produzione (autenticazione, onboarding per regime, fatture/spese, funzionalità Pro, fatturazione elettronica) più `helpers.ts` con le funzioni condivise.
- `src/__tests__/` — 4 file di test unitari Vitest, concentrati sulla logica fiscale pura e su alcuni percorsi critici (bootstrap profilo, gestione sessione, gate di installazione).

## Documentazione (`docs/`)

Questa stessa Data Room: Executive Overview, Architecture Overview, Feature Guide, Security Overview, Repository Structure (questo documento), più `credential-transfer-plan.md` e `known-limitations.md`, già pronti da fasi precedenti di questa preparazione.

## File di configurazione root

| File | Scopo |
|---|---|
| `package.json` | Dipendenze e script (`dev`, `build`, `lint`, `test`) |
| `vite.config.ts` | Configurazione build/dev server |
| `tsconfig.json` | Configurazione TypeScript |
| `vercel.json` | Routing multi-pagina e header di sicurezza HTTP |
| `playwright.config.ts` | Configurazione test end-to-end |
| `.env.example` | Variabili d'ambiente richieste lato client (dettaglio completo in `environment-variables-guide.md`, quando disponibile) |
| `CLAUDE.md` | Regole di dominio e convenzioni di sviluppo (regole fiscali, workflow git) |

## Cerco X → guardo qui

| Voglio... | Vado in... |
|---|---|
| Aggiungere un nuovo paese fiscale | `src/lib/countries/` |
| Modificare un calcolo fiscale italiano | `src/lib/it/` |
| Modificare un calcolo fiscale spagnolo | `src/lib/es/` |
| Aggiungere o modificare una schermata | `src/views/` |
| Aggiungere un'azione modale (es. nuova fattura) | `src/components/modals/` |
| Modificare un componente UI di base | `src/components/ui/` |
| Aggiungere una funzione serverless | `supabase/functions/` |
| Modificare lo schema del database | Nuova migration in `supabase/migrations/` + aggiornamento `schema_production.sql` |
| Aggiungere un test unitario | `src/__tests__/` |
| Aggiungere un test end-to-end | `e2e/` |
| Aggiungere una stringa di traduzione | `src/locales/it.json` + `es.json` |
| Modificare i colori/design tokens | `src/styles/` |
