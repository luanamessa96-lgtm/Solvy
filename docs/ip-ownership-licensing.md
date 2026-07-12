# Solvy — IP Ownership & Licensing Statement

*Questo documento risponde alla domanda che un legale di un acquirente pone prima di qualsiasi altra verifica tecnica: chi possiede davvero questo codice, e posso rivenderlo senza obblighi legali nascosti? È leggibile da solo. Per il piano di trasferimento degli account operativi vedi `credential-transfer-plan.md`.*

## Proprietà del codice sorgente

L'intero codice applicativo di Solvy (frontend React, funzioni serverless, migration del database) è stato scritto dalla fondatrice, Luana Messa. **Confermato dalla fondatrice**: nessun contractor, agenzia o collaboratore esterno ha contribuito al codice — non esiste quindi alcuna proprietà intellettuale di terzi da cedere o verificare. È il singolo controllo più citato nelle due diligence software, ed è risolto nel modo più semplice possibile: un solo autore, nessuna terza parte coinvolta.

## Proprietà del dominio e degli asset di brand

**Confermato dalla fondatrice**: il dominio `solvyapp.com` è di sua proprietà diretta, così come gli asset di brand principali (nome, logo, design e materiali grafici) — nessuna licenza o cessione di terzi da verificare in trasferimento.

## Audit delle licenze delle dipendenze

Eseguito con strumento automatico (`license-checker`) sull'intero albero delle dipendenze — non solo le 27 dirette, ma tutte le librerie transitive effettivamente incluse nel progetto (oltre 230 pacchetti totali).

**Risultato principale: nessuna dipendenza con licenza copyleft forte (GPL, AGPL) senza alternativa permissiva.** Non ci sono obblighi di rilascio del codice sorgente derivanti dalle librerie utilizzate.

| Licenza | Pacchetti | Rischio per una cessione commerciale |
|---|---|---|
| MIT | 190 | Nessuno — permissiva, uso commerciale libero |
| ISC | 21 | Nessuno — equivalente a MIT |
| Apache-2.0 | 9 | Nessuno — permissiva, richiede solo mantenimento delle note di copyright |
| BSD-3-Clause, 0BSD | 4 | Nessuno — permissive |
| MPL-2.0 | 2 | Basso — copyleft solo sui file modificati direttamente della libreria stessa, non applicabile qui (nessun file di queste librerie è stato modificato) |

**Casi specifici verificati singolarmente:**

- **`jszip`** (dipendenza diretta, usata per l'export documenti) — licenza doppia `MIT OR GPL-3.0`: si applica il termine MIT, a scelta del licenziatario. Nessun obbligo GPL.
- **`dompurify`** (transitiva, via `jspdf`) — licenza doppia `MPL-2.0 OR Apache-2.0`: si applica Apache-2.0. Nessun rischio.
- **`@img/sharp-libvips-darwin-arm64`** (transitiva, via `sharp`) — **LGPL-3.0-or-later**. È l'unica libreria copyleft (debole) trovata. Rischio nullo nella pratica: `sharp` è una devDependency, usata solo in fase di build/sviluppo, non è inclusa nel bundle distribuito agli utenti finali.
- **`@fontsource-variable/inter`** (diretta, il font dell'interfaccia) — licenza **OFL-1.1** (SIL Open Font License), lo standard per i font, esplicitamente concepita per l'inclusione in software commerciale.
- **`caniuse-lite`** (transitiva, dati di compatibilità browser) — **CC-BY-4.0**, richiede solo attribuzione, non è codice eseguito nell'app.

Nessuna delle librerie sopra impedisce o complica una cessione commerciale del prodotto.

## Componenti verificati per dipendenza da servizi di terzi

Il componente `DiceBearAvatar` (`src/components/ui/DiceBearAvatar.tsx`), nonostante il nome, **non utilizza né l'API né la libreria del servizio DiceBear**: genera avatar localmente da iniziali del nome, senza chiamate esterne né dipendenze di terze parti. Codice interamente originale, nessuna implicazione di licenza.

## Correzione applicata durante questa verifica

`package.json` dichiarava `"name": "react-example"` — un residuo di boilerplate mai aggiornato — e non aveva un campo `"license"` esplicito nonostante il README dichiari licenza proprietaria. Corretto in questa fase: nome del progetto (`solvy`) e licenza (`UNLICENSED`, coerente con quanto già dichiarato in `README.md`) ora coincidono con la realtà del prodotto.

## Riepilogo

**Solvy non presenta ostacoli noti a una cessione commerciale**, né dal lato licenze open source (nessuna dipendenza a copyleft forte, un solo caso di copyleft debole confinato a uno strumento di build non distribuito) né dal lato proprietà (codice, dominio e brand interamente di proprietà della fondatrice, nessuna terza parte con diritti da cedere o verificare). Documento completo.
