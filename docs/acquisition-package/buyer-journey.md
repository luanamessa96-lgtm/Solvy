# Solvy — Buyer Journey

*Il percorso che un acquirente segue realisticamente dalla prima occhiata al closing, e cosa incontra a ogni passo. Serve a chi presenta il pacchetto per sapere cosa mostrare, in che ordine, e a chi lo riceve per sapere dove guardare.*

## 1. Primo contatto (minuti)

Il buyer vede l'Executive Summary di questo pacchetto o, se arriva direttamente dal repository, `docs/executive-overview.md`. In questa fase decide una cosa sola: vale la pena continuare a leggere? La riga che conta di più è quella che dichiara il tipo di operazione — cessione di asset tecnologico, non acquisizione societaria — perché imposta correttamente le aspettative prima ancora di entrare nel dettaglio.

## 2. Valutazione preliminare (ore)

Legge `docs/architecture-overview.md`, `docs/feature-guide.md`, `docs/security-overview.md`. In questa fase un CTO decide se il prodotto è tecnicamente serio o no. È qui che il pattern modulo-paese, la RLS verificata e il confine Free/Pro verificato nel codice fanno la differenza tra "continuiamo" e "no grazie".

## 3. Due diligence tecnica (giorni)

Naviga `docs/repository-structure.md`, `supabase/functions/README.md`, `supabase/migrations/README.md`, la suite di test, la pipeline CI/CD. Qui verifica che quanto dichiarato nei documenti corrisponda al codice — ed è qui che la disciplina di verifica empirica applicata durante la costruzione di questo pacchetto (schema autentico, Free/Pro verificato, CI verificata su infrastruttura reale) restituisce il suo valore: le domande che farebbe un revisore serio hanno già risposta.

## 4. Due diligence legale e IP (giorni)

Legge `docs/ip-ownership-licensing.md`, `LICENSE`, `docs/known-limitations.md`. Verifica che non ci siano ostacoli di proprietà intellettuale o licenze — già chiuso — e che i gap di prodotto (VeriFactu, A-Cube sandbox) siano dichiarati e non scoperti da solo.

## 5. Valutazione del valore (giorni)

Qui entrano `docs/acquisition-package/buyer-value-analysis.md` e `replacement-cost-analysis.md` — non più "cosa c'è", ma "quanto mi costerebbe non comprarlo". È il momento in cui la trattativa smette di essere tecnica e diventa economica.

## 6. Negoziazione (settimane)

`docs/acquisition-package/enterprise-gap-analysis.md` diventa il documento di riferimento: cosa è bloccante da chiudere prima della firma (il backup del database), cosa è importante ma negoziabile, cosa è solo un miglioramento futuro. È la base per decidere se il prezzo include tutto o se alcuni elementi diventano condizioni sospensive.

## 7. Closing (giorni)

Segue la checklist di trasferimento già condivisa e riceve quanto elencato in `docs/acquisition-package/enterprise-deliverables.md` — repository, account, dominio, credenziali rigenerate.

## 8. Post-acquisizione (settimane-mesi)

`docs/operations-manual.md`, `docs/deployment-guide.md`, `docs/installation-guide.md` e le 8 skill di dominio in `.claude/skills/` diventano gli strumenti quotidiani del nuovo team. È qui che si misura se il pacchetto ha davvero ridotto il tempo di presa in carico — la promessa centrale di tutto questo lavoro.
