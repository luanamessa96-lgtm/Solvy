# Solvy — Installation Guide

*Questo documento serve per far girare Solvy in locale rapidamente, per valutarlo prima di una decisione — non per metterlo in produzione (per quello vedi `deployment-guide.md`). È leggibile da solo.*

## Nota di scope

Solvy non è un'app statica: oltre alla schermata di login, ogni funzionalità (profili, fatture, calcoli fiscali) richiede un backend Supabase funzionante. Due strade per averne uno in locale:

- **Opzione A** — creare un progetto Supabase minimo proprio: bastano i primi due passi del `deployment-guide.md` (creazione progetto + esecuzione di `schema_production.sql`), senza bisogno di configurare Stripe, A-Cube o le altre integrazioni per una semplice valutazione.
- **Opzione B** — richiedere accesso temporaneo a un ambiente demo esistente, se già in fase di trattativa.

## Prerequisiti

Node.js (versione recente, LTS consigliata) e npm, inclusi entrambi in una singola installazione di Node.

## Passo 1 — Clone e installazione

```
git clone <url-repository>
cd Solvy
npm install
```

## Passo 2 — Variabili d'ambiente

Copia `.env.example` in `.env` e compila almeno `VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY` (Opzione A o B sopra). Elenco completo e scopo di ogni variabile in `environment-variables-guide.md` — per una semplice valutazione locale, Stripe e le altre integrazioni non sono indispensabili.

## Passo 3 — Avviare l'app

```
npm run dev
```

Il dev server parte su `localhost:3000` (porta di default, vedi `vite.config.ts` per eventuali modifiche).

## Passo 4 — Eseguire i test unitari

```
npm test
```

**Nota**: questo comando raccoglie anche i file Playwright sotto `e2e/`, che falliscono la fase di raccolta (non sono compatibili con il runner Vitest) — non sono asserzioni fallite, sono file nel posto sbagliato per questo comando. I 161 test unitari reali (logica fiscale) passano tutti. Per isolarli: `npm test -- src/__tests__`.

## Passo 5 — Verificare la build

```
npm run build
```

Conferma che il progetto compili correttamente in produzione, indipendentemente dal backend collegato.

## Passo 6 — Suite end-to-end (opzionale)

```
npx playwright test
```

Richiede le credenziali in `.env.test.example` e — per default — punta all'ambiente di produzione (solvyapp.com), non all'istanza locale. Non necessaria per una semplice valutazione del codice.

## Tempo stimato

- **Solo vedere l'app girare** (con un backend Supabase minimo già pronto): ~10 minuti
- **Partendo da zero, incluso creare un progetto Supabase di valutazione**: ~20-30 minuti
