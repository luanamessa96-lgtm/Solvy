# Limiti noti — disclosure per due diligence

Questo documento esiste per una ragione precisa: se un potenziale acquirente scopre un gap da solo durante la due diligence, il costo in fiducia (e nella trattativa) è molto più alto che se viene dichiarato subito, in modo chiaro, con il relativo contesto. Nessuno dei due punti sotto è un difetto nascosto — sono limiti di scope noti e già gestiti come tali nel prodotto.

## 1. VeriFactu (Spagna) — non implementato

VeriFactu (RD 1007/2023, Ley Antifraude 11/2021) è il sistema antifrode di fatturazione elettronica spagnolo, equivalente al SdI italiano. **Solvy ha 0 dei 10 requisiti tecnici implementati**: nessuna firma digitale, nessun concatenamento hash tra fatture, nessun invio automatico all'AEAT, nessun QR code, nessuna certificazione come software omologato.

**Perché non è un bug**: la scadenza obbligatoria per gli autónomos non è ancora stata fissata definitivamente dall'AEAT (posticipata più volte). Solvy si posiziona esplicitamente come *strumento di gestione e calcolo fiscale*, non come software di fatturazione certificato — un posizionamento legittimo che non richiede la conformità VeriFactu. La privacy policy e i materiali di prodotto non contengono claim di conformità VeriFactu (verificato).

**Impatto per un acquirente**: se il piano è espandere l'offerta ES verso la fatturazione elettronica certificata, questo è lavoro da preventivare (stimato 6-12 mesi: firma crittografica, concatenamento, integrazione API AEAT, certificazione legale). Il pattern di riferimento esiste già lato Italia (A-Cube come intermediario) e può essere replicato.

## 2. Fatturazione elettronica SdI (Italia) — integrazione tecnica completa, ma account A-Cube ancora in sandbox

L'integrazione con A-Cube (intermediario per l'invio delle fatture al Sistema di Interscambio) è tecnicamente completa e testata: le edge function `sdi-send`/`sdi-webhook` sono in produzione, la suite E2E dedicata (`e2e/07-sdi.test.ts`) passa. **Ma l'account A-Cube utilizzato è ancora in modalità sandbox** — nessuna fattura ha mai effettivamente raggiunto il Sistema di Interscambio o l'Agenzia delle Entrate. Le risposte che l'app mostra (incluse eventuali "fatture rifiutate") sono simulazioni del sandbox, non transazioni reali.

**Perché non è un bug**: l'onboarding all'ambiente di produzione A-Cube è un passaggio commerciale/amministrativo (richiesta a `support@a-cube.io`, scelta piano), non uno sviluppo software mancante. Il codice è pronto; manca l'attivazione dell'account.

**Impatto per un acquirente**: prima di annunciare la fatturazione elettronica diretta agli utenti italiani, va completato l'onboarding production con A-Cube — attività commerciale, stimabile in giorni/settimane a seconda dei tempi di risposta del fornitore, non mesi di sviluppo.

## Cosa NON è in questo documento

Le criticità di igiene tecnica (naming delle migration, assenza di CI, dipendenze desincronizzate) sono trattate nelle fasi dedicate della roadmap di preparazione alla vendita, non qui — questo documento copre solo limiti a livello di prodotto/funzionalità rilevanti per la decisione d'acquisto.
