# Solvy — Enterprise Acquisition Package: Executive Summary

Solvy è un asset tecnologico pronto per essere acquisito: una PWA di gestione fiscale per freelance in Italia e Spagna, con architettura estendibile ad altri mercati, sicurezza verificata, e un pacchetto di trasferimento costruito per ridurre al minimo il rischio percepito da un acquirente.

Questo documento introduce il pacchetto completo. Non sostituisce nessuno dei documenti che segue — li mette in ordine.

## Cosa stai per ricevere

Un repository tecnico completo (codice, database, 12 funzioni serverless, test, pipeline CI/CD), una Data Room di 14 documenti verificati nel codice prima di essere scritti, un piano di trasferimento per gli 8 servizi esterni collegati, e un asset raramente presente in un'acquisizione software: 8 skill Claude Code che codificano la conoscenza fiscale italiana e spagnola verificata da fonti ufficiali — non solo il codice che la implementa.

## Cosa NON stai comprando

Una base utenti commerciale. Solvy è stato testato da un piccolo gruppo chiuso durante lo sviluppo, non ha validazione di mercato. Il valore dell'operazione è nel tempo di sviluppo risparmiato e nel rischio tecnico già rimosso, non in un flusso di ricavi esistente. Questa distinzione, dichiarata qui esplicitamente, guida ogni altro documento del pacchetto.

## I due gap dichiarati

VeriFactu (Spagna) non è implementato — non ancora obbligatorio per legge. L'integrazione A-Cube per la fatturazione elettronica italiana è tecnicamente completa ma opera in modalità sandbox — l'attivazione in produzione è un passaggio commerciale, non uno sviluppo mancante. Entrambi sono documentati in dettaglio in `docs/known-limitations.md`, dichiarati qui perché un acquirente deve trovarli in questo documento, non scoprirli da solo.

## Nessun elemento bloccante residuo

Il backup del database, unico punto precedentemente classificato come bloccante, è oggi risolto tecnicamente (dump giornaliero automatico cifrato) e in attesa solo dell'attivazione dei secret da parte della proprietaria — dettaglio in `enterprise-gap-analysis.md`. Tutto il resto è già chiuso o rappresenta un miglioramento opzionale, non un ostacolo.

## Come navigare il resto del pacchetto

- Hai 10 minuti? Fermati qui, poi leggi `docs/executive-overview.md`.
- Sei un CTO che valuta l'acquisto? Vai a `buyer-value-analysis.md` e `replacement-cost-analysis.md`.
- Stai per negoziare? Vai a `enterprise-gap-analysis.md`.
- Vuoi sapere esattamente cosa ricevi al closing? Vai a `enterprise-deliverables.md`.
- Vuoi capire l'intero percorso prima di iniziare? Vai a `buyer-journey.md`.

Ogni claim in questo pacchetto è stato verificato contro il codice reale, non dichiarato per assunzione. È la differenza che questo intero lavoro di preparazione ha cercato di costruire.
