# Solvy — Google Analytics & Search Console: Piano di Trasferimento

*L'unico dato di business intelligence del pacchetto che vive interamente fuori dal repository. Questo documento chiarisce cosa verificare nel codice (fatto), cosa verificare negli account Google (non verificabile da qui), e come gestirlo al closing.*

## Cosa è verificato nel repository

Due integrazioni Google distinte, entrambe attive:

| Integrazione | ID / evidenza nel codice | Dove è wired |
|---|---|---|
| **Google Analytics 4** | Measurement ID `G-2F4JDKGKNX` | `index.html` (app autenticata) e `public/landing.html` (landing page pubblica) — due punti di iniezione dello stesso tag, non uno solo |
| **Google Search Console** | File di verifica proprietà `public/googlee414c4209c9dc88d.html` | Verifica dominio via file HTML (non via DNS TXT) — presuppone che `solvyapp.com` sia verificato come proprietà in Search Console |

Eventi custom tracciati via `gtag()` oltre al page view standard: `purchase` (upgrade a Pro, `src/App.tsx:491`) e `sign_up` (`src/views/AuthView.tsx:127`). Nessuna chiave privata o credenziale Google è presente nel codice — l'ID di misurazione GA4 è per design pubblico (client-side), la verifica Search Console è un file statico senza segreti.

`public/sitemap.xml` e `public/robots.txt` sono coerenti e puntano correttamente a Search Console (nessun ads.txt o altro file di verifica Google trovato — non risultano altre proprietà Google collegate).

## Cosa contengono questi account (per un acquirente)

- **Google Analytics 4**: storico completo di traffico, conversioni (`purchase`, `sign_up`), comportamento utenti dal lancio della landing page — l'unico dato quantitativo su acquisizione e conversione esistente per Solvy, utile a un buyer per valutare canali funzionanti anche in assenza di ricavi significativi
- **Google Search Console**: storico posizionamento organico, query di ricerca, copertura di indicizzazione, eventuali problemi tecnici SEO rilevati da Google nel tempo — dato che non si ricostruisce: iniziare da un nuovo account Search Console azzera tutto lo storico

## Quando devono essere consegnati

A differenza di Supabase, Vercel o del dominio, **queste due integrazioni non sono operativamente critiche** per la continuità del servizio: un ritardo nel trasferimento non causa downtime né perdita di funzionalità per gli utenti. Possono quindi essere gestite con priorità più bassa nella sequenza di closing, ma **prima della disattivazione dell'account Google della fondatrice**, che è il vero rischio: se quell'account viene chiuso o perde l'accesso prima del trasferimento, lo storico si perde in modo irreversibile.

Priorità consigliata: dopo il trasferimento di GitHub, Supabase, Vercel e dominio (i blocchi operativi), ma prima di considerare il closing concluso — va tracciato esplicitamente come task, non lasciato implicito.

## Come si trasferisce (meccanismo nativo Google)

- **Google Analytics 4**: Admin → Property Access Management → aggiungere l'acquirente come **Amministratore** sulla property, poi rimuovere l'accesso della fondatrice. Non richiede di ricreare la property né perde lo storico dati.
- **Google Search Console**: Impostazioni → Utenti e autorizzazioni → aggiungere l'acquirente come **Proprietario**, poi rimuovere l'accesso della fondatrice. Stesso principio: nessuna perdita di storico se fatto tramite aggiunta utente, non ricreazione della proprietà.

## Cosa NON è verificabile da qui — e cosa fare manualmente

Questi punti dipendono dall'account Google della fondatrice, a cui questa analisi non ha accesso:

| Cosa non è verificabile | Perché | Cosa verificare manualmente prima del closing |
|---|---|---|
| Quale account Google (indirizzo email) possiede la property GA4 e la proprietà Search Console | Non presente nel repository per design (nessuna credenziale Google è mai stata committata) | Confermare l'email dell'account proprietario, verificare che sia un account nella disponibilità della fondatrice (non condiviso con terzi, non un vecchio indirizzo aziendale dismesso) |
| Se l'autenticazione a due fattori (2FA) è attiva su quell'account | Non verificabile dal codice | Attivarla se non presente, prima del closing — un account senza 2FA che detiene storico dati è un rischio inutile |
| Se esistono altri utenti con accesso alla property GA4 o Search Console oltre alla fondatrice | Non verificabile dal codice | Controllare Property Access Management (GA4) e Impostazioni utenti (Search Console): rimuovere accessi non più necessari come parte dell'igiene pre-closing |
| Se GA4 è collegato a Google Ads o ad altri prodotti Google (Merchant Center, Tag Manager container condivisi) | Nessuna evidenza nel codice, ma non è escluso | Controllare Admin → Collegamenti prodotto in GA4; se esistono collegamenti, vanno dichiarati e gestiti separatamente |
| Il periodo esatto di storico dati disponibile (data di attivazione reale del tag) | Il codice mostra *che* il tag è installato, non *da quando* i dati sono continui e affidabili | Esportare un report GA4 con il range di date completo prima del closing, da allegare come evidenza concreta invece di una promessa di "storico disponibile" |

## Verifiche consigliate al closing

1. L'acquirente riceve un accesso di sola visualizzazione **prima** della firma (se la trattativa lo consente), per validare autonomamente che i dati dichiarati in questo documento esistano davvero — stessa logica di verifica-non-supposizione applicata al resto di questo pacchetto
2. Al closing: trasferimento ruoli come descritto sopra, non ricreazione delle property
3. Conferma scritta, post-trasferimento, che l'accesso della fondatrice sia stato effettivamente rimosso — non solo aggiunto quello dell'acquirente
