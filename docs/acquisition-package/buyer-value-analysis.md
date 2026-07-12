# Solvy — Buyer Value Analysis

*Non un inventario. Per ogni asset chiave: perché un CTO pagherebbe per averlo, quale problema evita, quale lavoro elimina, quale rischio riduce, quale valore aggiunge in due diligence.*

## Database con RLS verificata

Un CTO non paga per "un database" — paga per non dover rifare l'audit di sicurezza sui dati fiscali di terzi da zero. Ogni tabella ha Row Level Security verificata restrittiva, non dichiarata: significa che il lavoro di dimostrare che un utente non può leggere i dati di un altro è già fatto, verificato, e documentato in un formato che un security engineer può controllare in un'ora invece che in una settimana. Il rischio che elimina non è tecnico, è reputazionale: un data breach su dati fiscali, per un buyer fintech, è il tipo di evento che chiude un'azienda.

## 12 Edge Function payment-critical

Il valore qui non è il codice che processa un pagamento — è che quel codice è già **idempotente**, verificato contro la duplicazione di eventi Stripe, con autorizzazione JWT verificata (non solo autenticazione) su ogni endpoint distruttivo. Un CTO che ha già gestito un incidente di doppia fatturazione riconosce immediatamente cosa significa non doverci pensare. Elimina settimane di integrazione Stripe e il rischio, concreto e costoso, di un bug di idempotenza scoperto in produzione con soldi reali di mezzo.

## Pattern modulo-paese

Questo è l'unico asset del pacchetto che genera valore **dopo** l'acquisizione, non solo durante. Un buyer che vuole espandere a un terzo mercato fiscale non deve valutare se l'architettura regge l'espansione — l'architettura è già stata progettata per quello specifico scopo, e lo dimostra il fatto che due paesi (Italia e Spagna, con la variante Canarie) già coesistono senza codice condiviso fragile. Elimina la domanda più costosa di una due diligence tecnica: "se investiamo per crescere, dovremo riscrivere tutto?"

## 8 skill di dominio Claude Code

Questo è l'asset con il rapporto valore/percezione più squilibrato del pacchetto. Un CTO che valuta Solvy con un team AI-assisted non sta comprando solo codice che implementa le regole fiscali italiane e spagnole — sta comprando la conoscenza normativa stessa, già verificata contro fonti ufficiali (Agenzia delle Entrate, INPS, AEAT), in un formato che il proprio team può interrogare e mantenere aggiornato dal primo giorno. Elimina mesi di lavoro che normalmente nessuno considera nel prezzo di un'acquisizione software, perché normalmente non esiste: la conoscenza di dominio di solito se ne va con il team che l'ha maturata. Qui resta, ed è eseguibile.

## Data Room di 14 documenti verificati

Il valore non è "avere documentazione" — è **non dover verificare se la documentazione è vera**. Ogni claim tecnico in questi documenti è stato controllato nel codice prima di essere scritto (schema autentico via dump diretto, non ricostruito a mano; Free/Pro verificato nel codice, non dichiarato; numeri di test verificati eseguendo la suite). Un CTO che ha vissuto una due diligence dove la documentazione mentiva riconosce la differenza in pochi minuti di lettura. Elimina settimane di verifica incrociata tra quello che i documenti dicono e quello che il codice fa davvero.

## Pipeline CI/CD funzionante

Piccolo in sé, ma verificato **rotto e poi riparato** durante questo stesso percorso — un dettaglio che vale la pena dichiarare in trattativa, non nascondere: dimostra che il processo di verifica descritto nella documentazione è stato testato contro la realtà, non solo scritto. Elimina il rischio silenzioso più comune nelle acquisizioni software: comprare un repository dove "la CI c'è" ma nessuno ha mai controllato se funziona davvero.

## Piano di trasferimento credenziali (8 servizi)

Senza questo documento, il closing operativo di qualunque acquisizione software si allunga di settimane — è il lavoro che normalmente tocca fare a un IT manager il giorno dopo la firma, scoprendo servizio per servizio cosa serve trasferire. Qui è già mappato, con priorità e metodo. Elimina il rischio più banale e più frequente nelle acquisizioni piccole: dimenticare un servizio e scoprirlo quando smette di funzionare.

## Disclosure onesta dei limiti noti

Controintuitivo ma reale: un documento che elenca cosa *non* funziona ancora (VeriFactu Spagna, A-Cube in sandbox) aumenta la fiducia più di quanto la riduca. Un CTO esperto sa che ogni software ha limiti — quello che valuta è se il venditore li conosce e li dichiara, o se li scopre lui in produzione dopo il closing. Elimina il rischio di rinegoziazione a valle: se il gap è dichiarato prima, non può essere usato come leva dopo.
