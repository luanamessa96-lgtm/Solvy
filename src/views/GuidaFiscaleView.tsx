import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Search, BookOpen, X } from 'lucide-react';

interface Article {
  title: string;
  body: string;
}

interface Section {
  title: string;
  articles: Article[];
}

const SECTIONS: Section[] = [
  {
    title: 'I Regimi Fiscali',
    articles: [
      {
        title: 'Come funziona il regime forfettario',
        body: 'Aliquota flat 5% (primi 5 anni) o 15% dal 6° anno sul reddito imponibile. Niente IVA in fattura, niente spese deducibili — il reddito si calcola con il coefficiente ATECO. Ideale per chi fattura meno di €85.000.',
      },
      {
        title: 'Come funziona il regime ordinario',
        body: 'IRPEF a scaglioni progressivi (23%-43%), IVA in fattura, spese deducibili dal reddito. Più complesso ma conveniente se hai costi alti o fatturato sopra €85.000.',
      },
      {
        title: 'Differenza tra forfettario e ordinario — quale scegliere',
        body: 'Forfettario → semplice, meno tasse se fatturato basso, zero IVA. Ordinario → più complesso, conviene se hai molte spese deducibili o fatturato alto. Consulta il commercialista per la scelta.',
      },
      {
        title: 'Cosa fare quando superi €85.000 di fatturato',
        body: 'Devi passare obbligatoriamente al regime ordinario dall\'anno successivo. Solvy ti avvisa con alert progressivi a €65k, €80k e €85k. Contatta subito il tuo commercialista.',
      },
      {
        title: 'Differenza tra spese forfettario e ordinario',
        body: 'Forfettario → le spese non riducono le tasse, servono solo per tenere traccia del cash flow. Ordinario → le spese si deducono dal reddito imponibile riducendo le tasse, ma con limiti per categoria (telefono 80%, auto 20% ecc.).',
      },
    ],
  },
  {
    title: 'Le Tasse',
    articles: [
      {
        title: 'Cos\'è il coefficiente ATECO e come influisce sulle tasse',
        body: 'Nel forfettario, il reddito imponibile = fatturato × coefficiente ATECO. Es: professionisti 78% → su €10.000 fatturati paghi tasse su €7.800. Varia per categoria di attività.',
      },
      {
        title: 'Cos\'è l\'imposta sostitutiva',
        body: 'La tassa flat del forfettario: 5% nei primi 5 anni, 15% dal 6° anno. Sostituisce IRPEF, addizionali regionali e IVA — tutto in una sola aliquota.',
      },
      {
        title: 'Come funziona l\'IRPEF a scaglioni (ordinario)',
        body: '23% fino a €28.000 · 33% da €28.001 a €50.000 · 43% oltre €50.000 (aliquote 2026, L.199/2025). Si applica sul reddito imponibile (fatturato - spese - INPS).',
      },
      {
        title: 'Cosa sono le addizionali regionali e comunali',
        body: 'Tasse aggiuntive all\'IRPEF che variano per regione (da 0.7% Valle d\'Aosta a 3.33% Lazio). Si applicano solo al regime ordinario — i forfettari ne sono esenti.',
      },
      {
        title: 'Cos\'è la marca da bollo e quando si applica',
        body: 'Imposta di €2 obbligatoria sulle fatture superiori a €77,47 in regime forfettario (esenti IVA). Solvy la aggiunge automaticamente.',
      },
      {
        title: 'Cos\'è la ritenuta d\'acconto e quando sei esente',
        body: 'Il cliente trattiene il 20% del tuo compenso e lo versa per te all\'AdE. I forfettari sono esenti per legge (L.190/2014) — non devi applicarla. Gli ordinari sì.',
      },
      {
        title: 'Cos\'è la rivalsa INPS 4% e quando usarla',
        body: 'Quota dei contributi INPS che puoi addebitare al cliente in fattura. Riduce il tuo costo INPS effettivo. Opzionale — non obbligatoria.',
      },
    ],
  },
  {
    title: 'L\'INPS',
    articles: [
      {
        title: 'Come funziona l\'INPS per i freelance',
        body: 'Contributi previdenziali obbligatori che danno diritto alla pensione. Per i professionisti è la gestione separata (26.07%), per artigiani e commercianti ci sono gestioni specifiche con aliquote diverse.',
      },
      {
        title: 'Qual è il tuo tipo di INPS — gestione separata, artigiani o commercianti',
        body: 'Professionisti (designer, sviluppatori, consulenti) → gestione separata 26.07%. Artigiani (tatuatori, idraulici, parrucchieri) → INPS artigiani 24%. Commercianti → 24.48%. Verifica con il commercialista.',
      },
      {
        title: 'Come funziona il minimale INPS per artigiani e commercianti',
        body: 'Anche se guadagni poco, paghi un minimo di ~€4.000/anno di INPS. È il "minimale contributivo" — garantisce comunque contributi pensionistici minimi.',
      },
    ],
  },
  {
    title: 'Acconti e Scadenze',
    articles: [
      {
        title: 'Cosa sono gli acconti IRPEF e quando pagarli',
        body: 'Pagamenti anticipati delle tasse dell\'anno in corso: 40% a giugno e 60% a novembre. Si calcolano sul reddito dell\'anno precedente. Il primo anno non si pagano.',
      },
      {
        title: 'Come funzionano gli acconti stimati nel calendario',
        body: 'Solvy mostra una stima degli acconti basata sui dati attuali. È un\'indicazione — l\'importo reale dipende dal reddito finale dell\'anno e dalla dichiarazione definitiva. Consulta sempre il commercialista.',
      },
      {
        title: 'Cos\'è il saldo IRPEF e quando si paga',
        body: 'Conguaglio finale delle tasse dovute dopo la dichiarazione dei redditi. Si paga a giugno dell\'anno successivo. È la differenza tra tasse reali dovute e acconti già versati.',
      },
      {
        title: 'Come funziona il reddito anno precedente per gli acconti',
        body: 'Per calcolare gli acconti con più precisione puoi inserire il reddito dell\'anno precedente in Fiscalità. Solvy lo usa come base di calcolo invece del reddito corrente.',
      },
    ],
  },
  {
    title: 'Le Fatture',
    articles: [
      {
        title: 'Cosa si scrive in una fattura — guida ai campi obbligatori',
        body: 'Numero progressivo, data, dati tuoi (P.IVA/CF, indirizzo), dati cliente (P.IVA/CF), descrizione servizio, importo, regime fiscale. Per il forfettario obbligatoria la nota L.190/2014.',
      },
      {
        title: 'Come funziona la numerazione progressiva delle fatture',
        body: 'Le fatture devono essere numerate in ordine crescente senza buchi (001/2026, 002/2026...). Solvy gestisce la numerazione automaticamente — anche se elimini una fattura il contatore non torna indietro.',
      },
      {
        title: 'Cos\'è il codice SDI e la PEC destinatario — quando servono',
        body: 'Codice di 7 caratteri che identifica il canale di ricezione delle fatture elettroniche di un\'azienda. Serve quando fatturi a società strutturate. I clienti privati non ne hanno bisogno — si usa il codice default 0000000.',
      },
      {
        title: 'Cos\'è una nota di credito e quando emetterla',
        body: 'Documento che annulla o rettifica una fattura già emessa. Non si modifica mai una fattura pagata — si emette una nota di credito. Scala il fatturato totale nel dashboard.',
      },
      {
        title: 'Cos\'è una fattura proforma e quando usarla',
        body: 'Documento non fiscalmente valido usato come pre-fattura o preventivo formale. Non conta per il fatturato, non va all\'AdE. Si converte in fattura definitiva con un click quando il cliente paga.',
      },
      {
        title: 'Perché non dovresti modificare una fattura già pagata',
        body: 'Una fattura pagata è un documento fiscale definitivo. Se hai fatto un errore devi emettere una nota di credito — non modificare la fattura originale. È un obbligo fiscale.',
      },
    ],
  },
  {
    title: 'La FatturaPA',
    articles: [
      {
        title: 'Come funziona l\'invio diretto a SdI — nessun portale, nessun file',
        body: 'Solvy trasmette la fattura direttamente al Sistema di Interscambio (SdI) dell\'Agenzia delle Entrate con un click — senza scaricare file, senza portali. La fattura arriva automaticamente al cliente tramite il suo codice SDI o PEC. Lo stato si aggiorna in tempo reale: ⏳ in attesa, ✓ consegnata.',
      },
      {
        title: 'Dati obbligatori per inviare una fattura a SdI — controlla prima di inviare',
        body: 'Nel tuo profilo servono: P.IVA o Codice Fiscale + indirizzo completo. Sulla fattura servono i dati del cliente: P.IVA o CF del cliente, e almeno uno tra Codice SDI (7 caratteri, lo chiedi al cliente o al suo commercialista) oppure PEC. Se manca il Codice SDI usa 0000000 — la fattura arriva nel cassetto fiscale del cliente ma è comunque valida. Se i dati sono incompleti SdI scarterà la fattura.',
      },
      {
        title: 'Le FatturaPA XML sono già conservate dall\'AdE — non devi fare nulla',
        body: 'L\'Agenzia delle Entrate conserva automaticamente le tue FatturaPA XML per 10 anni. Non devi fare nulla — sono al sicuro. L\'Archivio Solvy è un backup aggiuntivo opzionale.',
      },
      {
        title: 'Differenza tra invio SdI, Registro Cronologico e Riepilogo Annuale',
        body: 'Invia a SdI → trasmette la fattura all\'AdE in tempo reale, obbligatorio per legge. Registro Cronologico → elenco fatture in PDF per il commercialista. Riepilogo Annuale → documento fiscale completo per la dichiarazione dei redditi.',
      },
    ],
  },
  {
    title: 'Le Spese',
    articles: [
      {
        title: 'Quali spese sono deducibili al 100% e quali hanno limiti',
        body: '100%: software, formazione, materiale da lavoro. 80%: telefono. 20%: auto/moto. Solo per regime ordinario — nel forfettario le spese non riducono le tasse.',
      },
      {
        title: 'Perché Solvy calcola le spese con percentuali diverse',
        body: 'La legge italiana stabilisce limiti di deducibilità per alcune categorie. Solvy applica automaticamente le percentuali standard. L\'importo effettivo può variare — consulta il commercialista.',
      },
    ],
  },
  {
    title: 'Strumenti Solvy',
    articles: [
      {
        title: 'Come leggere il dashboard — differenza tra Panoramica, Tasse e Spese',
        body: 'Panoramica → visione generale entrate/uscite/netto. Tasse → calcolo fiscale dettagliato con INPS e imposta. Spese → analisi spese per categoria con deducibilità.',
      },
      {
        title: 'Come funziona "Invia Documenti" — guida passo passo',
        body: 'Seleziona anno e mesi → scegli cosa includere → invia. "Invia a SdI" trasmette le fatture del periodo direttamente all\'AdE. "Fatture del periodo" genera un PDF per il commercialista. "Registro Cronologico" e "Riepilogo Annuale" sono documenti di supporto per la dichiarazione.',
      },
      {
        title: 'Differenza tra export periodico al commercialista e Archivio Solvy',
        body: 'Export periodico → invio mensile/trimestrale delle fatture al commercialista. Archivio Solvy → backup annuale completo di tutte le fatture dal 2026. Sono complementari, non alternativi.',
      },
      {
        title: 'Cos\'è l\'Archivio Solvy e perché è nella sezione Fiscalità',
        body: 'Backup di tutte le fatture saldate organizzate per anno. Sta in Fiscalità perché è un documento di conservazione fiscale, non un\'operazione quotidiana come creare fatture.',
      },
      {
        title: 'Come funziona la sezione Fiscalità nel menu',
        body: 'Contiene tutto ciò che riguarda la tua situazione fiscale: regione e addizionali, reddito anno precedente, categoria ATECO, tipo INPS e archivio backup. È separata dalle impostazioni generali perché riguarda solo la fiscalità.',
      },
      {
        title: 'Cosa significa "Metti da parte" e come funziona',
        body: 'Card Pro che calcola quanto mettere da parte ogni mese per non farsi trovare impreparati alle scadenze fiscali. Formula: tasse annuali stimate ÷ mesi rimasti all\'anno. È una stima — l\'importo reale può variare.',
      },
      {
        title: 'Come funziona il glossario fiscale — i tooltip ℹ️',
        body: 'Tocca l\'icona ℹ️ accanto a qualsiasi termine fiscale nell\'app per vedere una spiegazione rapida. Per approfondire vai nella Guida Fiscale nel menu.',
      },
    ],
  },
  {
    title: 'Dichiarazione e Limiti',
    articles: [
      {
        title: 'Cos\'è il registro cronologico e perché è obbligatorio',
        body: 'Elenco ufficiale di tutte le fatture emesse che ogni freelancer deve tenere per legge. Il commercialista lo usa per la dichiarazione dei redditi. Solvy lo genera automaticamente in PDF.',
      },
      {
        title: 'Come preparare il riepilogo annuale per il commercialista',
        body: 'A gennaio il commercialista ha bisogno di: totale fatturato, spese per categoria, ritenute subite, INPS versato, acconti pagati. Solvy genera tutto in un PDF con "Riepilogo Annuale" nell\'export.',
      },
      {
        title: 'Quali detrazioni puoi avere come freelancer ordinario',
        body: 'Detrazione base lavoro autonomo, figli a carico, spese mediche, interessi mutuo. Solvy non le calcola automaticamente — sono troppo variabili e personali. Consulta il commercialista.',
      },
      {
        title: 'Come funziona il riporto delle perdite nei primi anni',
        body: 'In regime ordinario le perdite dei primi 3 anni si deducono al 100% negli anni successivi. Solvy non gestisce questa funzionalità — rivolgiti al commercialista.',
      },
      {
        title: 'Differenza tra 730 e Modello Redditi PF — quale devi presentare',
        body: 'I lavoratori dipendenti presentano il 730. I freelancer con P.IVA presentano il Modello Redditi PF (ex Unico). Solvy gestisce solo la fiscalità P.IVA — per il 730 o dichiarazioni complesse rivolgiti al commercialista o CAF.',
      },
      {
        title: 'Se hai sia P.IVA che lavoro dipendente',
        body: 'La situazione è più complessa — hai sia redditi da lavoro dipendente che da lavoro autonomo. Solvy non copre questa combinazione. Rivolgiti al commercialista per la dichiarazione completa.',
      },
      {
        title: 'Come funziona il glossario fiscale completo',
        body: 'Tutti i termini spiegati in questa guida hanno anche un tooltip ℹ️ direttamente nell\'app. Tocca ℹ️ per una spiegazione rapida sul momento, leggi questa guida per approfondire.',
      },
    ],
  },
];

interface GuidaFiscaleViewProps {
  darkMode?: boolean;
}

const GuidaFiscaleView = ({ darkMode }: GuidaFiscaleViewProps) => {
  const [openSection, setOpenSection] = useState<number | null>(0);
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return SECTIONS;
    const q = query.toLowerCase();
    return SECTIONS.map(s => ({
      ...s,
      articles: s.articles.filter(
        a => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
      ),
    })).filter(s => s.articles.length > 0);
  }, [query]);

  const isSearching = query.trim().length > 0;

  const toggleSection = (idx: number) => {
    setOpenSection(prev => (prev === idx ? null : idx));
    setOpenArticle(null);
  };

  const toggleArticle = (key: string) => {
    setOpenArticle(prev => (prev === key ? null : key));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="p-4 pb-28 space-y-3"
    >
      {/* Header */}
      <div className={`p-5 rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen size={20} className="text-primary" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Guida Fiscale</h2>
            <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>44 articoli · 9 sezioni · solo Italia</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <Search size={16} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cerca nella guida..."
          className={`flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400 ${darkMode ? 'text-white' : 'text-slate-900'}`}
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-slate-400 active:scale-90 transition-transform">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Sections */}
      {filtered.length === 0 ? (
        <div className={`p-6 rounded-2xl border text-center ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Nessun risultato per "{query}"</p>
        </div>
      ) : (
        filtered.map((section, sIdx) => {
          const isOpen = isSearching || openSection === sIdx;
          return (
            <div
              key={section.title}
              className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}
            >
              {/* Section header */}
              {!isSearching && (
                <button
                  onClick={() => toggleSection(sIdx)}
                  className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors active:scale-[0.99] ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      {sIdx + 1}
                    </span>
                    <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{section.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{section.articles.length}</span>
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={16} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                    </motion.div>
                  </div>
                </button>
              )}

              {/* Articles */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {isSearching && (
                      <div className={`px-5 pt-4 pb-1`}>
                        <span className={`text-xs font-bold uppercase tracking-wide ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{section.title}</span>
                      </div>
                    )}
                    <div className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-50'}`}>
                      {section.articles.map((article, aIdx) => {
                        const articleKey = `${sIdx}-${aIdx}`;
                        const isArticleOpen = openArticle === articleKey;
                        return (
                          <div key={article.title}>
                            <button
                              onClick={() => toggleArticle(articleKey)}
                              className={`w-full flex items-start justify-between px-5 py-3.5 text-left gap-3 transition-colors active:scale-[0.99] ${darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}`}
                            >
                              <span className={`text-sm leading-snug flex-1 ${isArticleOpen ? 'text-primary font-semibold' : (darkMode ? 'text-slate-300 font-medium' : 'text-slate-700 font-medium')}`}>
                                {article.title}
                              </span>
                              <motion.div animate={{ rotate: isArticleOpen ? 180 : 0 }} transition={{ duration: 0.18 }} className="shrink-0 mt-0.5">
                                <ChevronDown size={14} className={isArticleOpen ? 'text-primary' : (darkMode ? 'text-slate-600' : 'text-slate-400')} />
                              </motion.div>
                            </button>

                            <AnimatePresence initial={false}>
                              {isArticleOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="overflow-hidden"
                                >
                                  <p className={`px-5 pb-4 text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {article.body}
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })
      )}
    </motion.div>
  );
};

export default GuidaFiscaleView;
