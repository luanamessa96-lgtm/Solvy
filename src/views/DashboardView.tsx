import { useMemo, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, AlertTriangle, AlertCircle, Info, FileText, Receipt } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PaywallModal from '../components/modals/PaywallModal';
import { useProStatus } from '../hooks/useProStatus';
import { Profile, Document } from '../types';
import InfoTooltip from '../components/ui/InfoTooltip';

const DashboardChart = lazy(() => import('../components/DashboardChart'));
import { calculateSpanishTaxes } from '../lib/countries/es';
import { calcularTrimestre } from '../services/modelosES';
import { parseLocalDate, getLocalYear } from '../utils/date';
import { getItDeductibilityRate } from '../lib/it/deductibility';
import { getEsDeductibilityRate } from '../lib/es/deductibility';
import { getAddizionaliRate } from '../lib/it/addizionali';
function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    'Italy': '🇮🇹',
    'Spain': '🇪🇸',
  };
  return flags[country] ?? '';
}

interface DashboardViewProps {
  profile: Profile;
  onProfileClick: () => void;
  onAddDocumentClick?: () => void;
  income: number;
  expenses: number;
  paidPercentage: number;
  documents: Document[];
  darkMode?: boolean;
  theme?: string;
  key?: string;
}

interface TasseForfettario {
  regime: 'forfettario';
  imposta: number;
  inps: number;
  netto: number;
  redditoLordo: number;     // income × coeff — mostrato come "Reddito imponibile"
  redditoImponibile: number; // redditoLordo − inps — base effettiva per imposta sostitutiva
  aliquota: number;
  isFivePercent: boolean;
  coeff: number;
}

interface TasseOrdinario {
  regime: 'ordinario';
  imposta: number;
  irpef: number;
  addizionali: number;
  inps: number;        // netto rivalsa
  inpsLordo: number;   // prima della rivalsa
  rivalsaInps: number; // rivalsa ricevuta dai clienti
  netto: number;
  redditoImponibile: number;
  aliquota: number;
}

type Tasse = TasseForfettario | TasseOrdinario;

const INPS_GESTIONE_SEPARATA = 0.2607;
const INPS_ORDINARIO = 0.24;
const INPS_ARTIGIANI = 0.24;
const INPS_COMMERCIANTI = 0.2448;
const INPS_MINIMALE = 4000; // minimale annuo artigiani/commercianti

type InpsType = 'separata' | 'artigiani' | 'commercianti';

function getInpsType(country: string, coeff: number | undefined): InpsType {
  if (country !== 'Italy') return 'separata';
  if (coeff === 67) return 'artigiani';
  if (coeff === 40) return 'commercianti';
  return 'separata';
}

const SOGLIA_FORFETTARIO = 85000;
const ALERT_SOGLIA = 80000;
const ALERT_SOGLIA_VICINO = 65000;

function calcIRPEF(imponibile: number): number {
  if (!Number.isFinite(imponibile) || imponibile <= 0) return 0;
  if (imponibile <= 28000) return imponibile * 0.23;
  if (imponibile <= 50000) return 28000 * 0.23 + (imponibile - 28000) * 0.33;
  return 28000 * 0.23 + 22000 * 0.33 + (imponibile - 50000) * 0.43;
}

function fmt(n: number) {
  const abs = Math.abs(Math.round(n));
  return `${n < 0 ? '-' : ''}€${abs.toLocaleString('it-IT')}`;
}

type DashTab = 'overview' | 'taxes' | 'expenses';

const DashboardView = ({ profile, income, expenses, paidPercentage, documents, darkMode, theme, onProfileClick, onAddDocumentClick }: DashboardViewProps) => {
  const { t } = useTranslation();
  const displayYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<DashTab>('overview');
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const isPro = useProStatus(profile);
  const isProDark = theme === 'pro-dark';

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  };

  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } },
  };

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, '0');
    const currentYear = new Date().getFullYear();
    const monthDocs = documents.filter(d => {
      const date = parseLocalDate(d.date);
      return date.getFullYear() === currentYear && date.getMonth() === i;
    });
    const applyItDeductibility = profile.country === 'Italy' && profile.regime === 'ordinario';
    const applyEsDeductibility = profile.country === 'Spain';
    const monthIncome = monthDocs.filter(d => d.type === 'invoice' && d.status === 'paid').reduce((s, d) => s + d.amount, 0);
    const monthExpenses = monthDocs.filter(d => d.type === 'expense').reduce((s, d) => {
      let rate = 1;
      if (applyItDeductibility) rate = getItDeductibilityRate(d.category);
      else if (applyEsDeductibility) rate = getEsDeductibilityRate(d.category);
      return s + d.amount * rate;
    }, 0);
    return { name: month, income: monthIncome, expenses: monthExpenses, net: monthIncome - monthExpenses };
  });

  // Proiezione annuale basata sui mesi con fatturato
  const proiezione = useMemo(() => {
    const monthsWithIncome = chartData.filter(m => m.income > 0);
    if (monthsWithIncome.length === 0) return income;
    const avgMonthly = monthsWithIncome.reduce((s, m) => s + m.income, 0) / monthsWithIncome.length;
    return avgMonthly * 12;
  }, [chartData, income]);

  const inpsType = getInpsType(profile.country, profile.coefficiente);

  // Calcoli fiscali
  const tasse = useMemo((): Tasse => {
    const regime = profile.regime || 'forfettario';
    const base = income; // fatturato incassato
    const it = getInpsType(profile.country, profile.coefficiente);

    const calcInpsAmount = (reddito: number, fallbackRate: number) => {
      if (it === 'artigiani') return Math.max(INPS_MINIMALE, reddito * INPS_ARTIGIANI);
      if (it === 'commercianti') return Math.max(INPS_MINIMALE, reddito * INPS_COMMERCIANTI);
      return reddito * fallbackRate;
    };

    if (regime === 'forfettario') {
      const coeffRaw = profile.coefficiente;
      const coeff = (coeffRaw != null && coeffRaw > 0) ? coeffRaw / 100 : 0.78;
      const redditoLordo = Math.max(0, base * coeff);

      // INPS è deducibile al 100% dalla base imponibile IRPEF (IT-20)
      const inps = calcInpsAmount(redditoLordo, INPS_GESTIONE_SEPARATA);
      const redditoImponibile = Math.max(0, redditoLordo - inps);

      const annoInizio = profile.annoInizioAttivita ?? null;
      const yearsActive = annoInizio != null ? displayYear - Number(annoInizio) : null;
      const isFivePercent = yearsActive != null && Number.isFinite(yearsActive) && yearsActive < 5;
      const aliquota = isFivePercent ? 0.05 : 0.15;

      const imposta = redditoImponibile * aliquota;
      const netto = base - imposta - inps;

      return { regime: 'forfettario', imposta, inps, netto, redditoLordo, redditoImponibile, aliquota, isFivePercent, coeff };
    } else {
      // Regime ordinario — INPS deducibile dalla base imponibile IRPEF (IT-20)
      const redditoLordo = Math.max(0, base - expenses);
      const inpsLordo = calcInpsAmount(redditoLordo, INPS_GESTIONE_SEPARATA);

      // Rivalsa INPS 4% ricevuta dai clienti riduce il costo INPS effettivo (solo IT ordinario).
      // Cappata a inpsLordo: in nessun caso la rivalsa può azzerare più di quanto dovuto.
      const rivalsaRaw = profile.country === 'Italy'
        ? documents
            .filter(d => d.type === 'invoice' && d.status === 'paid' && d.rivalsaInps && getLocalYear(d.date) === displayYear)
            .reduce((sum, d) => sum + d.amount * 0.04, 0)
        : 0;
      const rivalsaInps = Math.min(rivalsaRaw, inpsLordo);
      const inps = inpsLordo - rivalsaInps; // always >= 0

      const redditoImponibile = Math.max(0, redditoLordo - inps);
      const irpef = calcIRPEF(redditoImponibile);
      const addizionali = redditoImponibile * getAddizionaliRate(profile.region);
      const totaleImposta = irpef + addizionali;
      const netto = base - totaleImposta - inps - expenses;

      return { regime: 'ordinario', imposta: totaleImposta, irpef, addizionali, inps, inpsLordo, rivalsaInps, netto, redditoImponibile, aliquota: Number.isFinite(redditoImponibile) && redditoImponibile > 0 ? totaleImposta / redditoImponibile : 0 };
    }
  }, [income, expenses, profile, displayYear, documents]);

  const sogliAlert = income >= SOGLIA_FORFETTARIO ? 'exceeded' : income >= ALERT_SOGLIA ? 'warning' : income >= ALERT_SOGLIA_VICINO ? 'approaching' : null;

  const spesePerCategoria = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearExpenses = documents.filter(d => d.type === 'expense' && getLocalYear(d.date) === currentYear);
    const applyDeductibility = profile.country === 'Italy' && profile.regime === 'ordinario';
    const map: Record<string, { gross: number; deductible: number; rate: number }> = {};
    yearExpenses.forEach(d => {
      const cat = d.category || 'Altro';
      const rate = applyDeductibility ? getItDeductibilityRate(d.category) : 1;
      if (!map[cat]) map[cat] = { gross: 0, deductible: 0, rate };
      map[cat].gross += d.amount;
      map[cat].deductible += d.amount * rate;
    });
    return Object.entries(map)
      .map(([name, { gross, deductible, rate }]) => ({ name, amount: deductible, gross, rate }))
      .sort((a, b) => b.amount - a.amount);
  }, [documents, profile.country, profile.regime]);

  const isSpainProfile = profile.country === 'Spain';
  const isForfettario = !isSpainProfile && tasse.regime === 'forfettario';

  // ES deductible expenses for displayYear (applied when computing Spanish taxes)
  const esDeductibleExpenses = useMemo(() => {
    if (!isSpainProfile) return 0;
    return documents
      .filter(d => d.type === 'expense' && getLocalYear(d.date) === displayYear)
      .reduce((s, d) => s + d.amount * getEsDeductibilityRate(d.category), 0);
  }, [isSpainProfile, documents, displayYear]);

  const totaleTasse = useMemo(() => {
    if (isSpainProfile) {
      const sp = calculateSpanishTaxes(income, false, false, profile.annoInizioAttivita, displayYear, esDeductibleExpenses);
      return sp.irpf + sp.reta;
    }
    return tasse.imposta + tasse.inps;
  }, [isSpainProfile, income, profile.annoInizioAttivita, displayYear, esDeductibleExpenses, tasse]);
  const mettiDaParte = useMemo(() => {
    if (!isPro || isSpainProfile) return null;
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1–12
    const mesiRimasti = Math.max(1, 12 - currentMonth);
    const rataMensile = Math.round(totaleTasse / mesiRimasti);
    const year = today.getFullYear();
    const deadlines = [
      { date: new Date(year, 5, 30), label: '30 giugno', month: 'giugno', amount: Math.round(totaleTasse * 0.4) },
      { date: new Date(year, 10, 30), label: '30 novembre', month: 'novembre', amount: Math.round(totaleTasse * 0.6) },
    ];
    const next = deadlines.find(d => d.date >= today) ?? deadlines[1];
    return { rataMensile, next };
  }, [isPro, isSpainProfile, totaleTasse]);

  const barImposta = income > 0 ? (tasse.imposta / income) * 100 : 0;
  const barInps = income > 0 ? (tasse.inps / income) * 100 : 0;
  const barNetto = income > 0 ? (Math.max(0, tasse.netto) / income) * 100 : 0;

  const tabs: { id: DashTab; label: string }[] = [
    { id: 'overview', label: t('dashboard.tab_overview') },
    { id: 'taxes', label: t('dashboard.tab_taxes') },
    { id: 'expenses', label: t('dashboard.tab_expenses') },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="pb-24">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 space-y-4">
        <motion.div variants={item} className="space-y-1">
          <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {t('dashboard.hello', { name: (profile.name || '').split(' ')[0] || 'utente' })}{profile.country ? ` ${getCountryFlag(profile.country)}` : ''}
          </h2>
        </motion.div>

        {/* Tab bar */}
        <motion.div variants={item} className={`flex p-1 rounded-2xl ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'taxes' && !isPro) { setIsPaywallOpen(true); return; }
                setActiveTab(tab.id);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all relative ${activeTab === tab.id ? (isProDark ? 'text-white' : darkMode ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-400'}`}
              style={isProDark && activeTab === tab.id ? { background: 'rgba(200, 85, 247, 0.12)', borderRadius: '12px' } : undefined}
            >
              {tab.label}
              {tab.id === 'taxes' && !isPro && <span className="absolute top-0.5 right-1 text-[8px] font-black text-primary/60 uppercase">Pro</span>}
            </button>
          ))}
        </motion.div>
      </div>

      {documents.length === 0 && (
        <div className="px-6">
          <motion.div variants={item} className={`rounded-3xl p-6 border text-center space-y-4 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-50 text-slate-300'}`}>
              <FileText size={32} />
            </div>
            <div className="space-y-1">
              <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{t('dashboard.no_documents_title')}</p>
              <p className="text-xs text-slate-400">{t('dashboard.no_documents_subtitle')}</p>
            </div>
            {onAddDocumentClick && (
              <button onClick={onAddDocumentClick} className="mx-auto flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-all">
                <span>{t('dashboard.add_invoice_btn')}</span>
              </button>
            )}
          </motion.div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── PANORAMICA ── */}
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="px-6 space-y-4">
            {/* Entrate */}
            <div className={`rounded-3xl p-6 border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} space-y-4`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('dashboard.annual_income')}</span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.synced')}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gen, {displayYear} - Dic, {displayYear}</p>
                <h2 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{income.toLocaleString()}</h2>
              </div>
              <div className={`pt-4 border-t flex justify-between items-center ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('dashboard.paid_invoices')}</span>
                <span className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>{paidPercentage}%</span>
              </div>
            </div>

            {/* Margine netto */}
            <div className={`rounded-3xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} overflow-hidden`}>
              <div className={`px-6 py-5 flex items-center justify-between border-b ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.net_margin')}</p>
                  <p className={`text-2xl font-bold ${income - expenses >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{income - expenses < 0 ? '-' : ''}€{Math.abs(income - expenses).toLocaleString()}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${income - expenses >= 0 ? (darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600')}`}>
                  {income > 0 ? `${Math.round(((income - expenses) / income) * 100)}%` : '0%'}
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
                <div className="px-5 py-4 flex flex-col items-start gap-1.5">
                  <div className="flex items-center gap-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">{t('dashboard.total_expenses')}</p>
                    {profile.country === 'Italy' && profile.regime === 'ordinario' && (
                      <InfoTooltip text="Spese deducibili al netto dell'aliquota di deducibilità per categoria. Le uscite lorde sono visibili nella sezione Fatture." darkMode={darkMode} />
                    )}
                  </div>
                  <p className={`text-base font-bold leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{expenses.toLocaleString()}</p>
                  <div className={`w-full h-1 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div className="bg-red-400 h-full rounded-full" style={{ width: income > 0 ? `${Math.min((expenses / income) * 100, 100)}%` : '0%' }} />
                  </div>
                </div>
                <div className="px-5 py-4 flex flex-col items-start gap-1.5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">{t('dashboard.estimated_taxes')}</p>
                  <p className={`text-base font-bold leading-none ${darkMode ? 'text-white' : 'text-slate-900'}`}>{fmt(totaleTasse)}</p>
                  <div className={`w-full h-1 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div className="bg-primary h-full rounded-full" style={{ width: income > 0 ? `${Math.min((totaleTasse / income) * 100, 100)}%` : '0%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Grafico */}
            <div className={`rounded-3xl p-6 border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} space-y-6`}>
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('dashboard.monthly_trend')}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{displayYear}</p>
                </div>
                <div
                  className={`p-2 rounded-xl ${isProDark ? 'text-primary' : darkMode ? 'bg-slate-800 text-primary' : 'bg-slate-50 text-primary'}`}
                  style={isProDark ? { background: 'rgba(160, 50, 200, 0.22)', borderRadius: '12px', padding: '10px' } : undefined}
                ><TrendingUp size={18} /></div>
              </div>
              <div className="h-48 w-full">
                <Suspense fallback={<div className="h-full w-full" />}>
                  <DashboardChart data={chartData} darkMode={darkMode} theme={theme} year={displayYear} />
                </Suspense>
              </div>
              <div className="flex gap-4 pt-2">
                {[{ label: t('dashboard.chart_income'), color: 'bg-emerald-500' }, { label: t('dashboard.chart_outflows'), color: 'bg-indigo-500' }].map(l => (
                  <div key={l.label} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${l.color}`} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TASSE ── */}
        {activeTab === 'taxes' && profile.country === 'Spain' && (() => {
          const spTaxes = calculateSpanishTaxes(income, false, false, profile.annoInizioAttivita, displayYear, esDeductibleExpenses);
          const isTarifaPlana = spTaxes.tarifaPlanaStatus !== 'normal';
          const annoInicio = profile.annoInizioAttivita != null ? Number(profile.annoInizioAttivita) : null;
          const yearsActiveES = annoInicio != null ? displayYear - annoInicio : null;
          const retencionRate = yearsActiveES != null && yearsActiveES < 3 ? 7 : 15;
          const retencionesDocs = documents.filter(d =>
            d.type === 'invoice' && d.ritenuta === true && getLocalYear(d.date) === displayYear
          );
          const totalRetenciones = retencionesDocs.reduce((sum, d) => sum + d.amount * (retencionRate / 100), 0);
          const today = new Date();
          const barIRPF = income > 0 ? (spTaxes.irpf / income) * 100 : 0;
          const barRETA = income > 0 ? (spTaxes.reta / income) * 100 : 0;
          const barNetES = income > 0 ? (Math.max(0, spTaxes.netIncome) / income) * 100 : 0;
          // ES-17 — Aparta para impuestos
          const currentMonthES = today.getMonth() + 1;
          const mesiRimastiES = Math.max(1, 12 - currentMonthES);
          const rataMensileES = Math.round((spTaxes.irpf + spTaxes.reta) / mesiRimastiES);
          const currentYearES = today.getFullYear();
          const quarterlyDeadlinesES = [
            { date: new Date(currentYearES, 3, 20), label: '20 de abril', modelo: 'Mod. 130 T1' },
            { date: new Date(currentYearES, 6, 20), label: '20 de julio', modelo: 'Mod. 130 T2' },
            { date: new Date(currentYearES, 9, 20), label: '20 de octubre', modelo: 'Mod. 130 T3' },
            { date: new Date(currentYearES + 1, 0, 20), label: '20 de enero', modelo: 'Mod. 130 T4' },
          ];
          const nextQuarterlyES = quarterlyDeadlinesES.find(d => d.date >= today) ?? quarterlyDeadlinesES[3];
          const nextQIndex = quarterlyDeadlinesES.indexOf(nextQuarterlyES);
          const nextQNum = (nextQIndex + 1) as 1 | 2 | 3 | 4;
          // T4 deadline (Jan 30 year+1) belongs to fiscal year currentYearES-1
          const nextQYear = nextQNum === 4 ? currentYearES - 1 : currentYearES;
          const esRetencionRateDecimal = (yearsActiveES != null && yearsActiveES < 3 ? 7 : 15) / 100;
          const nextQData = calcularTrimestre(documents ?? [], nextQNum, nextQYear, esRetencionRateDecimal);
          const quarterlyAmountES = nextQData.cuotaIRPF;
          return (
            <motion.div key="taxes" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="px-6 space-y-4">
              <div className={`rounded-3xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className={`px-6 pt-5 pb-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimación Fiscal {displayYear}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5 ${darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>Estimación Directa<InfoTooltip text="Régimen fiscal estándar para autónomos: pagas impuestos sobre tus ingresos reales menos gastos." darkMode={darkMode} /></span>
                  </div>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{Math.round(spTaxes.irpf + spTaxes.reta).toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-0.5">IRPF + RETA estimados</p>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-slate-400">Facturación bruta</span>
                    <span className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>€{income.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-slate-400">IRPF estimado<InfoTooltip text="Impuesto sobre la Renta de las Personas Físicas. El impuesto principal para autónomos en España." darkMode={darkMode} /></span>
                      <span className="text-xs font-bold text-rose-500">€{Math.round(spTaxes.irpf).toLocaleString()}</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="bg-rose-400 h-full rounded-full" style={{ width: `${Math.min(barIRPF, 100)}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400">RETA anual<InfoTooltip text="Cuota a la Seguridad Social (autónomos). No es un impuesto: es tu cotización previdencial mensual. Calculada según el sistema de ingresos reales vigente desde 2023." darkMode={darkMode} /></span>
                      </div>
                      <span className="text-xs font-bold text-amber-500">€{Math.round(spTaxes.reta).toLocaleString()}</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(barRETA, 100)}%` }} />
                    </div>
                  </div>
                  <div className={`pt-3 border-t space-y-1.5 ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                    <div className="flex justify-between">
                      <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Neto estimado</span>
                      <span className={`text-sm font-bold ${spTaxes.netIncome >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{spTaxes.netIncome < 0 ? '-' : ''}€{Math.abs(Math.round(spTaxes.netIncome)).toLocaleString()}</span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min(barNetES, 100)}%` }} />
                    </div>
                  </div>
                  {spTaxes.rendimientoNeto > 0 && (
                    <div className={`pt-3 border-t flex items-start gap-2 ${darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-50 text-slate-400'}`}>
                      <Info size={13} className="mt-0.5 shrink-0" />
                      <p className="text-[11px] leading-relaxed">Tipo efectivo (IRPF+RETA / rendimiento neto): <span className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{Math.round((spTaxes.irpf + spTaxes.reta) / spTaxes.rendimientoNeto * 100)}%</span></p>
                    </div>
                  )}
                  {/* Disclaimer ES-12 */}
                  <p className="text-[10px] text-slate-400 leading-relaxed pt-2">
                    Los cálculos mostrados son estimaciones basadas en los datos introducidos y los tipos fiscales estándar. No constituyen asesoramiento fiscal profesional. Consulta siempre con tu gestor o asesor fiscal.
                  </p>
                </div>
              </div>
              {/* ES-28 — Retenciones IRPF subidas */}
              {retencionesDocs.length > 0 && (
                <div className={`rounded-3xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <div className={`px-6 pt-5 pb-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center">Retenciones IRPF subidas {displayYear}<InfoTooltip text="El cliente retiene el 7% o 15% de tu factura y lo ingresa a la AEAT por ti." darkMode={darkMode} /></p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{Math.round(totalRetenciones).toLocaleString('es-ES')}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Total retenido por clientes ({retencionRate}%)</p>
                  </div>
                  <div className="px-6 py-4 space-y-3">
                    {retencionesDocs.map(d => {
                      const impRet = d.amount * (retencionRate / 100);
                      return (
                        <div key={d.id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{d.client || d.title}</p>
                            <p className="text-[10px] text-slate-400">{retencionRate}% · base €{d.amount.toLocaleString('es-ES')}</p>
                          </div>
                          <span className="text-xs font-bold text-rose-500 shrink-0">-€{Math.round(impRet).toLocaleString('es-ES')}</span>
                        </div>
                      );
                    })}
                    <div className={`pt-3 border-t flex items-start gap-2 ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                      <Info size={13} className="mt-0.5 shrink-0 text-slate-400" />
                      <p className="text-[11px] text-slate-400 leading-relaxed">Se deducen del Modelo 100 anual. Consulta con tu gestor fiscal.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ES-17 — Aparta para impuestos (Pro ES) */}
              {isPro && income > 0 && (
                <div
                  className="rounded-3xl p-5 border"
                  style={darkMode
                    ? { background: 'rgba(109, 40, 217, 0.1)', borderColor: 'rgba(139, 92, 246, 0.2)' }
                    : { background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', borderColor: '#ddd6fe' }
                  }
                >
                  <div className="space-y-2 mb-3">
                    <p className={`text-sm font-bold ${darkMode ? 'text-violet-300' : 'text-violet-800'}`}>
                      💰 Aparta €{rataMensileES.toLocaleString('es-ES')}/mes para estar tranquilo
                    </p>
                    <p className={`text-sm font-bold ${darkMode ? 'text-violet-400' : 'text-violet-700'}`}>
                      📅 Próximo pago: €{quarterlyAmountES.toLocaleString('es-ES')} el {nextQuarterlyES.label} ({nextQuarterlyES.modelo})
                    </p>
                  </div>
                  <p className={`text-[10px] leading-relaxed ${darkMode ? 'text-violet-500' : 'text-violet-500'}`}>
                    Estimación basada en los datos actuales. El importe real puede variar.
                  </p>
                </div>
              )}
            </motion.div>
          );
        })()}

        {activeTab === 'taxes' && profile.country !== 'Spain' && (
          <motion.div key="taxes" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="px-6 space-y-4">
            <div className={`rounded-3xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <div className={`px-6 pt-5 pb-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.fiscal_estimate', { year: displayYear })}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isForfettario ? (darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')}`}>
                    {isForfettario ? (tasse.isFivePercent ? 'Forfettario 5%' : 'Forfettario 15%') : 'Ordinario'}
                  </span>
                </div>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{fmt(totaleTasse)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t('dashboard.tax_subtitle')}</p>
              </div>

              {isForfettario && sogliAlert && (
                <div className={`mx-4 mt-4 px-4 py-3 rounded-2xl flex items-start gap-3 ${
                  sogliAlert === 'exceeded'
                    ? (darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600')
                    : sogliAlert === 'warning'
                      ? (darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')
                      : (darkMode ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-50 text-yellow-700')
                }`}>
                  {sogliAlert === 'exceeded'
                    ? <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
                  <p className="text-xs font-bold leading-relaxed">
                    {sogliAlert === 'exceeded'
                      ? t('dashboard.alert_exceeded')
                      : sogliAlert === 'warning'
                        ? t('dashboard.alert_warning', { remaining: fmt(SOGLIA_FORFETTARIO - income) })
                        : t('dashboard.alert_approaching')}
                  </p>
                </div>
              )}

              <div className="px-6 py-4 space-y-3">
                {isForfettario ? (<>
                  <div className="flex justify-between">
                    <span className="inline-flex items-center text-xs font-bold text-slate-400">
                      {t('dashboard.taxable_income', { pct: tasse.regime === 'forfettario' ? Math.round(tasse.coeff * 100) : 100 })}
                      <InfoTooltip text="Percentuale che determina la base imponibile nel forfettario. Varia per categoria (es. 78% per professionisti). Rappresenta la quota di fatturato considerata come reddito. L'INPS è poi deducibile prima del calcolo dell'imposta sostitutiva." darkMode={darkMode} />
                    </span>
                    <span className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{fmt(tasse.redditoLordo)}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="inline-flex items-center text-xs font-bold text-slate-400">
                        {t('dashboard.substitutive_tax', { pct: Math.round(tasse.aliquota * 100) })}
                        <InfoTooltip text="Tassa flat del forfettario: 5% nei primi 5 anni, 15% dal 6° anno. Sostituisce IRPEF, addizionali e IVA." darkMode={darkMode} />
                      </span>
                      <span className="text-xs font-bold text-rose-500">{fmt(tasse.imposta)}</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="bg-rose-400 h-full rounded-full" style={{ width: `${Math.min(barImposta, 100)}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="inline-flex items-center text-xs font-bold text-slate-400">
                        {inpsType === 'artigiani' ? t('dashboard.inps_artigiani') : inpsType === 'commercianti' ? t('dashboard.inps_commercianti') : t('dashboard.inps_sep')}
                        <InfoTooltip
                          text={inpsType === 'artigiani' || inpsType === 'commercianti'
                            ? "Contributi previdenziali per artigiani e lavoratori manuali. Hanno un minimale annuo di ~€4.000 indipendentemente dal reddito."
                            : "Contributi previdenziali obbligatori per professionisti autonomi. Si calcolano sul reddito imponibile e danno diritto alla pensione."}
                          darkMode={darkMode}
                        />
                      </span>
                      <span className="text-xs font-bold text-amber-500">{fmt(tasse.inps)}</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(barInps, 100)}%` }} />
                    </div>
                  </div>
                </>) : (<>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-slate-400">{t('dashboard.taxable_income_plain')}</span>
                    <span className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{fmt(tasse.redditoImponibile)}</span>
                  </div>
                  {tasse.regime === 'ordinario' && (<>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-xs font-bold text-slate-400">{t('dashboard.irpef_brackets')}</span>
                        <span className="text-xs font-bold text-rose-500">{fmt(tasse.irpef)}</span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <div className="bg-rose-400 h-full rounded-full" style={{ width: `${Math.min(income > 0 ? (tasse.irpef / income) * 100 : 0, 100)}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="inline-flex items-center text-xs font-bold text-slate-400">
                        {profile.region
                          ? `Addizionali (${(getAddizionaliRate(profile.region) * 100).toFixed(2)}% — ${profile.region})`
                          : t('dashboard.surcharges')}
                        <InfoTooltip text="Tasse aggiuntive all'IRPEF che variano per regione (da 0.7% Valle d'Aosta a 3.33% Lazio). Non si applicano al forfettario." darkMode={darkMode} />
                      </span>
                      <span className="text-xs font-bold text-orange-500">{fmt(tasse.addizionali)}</span>
                    </div>
                  </>)}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="inline-flex items-center text-xs font-bold text-slate-400">
                        {inpsType === 'artigiani' ? t('dashboard.inps_artigiani') : inpsType === 'commercianti' ? t('dashboard.inps_commercianti') : t('dashboard.inps_sep')}
                        <InfoTooltip
                          text={inpsType === 'artigiani' || inpsType === 'commercianti'
                            ? "Contributi previdenziali per artigiani e lavoratori manuali. Hanno un minimale annuo di ~€4.000 indipendentemente dal reddito."
                            : "Contributi previdenziali obbligatori per professionisti autonomi. Si calcolano sul reddito imponibile e danno diritto alla pensione."}
                          darkMode={darkMode}
                        />
                      </span>
                      <span className="text-xs font-bold text-amber-500">{fmt((tasse as TasseOrdinario).inpsLordo)}</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(barInps, 100)}%` }} />
                    </div>
                  </div>
                  {(tasse as TasseOrdinario).rivalsaInps > 0 && (
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-emerald-600">Rivalsa INPS ricevuta (4%)</span>
                      <span className="text-xs font-bold text-emerald-600">−{fmt((tasse as TasseOrdinario).rivalsaInps)}</span>
                    </div>
                  )}
                </>)}

                <div className={`pt-3 border-t space-y-1.5 ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                  <div className="flex justify-between">
                    <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('dashboard.net_estimated')}</span>
                    <span className={`text-sm font-bold ${tasse.netto >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{fmt(tasse.netto)}</span>
                  </div>
                  <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min(barNetto, 100)}%` }} />
                  </div>
                </div>

                {income > 0 && proiezione !== income && (
                  <div className={`pt-3 border-t flex items-start gap-2 ${darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-50 text-slate-400'}`}>
                    <Info size={13} className="mt-0.5 shrink-0" />
                    <p className="text-[11px] leading-relaxed">{t('dashboard.annual_projection')}<span className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{fmt(proiezione)}</span></p>
                  </div>
                )}

                {isForfettario && !profile.coefficiente && (
                  <div className={`pt-2 flex items-start gap-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Info size={13} className="mt-0.5 shrink-0" />
                    <p className="text-[11px] leading-relaxed">{t('dashboard.coeff_missing')}<button onClick={onProfileClick} className="text-primary font-bold">{t('dashboard.set_in_profile')}</button></p>
                  </div>
                )}

                {/* Disclaimer IT-18 */}
                <p className="text-[10px] text-slate-400 leading-relaxed pt-2">
                  I calcoli mostrati sono stime indicative basate sui dati inseriti e sulle aliquote fiscali standard. Non costituiscono consulenza fiscale professionale. Consulta sempre il tuo commercialista.
                </p>
              </div>
            </div>

            {/* IT-24 — Metti da parte (Pro IT) */}
            {mettiDaParte && (
              <div
                className="rounded-3xl p-5 border"
                style={darkMode
                  ? { background: 'rgba(109, 40, 217, 0.1)', borderColor: 'rgba(139, 92, 246, 0.2)' }
                  : { background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', borderColor: '#ddd6fe' }
                }
              >
                <div className="space-y-2 mb-3">
                  <p className={`text-sm font-bold ${darkMode ? 'text-violet-300' : 'text-violet-800'}`}>
                    💰 Metti da parte €{mettiDaParte.rataMensile.toLocaleString('it-IT')}/mese per essere tranquillo a {mettiDaParte.next.month}
                  </p>
                  <p className={`text-sm font-bold ${darkMode ? 'text-violet-400' : 'text-violet-700'}`}>
                    📅 Prossimo pagamento fiscale: €{mettiDaParte.next.amount.toLocaleString('it-IT')} il {mettiDaParte.next.label}
                  </p>
                </div>
                <p className={`text-[10px] leading-relaxed ${darkMode ? 'text-violet-500' : 'text-violet-500'}`}>
                  Stima basata sui dati attuali. L'importo reale potrebbe variare.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── SPESE ── */}
        {activeTab === 'expenses' && (
          <motion.div key="expenses" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="px-6">
            {spesePerCategoria.length === 0 ? (
              <div className={`rounded-3xl p-10 border text-center space-y-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-50 text-slate-300'}`}><Receipt size={32} /></div>
                <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{t('dashboard.no_expenses_title')}</p>
                <p className="text-xs text-slate-400">{t('dashboard.no_expenses_subtitle')}</p>
              </div>
            ) : (
              <div className={`rounded-3xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className={`px-6 py-5 flex items-center justify-between border-b ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.expenses_by_category')}</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{expenses.toLocaleString()}</p>
                  </div>
                  <div
                    className={`p-2 rounded-xl ${isProDark ? '' : darkMode ? 'bg-slate-800 text-red-400' : 'bg-red-50 text-red-500'}`}
                    style={isProDark ? { background: 'rgba(45, 212, 191, 0.12)', borderRadius: '12px', padding: '10px', color: 'var(--color-accent)' } : undefined}
                  ><Receipt size={18} /></div>
                </div>
                <div className="px-6 py-4 space-y-3">
                  {spesePerCategoria.map(({ name, amount, gross, rate }, index) => {
                    const pct = expenses > 0 ? (amount / expenses) * 100 : 0;
                    const showDeductibility = rate < 1;
                    const colors = [
                      { bar: isProDark ? '#2dd4bf' : '#6366f1', bg: 'bg-indigo-500' },
                      { bar: '#f59e0b', bg: 'bg-amber-400' },
                      { bar: '#10b981', bg: 'bg-emerald-500' },
                      { bar: isProDark ? '#c855f7' : '#3b82f6', bg: 'bg-blue-500' },
                      { bar: '#ec4899', bg: 'bg-pink-500' },
                      { bar: '#f97316', bg: 'bg-orange-500' },
                      { bar: '#8b5cf6', bg: 'bg-violet-500' },
                      { bar: '#14b8a6', bg: 'bg-teal-500' },
                    ];
                    const color = colors[index % colors.length];
                    return (
                      <div key={name} className="space-y-1.5">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${color.bg}`} />
                            <span className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-right">
                            <span className="text-[10px] font-bold text-slate-400">{Math.round(pct)}%</span>
                            {showDeductibility ? (
                              <div className="text-right">
                                <p className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{amount.toLocaleString()} <span className="text-[10px] font-semibold text-slate-400">deducibile</span></p>
                                <p className="text-[10px] text-slate-400">€{gross.toLocaleString()} lordo · {Math.round(rate * 100)}%</p>
                              </div>
                            ) : (
                              <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{amount.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.08 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: color.bar }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <PaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} darkMode={darkMode} />
    </motion.div>
  );
};

export default DashboardView;
