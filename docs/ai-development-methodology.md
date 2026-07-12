# Solvy — AI Development Methodology

*Cosa significa, in pratica, che Solvy è stato costruito con un flusso di lavoro AI-assisted — e perché questo è un asset che si acquisisce, non un dettaglio di processo che si perde con il team.*

## Il problema che risolve

In una normale acquisizione software, la conoscenza di dominio se ne va con le persone che l'hanno maturata. Un nuovo team eredita il codice che implementa le regole fiscali italiane e spagnole, ma non il ragionamento, le fonti ufficiali verificate, e la disciplina che ha prodotto quel codice — deve ricostruirli da zero, spesso sbagliando, quasi sempre lentamente.

Solvy è stato sviluppato codificando quella conoscenza in **6 skill Claude Code specifiche del progetto**, in `.claude/skills/`: file leggibili da un assistente AI (e da una persona) che descrivono non solo *cosa* fare, ma *perché*, con fonte normativa citata riga per riga. Non sono commenti nel codice. Sono un livello di conoscenza separato, versionato, aggiornabile indipendentemente dal codice che implementa.

## Le 6 skill di dominio

| Skill | Cosa codifica | Perché è un asset |
|---|---|---|
| `fiscale-avanzata` | Fonte di verità unica per aliquote, soglie, scadenze IT ed ES — 301 righe, ogni valore numerico citato da un PDF ufficiale (Agenzia Entrate, INPS, AEAT, Seguridad Social, BOE), con storico multi-anno e changelog delle variazioni normative (es. "il 2° scaglione IRPEF passa dal 35% al 33% nel 2026 — il codice con 0.35 è sbagliato per i redditi 2026") | È l'unico posto in cui la domanda "questo numero è corretto?" ha una risposta verificabile in secondi, non una ricerca normativa da rifare |
| `fiscale-it` | Regole operative del regime forfettario e ordinario italiano, riferimento ai 65 test Vitest che le proteggono | Instrada chi tocca la logica fiscale IT verso il comportamento corretto prima di scrivere codice, non dopo un bug in produzione |
| `fiscale-es` | Stesso ruolo per IRPF, RETA, Modelos spagnoli | Copre un secondo ordinamento fiscale con lo stesso livello di disciplina — è la prova che il pattern si ripete, non un caso isolato |
| `i18n` | Regola non negoziabile (mai testo hardcoded) e procedura in 3 passi per ogni stringa visibile, in entrambe le lingue | Previene silenziosamente la classe di bug più comune in un prodotto bilingue: la chiave grezza che appare all'utente |
| `sicurezza` | Cosa non toccare mai (variabili d'ambiente di produzione, RLS, service role key), come sono strutturate le funzioni serverless | Riduce il rischio più costoso di un'acquisizione tecnica — un errore di sicurezza introdotto da chi non conosce ancora il sistema |
| `ui-solvy` | Design system: gradiente brand, temi, pattern avatar, vincoli di bundle size | Garantisce che chiunque continui lo sviluppo produca un'interfaccia coerente con il brand esistente, senza dover reverse-engineerizzare lo stile dal codice |

*Nota di accuratezza: il repository contiene 43 skill totali in `.claude/skills/`, di cui 37 sono skill generiche di marketing/prodotto (provenienti da un pacchetto riutilizzabile, mai personalizzate per Solvy — verificato: nessun riferimento a Solvy nel loro contenuto, nessun commit le ha mai modificate). Solo le 6 elencate sopra sono know-how specifico e verificato di Solvy. Un documento precedente di questo pacchetto ne contava 8, includendo per errore due skill generiche (`site-architecture`, `web-asset-generator`); il conteggio è stato corretto qui e negli altri documenti che lo citavano.*

## Cosa trasferisce, concretamente

Non è documentazione statica. Sono istruzioni operative che un assistente AI (Claude Code o equivalente) applica automaticamente quando il nuovo team tocca codice fiscale, i18n, sicurezza o UI — nello stesso modo in cui le ha applicate durante lo sviluppo originale. Il know-how non richiede che il venditore sia disponibile per essere utile: è eseguibile dal primo giorno.

## Impatto sui tempi di onboarding

Per la sola logica di calcolo fiscale IT/ES, la ricerca normativa necessaria a produrre un contenuto equivalente a `fiscale-avanzata` richiede stimabilmente 3-4 mesi di lavoro combinato commercialista/gestor + sviluppatore, prima ancora di scrivere codice (stima di dettaglio in `buyer-value-analysis.md`). Le 6 skill non eliminano la necessità che il nuovo team capisca il dominio — ma comprimono drasticamente il tempo tra "abbiamo acquisito il codice" e "il nostro team può modificarlo con sicurezza", perché la fase di ricerca-e-verifica è già stata fatta ed è consultabile in secondi invece che ricostruita da zero.

## Perché aumenta il valore dell'acquisizione

Tre motivi, in ordine di importanza per un CTO che valuta l'operazione:

1. **Riduce il rischio del giorno dopo il closing.** Il rischio più concreto di acquisire codice fiscale non è "il codice non funziona" — è "il nuovo team lo modifica senza sapere perché una regola è scritta in un certo modo, e la rompe". Le skill rendono quel rischio esplicito e mitigato, non implicito e scoperto tardi.
2. **È un asset raro nelle acquisizioni software.** La maggior parte delle vendite di codice trasferisce l'artefatto (il software) senza il metodo che lo ha prodotto. Qui il metodo è incluso, leggibile, e riapplicabile a un terzo mercato fiscale con lo stesso pattern — coerente con l'architettura modulo-paese descritta in `architecture-overview.md`.
3. **Dimostra maturità di processo, non solo di prodotto.** Un acquirente che vede una metodologia di sviluppo disciplinata, verificata e documentata inferisce (correttamente, in questo caso) che il resto del codice segue lo stesso standard — è un segnale di qualità che precede qualunque revisione riga per riga.

## Come verificarlo in due minuti

`.claude/skills/fiscale-avanzata/SKILL.md`, `fiscale-it/SKILL.md`, `fiscale-es/SKILL.md`, `i18n/SKILL.md`, `sicurezza/SKILL.md`, `ui-solvy/SKILL.md` sono leggibili come testo semplice, senza bisogno di eseguire codice o avere accesso a Claude Code. Ogni claim fiscale in `fiscale-avanzata` cita la fonte ufficiale nella stessa riga.
