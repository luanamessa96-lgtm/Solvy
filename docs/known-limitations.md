# Solvy — Known Limitations

Limitazioni note a livello di prodotto.

## 1. VeriFactu (Spagna)

**Stato attuale:** non implementato.

**Descrizione tecnica**
VeriFactu (RD 1007/2023, Ley Antifraude 11/2021) è il sistema spagnolo di fatturazione antifrode, analogo al Sistema di Interscambio italiano. Nessuno dei 10 requisiti tecnici è implementato: assenti firma digitale, concatenamento hash tra fatture, invio automatico all'AEAT, QR code e certificazione come software omologato.

I materiali di prodotto e la privacy policy non contengono dichiarazioni di conformità VeriFactu.

**Stato regolatorio**
La scadenza di obbligatorietà per gli autónomos non è stata fissata in via definitiva dall'AEAT.

**Requisiti per il completamento**
Implementazione di firma crittografica, concatenamento hash, integrazione con le API AEAT, generazione del QR code e ottenimento della certificazione come software omologato.

## 2. Fatturazione elettronica SdI (Italia) — account A-Cube in sandbox

**Stato attuale:** integrazione tecnica completa; account A-Cube in modalità sandbox.

**Descrizione tecnica**
Le Edge Function `sdi-send` e `sdi-webhook` sono in produzione ed è presente una suite E2E dedicata (`e2e/07-sdi.test.ts`). L'account A-Cube configurato opera in modalità sandbox: nessuna fattura ha raggiunto il Sistema di Interscambio o l'Agenzia delle Entrate. Le risposte mostrate in applicazione, incluse le eventuali fatture rifiutate, sono simulazioni dell'ambiente sandbox.

**Prerequisiti per il completamento**
Attivazione di un account A-Cube di produzione tramite onboarding con il fornitore (`support@a-cube.io`). Non è richiesto sviluppo software aggiuntivo.
