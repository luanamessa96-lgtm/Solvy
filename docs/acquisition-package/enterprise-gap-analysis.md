# Solvy — Enterprise Gap Analysis

*Solo ciò che manca davvero per considerare il pacchetto pronto per una vendita professionale. Classificazione: 🔴 Bloccante, 🟡 Importante, ⚪ Miglioramento.*

## 🔴 Bloccante

*Nessun elemento bloccante residuo.*

**Backup del database — risolto e verificato con restore reale (12/07/2026)**
Verifica diretta sulla dashboard Supabase (12/07/2026) aveva confermato l'assenza totale di backup sul piano **Free** ("Last Backup: No backups") — unico punto classificato 🔴 in questa analisi. Risolto con `.github/workflows/db-backup.yml`: dump giornaliero automatico (ruoli, schema, dati) via Supabase CLI, cifrato AES-256 prima di lasciare il runner, conservato come artifact GitHub per 90 giorni — soluzione ponte a costo zero, scelta esplicitamente al posto dell'upgrade a piano Pro.
Non dichiarato chiuso alla sola implementazione: lo stesso giorno è stato eseguito un run reale del workflow (successo, artifact non vuoto) seguito da un **restore end-to-end completo su un database Postgres 17 locale isolato** (mai produzione) — decifratura dell'artifact, ripristino di ruoli/schema/dati, verifica dei conteggi riga sulle 4 tabelle applicative (profiles, documents, deadlines, accountant, dati reali coerenti con la beta chiusa) e conferma che tutte le 20 policy RLS e le relative `ENABLE ROW LEVEL SECURITY` sono presenti e corrette nel dump. Gli unici errori del test (schemi `auth`/`extensions`/`storage`, estensione `supabase_vault`) sono limiti noti di un Postgres locale "vergine" rispetto alla piattaforma Supabase — non applicabili quando il target di restore è un vero progetto Supabase. Procedura di ripristino documentata in `docs/operations-manual.md`.

## 🟡 Importante

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
