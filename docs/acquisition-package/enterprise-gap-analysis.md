# Solvy — Enterprise Gap Analysis

*Solo ciò che manca davvero per considerare il pacchetto pronto per una vendita professionale. Classificazione: 🔴 Bloccante, 🟡 Importante, ⚪ Miglioramento.*

## 🔴 Bloccante

*Nessun elemento bloccante residuo. Il backup del database, unico punto classificato 🔴 in questa analisi, è stato risolto tecnicamente — vedi sezione 🟡 per l'ultimo passaggio di attivazione.*

## 🟡 Importante

**Backup del database — implementato, in attesa di attivazione e primo run verificato**
Verifica diretta sulla dashboard Supabase (12/07/2026) aveva confermato l'assenza totale di backup sul piano **Free** ("Last Backup: No backups"). Risolto il 12/07/2026 con `.github/workflows/db-backup.yml`: dump giornaliero automatico (ruoli, schema, dati) via Supabase CLI, cifrato AES-256 prima di lasciare il runner, conservato come artifact GitHub per 90 giorni — soluzione ponte a costo zero, scelta esplicitamente al posto dell'upgrade a piano Pro. Procedura di ripristino documentata in `docs/operations-manual.md`.
Resta 🟡 e non 🟢 per un motivo preciso, coerente con la disciplina di verifica di tutto questo pacchetto: il meccanismo richiede due GitHub Secret (`SUPABASE_DB_URL`, `BACKUP_ENCRYPTION_PASSPHRASE`) che solo la proprietaria del progetto può configurare, e non è ancora stato osservato un run reale andato a buon fine. Passa a 🟢 non appena i secret sono impostati e un run manuale (`workflow_dispatch`) produce un artifact cifrato non vuoto.

**Documento "AI Development Methodology"**
Le 8 skill di dominio e la metodologia di sviluppo AI-assisted sono, per valore, tra i primi due asset del pacchetto — ma oggi nessun documento lo dichiara esplicitamente a chi non apre `.claude/skills/`. È importante perché lascia scoperto l'asset con il rapporto valore/visibilità peggiore di tutto il pacchetto, non perché manchi qualcosa di funzionale.

**Verifica formale dello stato del marchio "Solvy"**
Confermata la proprietà d'uso di nome e brand, non confermata l'esistenza di una registrazione formale. Importante se l'acquirente intende continuare a operare sotto lo stesso nome — irrilevante se prevede un rebranding.

**Export dello storico Google Analytics 4 e Search Console**
L'integrazione è confermata attiva, ma i dati storici vivono fuori dal repository, nella dashboard Google. È l'unico dato di business intelligence del pacchetto, e va reso esplicito prima che si perda nel passaggio di proprietà degli account.

## ⚪ Miglioramento

**Conferma dello stato di materiale marketing esterno** (video YouTube, contenuti social)
Prodotti in fasi precedenti del progetto, stato attuale non verificabile da questa sede. Non bloccante: il pacchetto resta completo e vendibile anche senza, ma la loro conferma aggiunge valore percepito a costo quasi nullo.

**Ambiente demo separato dalla produzione**
Utile per far valutare il prodotto a un acquirente senza toccare dati reali, ma non necessario alla vendita stessa — la Data Room già permette una valutazione completa senza clonare o eseguire nulla.

**Procedura scritta di aggiornamento normativo fiscale**
Oggi implicita in `CLAUDE.md` e nelle skill di dominio, non ancora formalizzata come processo autonomo per un nuovo team. Miglioramento, non gap: la conoscenza esiste già, manca solo la sua descrizione come procedura ripetibile.

---

Ogni altro elemento precedentemente segnalato in questo percorso (CI/CD, sicurezza, codice, licenze, IP, credenziali, documentazione tecnica) è stato verificato, corretto dove necessario, e confermato chiuso. Questa lista rappresenta lo stato reale residuo, non un riepilogo di tutto il lavoro già svolto.
