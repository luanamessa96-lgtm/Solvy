# Verifactu / SIF — Audit tecnico

Data: 2026-08-09
Perimetro normativo: Real Decreto 1007/2023 + Orden HAC/1177/2024 (sistema Verifactu, Ley Antifraude 11/2021).
Natura del documento: valutazione **tecnica**, basata solo su lettura del codice. Non è un parere legale.

---

## 1. Verdetto

**Scenario A — il modulo di fatturazione spagnola di Solvy soddisfa, dal punto di vista funzionale, i criteri con cui il RD 1007/2023 definisce un "software de facturación" (SIF).**

Non è una zona grigia dal punto di vista tecnico: l'app non si limita a registrare importi di fatture già emesse altrove, ma **genera** il documento fattura, gli assegna una **numerazione progressiva propria**, e produce un **documento consegnabile al cliente**. Questi sono esattamente i tre elementi che, funzionalmente, distinguono un SIF da un cruscotto di calcolo fiscale.

Quello che manca — e che oggi rende l'app **non conforme** a Verifactu, non "fuori perimetro" — sono i requisiti tecnici specifici del regolamento: hash chain, firma, invio AEAT, QR, Declaración Responsable. Questi sono assenti e documentati come tali dal team stesso.

La classificazione legale definitiva (se e quando l'obbligo scatta per Solvy come sviluppatore, vs. per l'autónomo come contribuente dal 2027) va confermata con un asesor fiscal — ma non ci sono elementi di codice che supportino la tesi "siamo fuori perimetro": è il contrario, l'app fa esattamente ciò che un SIF fa.

---

## 2. Evidenze

### 2.1 Emissione vs. registrazione

`src/components/modals/CreateFacturaModal.tsx` è il form "Crea Factura" per profili Spagna. Non chiede un importo incassato: chiede dati cliente completi (nome/ragione sociale, NIF/CIF, indirizzo — righe 229-266), base imponibile e descrizione servizio (270-297), aliquota IVA/IGIC (299-326), retención IRPF (328-347), flag operazione intracomunitaria (349-365), e calcola il totale (367-391). È lo stesso pattern di `CreateInvoiceModal.tsx` per l'Italia. Non esiste, in nessun punto dell'app, un form "importo + data" che rappresenti solo un incasso già fatturato altrove.

`src/components/modals/CreateFacturaRectificativaModal.tsx` genera anche note di rettifica legate a una fattura originale — un concetto che ha senso solo se Solvy è la fonte del documento originale.

### 2.2 Numerazione progressiva

Generata dall'app, non inserita dall'utente:
- `src/components/modals/CreateFacturaModal.tsx:29-34` — `nextInvoiceNumber` calcolato via `useMemo`, formato `NNN/YYYY`.
- `src/components/modals/CreateFacturaModal.tsx:118-123` — `incrementCounter()` incrementa il contatore alla creazione della fattura.
- Persistito su Postgres: `src/lib/db.ts:205,244` → colonna `invoice_counters` (jsonb, per anno) sul profilo.
- Esiste anche `deleted_invoice_numbers` (`src/lib/db.ts:206,245`) — il team si è già posto il problema di tracciare i numeri "bruciati" da fatture cancellate, segno implicito di consapevolezza del requisito di integrità della sequenza.

**Nota tecnica**: la numerazione è generata **client-side**, non da una sequence/trigger Postgres. Non c'è enforcement lato database — due client concorrenti potrebbero in teoria generare lo stesso numero. Non è un problema Verifactu in sé, ma è un gap di robustezza che andrebbe comunque risolto se si procede con l'integrazione (vedi §3).

### 2.3 Documento consegnabile a terzi

- `package.json` — dipendenze `jspdf`, `jspdf-autotable`, `pdf-lib`.
- `src/lib/generateInvoicePDF.ts` — `buildInvoicePage()` (26-350) genera un PDF A4 completo: intestazione, tipo documento, numero e data (66-86), dati emittente/cliente con NIF/IBAN (106-156), tabella voci (196-217), riepilogo IVA/ritenute/totale (222-273).
- `generateInvoicePDF()` (376-395) usa `navigator.share({ files: [file] })` per condividere direttamente il PDF con il cliente, oppure lo scarica.

Questo è precisamente l'atto di "expedir factura": produzione di un documento con tutti i dati obbligatori del Reglamento de Facturación, consegnabile al destinatario.

### 2.4 Schema dati

Tabella unica `documents` (non ci sono tabelle `invoices`/`facturas` separate; il tipo è discriminato dal campo `type`). Colonne rilevanti (da `src/types.ts:38-64` e `src/lib/db.ts:31-134`):

| Colonna | Contenuto |
|---|---|
| `type` | `invoice` / `expense` / `credit_note` / `proforma` / `factura_rectificativa` / `presupuesto` |
| `client`, `client_address`, `client_piva`, `client_cf` | dati cliente completi |
| `invoice_number` | numero assegnato dal sistema |
| `iva_rate`, `ritenuta`, `intracomunitaria`, `nif_proveedor` | dati fiscali |
| `client_sdi`, `client_pec`, `sdi_status`, `sdi_id`, `sdi_sent_at` | stato invio SdI (solo Italia) |
| `updated_at` | sync timestamp |

RLS attiva su `documents` (`supabase/migrations/20260325120000_enable_rls.sql:36-77`), ownership via `profile_id`.

### 2.5 Hash, firma, versionamento, immutabilità

**Assenti**, confermato sia da ricerca nel codice (nessun pattern `hash`/`chain`/`signature`/`audit` su `documents` in `supabase/migrations/*.sql`) sia da dichiarazione esplicita del team in `docs/known-limitations.md:10`:

> "Nessuno dei 10 requisiti tecnici è implementato: assenti firma digitale, concatenamento hash tra fatture, invio automatico all'AEAT, QR code e certificazione come software omologato."

Non esiste inoltre alcun meccanismo di immutabilità: una fattura in `documents` può oggi essere modificata o cancellata liberamente (nessun trigger che lo impedisca), il che è incompatibile con il requisito Verifactu di inalterabilità dei record.

### 2.6 Integrazioni con la PA

**Italia — attiva, per emissione reale**: `supabase/functions/sdi-send/index.ts` costruisce il payload FatturaPA (`buildPayload()`, 72-189) e lo invia via A-Cube (`POST ${ACUBE_BASE}/invoices`, riga 242); `supabase/functions/sdi-webhook/index.ts` riceve gli esiti (RC/NS/MC/DT/NE/AT/EC, righe 7-15). Secondo `docs/known-limitations.md:22-28`, l'integrazione è tecnicamente completa e production-ready, ma l'account A-Cube è ancora in sandbox: nessuna fattura ha realmente raggiunto il SdI.

**Spagna — assente**: nessuna edge function, endpoint o chiamata verso AEAT/Verifactu. I riferimenti ad "AEAT" nel codice (`src/services/modelosES.ts`, `src/views/GuiaFiscalESView.tsx`) generano solo PDF informativi (Modelo 130/303) da presentare manualmente — non c'è trasmissione automatica di dati fiscali.

### 2.7 Posizionamento dichiarato dal prodotto

`docs/executive-overview.md:9`:
> "Solvy è uno strumento di gestione e calcolo fiscale, non un software di fatturazione certificato né un sostituto della consulenza professionale."

Questa dichiarazione descrive l'**intento di posizionamento**, ma il codice — in particolare il modulo Factura per la Spagna — implementa esattamente le funzioni operative di un software di fatturazione (numerazione, generazione documento, consegna a terzi). È il disallineamento tra posizionamento dichiarato e comportamento funzionale reale a costituire il rischio principale, più che l'assenza dei requisiti tecnici Verifactu in sé (quella è nota e già tracciata).

---

## 3. Se si procede con l'integrazione (via provider esterno: Verifacti / InvoCash)

Il vincolo è di non implementare crittografia/hash chain/firma a mano: tutta la parte "difficile" del regolamento va delegata al provider (che firma, concatena, genera QR e invia all'AEAT via la propria API). Il pattern architetturale da seguire esiste già in azienda: `sdi-send` / `sdi-webhook` per l'Italia sono un precedente diretto — stessa forma (edge function che chiama un intermediario esterno, webhook che riceve lo stato asincrono).

| Modifica | Descrizione | Complessità |
|---|---|---|
| **Schema dati** | Nuove colonne su `documents` (o tabella dedicata): `verifactu_status`, `verifactu_id`/`csv` (codice restituito dal provider), `verifactu_qr_url`, `verifactu_sent_at`, riferimento al record precedente per l'hash chain (gestito dal provider, ma va tracciato lato Solvy). Segue lo stesso schema già usato per `sdi_status`/`sdi_id`/`sdi_sent_at`. | **Bassa** — precedente diretto già in produzione |
| **Numerazione fatture robusta** | Oggi la numerazione è generata client-side (`invoiceCounters` sul profilo, §2.2). Un provider Verifactu richiede una sequenza affidabile e senza collisioni/buchi non giustificati. Va valutato uno spostamento della generazione del numero lato server (edge function o trigger Postgres) prima di collegare il provider. | **Media** — non tecnicamente difficile, ma tocca un flusso oggi solo client-side |
| **Edge function `verifactu-send`** | Analoga a `sdi-send`: costruisce il payload richiesto dal provider (Verifacti/InvoCash), lo invia, riceve QR/hash/CSV, aggiorna `documents`. | **Media** — dipende dalla qualità della documentazione/SDK del provider scelto |
| **Edge function `verifactu-webhook`** | Analoga a `sdi-webhook`: riceve stato asincrono (accettata/rifiutata dall'AEAT) e aggiorna il record. | **Bassa-Media** — stesso pattern già esistente |
| **PDF con QR** | `src/lib/generateInvoicePDF.ts` deve includere il QR code di verifica AEAT restituito dal provider nell'immagine/documento generato. | **Bassa** — è un'aggiunta a una funzione già esistente |
| **Immutabilità post-invio** | Bloccare modifica/cancellazione di una fattura una volta inviata al provider; le correzioni vanno tramite `CreateFacturaRectificativaModal.tsx`, che già esiste come pattern di rettifica. | **Media** — richiede guardie sia in UI sia (idealmente) lato RLS/trigger, oggi assenti |
| **Declaración Responsable** | Testo statico pubblicato nell'app con numero di versione del software, visibile agli utenti. | **Bassa** — contenuto, non logica |
| **Modalità Verifactu vs. no-Verifactu** | Decisione di prodotto: invio in tempo reale all'AEAT (Verifactu) o sola conservazione con possibilità di ispezione (no-Verifactu). Cambia cosa fa `verifactu-send` ma non la forma architetturale. | Da decidere con il provider — impatto su UX e costi |

**Stima complessiva**: sforzo paragonabile a quanto già fatto per l'integrazione SdI italiana (che il team descrive come "tecnicamente completa"), quindi realisticamente un progetto di media complessità — non banale, ma delegando la parte crittografica/hash/firma al provider esterno si evita la parte più rischiosa e costosa da costruire in casa.

---

## 4. Opzione di riduzione dello scope (restare fuori dal perimetro SIF)

Se l'obiettivo è evitare l'obbligo Verifactu invece di soddisfarlo, la leva è cambiare cosa fa il modulo Factura per i profili Spagna, spostandolo da "genera fattura" a "registra fattura già emessa altrove":

**Modifiche necessarie:**
- Rimuovere la numerazione progressiva generata dal sistema (`nextInvoiceNumber`, `invoiceCounters`) per i documenti spagnoli: il numero andrebbe inserito dall'utente, riportando quello di una fattura già emessa con un altro strumento.
- Il PDF generato da `generateInvoicePDF.ts` per l'Spagna non dovrebbe più presentarsi come il documento fiscale originale, ma come un riepilogo interno (es. filigrana "documento non fiscale — riepilogo interno", rimozione di elementi che lo rendono un originale valido ai fini del Reglamento de Facturación).
- Rimuovere `navigator.share`/il download come "invio al cliente" per i documenti ES, o quantomeno rietichettarlo esplicitamente come copia di cortesia non fiscale.
- Aggiornare `docs/executive-overview.md` e ogni materiale di prodotto/copy affinché la descrizione corrisponda al comportamento reale (oggi già scritto "non un software di fatturazione certificato", ma il prodotto si comporterebbe coerentemente solo dopo questo cambio).

**Cosa si perde:**
- Per gli utenti Spagna, Solvy non sarebbe più uno strumento per creare ed emettere una fattura valida da consegnare a un cliente — solo per tracciare fatture create altrove ai fini del calcolo di IVA/IRPF. Questo è un downgrade funzionale significativo rispetto a cosa offre oggi il modulo Factura ES, e disallinea la UX Spagna da quella Italia (dove l'emissione reale via SdI resta un obiettivo attivo).
- Se "crea ed emetti fattura" è percepito come feature chiave per il mercato spagnolo (va verificato quanto è usata/valorizzata), la riduzione di scope ha un costo di prodotto, non solo tecnico.

---

## 5. Cosa non è deducibile dal codice

- Se e quando l'obbligo Verifactu si applichi concretamente a Solvy come sviluppatore (soggetti dal 29/07/2025 secondo il contesto fornito) — è una questione di interpretazione normativa su cui va sentito un asesor fiscal, non deducibile dal codice.
- Se i clienti attuali (zero utenti paganti al momento) userebbero effettivamente il modulo Factura ES per emettere fatture reali verso terzi, o lo trattano già oggi come strumento di calcolo — non misurabile da codice statico, richiede dati d'uso che non esistono ancora.
- Se la Declaración Responsable sia già stata pubblicata altrove (es. sito, privacy policy) al di fuori del repository — non verificato in questo audit, che ha guardato solo codice e docs interne.
