# Solvy — Enterprise Gap Analysis

*Solo ciò che manca davvero per considerare il pacchetto pronto per una vendita professionale. Classificazione: 🔴 Bloccante, 🟡 Importante, ⚪ Miglioramento.*

## 🔴 Bloccante

**Backup del database — verificato assente, non solo "da confermare"**
Verifica diretta sulla dashboard Supabase (12/07/2026): il progetto opera su piano **Free**, e il pannello di controllo dichiara esplicitamente **"Last Backup: No backups"**. Nessun backup automatico è mai stato eseguito su questo progetto. Un segnale precedente raccolto via CLI (`supabase backups list`, campo `WALG: true`) aveva suggerito una situazione più favorevole — smentito dalla dashboard, che è la fonte autoritativa: quel campo riflette un meccanismo infrastrutturale interno di Supabase, non un backup utilizzabile sul piano Free. È l'unico elemento di questa analisi che, se scoperto dall'acquirente durante il closing invece che risolto prima, blocca o fa rinegoziare la trattativa nell'immediato — nessuna acquisizione seria si chiude senza la certezza che i dati siano recuperabili.
**Remediation consigliata**: upgrade a piano Pro (backup automatici giornalieri inclusi) prima del closing, oppure — come soluzione ponte a costo zero — un dump manuale pianificato del database (`supabase db dump` o `pg_dump` diretto) conservato fuori da Supabase fino all'upgrade.

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
