# Solvy — Gap Analysis

*Cosa manca davvero, oggi, per considerare questo pacchetto pronto per una vendita. Non un riepilogo del lavoro svolto — solo lo stato residuo, verificato.*

## Backup del database — risolto e verificato con restore reale

Il progetto opera su piano Supabase Free, che non include backup automatici (verificato da dashboard: "Last Backup: No backups"). Risolto con `.github/workflows/db-backup.yml`: dump giornaliero cifrato (AES-256), conservato come artifact GitHub 90 giorni. Non dichiarato chiuso alla sola implementazione: eseguito un run reale e un **restore end-to-end su un database isolato** (mai produzione) — ruoli, schema e dati reali ripristinati correttamente, tutte le 20 policy RLS verificate presenti e corrette nel dump. Procedura di ripristino in `operations-manual.md`.

## Marchio "Solvy" — non registrato, precedente noto verificato

Nessuna registrazione formale del marchio. Ricerca diretta su EUIPO eSearch: il nome esatto "SOLVY" è già stato depositato nel 2018 da una società terza non collegata, in classi sovrapposte all'attività di Solvy, ha ricevuto opposizione da un istituto bancario spagnolo, ed è stato ritirato nel 2020. Nessun conflitto attivo oggi. Analisi costo/beneficio conclude di non registrare preventivamente — decisione motivata, disclosure completa in `trademark-analysis.md` e `ip-ownership-licensing.md`.

## Google Analytics 4 e Search Console — piano di trasferimento documentato

Entrambi attivi (GA4 `G-2F4JDKGKNX`, Search Console verificata). Piano di trasferimento nativo (nessuna perdita di storico) in `analytics-search-console-transfer.md`. Azioni manuali residue, non verificabili dal repository: conferma dell'account Google proprietario, stato 2FA, eventuali collegamenti ad altri prodotti Google.

## Miglioramenti opzionali, non bloccanti

- **Materiale marketing esterno** (video, social) — prodotto in fasi precedenti, stato non riverificabile da questa sede
- **Ambiente demo separato dalla produzione** — comodo per una valutazione pratica, non necessario: la documentazione permette una valutazione completa senza eseguire nulla
- **Procedura scritta di aggiornamento normativo fiscale** — oggi implicita in `CLAUDE.md` e nelle skill di dominio, non ancora formalizzata come processo a sé
