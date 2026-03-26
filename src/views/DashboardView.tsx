import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, AlertTriangle, AlertCircle, Info, FileText, Receipt } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PaywallModal from '../components/modals/PaywallModal';
import { useProStatus } from '../hooks/useProStatus';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Profile, Document } from '../types';
import { calculateSpanishTaxes } from '../lib/countries/es';
import { getSpanishDeadlines } from '../data/deadlines-es';
import { CountryBadge } from '../components/CountryBadge';

interface DashboardViewProps {
  profile: Profile;
  onProfileClick: () => void;
  onAddDocumentClick?: () => void;
  income: number;
  expenses: number;
  paidPercentage: number;
  documents: Document[];
  darkMode?: boolean;
  key?: string;
}

interface TasseForfettario {
  regime: 'forfettario';
  imposta: number;
  inps: number;
  netto: number;
  redditoImponibile: number;
  aliquota: number;
  isFivePercent: boolean;
  coeff: number;
}

interface TasseOrdinario {
  regime: 'ordinario';
  imposta: number;
  irpef: number;
  addizionali: number;
  inps: number;
  netto: number;
  redditoImponibile: number;
  aliquota: number;
}

type Tasse = TasseForfettario | TasseOrdinario;

const INPS_GESTIONE_SEPARATA = 0.2607;
const INPS_ORDINARIO = 0.24;
const SOGLIA_FORFETTARIO = 85000;
const ALERT_SOGLIA = 80000;

function calcIRPEF(imponibile: number): number {
  if (imponibile <= 0) return 0;
  if (imponibile <= 28000) return imponibile * 0.23;
  if (imponibile <= 50000) return 28000 * 0.23 + (imponibile - 28000) * 0.35;
  return 28000 * 0.23 + 22000 * 0.35 + (imponibile - 50000) * 0.43;
}

function fmt(n: number) {
  return `€ ${Math.round(n).toLocaleString('it-IT')}`;
}

type DashTab = 'overview' | 'taxes' | 'expenses';

const DashboardView = ({ profile, income, expenses, paidPercentage, documents, darkMode, onProfileClick, onAddDocumentClick }: DashboardViewProps) => {
  const { t } = useTranslation();
  const displayYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<DashTab>('overview');
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const isPro = useProStatus(profile);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  };

  const item = {
    hidden: { opacity: 0, y: 20, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } },
  };

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, '0');
    const currentYear = new Date().getFullYear();
    const monthDocs = documents.filter(d => {
      const date = new Date(d.date);
      return date.getFullYear() === currentYear && date.getMonth() === i;
    });
    const monthIncome = monthDocs.filter(d => d.type === 'invoice' && d.status === 'paid').reduce((s, d) => s + d.amount, 0);
    const monthExpenses = monthDocs.filter(d => d.type === 'expense').reduce((s, d) => s + d.amount, 0);
    return { name: month, income: monthIncome, expenses: monthExpenses, net: monthIncome - monthExpenses };
  });

  // Proiezione annuale basata sui mesi con fatturato
  const proiezione = useMemo(() => {
    const monthsWithIncome = chartData.filter(m => m.income > 0);
    if (monthsWithIncome.length === 0) return income;
    const avgMonthly = monthsWithIncome.reduce((s, m) => s + m.income, 0) / monthsWithIncome.length;
    return avgMonthly * 12;
  }, [chartData, income]);

  // Calcoli fiscali
  const tasse = useMemo((): Tasse => {
    const regime = profile.regime || 'forfettario';
    const base = income; // fatturato incassato

    if (regime === 'forfettario') {
      const coeffRaw = profile.coefficiente;
      const coeff = (coeffRaw != null && coeffRaw > 0) ? coeffRaw / 100 : 0.78;
      const redditoImponibile = base * coeff;

      const annoInizio = profile.annoInizioAttivita;
      const isFivePercent = annoInizio != null && (displayYear - annoInizio) < 5;
      const aliquota = isFivePercent ? 0.05 : 0.15;

      const imposta = redditoImponibile * aliquota;
      const inps = redditoImponibile * INPS_GESTIONE_SEPARATA;
      const netto = base - imposta - inps;

      return { regime: 'forfettario', imposta, inps, netto, redditoImponibile, aliquota, isFivePercent, coeff };
    } else {
      // Regime ordinario
      const redditoImponibile = Math.max(0, base - expenses); // reddito netto approssimato
      const irpef = calcIRPEF(redditoImponibile);
      const addizionali = redditoImponibile * 0.023;
      const inps = redditoImponibile * INPS_ORDINARIO;
      const totaleImposta = irpef + addizionali;
      const netto = base - totaleImposta - inps - expenses;

      return { regime: 'ordinario', imposta: totaleImposta, irpef, addizionali, inps, netto, redditoImponibile, aliquota: redditoImponibile > 0 ? totaleImposta / redditoImponibile : 0 };
    }
  }, [income, expenses, profile, displayYear]);

  const sogliAlert = income >= SOGLIA_FORFETTARIO ? 'exceeded' : income >= ALERT_SOGLIA ? 'warning' : null;

  const spesePerCategoria = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearExpenses = documents.filter(d => d.type === 'expense' && new Date(d.date).getFullYear() === currentYear);
    const map: Record<string, number> = {};
    yearExpenses.forEach(d => {
      const cat = d.category || 'Altro';
      map[cat] = (map[cat] || 0) + d.amount;
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [documents]);

  const isSpainProfile = profile.country === 'Spain';
  const isForfettario = !isSpainProfile && tasse.regime === 'forfettario';
  const totaleTasse = useMemo(() => {
    if (isSpainProfile) {
      const sp = calculateSpanishTaxes(income, false, false, profile.annoInizioAttivita, displayYear);
      return sp.irpf + sp.reta;
    }
    return tasse.imposta + tasse.inps;
  }, [isSpainProfile, income, profile.annoInizioAttivita, displayYear, tasse]);
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
          <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('dashboard.hello', { name: (profile.name || '').split(' ')[0] || 'utente' })}</h2>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{profile.country}</p>
            <CountryBadge country={profile.country} size="sm" />
          </div>
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
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all relative ${activeTab === tab.id ? (darkMode ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-400'}`}
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
                  <p className={`text-2xl font-bold ${income - expenses >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>€{(income - expenses).toLocaleString()}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${income - expenses >= 0 ? (darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600')}`}>
                  {income > 0 ? `${Math.round(((income - expenses) / income) * 100)}%` : '0%'}
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
                <div className="px-5 py-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.total_expenses')}</p>
                  <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{expenses.toLocaleString()}</p>
                  <div className={`w-full h-1 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div className="bg-red-400 h-full rounded-full" style={{ width: income > 0 ? `${Math.min((expenses / income) * 100, 100)}%` : '0%' }} />
                  </div>
                </div>
                <div className="px-5 py-4 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.estimated_taxes')}</p>
                  <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{fmt(totaleTasse)}</p>
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
                <div className={`p-2 rounded-xl ${darkMode ? 'bg-slate-800 text-primary' : 'bg-slate-50 text-primary'}`}><TrendingUp size={18} /></div>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className={`p-2 rounded-xl border shadow-xl backdrop-blur-md ${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-100'}`}>
                            <p className={`text-[10px] font-bold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t('dashboard.tooltip_month', { month: payload[0].payload.name })}</p>
                            <div className="space-y-0.5">
                              {payload.map((entry: { name: string; value: number }, i: number) => (
                                <div key={i} className="flex items-center justify-between gap-4">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">{entry.name === 'income' ? t('dashboard.chart_income') : t('dashboard.chart_outflows')}</span>
                                  <span className={`text-[10px] font-black ${entry.name === 'income' ? 'text-emerald-500' : 'text-indigo-500'}`}>€{Math.round(entry.value).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expenses" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} dy={10} />
                  </AreaChart>
                </ResponsiveContainer>
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
          const spTaxes = calculateSpanishTaxes(income, false, false, profile.annoInizioAttivita, displayYear);
          const isTarifaPlana = spTaxes.tarifaPlanaStatus !== 'normal';
          const spDeadlines = getSpanishDeadlines(displayYear);
          const today = new Date();
          const nextSpDeadline = spDeadlines
            .map(d => ({ ...d, dateObj: new Date(d.date) }))
            .filter(d => d.dateObj >= today)
            .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())[0] || null;
          const daysToNext = nextSpDeadline ? Math.ceil((nextSpDeadline.dateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
          const barIRPF = income > 0 ? (spTaxes.irpf / income) * 100 : 0;
          const barRETA = income > 0 ? (spTaxes.reta / income) * 100 : 0;
          const barNetES = income > 0 ? (Math.max(0, spTaxes.netIncome) / income) * 100 : 0;
          return (
            <motion.div key="taxes" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="px-6 space-y-4">
              <div className={`rounded-3xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className={`px-6 pt-5 pb-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimación Fiscal {displayYear}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>Estimación Directa</span>
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
                      <span className="text-xs font-bold text-slate-400">IRPF estimado</span>
                      <span className="text-xs font-bold text-rose-500">€{Math.round(spTaxes.irpf).toLocaleString()}</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="bg-rose-400 h-full rounded-full" style={{ width: `${Math.min(barIRPF, 100)}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400">RETA anual</span>
                        {isTarifaPlana && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                            Tarifa Plana €{spTaxes.monthlyRETA}/mes
                          </span>
                        )}
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
                      <span className={`text-sm font-bold ${spTaxes.netIncome >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>€{Math.round(spTaxes.netIncome).toLocaleString()}</span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min(barNetES, 100)}%` }} />
                    </div>
                  </div>
                  {income > 0 && (
                    <div className={`pt-3 border-t flex items-start gap-2 ${darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-50 text-slate-400'}`}>
                      <Info size={13} className="mt-0.5 shrink-0" />
                      <p className="text-[11px] leading-relaxed">Tipo efectivo: <span className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{Math.round(spTaxes.effectiveRate * 100)}%</span></p>
                    </div>
                  )}
                </div>
              </div>
              {nextSpDeadline && (
                <div className={`rounded-3xl p-5 border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Próximo vencimiento</p>
                  <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{nextSpDeadline.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(nextSpDeadline.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {daysToNext !== null && ` — faltan ${daysToNext} días`}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })()}

        {activeTab === 'taxes' && profile.country !== 'Spain' && (
          <motion.div key="taxes" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="px-6">
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
                <div className={`mx-4 mt-4 px-4 py-3 rounded-2xl flex items-start gap-3 ${sogliAlert === 'exceeded' ? (darkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600') : (darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')}`}>
                  {sogliAlert === 'exceeded' ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
                  <p className="text-xs font-bold leading-relaxed">
                    {sogliAlert === 'exceeded' ? t('dashboard.alert_exceeded') : t('dashboard.alert_warning', { remaining: fmt(SOGLIA_FORFETTARIO - income) })}
                  </p>
                </div>
              )}

              <div className="px-6 py-4 space-y-3">
                {isForfettario ? (<>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-slate-400">{t('dashboard.taxable_income', { pct: tasse.regime === 'forfettario' ? Math.round(tasse.coeff * 100) : 100 })}</span>
                    <span className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{fmt(tasse.redditoImponibile)}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-slate-400">{t('dashboard.substitutive_tax', { pct: Math.round(tasse.aliquota * 100) })}</span>
                      <span className="text-xs font-bold text-rose-500">{fmt(tasse.imposta)}</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="bg-rose-400 h-full rounded-full" style={{ width: `${Math.min(barImposta, 100)}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-slate-400">{t('dashboard.inps_sep')}</span>
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
                      <span className="text-xs font-bold text-slate-400">{t('dashboard.surcharges')}</span>
                      <span className="text-xs font-bold text-orange-500">{fmt(tasse.addizionali)}</span>
                    </div>
                  </>)}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-slate-400">{t('dashboard.inps_artisan')}</span>
                      <span className="text-xs font-bold text-amber-500">{fmt(tasse.inps)}</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(barInps, 100)}%` }} />
                    </div>
                  </div>
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
              </div>
            </div>
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
                  <div className={`p-2 rounded-xl ${darkMode ? 'bg-slate-800 text-red-400' : 'bg-red-50 text-red-500'}`}><Receipt size={18} /></div>
                </div>
                <div className="px-6 py-4 space-y-3">
                  {spesePerCategoria.map(({ name, amount }, index) => {
                    const pct = expenses > 0 ? (amount / expenses) * 100 : 0;
                    const colors = [
                      { bar: '#6366f1', bg: 'bg-indigo-500' },
                      { bar: '#f59e0b', bg: 'bg-amber-400' },
                      { bar: '#10b981', bg: 'bg-emerald-500' },
                      { bar: '#3b82f6', bg: 'bg-blue-500' },
                      { bar: '#ec4899', bg: 'bg-pink-500' },
                      { bar: '#f97316', bg: 'bg-orange-500' },
                      { bar: '#8b5cf6', bg: 'bg-violet-500' },
                      { bar: '#14b8a6', bg: 'bg-teal-500' },
                    ];
                    const color = colors[index % colors.length];
                    return (
                      <div key={name} className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${color.bg}`} />
                            <span className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">{Math.round(pct)}%</span>
                            <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{amount.toLocaleString()}</span>
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
