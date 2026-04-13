---
name: i18n
description: Regole internazionalizzazione Solvy IT+ES. Usa quando aggiungi testo UI, stringhe, label, messaggi, toast, errori o qualsiasi contenuto visibile all'utente.
user-invocable: false
---

# Regole i18n Solvy

Ogni testo visibile all'utente DEVE essere tradotto in entrambe le lingue.

## Regola fondamentale

Non aggiungere MAI testo hardcoded nei componenti React. Usa sempre `t('chiave')` dal hook `useTranslation`.

## Procedura obbligatoria

1. Aggiungi la chiave in `src/locales/it.json`
2. Aggiungi la stessa chiave in `src/locales/es.json`
3. Usa `t('chiave')` nel componente

Se dimentichi uno dei due file, il cambio lingua causerà la chiave grezza visibile all'utente (es. `"documents.upload.error"`).

## Struttura chiavi

Usa namespacing coerente con la struttura esistente:
- `documents.*` → fatture e spese
- `calendar.*` → scadenze
- `profile.*` → impostazioni profilo
- `common.*` → elementi condivisi (pulsanti, errori generici)
- `fiscale.*` → guida fiscale e tooltip scadenze

## Formato

```json
// it.json
"chiave": "Testo in italiano"

// es.json  
"chiave": "Texto en español"
```

## Plurali e variabili

```json
"documents.count": "{{count}} fattura",
"documents.count_plural": "{{count}} fatture"
```

Nel componente: `t('documents.count', { count: n })`
