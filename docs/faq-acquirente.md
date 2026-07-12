# Solvy — FAQ per l'acquirente

*Domande trasversali con risposta breve, per chi salta da un tema all'altro senza voler leggere ogni documento per intero. Ogni risposta rimanda al documento di dettaglio dove serve approfondire. È leggibile da solo.*

## Il deal

**Perché Solvy è in vendita?**
La fondatrice ha cambiato direzione strategica: vuole costruire un ecosistema di prodotti digitali scalabili, non gestire nel tempo un software fiscale (aggiornamenti normativi, assistenza, operatività continua). Solvy resta un prodotto tecnicamente solido e completo — la scelta di vendere è strategica, non dettata da problemi del prodotto.

**Che tipo di operazione è?**
Cessione di asset tecnologico, non acquisizione societaria: codice, architettura, documentazione e infrastruttura concordata — non equity, cap table o base clienti (dettaglio in `executive-overview.md`).

**Cosa è incluso?**
Codice sorgente completo, database con relative policy di sicurezza, 12 funzioni serverless, 161+9 test, l'intera Data Room, e — se le parti lo concordano — l'infrastruttura live. Elenco completo in `executive-overview.md`.

## Il prodotto

**Si può estendere Solvy ad altri paesi oltre Italia e Spagna?**
È il punto di forza architetturale principale del prodotto: ogni calcolo fiscale passa da un'interfaccia comune (`CountryModule`) implementata separatamente per ciascun paese. Aggiungerne uno nuovo significa scrivere un nuovo modulo, senza toccare dashboard, form o export esistenti (dettaglio in `architecture-overview.md`, sezione 2). Il tempo necessario dipende dalla complessità normativa del paese da aggiungere, non dall'architettura.

**Cosa distingue il piano Free dal piano Pro?**
Free: 1 profilo fiscale, fino a 8 fatture, calcoli di base, calendario scadenze. Pro: profili e fatture illimitati, export per il commercialista, report avanzati, OCR scontrini, temi dedicati. Tabella completa e verificata nel codice in `feature-guide.md`.

**Cosa manca o è incompleto oggi?**
Due gap dichiarati esplicitamente: assenza di conformità VeriFactu per la Spagna (non ancora obbligatoria per legge) e stato sandbox (non production) dell'integrazione A-Cube per la fatturazione elettronica italiana. Dettaglio completo, incluso perché non sono difetti nascosti, in `known-limitations.md`.

## Presa in carico e competenze

**Quanto tempo serve per prendere in carico il progetto?**
Per orientarsi a livello di prodotto e architettura (Executive Overview, Architecture Overview, Feature Guide): meno di un'ora di lettura. Per un ingegnere con esperienza React/TypeScript e Postgres, essere operativo sul codice richiede tipicamente una singola giornata, aiutato dalla Repository Structure e dal Deployment Guide.

**Quanto tempo serve per il deploy?**
Da 30 minuti (infrastruttura minima) a circa 4 ore (con tutte le integrazioni collegate) — stima dettagliata per fase in `deployment-guide.md`.

**Quali competenze servono per mantenerlo?**
React e TypeScript per il frontend, Postgres/SQL e familiarità con Supabase (Auth, RLS, Edge Function) per il backend. Le funzioni serverless sono scritte in TypeScript su runtime Deno — sintassi molto simile a Node.js, non richiede competenze aggiuntive per chi già conosce TypeScript. Nessuna tecnologia esotica o proprietaria nello stack (dettaglio in `architecture-overview.md`).

## Sicurezza e conformità

**I dati degli utenti sono al sicuro?**
Ogni tabella del database ha Row Level Security verificata e restrittiva: un utente non può accedere ai dati di un altro, controllo imposto dal database stesso. Nessun secret è mai stato committato nel codice sorgente. Postura completa, inclusi i punti ancora da migliorare, in `security-overview.md`.

**Solvy è conforme alle normative fiscali locali?**
Sì per l'impianto generale (posizionato come strumento di calcolo/gestione, non come software di fatturazione certificato — scelta che evita obblighi non necessari), con l'unica eccezione dichiarata di VeriFactu in Spagna (vedi sopra). La fatturazione elettronica italiana verso il Sistema di Interscambio è tecnicamente completa e già testata.

## Dopo l'acquisizione

**Cosa devo trasferire per operare Solvy in autonomia?**
8 servizi esterni (Supabase, Stripe, A-Cube, Loops, Telegram, Vercel, dominio, GitHub), con priorità e metodo di trasferimento per ciascuno in `credential-transfer-plan.md`.

**Cosa faccio se qualcosa si rompe?**
`operations-manual.md` copre il monitoraggio esistente, un problema operativo ricorrente già documentato (redeploy di `stripe-webhook`), una tabella di troubleshooting rapido e cosa serve per un backup/restore completo.

**La fondatrice resta disponibile dopo il closing?**
Non automaticamente incluso nell'operazione — è un punto da negoziare esplicitamente come parte dell'accordo, non una garanzia implicita.
