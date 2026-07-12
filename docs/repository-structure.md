# Solvy — Repository Structure

Organizzazione del repository. Per l'architettura del sistema vedi `architecture-overview.md`.

## Root

| Cartella/file | Contenuto |
|---|---|
| `src/` | Codice sorgente dell'applicazione React |
| `supabase/` | Migration, schema, Edge Function, template email |
| `e2e/` | Test end-to-end (Playwright) |
| `docs/` | Documentazione della Data Room |
| `public/` | Asset statici e pagine legali (privacy, termini, cookie) |
| `future/` | Note di roadmap non implementate |
| `index.html`, file di build | Entry point e configurazione build |

## Frontend (`src/`)

82 file `.ts`/`.tsx`.

| Cartella | File | Contenuto |
|---|---|---|
| `views/` | 16 | Schermate principali (dashboard, fatture, calendario, profilo) |
| `components/modals/` | 18 | Modali di azione (creazione fattura, modifica profilo, paywall) |
| `components/ui/` | 6 | Componenti UI di base |
| `components/layout/` | 3 | Elementi di struttura (navigazione, header) |
| `components/` (root) | 6 | Componenti condivisi |
| `lib/countries/` | 4 | Interfaccia comune dei moduli per paese e implementazioni `it`/`es` |
| `lib/it/` | 3 | Logica di calcolo fiscale italiana |
| `lib/es/` | 2 | Logica di calcolo fiscale spagnola |
| `lib/` (root) | 8 | Utility di dominio condivise (i18n, formattazione) |
| `hooks/` | 3 | Hook React condivisi |
| `services/` | 2 | Chiamate a Supabase e generazione documenti |
| `data/` | 2 | Dati statici (es. codici ATECO) |
| `locales/` | 2 | Traduzioni IT/ES (~280 chiavi ciascuna) |
| `styles/` | 1 | Design token (CSS variables) |
| `utils/` | 1 | Utility generiche |
| `__tests__/` | 4 | Test unitari (Vitest) |

## Backend (`supabase/`)

| Elemento | Contenuto |
|---|---|
| `migrations/` | 17 file SQL. Convenzioni in `supabase/migrations/README.md` |
| `functions/` | 12 Edge Function. Dettaglio in `supabase/functions/README.md` |
| `schema_production.sql` | Dump dello schema di produzione |
| `email-templates/` | Template delle email transazionali |

## Test

| Percorso | Contenuto |
|---|---|
| `e2e/` | 9 suite Playwright più `helpers.ts` |
| `src/__tests__/` | 4 file di test unitari (Vitest) |

## Documentazione

`docs/` contiene la Data Room. Indice in `data-room-index.md`.

## File di configurazione (root)

| File | Contenuto |
|---|---|
| `package.json` | Dipendenze e script (`dev`, `build`, `lint`, `test`) |
| `vite.config.ts` | Configurazione build e dev server |
| `tsconfig.json` | Configurazione TypeScript |
| `vercel.json` | Routing multi-pagina e header di sicurezza HTTP |
| `playwright.config.ts` | Configurazione test end-to-end |
| `.env.example` | Variabili d'ambiente lato client (vedi `environment-variables-guide.md`) |
| `CLAUDE.md` | Regole di dominio e convenzioni di sviluppo |
