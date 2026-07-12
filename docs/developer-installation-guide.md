# Solvy — Developer Installation Guide

Procedura per eseguire Solvy in locale a scopo di valutazione tecnica.

## Prerequisiti

- **Node.js** (LTS) e **npm**.
- **Git**.
- Un'istanza **Supabase** raggiungibile dall'ambiente locale. In assenza di un'istanza esistente, crearne una eseguendo i passi 1–2 di `deployment-guide.md` (creazione progetto ed esecuzione di `schema_production.sql`). Per la sola valutazione non sono necessarie le integrazioni Stripe, A-Cube, Loops o Telegram.

## 1 — Ottenimento del codice sorgente

```
git clone <url-repository>
cd Solvy
```

## 2 — Installazione delle dipendenze

```
npm install
```

## 3 — Configurazione delle variabili d'ambiente

Copiare `.env.example` in `.env` e valorizzare almeno:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`

Elenco completo delle variabili in `environment-variables-guide.md`.

## 4 — Avvio dell'applicazione

```
npm run dev
```

Dev server su `localhost:3000` (porta definita in `vite.config.ts`).

## 5 — Esecuzione dei test unitari

```
npm test -- src/__tests__
```

Esegue la suite unitaria (161 test) sulla logica fiscale e su alcuni percorsi critici.

## 6 — Verifica della build

```
npm run build
```

Verifica la compilazione della build di produzione, indipendentemente dal backend collegato.

## 7 — Test end-to-end (opzionale)

```
npx playwright test
```

Richiede le credenziali in `.env.test.example`. Per default la suite è eseguita contro l'ambiente di produzione (`solvyapp.com`), non contro l'istanza locale.
