# Solvy — Enterprise Gap Analysis

*Solo ciò che manca davvero per considerare il pacchetto pronto per una vendita professionale. Classificazione: 🔴 Bloccante, 🟡 Importante, ⚪ Miglioramento.*

## 🔴 Bloccante

*Nessun elemento bloccante residuo.*

**Backup del database — risolto e verificato con restore reale (12/07/2026)**
Verifica diretta sulla dashboard Supabase (12/07/2026) aveva confermato l'assenza totale di backup sul piano **Free** ("Last Backup: No backups") — unico punto classificato 🔴 in questa analisi. Risolto con `.github/workflows/db-backup.yml`: dump giornaliero automatico (ruoli, schema, dati) via Supabase CLI, cifrato AES-256 prima di lasciare il runner, conservato come artifact GitHub per 90 giorni — soluzione ponte a costo zero, scelta esplicitamente al posto dell'upgrade a piano Pro.
Non dichiarato chiuso alla sola implementazione: lo stesso giorno è stato eseguito un run reale del workflow (successo, artifact non vuoto) seguito da un **restore end-to-end completo su un database Postgres 17 locale isolato** (mai produzione) — decifratura dell'artifact, ripristino di ruoli/schema/dati, verifica dei conteggi riga sulle 4 tabelle applicative (profiles, documents, deadlines, accountant, dati reali coerenti con la beta chiusa) e conferma che tutte le 20 policy RLS e le relative `ENABLE ROW LEVEL SECURITY` sono presenti e corrette nel dump. Gli unici errori del test (schemi `auth`/`extensions`/`storage`, estensione `supabase_vault`) sono limiti noti di un Postgres locale "vergine" rispetto alla piattaforma Supabase — non applicabili quando il target di restore è un vero progetto Supabase. Procedura di ripristino documentata in `docs/operations-manual.md`.

## 🟡 Importante

*Nessun elemento aperto. I tre punti di questa sezione sono stati chiusi il 12/07/2026 — dettaglio sotto per trasparenza, coerente con il resto di questo documento.*

**Documento "AI Development Methodology" — chiuso**
Creato `docs/acquisition-package/ai-development-methodology.md`: descrive le 6 skill di dominio (non 8 — cifra corretta durante questo lavoro, verificato che le due skill in eccesso erano generiche/mai personalizzate per Solvy, nessun commit le ha mai toccate) in termini di valore per un CTO acquirente, know-how trasferito, impatto sui tempi di onboarding e ragioni dell'aumento di valore. Il conteggio corretto (6, non 8) è stato propagato a tutti i documenti del pacchetto che lo citavano.

**Verifica formale dello stato del marchio "Solvy" — chiuso come decisione documentata, non come registrazione**
Creato `docs/acquisition-package/trademark-analysis.md`: analisi costo/tempi/beneficio conclude che la registrazione preventiva non è giustificata per una cessione di asset tecnologico senza validazione commerciale. La ricerca di anteriorità è stata eseguita direttamente su EUIPO eSearch (12/07/2026, non un motore di ricerca generico) e ha trovato un precedente concreto: il marchio denominativo "SOLVY" — grafia esatta — è già stato depositato nel 2018 da "Solvy Ltd" (Malta) nelle classi 35/36/42 (marketing, servizi di pagamento, sviluppo software — sovrapposizione diretta con Solvy), ha ricevuto un'opposizione formale da **Banco de Sabadell, S.A.** per rischio di confusione, ed entrambe le domande (denominativa e figurativa) sono state **ritirate nel 2020** dopo il procedimento. Non è la prova che "Solvy" sia oggi bloccato, ma è la prova che un tentativo quasi identico ha già incontrato una resistenza legale seria in uno dei due mercati di Solvy. Rafforza, con evidenza reale, la conclusione di non registrare preventivamente e di trattare qualunque tentativo futuro come lavoro per un consulente in proprietà industriale, non fai-da-te. Dettaglio completo, inclusi i numeri di pratica EUIPO, in `trademark-analysis.md`.

**Export dello storico Google Analytics 4 e Search Console — chiuso**
Creato `docs/acquisition-package/analytics-search-console-transfer.md`: cosa contengono i due account (GA4 `G-2F4JDKGKNX`, Search Console verificata via `public/googlee414c4209c9dc88d.html`), come si trasferiscono nativamente senza perdita di storico, quando farlo nella sequenza di closing. **Azioni manuali residue per la fondatrice**, non verificabili dal repository: confermare quale account Google possiede le due property, verificare 2FA attivo, controllare eventuali altri utenti o collegamenti (Google Ads, Tag Manager) — elenco completo nel documento.

## ⚪ Miglioramento

**Conferma dello stato di materiale marketing esterno** (video YouTube, contenuti social)
Prodotti in fasi precedenti del progetto, stato attuale non verificabile da questa sede. Non bloccante: il pacchetto resta completo e vendibile anche senza, ma la loro conferma aggiunge valore percepito a costo quasi nullo.

**Ambiente demo separato dalla produzione**
Utile per far valutare il prodotto a un acquirente senza toccare dati reali, ma non necessario alla vendita stessa — la Data Room già permette una valutazione completa senza clonare o eseguire nulla.

**Procedura scritta di aggiornamento normativo fiscale**
Oggi implicita in `CLAUDE.md` e nelle skill di dominio, non ancora formalizzata come processo autonomo per un nuovo team. Miglioramento, non gap: la conoscenza esiste già, manca solo la sua descrizione come procedura ripetibile.

---

Ogni altro elemento precedentemente segnalato in questo percorso (CI/CD, sicurezza, codice, licenze, IP, credenziali, documentazione tecnica) è stato verificato, corretto dove necessario, e confermato chiuso. Questa lista rappresenta lo stato reale residuo, non un riepilogo di tutto il lavoro già svolto.
