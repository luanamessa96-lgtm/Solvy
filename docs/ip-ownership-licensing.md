# Solvy — IP Ownership & Licensing

Titolarità del software, stato del marchio e licenze delle dipendenze open source. Le voci relative alla titolarità sono rese come dichiarazioni della parte venditrice, da confermare con la documentazione di supporto in sede di due diligence. L'analisi estesa del marchio è in `trademark-analysis.md`.

## Proprietà del codice sorgente

Secondo dichiarazione della fondatrice, Luana Messa, l'intero codice applicativo (frontend React, funzioni serverless, migration del database) è stato sviluppato dalla stessa, senza il contributo di contractor, agenzie o collaboratori esterni. Non risulta pertanto proprietà intellettuale di terzi incorporata nel codice originale.

## Proprietà del dominio e degli asset di brand

Secondo dichiarazione della fondatrice, il dominio `solvyapp.com` e gli asset di brand (nome, logo, design, materiali grafici) sono di sua titolarità diretta, senza licenze o cessioni di terzi.

## Stato del marchio

Il segno "Solvy" non risulta registrato come marchio. Ricerca sul database EUIPO eSearch (12/07/2026):

- Il marchio denominativo "SOLVY" è stato depositato nel 2018 da un soggetto terzo non collegato ("Solvy Ltd", Malta), in classi sovrapposte all'ambito di attività di Solvy.
- La domanda ha ricevuto un'opposizione da Banco de Sabadell, S.A. ed è stata ritirata nel 2020.
- Non risultano conflitti attivi alla data della ricerca. La registrabilità futura del segno non è determinabile senza una verifica legale dedicata.

Dettaglio dei numeri di pratica, dei motivi di opposizione e dell'analisi in `trademark-analysis.md`.

## Audit delle licenze open source

Audit eseguito con `license-checker` sull'intero albero delle dipendenze (27 dirette e relative transitive, oltre 230 pacchetti complessivi).

Nessuna dipendenza applicabile impone una licenza copyleft forte (GPL, AGPL): i casi a doppia licenza consentono l'opzione permissiva (vedi "Casi specifici"). Non risultano obblighi di disclosure del codice sorgente derivanti dalle dipendenze.

| Licenza | Pacchetti | Natura |
|---|---|---|
| MIT | 190 | Permissiva |
| ISC | 21 | Permissiva |
| Apache-2.0 | 9 | Permissiva, con obbligo di mantenimento delle note di copyright |
| BSD-3-Clause, 0BSD | 4 | Permissiva |
| MPL-2.0 | 2 | Copyleft a livello di singolo file |

I file delle librerie MPL-2.0 non risultano modificati.

### Casi specifici

- **`jszip`** (diretta, export documenti) — doppia licenza `MIT OR GPL-3.0`. Si applica il termine MIT, a scelta del licenziatario.
- **`dompurify`** (transitiva, via `jspdf`) — doppia licenza `MPL-2.0 OR Apache-2.0`. Si applica Apache-2.0.
- **`@img/sharp-libvips-darwin-arm64`** (transitiva, via `sharp`) — `LGPL-3.0-or-later`. `sharp` è una devDependency utilizzata in fase di build/sviluppo e non è inclusa nel bundle distribuito.
- **`@fontsource-variable/inter`** (diretta, font dell'interfaccia) — `OFL-1.1` (SIL Open Font License).
- **`caniuse-lite`** (transitiva, dati di compatibilità browser) — `CC-BY-4.0`. Richiede attribuzione; non è codice eseguito nell'applicazione.

## Componenti e servizi di terze parti

Il componente `DiceBearAvatar` (`src/components/ui/DiceBearAvatar.tsx`) non utilizza l'API né la libreria del servizio DiceBear: genera avatar localmente a partire dalle iniziali del nome, senza chiamate esterne né dipendenze di terzi.

## Metadati di licenza del progetto

`package.json` dichiara `name: "solvy"` e `license: "UNLICENSED"`, coerentemente con la licenza proprietaria indicata in `README.md`.

## Punti da verificare

- Le titolarità di codice, dominio e asset di brand sono rese come dichiarazioni della parte venditrice; da confermare con la documentazione di supporto (registrazioni di dominio, cronologia del repository, dichiarazioni contrattuali).
- La registrabilità del marchio "Solvy" non è determinabile senza una verifica legale dedicata, in ragione del precedente EUIPO citato (vedi `trademark-analysis.md`).
