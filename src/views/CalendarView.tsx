import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutList, Grid, AlertCircle, Calendar, FileEdit, Trash2, Plus, ChevronRight, CheckCircle2, ChevronLeft, Search, X } from 'lucide-react';
import { Deadline, Profile } from '../types';
import { getSpanishDeadlines } from '../data/deadlines-es';
import { parseLocalDate, getLocalYear, getLocalMonth } from '../utils/date';
import PaywallModal from '../components/modals/PaywallModal';
import { useProStatus } from '../hooks/useProStatus';
import { useTranslation } from 'react-i18next';

const FISCAL_ESTIMATE_TITLES = new Set([
  'Saldo imposta sostitutiva + 1° acconto',
  '1° acconto INPS gestione separata',
  '2° acconto imposta sostitutiva',
  '2° acconto INPS gestione separata',
]);

function isFiscalEstimate(deadline: Deadline): boolean {
  return deadline.type === 'tax' && !!deadline.amount && FISCAL_ESTIMATE_TITLES.has(deadline.title);
}

function getScadenzeFiscali(year: number): Omit<Deadline, 'id'>[] {
  return [
    { title: 'Saldo imposta sostitutiva + 1° acconto', date: `${year}-06-30`, type: 'tax' },
    { title: '1° acconto INPS gestione separata', date: `${year}-06-16`, type: 'tax' },
    { title: '2° acconto imposta sostitutiva', date: `${year}-11-30`, type: 'tax' },
    { title: '2° acconto INPS gestione separata', date: `${year}-11-16`, type: 'tax' },
    { title: 'Dichiarazione dei redditi (Modello Redditi)', date: `${year}-10-31`, type: 'tax' },
    { title: 'Acconto IVA dicembre', date: `${year}-12-16`, type: 'tax' },
  ];
}

interface CalendarViewProps {
  deadlines: Deadline[];
  onAddDeadline: (d: Deadline) => void;
  onUpdateDeadline: (d: Deadline) => void;
  onDeleteDeadline: (id: string) => void;
  darkMode?: boolean;
  key?: string;
  profile?: Profile;
  openAddTrigger?: number;
  income?: number;
  expenses?: number;
}

const CalendarView = ({ deadlines, onAddDeadline, onUpdateDeadline, onDeleteDeadline, darkMode, profile, openAddTrigger, income, expenses }: CalendarViewProps) => {
  const { t, i18n } = useTranslation();
  const isSpain = profile?.country === 'Spain';
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(null);
  const [deadlineToEdit, setDeadlineToEdit] = useState<Deadline | null>(null);
  const [deadlineToDelete, setDeadlineToDelete] = useState<Deadline | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => { if (openAddTrigger) setIsAddOpen(true); }, [openAddTrigger]);
  const [isPreloadOpen, setIsPreloadOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const isPro = useProStatus(profile);
  const [newDeadline, setNewDeadline] = useState({ title: '', date: new Date().toISOString().split('T')[0], type: 'tax' as Deadline['type'], amount: '' });

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [searchQuery, setSearchQuery] = useState('');
  // IT-33: primo anno e reddito N-1
  // ORDINE DICHIARAZIONI: redditoN1 deve stare prima di isPrimoAnnoIT (evita TDZ crash)
  const annoInizio = profile?.annoInizioAttivita != null ? Number(profile.annoInizioAttivita) : null;
  const redditoN1 = profile?.redditoN1;
  const isPrimoAnnoIT = !isSpain && profile?.regime !== 'ordinario' && annoInizio != null && annoInizio === selectedYear && !(redditoN1 != null && redditoN1 > 0);

  // IT-21 + IT-22: importi stimati per scadenze fiscali IT
  // NOTA: currentYear deve essere dichiarato prima di questo useMemo
  const fiscalAmounts = useMemo<Record<string, number>>(() => {
    if (isSpain) return {};
    if (isPrimoAnnoIT) return {};
    // IT-33: usa reddito N-1 se disponibile, altrimenti reddito corrente
    const baseInc = (redditoN1 != null && redditoN1 > 0)
      ? redditoN1
      : (typeof income === 'number' && Number.isFinite(income) && income > 0 ? income : 0);
    if (baseInc === 0) return {};
    const exp = typeof expenses === 'number' && Number.isFinite(expenses) ? expenses : 0;
    const regime = profile?.regime ?? 'forfettario';
    let imposta = 0;
    let inps = 0;
    try {
      if (regime === 'forfettario') {
        const coeffRaw = profile?.coefficiente;
        const coeff = coeffRaw != null && coeffRaw > 0 ? coeffRaw / 100 : 0.78;
        const redditoLordo = Math.max(0, baseInc * coeff);
        inps = redditoLordo * 0.2607;
        const base = Math.max(0, redditoLordo - inps);
        const isFive = annoInizio != null && Number.isFinite(annoInizio) && (currentYear - annoInizio) < 5;
        imposta = base * (isFive ? 0.05 : 0.15);
      } else {
        const redditoLordo = Math.max(0, baseInc - exp);
        inps = redditoLordo * 0.2607; // gestione separata (stesso del forfettario)
        const base = Math.max(0, redditoLordo - inps);
        const irpef = base <= 0 ? 0 : base <= 28000 ? base * 0.23 : base <= 50000 ? 28000 * 0.23 + (base - 28000) * 0.35 : 28000 * 0.23 + 22000 * 0.35 + (base - 50000) * 0.43;
        imposta = irpef + base * 0.023;
      }
    } catch {
      return {};
    }
    if (!Number.isFinite(imposta) || !Number.isFinite(inps)) return {};
    return {
      'Saldo imposta sostitutiva + 1° acconto': Math.round(imposta * 0.40),
      '1° acconto INPS gestione separata': Math.round(inps * 0.40),
      '2° acconto imposta sostitutiva': Math.round(imposta * 0.60),
      '2° acconto INPS gestione separata': Math.round(inps * 0.60),
    };
  }, [isSpain, isPrimoAnnoIT, redditoN1, income, expenses, profile, annoInizio, currentYear, selectedYear]);

  const scadenzeFiscaliRaw = isSpain
    ? getSpanishDeadlines(selectedYear).map(s => ({ title: s.title, date: s.date, type: 'tax' as Deadline['type'] }))
    : getScadenzeFiscali(selectedYear);
  const scadenzeFiscali = scadenzeFiscaliRaw;
  const addedCount = scadenzeFiscali.filter(s => deadlines.some(d => d.title === s.title && getLocalYear(d.date) === getLocalYear(s.date))).length;
  const hasFiscalDeadlines = addedCount === scadenzeFiscali.length;
  const partialFiscalDeadlines = addedCount > 0 && addedCount < scadenzeFiscali.length;
  const missingCount = scadenzeFiscali.length - addedCount;

  const months = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(new Date(2024, i, 1))
      .replace(/^\w/, c => c.toUpperCase())
  );

  const yearDeadlines = useMemo(() => {
    // Build a map title→date from this year's fiscal templates
    // (handles ES deadlines like T4/390 whose date falls in year+1)
    const templates = isSpain
      ? getSpanishDeadlines(selectedYear).map(s => ({ title: s.title, date: s.date }))
      : getScadenzeFiscali(selectedYear);
    const templateMap = new Map(templates.map(s => [s.title, s.date]));
    return deadlines.filter(d => {
      const templateDate = templateMap.get(d.title);
      // Template deadline: show if title+date matches this year's template exactly
      if (templateDate !== undefined) return templateDate === d.date;
      // User-created deadline: show by date year
      return getLocalYear(d.date) === selectedYear;
    });
  }, [deadlines, selectedYear, isSpain]);

  const filteredDeadlines = useMemo(() => {
    let result = selectedMonth === null ? yearDeadlines : yearDeadlines.filter(d => getLocalMonth(d.date) === selectedMonth);
    if (searchQuery.trim()) result = result.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return result;
  }, [selectedMonth, yearDeadlines, searchQuery]);

  const nextDeadline = useMemo(() => {
    const today = new Date();
    return deadlines.filter(d => parseLocalDate(d.date) >= today && !d.completed).sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime())[0] || null;
  }, [deadlines]);

  const daysUntilNext = nextDeadline ? Math.ceil((new Date(nextDeadline.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } };
  const item = { hidden: { opacity: 0 }, show: { opacity: 1 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-8 pb-24">
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => { setSelectedYear(y => y - 1); setSelectedMonth(null); }} disabled={selectedYear <= 2026} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 ${darkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-500'}`}><ChevronLeft size={16} /></button>
          <span className={`text-base font-bold min-w-[48px] text-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedYear}</span>
          <button onClick={() => { setSelectedYear(y => y + 1); setSelectedMonth(null); }} disabled={selectedYear >= currentYear + 1} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 ${darkMode ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-500'}`}><ChevronRight size={16} /></button>
        </div>
        <div className={`flex p-1 rounded-xl transition-colors ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? (darkMode ? 'bg-slate-800 shadow-sm text-primary' : 'bg-white shadow-sm text-primary') : 'text-slate-400'}`}><LayoutList size={18} /></button>
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? (darkMode ? 'bg-slate-800 shadow-sm text-primary' : 'bg-white shadow-sm text-primary') : 'text-slate-400'}`}><Grid size={18} /></button>
        </div>
      </motion.div>

      <motion.div variants={item} className="flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all" style={{ backgroundColor: 'var(--color-card)', borderColor: searchQuery ? undefined : 'var(--color-border)' }}>
        <Search size={16} className={searchQuery ? 'text-primary' : 'text-slate-400'} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); if (e.target.value) { setViewMode('list'); setSelectedMonth(null); } }}
          placeholder={t('calendar.search_placeholder')}
          className={`flex-1 text-sm bg-transparent focus:outline-none ${darkMode ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'}`}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-slate-400 active:scale-90 transition-all">
            <X size={16} />
          </button>
        )}
      </motion.div>

      {viewMode === 'grid' ? (
        <motion.div variants={container} className="space-y-6">
          <motion.div variants={item} className="flex items-center justify-between px-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t('calendar.select_month')}</span>
          </motion.div>
          <div className="grid grid-cols-3 gap-3">
            {months.map((month, index) => {
              const hasDeadlines = yearDeadlines.some(d => getLocalMonth(d.date) === index);
              const isSelected = selectedMonth === index;
              return (
                <motion.button variants={item} key={month} onClick={() => { setSelectedMonth(isSelected ? null : index); setViewMode('list'); }} className={`relative p-4 rounded-3xl border transition-all text-center space-y-1 active:scale-[0.95] ${isSelected ? 'bg-primary border-primary text-white shadow-xl shadow-primary/40' : (darkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10' : 'bg-white border-slate-100 text-slate-600 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5')}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>{month.substring(0, 3)}</p>
                  <p className={`text-sm font-bold transition-colors ${isSelected ? 'text-white' : (darkMode ? 'text-slate-200' : 'text-slate-900')}`}>{index + 1}</p>
                  {hasDeadlines && !isSelected && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      ) : (
        <>
          {nextDeadline && !searchQuery && (
            <motion.div variants={item} className="relative p-6 bg-primary rounded-3xl text-white overflow-hidden shadow-xl shadow-primary/20">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md"><AlertCircle size={20} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{t('calendar.next_deadline')}</p>
                    <p className="text-sm font-bold">{daysUntilNext === 0 ? t('calendar.today') : daysUntilNext === 1 ? t('calendar.tomorrow') : t('calendar.days_left', { count: daysUntilNext })}</p>
                  </div>
                </div>
                <h3 className="text-lg font-bold leading-tight">{nextDeadline.title}</h3>
                {nextDeadline.amount && <p className="text-2xl font-bold pt-2">€{nextDeadline.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>}
              </div>
            </motion.div>
          )}

          {isPrimoAnnoIT && !searchQuery && (
            <motion.div variants={item} className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl border ${darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
              <span className="text-base leading-none mt-0.5">🎉</span>
              <div>
                <p className="text-sm font-bold">Primo anno — nessun acconto dovuto</p>
                <p className="text-[10px] mt-0.5 opacity-70">Le imposte del primo anno si pagano interamente nell'anno successivo.</p>
              </div>
            </motion.div>
          )}

          {!isPrimoAnnoIT && redditoN1 != null && redditoN1 > 0 && !isSpain && !searchQuery && (
            <motion.div variants={item} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-base leading-none">📊</span>
              <p className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Acconti calcolati su reddito {selectedYear - 1}: €{redditoN1.toLocaleString('it-IT')}
              </p>
            </motion.div>
          )}

          {!hasFiscalDeadlines && !searchQuery && (
            <motion.div variants={item} onClick={() => { if (!isPro) { setIsPaywallOpen(true); return; } setIsPreloadOpen(true); }} className={`p-5 rounded-3xl border cursor-pointer active:scale-[0.98] transition-all ${partialFiscalDeadlines ? (darkMode ? 'bg-amber-500/5 border-amber-500/30' : 'bg-amber-50 border-amber-200') : (darkMode ? 'bg-slate-900 border-slate-700 hover:border-primary/40' : 'bg-slate-50 border-slate-200 hover:border-primary/30')}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className={`text-sm font-bold ${partialFiscalDeadlines ? 'text-amber-600' : (darkMode ? 'text-white' : 'text-slate-900')}`}>
                    {partialFiscalDeadlines ? t('calendar.removed_deadlines', { count: missingCount, suffix: i18n.language.startsWith('es') ? (missingCount === 1 ? '' : 's') : (missingCount === 1 ? 'a' : 'e') }) : t('calendar.fiscal_deadlines_year', { year: selectedYear })}
                  </p>
                  <p className="text-xs text-slate-400">
                    {partialFiscalDeadlines ? t('calendar.restore_deadlines_hint') : isSpain ? t('calendar.add_spain_hint') : t('calendar.add_italian_hint')}
                  </p>
                </div>
                <div className={`px-3 py-1.5 text-white text-xs font-bold rounded-xl shrink-0 ml-4 ${partialFiscalDeadlines ? 'bg-amber-500' : 'bg-primary'}`}>
                  {partialFiscalDeadlines ? t('calendar.restore') : t('calendar.add')}
                </div>
              </div>
            </motion.div>
          )}

          <motion.div variants={item} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{selectedMonth !== null ? t('calendar.deadlines_of_month', { month: months[selectedMonth] }) : t('calendar.all_deadlines')}</span>
              {selectedMonth !== null && <button onClick={() => setSelectedMonth(null)} className="text-[11px] font-bold text-primary uppercase tracking-wider active:scale-90 transition-all hover:drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]">{t('calendar.view_all')}</button>}
            </div>
            <div className="space-y-3">
              {filteredDeadlines.length > 0 ? filteredDeadlines.map(deadline => (
                <motion.button variants={item} key={deadline.id} onClick={() => setSelectedDeadline(deadline)} className={`w-full p-4 border rounded-2xl flex items-center gap-4 transition-all active:scale-[0.98] hover:shadow-xl text-left ${deadline.completed ? 'opacity-50' : ''} ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'}`}>
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${deadline.completed ? (darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400') : deadline.type === 'tax' ? (darkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-600') : (darkMode ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-50 text-blue-600')}`}>
                    <span className="text-[9px] font-bold uppercase tracking-tighter">{new Date(deadline.date).toLocaleDateString('it-IT', { month: 'short' })}</span>
                    <span className="text-lg font-black leading-none">{new Date(deadline.date).getDate()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h3 className={`text-sm font-bold truncate pr-2 transition-colors ${deadline.completed ? 'line-through text-slate-400' : (darkMode ? 'text-white' : 'text-slate-900')}`}>{deadline.title}</h3>
                      {(() => {
                        const liveAmt = FISCAL_ESTIMATE_TITLES.has(deadline.title) ? fiscalAmounts[deadline.title] : undefined;
                        const displayAmt = liveAmt != null && liveAmt > 0 ? liveAmt : deadline.amount;
                        return displayAmt ? (
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>~€{displayAmt.toLocaleString()}</p>
                            {isFiscalEstimate(deadline) && <p className="text-[9px] text-slate-400 leading-tight">stimato · può variare</p>}
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      {deadline.completed ? (
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">{t('calendar.completed')}</span>
                      ) : (
                        <>
                          <span className="text-[10px] font-medium text-slate-400">{deadline.type === 'tax' ? t('calendar.type_tax') : deadline.type === 'payment' ? t('calendar.type_payment') : t('calendar.type_other')}</span>
                          <div className={`w-1 h-1 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${deadline.type === 'tax' ? 'text-red-500' : 'text-blue-500'}`}>{deadline.type === 'tax' ? t('calendar.urgent') : t('calendar.expiring')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 shrink-0" />
                </motion.button>
              )) : (
                <div className="py-16 text-center space-y-4">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto ${darkMode ? 'bg-slate-900 text-slate-700' : 'bg-slate-50 text-slate-300'}`}>
                    {searchQuery ? <Search size={36} /> : <Calendar size={36} />}
                  </div>
                  <div className="space-y-1">
                    <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      {searchQuery ? t('calendar.no_deadline_search', { query: searchQuery }) : selectedMonth !== null ? t('calendar.no_deadlines_month') : t('calendar.no_deadlines')}
                    </p>
                    <p className="text-xs text-slate-400">
                      {searchQuery ? t('calendar.no_deadline_search_hint') : t('calendar.no_deadline_hint')}
                    </p>
                  </div>
                  {!searchQuery && (
                    <button onClick={() => setIsAddOpen(true)} className="mx-auto flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-all">
                      <Plus size={16} />
                      {t('calendar.add_deadline_btn')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>

        </>
      )}


      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl" style={{ backgroundColor: 'var(--color-card)' }}>
              <div className="p-8 space-y-5">
                <div className="flex justify-between items-start">
                  <div><h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('calendar.add_modal_title')}</h2><p className="text-sm text-slate-500">{t('calendar.add_modal_subtitle')}</p></div>
                  <button onClick={() => setIsAddOpen(false)} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}><Plus className="rotate-45" size={24} /></button>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('calendar.field_title')}</label>
                    <input type="text" value={newDeadline.title} onChange={e => setNewDeadline({ ...newDeadline, title: e.target.value })} placeholder="Es: IVA Trimestrale" className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('calendar.field_date')}</label>
                      <input type="date" value={newDeadline.date} onChange={e => setNewDeadline({ ...newDeadline, date: e.target.value })} className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('calendar.field_amount')}</label>
                      <input type="number" value={newDeadline.amount} onChange={e => setNewDeadline({ ...newDeadline, amount: e.target.value })} placeholder="0.00" className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'}`} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('calendar.field_type')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['tax', 'payment', 'other'] as const).map(type => (
                        <button key={type} onClick={() => setNewDeadline({ ...newDeadline, type })} className={`py-3 rounded-xl text-xs font-bold border transition-all ${newDeadline.type === type ? 'bg-primary border-primary text-white' : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600')}`}>
                          {type === 'tax' ? t('calendar.type_fiscal') : type === 'payment' ? t('calendar.type_payment_btn') : t('calendar.type_other_btn')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={() => { if (!newDeadline.title) return; onAddDeadline({ id: Math.random().toString(36).substr(2, 9), title: newDeadline.title, date: newDeadline.date, type: newDeadline.type, amount: newDeadline.amount ? parseFloat(newDeadline.amount) : undefined }); setIsAddOpen(false); setNewDeadline({ title: '', date: new Date().toISOString().split('T')[0], type: 'tax', amount: '' }); }} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all">{t('calendar.add_deadline_confirm')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDeadline && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedDeadline(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl" style={{ backgroundColor: 'var(--color-card)' }}>
              <div className="p-6 space-y-4">
                <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedDeadline.title}</p>
                  {(() => {
                    const liveAmt = FISCAL_ESTIMATE_TITLES.has(selectedDeadline.title) ? fiscalAmounts[selectedDeadline.title] : undefined;
                    const displayAmt = liveAmt != null && liveAmt > 0 ? liveAmt : selectedDeadline.amount;
                    return displayAmt ? (
                      <>
                        <p className="text-sm font-bold text-primary mt-0.5">~€{displayAmt.toLocaleString()}</p>
                        {isFiscalEstimate(selectedDeadline) && <p className="text-[10px] text-slate-400 mt-0.5">Stima basata sui dati attuali. L'importo reale dipende dalla dichiarazione definitiva. Consulta il tuo commercialista.</p>}
                      </>
                    ) : null;
                  })()}
                </div>
                <button onClick={() => { onUpdateDeadline({ ...selectedDeadline, completed: !selectedDeadline.completed }); setSelectedDeadline(null); }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedDeadline.completed ? (darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400') : 'bg-emerald-50 text-emerald-500'}`}><CheckCircle2 size={18} /></div>
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedDeadline.completed ? t('calendar.mark_todo') : t('calendar.mark_complete')}</span>
                </button>
                <button onClick={() => { setDeadlineToEdit({ ...selectedDeadline }); setSelectedDeadline(null); }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-700 text-primary' : 'bg-primary/10 text-primary'}`}><FileEdit size={18} /></div>
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('common.edit')}</span>
                </button>
                <button onClick={() => { setDeadlineToDelete(selectedDeadline); setSelectedDeadline(null); }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 text-red-500"><Trash2 size={18} /></div>
                  <span className="font-bold text-red-500">{t('common.delete')}</span>
                </button>
                <button onClick={() => setSelectedDeadline(null)} className={`w-full py-4 rounded-2xl font-bold ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{t('common.cancel')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deadlineToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeadlineToEdit(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl" style={{ backgroundColor: 'var(--color-card)' }}>
              <div className="p-8 space-y-5">
                <div className="flex justify-between items-start">
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('calendar.edit_deadline_title')}</h2>
                  <button onClick={() => setDeadlineToEdit(null)} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}><Plus className="rotate-45" size={24} /></button>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('calendar.field_title')}</label>
                    <input type="text" value={deadlineToEdit.title} onChange={e => setDeadlineToEdit({ ...deadlineToEdit, title: e.target.value })} className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('calendar.field_date')}</label>
                      <input type="date" value={deadlineToEdit.date} onChange={e => setDeadlineToEdit({ ...deadlineToEdit, date: e.target.value })} className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('calendar.field_amount')}</label>
                      <input type="number" value={deadlineToEdit.amount || ''} onChange={e => setDeadlineToEdit({ ...deadlineToEdit, amount: parseFloat(e.target.value) || undefined })} className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`} />
                    </div>
                  </div>
                </div>
                <button onClick={() => { onUpdateDeadline(deadlineToEdit); setDeadlineToEdit(null); }} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all">{t('common.save')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPreloadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPreloadOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl" style={{ backgroundColor: 'var(--color-card)' }}>
              <div className="p-8 space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{partialFiscalDeadlines ? t('calendar.restore_modal_title') : t('calendar.fiscal_deadlines_year', { year: selectedYear })}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t('calendar.preload_disclaimer')}</p>
                  </div>
                  <button onClick={() => setIsPreloadOpen(false)} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}><Plus className="rotate-45" size={24} /></button>
                </div>
                <div className="space-y-2">
                  {scadenzeFiscali.filter(s => !deadlines.some(d => d.title === s.title && getLocalYear(d.date) === getLocalYear(s.date))).map((s, i) => {
                    const amt = fiscalAmounts[s.title];
                    return (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 text-red-500 ${darkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
                          <span className="text-[9px] font-bold uppercase">{new Date(s.date).toLocaleDateString('it-IT', { month: 'short' })}</span>
                          <span className="text-sm font-black leading-none">{new Date(s.date).getDate()}</span>
                        </div>
                        <p className={`text-sm font-semibold flex-1 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{s.title}</p>
                        {amt != null && amt > 0 && (
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-red-500">~€{amt.toLocaleString('it-IT')}</p>
                            {FISCAL_ESTIMATE_TITLES.has(s.title) && <p className="text-[9px] text-slate-400 leading-tight">stimato · può variare</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    scadenzeFiscali
                      .filter(s => !deadlines.some(d => d.title === s.title && getLocalYear(d.date) === getLocalYear(s.date)))
                      .forEach(s => {
                        const amt = fiscalAmounts[s.title];
                        onAddDeadline({ ...s, id: Math.random().toString(36).substr(2, 9), ...(amt != null && amt > 0 ? { amount: amt } : {}) });
                      });
                    setIsPreloadOpen(false);
                  }}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all"
                >
                  {t('calendar.add_all_btn')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deadlineToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeadlineToDelete(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl" style={{ backgroundColor: 'var(--color-card)' }}>
              <div className="p-8 space-y-5">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500"><Trash2 size={24} /></div>
                  <div>
                    <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('calendar.delete_deadline_title')}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t('calendar.delete_deadline_body')}<span className="font-bold">{deadlineToDelete.title}</span>?</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setDeadlineToDelete(null)} className={`py-4 rounded-2xl font-bold ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{t('common.cancel')}</button>
                  <button onClick={() => { onDeleteDeadline(deadlineToDelete.id); setDeadlineToDelete(null); }} className="py-4 rounded-2xl font-bold bg-red-500 text-white shadow-xl shadow-red-500/30">{t('common.delete')}</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <PaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} darkMode={darkMode} />
    </motion.div>
  );
};

export default CalendarView;
