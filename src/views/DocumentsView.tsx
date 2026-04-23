import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Mail, Camera, ChevronRight, ChevronDown, FileText, FileEdit, CheckCircle2, Trash2, CreditCard, Plus, Download, Copy, AlertTriangle, FileCode, Lock, BarChart3, FileMinus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Document, Accountant, Profile } from '../types';
import CreateInvoiceModal from '../components/modals/CreateInvoiceModal';
import CreateExpenseModal from '../components/modals/CreateExpenseModal';
import CreateCreditNoteModal from '../components/modals/CreateCreditNoteModal';
import CreateFacturaRectificativaModal from '../components/modals/CreateFacturaRectificativaModal';
import CreatePresupuestoModal from '../components/modals/CreatePresupuestoModal';
import CreateFacturaModal from '../components/modals/CreateFacturaModal';
import ExportModal from '../components/modals/ExportModal';
import ResumenTrimestralModal from '../components/modals/ResumenTrimestralModal';
import { buildInvoicePDFBlob } from '../lib/generateInvoicePDF';
import PdfPreviewModal from '../components/modals/PdfPreviewModal';
import { downloadFatturaPA, getMissingProfileFields } from '../services/fatturaPA';
import { useToast } from '../components/ui/Toast';
import { parseLocalDate, getLocalYear, todayLocalISO } from '../utils/date';
import PaywallModal from '../components/modals/PaywallModal';
import { useProStatus } from '../hooks/useProStatus';

interface DocumentsViewProps {
  documents: Document[];
  onAddDocument: (doc: Document) => void;
  onDeleteDocument: (id: string) => void;
  onUpdateDocument: (doc: Document) => void;
  onUpdateProfile: (p: Profile) => void;
  accountant: Accountant;
  profile: Profile;
  darkMode?: boolean;
  theme?: string;
  key?: string;
  onMediaLibraryClick?: () => void;
  onNavigateToProfile?: () => void;
  openChoiceTrigger?: number;
}

function DocCard({ doc, darkMode, profile, i18nLanguage, t, onClick }: { doc: Document; darkMode?: boolean; profile: Profile; i18nLanguage: string; t: (k: string) => string; onClick: () => void }) {
  return (
    <motion.button onClick={onClick} className={`w-full p-4 border rounded-2xl flex items-center gap-4 transition-all active:scale-[0.98] hover:shadow-xl text-left ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${doc.type === 'invoice' ? (darkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600') : doc.type === 'credit_note' ? (darkMode ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-50 text-violet-600') : doc.type === 'factura_rectificativa' ? (darkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600') : doc.type === 'proforma' ? (darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500') : doc.type === 'presupuesto' ? (darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600') : (darkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-600')}`}>
        {doc.type === 'invoice' ? <FileText size={18} /> : doc.type === 'credit_note' ? <FileMinus size={18} /> : doc.type === 'factura_rectificativa' ? <FileMinus size={18} /> : doc.type === 'proforma' ? <FileText size={18} /> : doc.type === 'presupuesto' ? <FileText size={18} /> : <FileEdit size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-0.5">
          <h3 className={`text-sm font-bold truncate pr-2 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{doc.client || doc.title}</h3>
          <p className={`text-sm font-bold shrink-0 ${doc.type === 'expense' || doc.type === 'credit_note' || doc.type === 'factura_rectificativa' ? 'text-red-500' : doc.type === 'proforma' ? (darkMode ? 'text-slate-400' : 'text-slate-500') : doc.type === 'presupuesto' ? (darkMode ? 'text-amber-400' : 'text-amber-600') : 'text-emerald-500'}`}>{doc.type === 'expense' || doc.type === 'credit_note' || doc.type === 'factura_rectificativa' ? '-' : ''}€{doc.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-medium text-slate-400">{parseLocalDate(doc.date).toLocaleDateString(i18nLanguage, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          {doc.type === 'proforma' && <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>PROFORMA</span>}
          {doc.type === 'presupuesto' && <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>PRESUPUESTO</span>}
          {doc.type === 'credit_note' && <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500">· {t('documents.credit_note_label')}</span>}
          {doc.type === 'factura_rectificativa' && <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">· Factura rectificativa</span>}
          {doc.type === 'invoice' && doc.status === 'paid' && <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">· {t('documents.status_badge_paid')}</span>}
          {doc.type === 'invoice' && doc.status === 'pending' && <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">· {t('documents.status_badge_pending')}</span>}
          {doc.type === 'invoice' && doc.status === 'overdue' && <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">· {t('documents.status_badge_overdue')}</span>}
          {doc.type === 'credit_note' && doc.category && <span className="text-[10px] font-medium text-slate-400">· rif. {doc.category}</span>}
          {doc.type === 'expense' && doc.category && <span className="text-[10px] font-medium text-slate-400">· {doc.category}</span>}
          {doc.type === 'expense' && (doc.ivaRate ?? 0) > 0 && <span className="text-[10px] font-bold text-primary">· {doc.ivaRate}% IVA</span>}
          {profile.country === 'Italy' && doc.type === 'invoice' && (!doc.title || !doc.clientAddress || (!doc.clientPiva && doc.clientPiva !== 'Privato')) && (
            <AlertTriangle size={11} className="text-amber-400 shrink-0" />
          )}
        </div>
      </div>
    </motion.button>
  );
}

const DocumentsView = ({ documents, onAddDocument, onDeleteDocument, onUpdateDocument, onUpdateProfile, accountant, profile, darkMode, theme, onMediaLibraryClick, onNavigateToProfile, openChoiceTrigger }: DocumentsViewProps) => {
  const isProDark = theme === 'pro-dark';
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isResumenOpen, setIsResumenOpen] = useState(false);
  const isPro = useProStatus(profile);
  const invoiceCount = useMemo(
    () => documents.filter(d => d.type === 'invoice' || d.type === 'credit_note' || d.type === 'factura_rectificativa').length,
    [documents]
  );
  const [isChoiceOpen, setIsChoiceOpen] = useState(false);

  const mountedChoiceTrigger = useRef(openChoiceTrigger);
  useEffect(() => {
    if (openChoiceTrigger !== mountedChoiceTrigger.current) {
      mountedChoiceTrigger.current = openChoiceTrigger;
      if (openChoiceTrigger) setIsChoiceOpen(true);
    }
  }, [openChoiceTrigger]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isCreditNoteOpen, setIsCreditNoteOpen] = useState(false);
  const [isProformaOpen, setIsProformaOpen] = useState(false);
  const [isRectificativaOpen, setIsRectificativaOpen] = useState(false);
  const [isPresupuestoOpen, setIsPresupuestoOpen] = useState(false);
  const [docToFacturaEdit, setDocToFacturaEdit] = useState<Document | null>(null);
  const [docToExpenseEdit, setDocToExpenseEdit] = useState<Document | null>(null);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [docToEdit, setDocToEdit] = useState<Document | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ blob: Blob; fileName: string } | null>(null);
  const [openMonths, setOpenMonths] = useState<Set<string>>(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return new Set([key]);
  });

  const initializedRef = useRef(false);
  const prevLengthRef = useRef(0);
  useEffect(() => {
    if (documents.length > 0 && !initializedRef.current) {
      const years = documents.map(d => getLocalYear(d.date));
      setSelectedYear(Math.max(...years));
      initializedRef.current = true;
    } else if (documents.length > prevLengthRef.current && initializedRef.current) {
      // Nuovo documento aggiunto: switcha all'anno del documento appena salvato
      const newDoc = documents[0];
      if (newDoc) setSelectedYear(getLocalYear(newDoc.date));
    }
    prevLengthRef.current = documents.length;
  }, [documents]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set(documents.map(d => getLocalYear(d.date)));
    years.add(currentYear);
    years.add(currentYear + 1);
    return Array.from(years).sort((a, b) => a - b);
  }, [documents]);

  const yearDocuments = useMemo(() => documents.filter(d => getLocalYear(d.date) === selectedYear), [documents, selectedYear]);

  const totals = useMemo(() => yearDocuments.reduce((acc, doc) => {
    if (doc.type === 'invoice' && doc.status === 'paid') acc.income += doc.amount;
    else if (doc.type === 'credit_note' || doc.type === 'factura_rectificativa') acc.income -= doc.amount;
    else if (doc.type === 'expense') acc.expenses += doc.amount;
    return acc;
  }, { income: 0, expenses: 0 }), [yearDocuments]);

  const balance = totals.income - totals.expenses;

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let docs = q ? documents : yearDocuments;
    if (filter === 'income') docs = docs.filter(d => d.type === 'invoice' || d.type === 'credit_note' || d.type === 'factura_rectificativa' || (profile.country === 'Spain' && d.type === 'presupuesto'));
    if (filter === 'expense') docs = docs.filter(d => d.type === 'expense');
    if (statusFilter !== 'all') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (statusFilter === 'overdue') {
        docs = docs.filter(d => d.status === 'overdue' || (d.type === 'invoice' && d.status === 'pending' && parseLocalDate(d.date) < thirtyDaysAgo));
      } else if (statusFilter === 'pending') {
        docs = docs.filter(d => d.status === 'pending' && parseLocalDate(d.date) >= thirtyDaysAgo);
      } else {
        docs = docs.filter(d => d.status === statusFilter);
      }
    }
    if (q) docs = docs.filter(d => (d.title ?? '').toLowerCase().includes(q) || (d.client ?? '').toLowerCase().includes(q) || (d.category ?? '').toLowerCase().includes(q) || String(d.amount).includes(q));
    return docs;
  }, [documents, yearDocuments, filter, statusFilter, searchQuery]);

  const monthGroups = useMemo(() => {
    const locale = profile.country === 'Spain' ? 'es-ES' : 'it-IT';
    const groups: { key: string; label: string; income: number; expenses: number; docs: typeof filteredDocuments }[] = [];
    const map = new Map<string, typeof groups[0]>();
    for (const doc of filteredDocuments) {
      const d = parseLocalDate(doc.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) {
        const label = d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
        const entry = { key, label: label.charAt(0).toUpperCase() + label.slice(1), income: 0, expenses: 0, docs: [] as typeof filteredDocuments };
        map.set(key, entry);
        groups.push(entry);
      }
      const g = map.get(key)!;
      g.docs.push(doc);
      if (doc.type === 'invoice' && doc.status === 'paid') g.income += doc.amount;
      else if (doc.type === 'credit_note') g.income -= doc.amount;
      else if (doc.type === 'presupuesto' || doc.type === 'proforma') { /* no totals */ }
      else if (doc.type === 'expense' || doc.type === 'factura_rectificativa') g.expenses += doc.amount;
    }
    return groups;
  }, [profile.country, filteredDocuments]);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } };
  const item = { hidden: { opacity: 0 }, show: { opacity: 1 } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-8" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 7rem)' }}>

      {profile.country !== 'Spain' && <motion.button variants={item} onClick={() => setIsExportOpen(true)} className={`w-full p-6 border rounded-3xl flex items-center justify-between transition-all group active:scale-[0.98] ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${darkMode ? 'bg-slate-800 text-primary group-hover:bg-primary group-hover:text-white' : 'bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white'}`}><Mail size={28} strokeWidth={1.5} /></div>
          <div className="text-left">
            <p className={`text-base font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('documents.send_documents')}</p>
            <p className="text-xs text-slate-500">{t('documents.send_to_accountant')}</p>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${darkMode ? 'bg-slate-800 text-slate-600 group-hover:bg-primary/20 group-hover:text-primary' : 'bg-slate-50 text-slate-300 group-hover:bg-primary/10 group-hover:text-primary'}`}><ChevronRight size={20} /></div>
      </motion.button>}

      {profile.country === 'Spain' && (
        <motion.button
          variants={item}
          onClick={() => { if (!isPro) { setIsPaywallOpen(true); return; } setIsResumenOpen(true); }}
          className={`w-full p-5 border rounded-3xl flex items-center gap-4 transition-all group active:scale-[0.98] ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5'} ${!isPro ? 'opacity-50' : ''}`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${darkMode ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white' : 'bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white'}`}>
            <BarChart3 size={22} />
          </div>
          <div className="text-left flex-1">
            <p className={`text-sm font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Resumen Trimestral</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Modelos 130 + 303 en PDF</p>
          </div>
          {!isPro ? <Lock size={14} className="text-slate-400" /> : <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${darkMode ? 'bg-slate-800 text-slate-600 group-hover:bg-primary/20 group-hover:text-primary' : 'bg-slate-50 text-slate-300 group-hover:bg-primary/10 group-hover:text-primary'}`}><ChevronRight size={20} /></div>}
        </motion.button>
      )}

      <motion.div variants={item} className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t('documents.quick_upload')}</span>
        </div>
        <button onClick={onMediaLibraryClick} className={`w-full p-5 rounded-3xl border flex items-center gap-4 transition-all active:scale-[0.96] ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-lg'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary'}`}><Camera size={22} /></div>
          <div className="text-left">
            <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('documents.library')}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{t('documents.library_subtitle')}</p>
          </div>
        </button>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t('documents.year')}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {availableYears.map(year => (
            <button key={year} onClick={() => setSelectedYear(year)} className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${selectedYear === year ? 'bg-primary text-white shadow-lg shadow-primary/40' : (darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}`}>{year}</button>
          ))}
        </div>
      </motion.div>

      {profile.country !== 'Spain' && (
        <motion.div variants={item} className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Filtra per Categoria</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setFilter('income')}
              className={`p-4 rounded-3xl border transition-all text-left space-y-2 active:scale-[0.95] ${filter === 'income' ? (isProDark ? 'shadow-xl' : 'bg-emerald-500 border-transparent text-white shadow-xl shadow-emerald-500/40') : (darkMode ? 'bg-slate-900 border-slate-800 text-emerald-500 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10' : 'bg-white border-slate-100 text-emerald-600 hover:border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5')}`}
              style={filter === 'income' && isProDark ? { background: 'rgba(45, 212, 191, 0.12)', border: '1px solid rgba(45, 212, 191, 0.4)', color: '#2dd4bf', boxShadow: '0 20px 25px -5px rgba(45, 212, 191, 0.25), 0 8px 10px -6px rgba(45, 212, 191, 0.2)' } : undefined}
            >
              <p className={`text-[9px] font-bold uppercase tracking-wider opacity-60`}>Entrate</p>
              <p className="text-sm font-bold">€{totals.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </button>
            <button
              onClick={() => setFilter('expense')}
              className={`p-4 rounded-3xl border transition-all text-left space-y-2 active:scale-[0.95] ${filter === 'expense' ? (isProDark ? 'shadow-xl' : 'bg-red-600 border-red-600 text-white shadow-xl shadow-red-500/40') : (darkMode ? 'bg-slate-900 border-slate-800 text-red-500 hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/10' : 'bg-white border-slate-100 text-red-600 hover:border-red-500/20 hover:shadow-lg hover:shadow-red-500/5')}`}
              style={filter === 'expense' && isProDark ? { background: 'rgba(200, 85, 247, 0.12)', border: '1px solid rgba(200, 85, 247, 0.4)', color: '#c855f7', boxShadow: '0 20px 25px -5px rgba(200, 85, 247, 0.25), 0 8px 10px -6px rgba(200, 85, 247, 0.2)' } : undefined}
            >
              <p className={`text-[9px] font-bold uppercase tracking-wider opacity-60`}>Uscite</p>
              <p className="text-sm font-bold">€{totals.expenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </button>
            <button onClick={() => setFilter('all')} className={`p-4 rounded-3xl border transition-all text-left space-y-2 active:scale-[0.95] ${filter === 'all' ? (darkMode ? 'bg-white border-white text-slate-900 shadow-xl shadow-white/20' : 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/40') : (darkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10' : 'bg-white border-slate-100 text-slate-600 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5')}`}>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${filter === 'all' ? (darkMode ? 'text-slate-900/60' : 'text-white/60') : 'text-slate-400'}`}>Bilancio</p>
              <p className="text-sm font-bold whitespace-nowrap">{balance < 0 ? '-' : ''}€{Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </button>
          </div>
        </motion.div>
      )}

      {profile.country === 'Spain' && (
        <motion.div variants={item} className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Filtrar por Categoría</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setFilter('income')}
              className={`p-4 rounded-3xl border transition-all text-left space-y-2 active:scale-[0.95] ${filter === 'income' ? (isProDark ? 'shadow-xl' : 'bg-emerald-500 border-transparent text-white shadow-xl shadow-emerald-500/40') : (darkMode ? 'bg-slate-900 border-slate-800 text-emerald-500 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10' : 'bg-white border-slate-100 text-emerald-600 hover:border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5')}`}
              style={filter === 'income' && isProDark ? { background: 'rgba(45, 212, 191, 0.12)', border: '1px solid rgba(45, 212, 191, 0.4)', color: '#2dd4bf', boxShadow: '0 20px 25px -5px rgba(45, 212, 191, 0.25), 0 8px 10px -6px rgba(45, 212, 191, 0.2)' } : undefined}
            >
              <p className="text-[9px] font-bold uppercase tracking-wider opacity-60">Ingresos</p>
              <p className="text-sm font-bold">€{totals.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </button>
            <button
              onClick={() => setFilter('expense')}
              className={`p-4 rounded-3xl border transition-all text-left space-y-2 active:scale-[0.95] ${filter === 'expense' ? (isProDark ? 'shadow-xl' : 'bg-red-600 border-red-600 text-white shadow-xl shadow-red-500/40') : (darkMode ? 'bg-slate-900 border-slate-800 text-red-500 hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/10' : 'bg-white border-slate-100 text-red-600 hover:border-red-500/20 hover:shadow-lg hover:shadow-red-500/5')}`}
              style={filter === 'expense' && isProDark ? { background: 'rgba(200, 85, 247, 0.12)', border: '1px solid rgba(200, 85, 247, 0.4)', color: '#c855f7', boxShadow: '0 20px 25px -5px rgba(200, 85, 247, 0.25), 0 8px 10px -6px rgba(200, 85, 247, 0.2)' } : undefined}
            >
              <p className="text-[9px] font-bold uppercase tracking-wider opacity-60">Gastos</p>
              <p className="text-sm font-bold">€{totals.expenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </button>
            <button onClick={() => setFilter('all')} className={`p-4 rounded-3xl border transition-all text-left space-y-2 active:scale-[0.95] ${filter === 'all' ? (darkMode ? 'bg-white border-white text-slate-900 shadow-xl shadow-white/20' : 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/40') : (darkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10' : 'bg-white border-slate-100 text-slate-600 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5')}`}>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${filter === 'all' ? (darkMode ? 'text-slate-900/60' : 'text-white/60') : 'text-slate-400'}`}>Balance</p>
              <p className="text-sm font-bold whitespace-nowrap">{balance < 0 ? '-' : ''}€{Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </button>
          </div>
        </motion.div>
      )}

      {filter === 'income' && (
        <motion.div variants={item} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {([
            { value: 'all', label: t('documents.status_all') },
            { value: 'paid', label: t('documents.status_paid') },
            { value: 'pending', label: t('documents.status_pending') },
            { value: 'overdue', label: t('documents.status_overdue') },
          ] as const).map(s => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)} className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${statusFilter === s.value ? (s.value === 'paid' ? 'bg-emerald-500 text-white' : s.value === 'overdue' ? 'bg-red-500 text-white' : s.value === 'pending' ? 'bg-amber-500 text-white' : 'bg-primary text-white') : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
              {s.label}
            </button>
          ))}
        </motion.div>
      )}

      <motion.div variants={item} className="space-y-4">
        <div className="flex items-center gap-3 px-4 py-3 border rounded-2xl transition-all" style={{ backgroundColor: 'var(--color-card)', borderColor: searchQuery ? undefined : 'var(--color-border)' }}>
            <Search size={16} className={searchQuery ? 'text-primary shrink-0' : 'text-slate-400 shrink-0'} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('documents.search_placeholder')}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--color-text)', caretColor: 'var(--color-primary)' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 active:scale-90 transition-all shrink-0">
                <Plus className="rotate-45" size={16} />
              </button>
            )}
        </div>
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            {searchQuery.trim()
              ? (profile.country === 'Spain'
                ? `${filteredDocuments.length} resultado${filteredDocuments.length === 1 ? '' : 's'} para "${searchQuery}"`
                : `${filteredDocuments.length} risultat${filteredDocuments.length === 1 ? 'o' : 'i'} per "${searchQuery}"`)
              : profile.country === 'Spain'
                ? (filter === 'all' ? 'Cronología Completa' : filter === 'income' ? 'Facturas y Presupuestos' : 'Gastos')
                : (filter === 'all' ? 'Cronologia Completa' : filter === 'income' ? 'Fatture Clienti' : 'Spese e Uscite')}
          </span>
          {(filter !== 'all' || statusFilter !== 'all' || searchQuery.trim()) && (
            <button onClick={() => { setFilter('all'); setStatusFilter('all'); setSearchQuery(''); }} className="text-[11px] font-bold text-primary uppercase tracking-wider active:scale-90 transition-all hover:drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]">Reset</button>
          )}
        </div>
        <div className="space-y-3">
          {filteredDocuments.length > 0 ? (
            <div className="space-y-3">
                {monthGroups.map(group => {
                  const isOpen = openMonths.has(group.key);
                  return (
                    <div key={group.key} className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                      <button
                        onClick={() => setOpenMonths(prev => {
                          const next = new Set(prev);
                          if (next.has(group.key)) next.delete(group.key); else next.add(group.key);
                          return next;
                        })}
                        className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors active:scale-[0.99] ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                      >
                        <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{group.label}</span>
                        <div className="flex items-center gap-3">
                          {group.income > 0 && <span className="text-[11px] font-bold text-emerald-500">+€{group.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                          {group.expenses > 0 && <span className="text-[11px] font-bold text-red-500">-€{group.expenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                          <span className={`text-[11px] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{group.docs.length}</span>
                          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={16} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                          </motion.div>
                        </div>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className={`divide-y px-3 pb-3 pt-1 space-y-2 ${darkMode ? 'divide-slate-800' : 'divide-slate-50'}`}>
                              {group.docs.map(doc => (
                                <DocCard key={doc.id} doc={doc} darkMode={darkMode} profile={profile} i18nLanguage={i18n.language} t={t} onClick={() => setSelectedDoc(doc)} />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
          ) : (
            <div className="py-16 text-center space-y-4">
              {searchQuery.trim() ? (
                <>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${darkMode ? 'bg-slate-900 text-slate-700' : 'bg-slate-50 text-slate-300'}`}>
                    <Search size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-700'}`}>Nessun risultato per "{searchQuery}"</p>
                    <p className="text-xs text-slate-400">Prova con un termine diverso</p>
                  </div>
                </>
              ) : (
                <>
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto ${darkMode ? 'bg-slate-900 text-slate-700' : 'bg-slate-50 text-slate-300'}`}>
                    <FileText size={36} />
                  </div>
                  <div className="space-y-1">
                    <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Nessun documento</p>
                    <p className="text-xs text-slate-400">{t('documents.no_documents_subtitle')}</p>
                  </div>
                  <button onClick={() => setIsChoiceOpen(true)} className="mx-auto flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-all">
                    <Plus size={16} />
                    {t('documents.add_document_btn')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>


      <AnimatePresence>
        {isChoiceOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsChoiceOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl" style={{ backgroundColor: 'var(--color-card)' }}>
              <div className="p-8 space-y-4">
                <div className="space-y-1">
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{profile.country === 'Spain' ? '¿Qué quieres añadir?' : 'Cosa vuoi aggiungere?'}</h2>
                  <p className="text-sm text-slate-500">{profile.country === 'Spain' ? 'Elige el tipo de documento' : 'Scegli il tipo di documento'}</p>
                </div>
                <button onClick={() => { setIsChoiceOpen(false); if (!isPro && invoiceCount >= 8) { setIsPaywallOpen(true); return; } setIsCreateOpen(true); }} className={`w-full p-5 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] hover:shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-primary/40 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'}`}>
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30"><FileText size={22} /></div>
                  <div className="text-left">
                    <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('documents.invoice')}</p>
                    <p className="text-sm text-slate-500">{profile.country === 'Spain' ? 'Ingreso de un cliente' : 'Entrata da un cliente'}</p>
                  </div>
                  <ChevronRight size={18} className="ml-auto text-slate-400" />
                </button>
                <button onClick={() => { setIsChoiceOpen(false); setIsExpenseOpen(true); }} className={`w-full p-5 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] hover:shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500/40 hover:shadow-indigo-500/10' : 'bg-white border-slate-100 hover:border-indigo-500/20 hover:shadow-indigo-500/5'}`}>
                  <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30"><CreditCard size={22} /></div>
                  <div className="text-left">
                    <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('documents.expense')}</p>
                    <p className="text-sm text-slate-500">{profile.country === 'Spain' ? 'Suscripción, material, software…' : 'Abbonamento, materiale, software…'}</p>
                  </div>
                  <ChevronRight size={18} className="ml-auto text-slate-400" />
                </button>
                {profile.country === 'Italy' && (
                  <button onClick={() => { setIsChoiceOpen(false); setIsCreditNoteOpen(true); }} className={`w-full p-5 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] hover:shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-violet-500/40 hover:shadow-violet-500/10' : 'bg-white border-slate-100 hover:border-violet-500/20 hover:shadow-violet-500/5'}`}>
                    <div className="w-12 h-12 bg-violet-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-500/30"><FileMinus size={22} /></div>
                    <div className="text-left">
                      <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('documents.credit_note_label')}</p>
                      <p className="text-sm text-slate-500">Storno di una fattura</p>
                    </div>
                    <ChevronRight size={18} className="ml-auto text-slate-400" />
                  </button>
                )}
                {profile.country === 'Italy' && (
                  <button onClick={() => { setIsChoiceOpen(false); setIsProformaOpen(true); }} className={`w-full p-5 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] hover:shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-500/40' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}><FileText size={22} /></div>
                    <div className="text-left">
                      <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('documents.proforma')}</p>
                      <p className="text-sm text-slate-500">Non fiscalmente valida</p>
                    </div>
                    <ChevronRight size={18} className="ml-auto text-slate-400" />
                  </button>
                )}
                {profile.country === 'Spain' && (
                  <>
                    <div className="flex items-center gap-3 pt-1">
                      <div className={`h-px flex-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Documentos no fiscales</span>
                      <div className={`h-px flex-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`} />
                    </div>
                    <button onClick={() => { setIsChoiceOpen(false); setIsRectificativaOpen(true); }} className={`w-full p-5 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] hover:shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-rose-500/40 hover:shadow-rose-500/10' : 'bg-white border-slate-100 hover:border-rose-500/20 hover:shadow-rose-500/5'}`}>
                      <div className="w-12 h-12 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-500/30"><FileMinus size={22} /></div>
                      <div className="text-left">
                        <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Factura Rectif.</p>
                        <p className="text-sm text-slate-500">Referencia a factura original</p>
                      </div>
                      <ChevronRight size={18} className="ml-auto text-slate-400" />
                    </button>
                    <button onClick={() => { setIsChoiceOpen(false); setIsPresupuestoOpen(true); }} className={`w-full p-5 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] hover:shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-amber-500/40 hover:shadow-amber-500/10' : 'bg-white border-slate-100 hover:border-amber-500/20 hover:shadow-amber-500/5'}`}>
                      <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30"><FileText size={22} /></div>
                      <div className="text-left">
                        <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Presupuesto</p>
                        <p className="text-sm text-slate-500">Estimación para un cliente</p>
                      </div>
                      <ChevronRight size={18} className="ml-auto text-slate-400" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Modal comuni ───────────────────────────────────────────── */}
      {profile.country !== 'Spain' && <CreateInvoiceModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSave={onAddDocument} onUpdateProfile={onUpdateProfile} profile={profile} documents={documents} darkMode={darkMode} />}
      {profile.country === 'Spain' && <CreateFacturaModal isOpen={isCreateOpen || !!docToFacturaEdit} onClose={() => { setIsCreateOpen(false); setDocToFacturaEdit(null); }} onSave={onAddDocument} onUpdate={onUpdateDocument} onUpdateProfile={onUpdateProfile} profile={profile} documents={documents} darkMode={darkMode} editDoc={docToFacturaEdit ?? undefined} />}
      <CreateExpenseModal isOpen={isExpenseOpen || !!docToExpenseEdit} onClose={() => { setIsExpenseOpen(false); setDocToExpenseEdit(null); }} onSave={onAddDocument} onUpdate={onUpdateDocument} editDoc={docToExpenseEdit ?? undefined} darkMode={darkMode} profile={profile} />
      {/* ─── Modal Italia ───────────────────────────────────────────── */}
      {profile.country === 'Italy' && <CreateCreditNoteModal isOpen={isCreditNoteOpen} onClose={() => setIsCreditNoteOpen(false)} onSave={onAddDocument} profile={profile} documents={documents} darkMode={darkMode} />}
      {profile.country === 'Italy' && <CreateInvoiceModal isOpen={isProformaOpen} onClose={() => setIsProformaOpen(false)} onSave={onAddDocument} onUpdateProfile={onUpdateProfile} profile={profile} documents={documents} darkMode={darkMode} isProforma={true} />}
      {/* ─── Modal Spain ────────────────────────────────────────────── */}
      {profile.country === 'Spain' && <CreateFacturaRectificativaModal isOpen={isRectificativaOpen} onClose={() => setIsRectificativaOpen(false)} onSave={onAddDocument} profile={profile} documents={documents} darkMode={darkMode} />}
      {profile.country === 'Spain' && <CreatePresupuestoModal isOpen={isPresupuestoOpen} onClose={() => setIsPresupuestoOpen(false)} onSave={onAddDocument} profile={profile} documents={documents} darkMode={darkMode} />}

      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedDoc(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl" style={{ backgroundColor: 'var(--color-card)' }}>
              <div className="p-6 space-y-4">
                <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2">
                    <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedDoc.client || selectedDoc.title}</p>
                    {selectedDoc.type === 'proforma' && <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>PROFORMA</span>}
                    {selectedDoc.type === 'presupuesto' && <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>PRESUPUESTO</span>}
                  </div>
                  <p className={`text-sm font-bold mt-0.5 ${selectedDoc.type === 'expense' || selectedDoc.type === 'credit_note' || selectedDoc.type === 'factura_rectificativa' ? 'text-red-500' : selectedDoc.type === 'proforma' ? (darkMode ? 'text-slate-400' : 'text-slate-500') : selectedDoc.type === 'presupuesto' ? (darkMode ? 'text-amber-400' : 'text-amber-600') : 'text-emerald-500'}`}>{selectedDoc.type === 'expense' || selectedDoc.type === 'credit_note' || selectedDoc.type === 'factura_rectificativa' ? '-' : ''}€{selectedDoc.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>

                {/* ─── Action sheet presupuesto (Spain only) ────────────── */}
                {selectedDoc.type === 'presupuesto' && (<>
                  <button onClick={async () => { if (!isPro) { setIsPaywallOpen(true); return; } const result = await buildInvoicePDFBlob(selectedDoc, profile); setSelectedDoc(null); setPdfPreview(result); }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-100'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500 text-white"><Download size={18} /></div>
                    <span className="font-bold text-amber-600">{t('documents.download_pdf_presupuesto')}</span>
                    {!isPro && <span className="ml-auto text-[10px] font-bold text-amber-600/60 uppercase tracking-wide">Pro</span>}
                  </button>
                  <button onClick={() => {
                    const year = new Date().getFullYear();
                    const yearStr = String(year);
                    const existingCount = documents.filter(d => d.type === 'invoice' && getLocalYear(d.date) === year).length;
                    const current = profile.invoiceCounters?.[yearStr] ?? existingCount;
                    const nextNum = `${String(current + 1).padStart(3, '0')}/${year}`;
                    const converted: Document = {
                      ...selectedDoc,
                      type: 'invoice',
                      status: 'pending',
                      invoiceNumber: nextNum,
                      date: todayLocalISO(),
                      validezDate: undefined,
                    };
                    onUpdateDocument(converted);
                    onUpdateProfile({ ...profile, invoiceCounters: { ...(profile.invoiceCounters ?? {}), [yearStr]: current + 1 } });
                    showToast(`Factura ${converted.invoiceNumber} creada`, 'success');
                    setSelectedDoc(null);
                  }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500 text-white"><FileText size={18} /></div>
                    <span className="font-bold text-emerald-600">Convertir en Factura</span>
                  </button>
                  <button onClick={() => { setDocToDelete(selectedDoc); setSelectedDoc(null); }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 text-red-500"><Trash2 size={18} /></div>
                    <span className="font-bold text-red-500">Eliminar</span>
                  </button>
                  <button onClick={() => setSelectedDoc(null)} className={`w-full py-4 rounded-2xl font-bold ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Cancelar</button>
                </>)}

                {/* ─── Action sheet proforma ─────────────────────────────── */}
                {selectedDoc.type === 'proforma' && (<>
                  <button onClick={async () => { if (!isPro) { setIsPaywallOpen(true); return; } const result = await buildInvoicePDFBlob(selectedDoc, profile); setSelectedDoc(null); setPdfPreview(result); }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-primary/10 border-primary/20' : 'bg-primary/5 border-primary/10'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary text-white"><Download size={18} /></div>
                    <span className="font-bold text-primary">{t('documents.download_pdf_proforma')}</span>
                    {!isPro && <span className="ml-auto text-[10px] font-bold text-primary/60 uppercase tracking-wide">Pro</span>}
                  </button>
                  <button onClick={() => {
                    const year = new Date().getFullYear();
                    const yearStr = String(year);
                    const existingCount = documents.filter(d => d.type === 'invoice' && getLocalYear(d.date) === year).length;
                    const current = profile.invoiceCounters?.[yearStr] ?? existingCount;
                    const nextNum = `${String(current + 1).padStart(3, '0')}/${year}`;
                    const converted: Document = {
                      ...selectedDoc,
                      type: 'invoice',
                      status: 'pending',
                      invoiceNumber: nextNum,
                      date: todayLocalISO(),
                    };
                    onUpdateDocument(converted);
                    onUpdateProfile({ ...profile, invoiceCounters: { ...(profile.invoiceCounters ?? {}), [yearStr]: current + 1 } });
                    showToast(`${t('documents.invoice_created_toast')} ${converted.invoiceNumber} creata`, 'success');
                    setSelectedDoc(null);
                  }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500 text-white"><FileText size={18} /></div>
                    <span className="font-bold text-emerald-600">{t('documents.convert_to_invoice')}</span>
                  </button>
                  <button onClick={() => { setDocToDelete(selectedDoc); setSelectedDoc(null); }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 text-red-500"><Trash2 size={18} /></div>
                    <span className="font-bold text-red-500">Elimina</span>
                  </button>
                  <button onClick={() => setSelectedDoc(null)} className={`w-full py-4 rounded-2xl font-bold ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{t('documents.cancel')}</button>
                </>)}

                {/* ─── Action sheet standard ────────────────────────────── */}
                {selectedDoc.type !== 'proforma' && selectedDoc.type !== 'presupuesto' && (<>
                {selectedDoc.type === 'invoice' && selectedDoc.status !== 'paid' && (
                  <button onClick={() => { onUpdateDocument({ ...selectedDoc, status: 'paid' }); setSelectedDoc(null); }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500 text-white"><CheckCircle2 size={18} /></div>
                    <span className="font-bold text-emerald-600">Segna come Pagata</span>
                  </button>
                )}
                {(selectedDoc.type === 'invoice' || selectedDoc.type === 'credit_note' || selectedDoc.type === 'factura_rectificativa') && (
                  <button onClick={async () => { if (!isPro) { setIsPaywallOpen(true); return; } const result = await buildInvoicePDFBlob(selectedDoc, profile); setSelectedDoc(null); setPdfPreview(result); }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-primary/10 border-primary/20' : 'bg-primary/5 border-primary/10'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary text-white"><Download size={18} /></div>
                    <span className="font-bold text-primary">{selectedDoc.type === 'credit_note' ? t('documents.download_pdf_credit_note') : selectedDoc.type === 'factura_rectificativa' ? t('documents.download_pdf_factura_rectificativa') : t('documents.download_pdf')}</span>
                    {!isPro && <span className="ml-auto text-[10px] font-bold text-primary/60 uppercase tracking-wide">Pro</span>}
                  </button>
                )}
                {(selectedDoc.type === 'invoice' || selectedDoc.type === 'credit_note') && profile.country === 'Italy' && (
                  <button
                    onClick={() => {
                      if (!isPro) { setIsPaywallOpen(true); return; }
                      const missing = getMissingProfileFields(profile);
                      if (missing.length > 0) {
                        showToast(
                          `Dati mancanti nel profilo: ${missing.map(f => f.label).join(', ')}`,
                          'error',
                          onNavigateToProfile ? { label: 'Vai al profilo', onClick: () => { setSelectedDoc(null); onNavigateToProfile(); } } : undefined
                        );
                        return;
                      }
                      downloadFatturaPA(selectedDoc, profile);
                      showToast(`XML scaricato`, 'success');
                      setSelectedDoc(null);
                    }}
                    className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} ${!isPro ? 'opacity-50' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-700 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><FileCode size={18} /></div>
                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedDoc.type === 'credit_note' ? 'Scarica XML TD04 (Nota Credito)' : 'Scarica FatturaPA XML'}</span>
                    {!isPro && <Lock size={11} className="ml-auto text-slate-400" />}
                  </button>
                )}
                {selectedDoc.type === 'invoice' && (
                  <button onClick={() => {
                    const year = new Date().getFullYear();
                    const yearStr = String(year);
                    const existingCount = documents.filter(d => d.type === 'invoice' && getLocalYear(d.date) === year).length;
                    const current = profile.invoiceCounters?.[yearStr] ?? existingCount;
                    const nextNum = `${String(current + 1).padStart(3, '0')}/${year}`;
                    const newDoc: Document = {
                      ...selectedDoc,
                      id: Math.random().toString(36).substr(2, 9),
                      date: todayLocalISO(),
                      status: 'pending',
                      invoiceNumber: nextNum,
                    };
                    onAddDocument(newDoc);
                    onUpdateProfile({ ...profile, invoiceCounters: { ...(profile.invoiceCounters ?? {}), [yearStr]: current + 1 } });
                    setSelectedDoc(null);
                  }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-700 text-amber-400' : 'bg-amber-50 text-amber-500'}`}><Copy size={18} /></div>
                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('documents.duplicate_invoice')}</span>
                  </button>
                )}
                {selectedDoc.type !== 'credit_note' && selectedDoc.type !== 'factura_rectificativa' && (
                  <button onClick={() => {
                    if (profile.country === 'Spain' && selectedDoc.type === 'invoice') {
                      setDocToFacturaEdit(selectedDoc);
                    } else if (profile.country === 'Spain' && selectedDoc.type === 'expense') {
                      setDocToExpenseEdit(selectedDoc);
                    } else {
                      setDocToEdit({ ...selectedDoc, docRegime: selectedDoc.docRegime ?? (profile.regime === 'autonomo' ? 'forfettario' : profile.regime ?? 'forfettario') });
                    }
                    setSelectedDoc(null);
                  }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-700 text-primary' : 'bg-primary/10 text-primary'}`}><FileEdit size={18} /></div>
                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Modifica</span>
                  </button>
                )}
                <button onClick={() => { setDocToDelete(selectedDoc); setSelectedDoc(null); }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 text-red-500"><Trash2 size={18} /></div>
                  <span className="font-bold text-red-500">Elimina</span>
                </button>
                <button onClick={() => setSelectedDoc(null)} className={`w-full py-4 rounded-2xl font-bold ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{t('documents.cancel')}</button>
                </>)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {docToEdit && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDocToEdit(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl" style={{ backgroundColor: 'var(--color-card)' }}>
              <div className="overflow-y-auto max-h-[90vh] p-8 space-y-5 [padding-bottom:max(2rem,calc(env(safe-area-inset-bottom)+1rem))]">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Modifica</h2>
                    <p className="text-sm text-slate-500">{docToEdit.type === 'invoice' ? `${t('documents.edit_subtitle_invoice')} ${docToEdit.invoiceNumber || ''}` : docToEdit.type === 'credit_note' ? `${t('documents.edit_subtitle_credit_note')} ${docToEdit.invoiceNumber || ''}` : t('documents.edit_subtitle_expense')}</p>
                  </div>
                  <button onClick={() => setDocToEdit(null)} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}><Plus className="rotate-45" size={24} /></button>
                </div>
                {(() => {
                  const ic = `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`;
                  const lc = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1';
                  return (
                    <div className="space-y-3">
                      {docToEdit.type === 'invoice' && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className={lc}>{t('documents.field_invoice_number')}</label>
                              <input type="text" value={docToEdit.invoiceNumber || ''} onChange={e => setDocToEdit({ ...docToEdit, invoiceNumber: e.target.value })} className={ic} />
                            </div>
                            <div className="space-y-1.5">
                              <label className={lc}>Data</label>
                              <input type="date" value={docToEdit.date} onChange={e => setDocToEdit({ ...docToEdit, date: e.target.value })} className={ic} />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className={lc}>Ragione Sociale / Nome</label>
                            <input type="text" value={docToEdit.client || ''} onChange={e => setDocToEdit({ ...docToEdit, client: e.target.value })} className={ic} />
                          </div>
                          <div className="space-y-1.5">
                            <label className={lc}>Indirizzo Cliente</label>
                            <input type="text" value={docToEdit.clientAddress || ''} onChange={e => setDocToEdit({ ...docToEdit, clientAddress: e.target.value })} className={ic} />
                          </div>
                          {/* Toggle Azienda / Privato */}
                          <div className={`p-1 rounded-2xl flex gap-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            {(['Azienda', 'Privato'] as const).map(t => (
                              <button key={t} type="button"
                                onClick={() => setDocToEdit({ ...docToEdit, clientPiva: t === 'Privato' ? 'Privato' : '' })}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${(t === 'Privato' ? docToEdit.clientPiva === 'Privato' : docToEdit.clientPiva !== 'Privato') ? 'bg-primary text-white shadow-lg shadow-primary/30' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                                {t}
                              </button>
                            ))}
                          </div>
                          <div className={`grid gap-3 ${docToEdit.clientPiva === 'Privato' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {docToEdit.clientPiva !== 'Privato' && (
                              <div className="space-y-1.5">
                                <label className={lc}>P.IVA Cliente</label>
                                <input type="text" value={docToEdit.clientPiva || ''} onChange={e => setDocToEdit({ ...docToEdit, clientPiva: e.target.value })} className={ic} />
                              </div>
                            )}
                            <div className="space-y-1.5">
                              <label className={lc}>C.F. Cliente</label>
                              <input type="text" value={docToEdit.clientCf || ''} onChange={e => setDocToEdit({ ...docToEdit, clientCf: e.target.value.toUpperCase() })} className={ic} />
                            </div>
                          </div>
                          {/* IVA (solo ordinario) */}
                          {(docToEdit.docRegime ?? 'forfettario') === 'ordinario' && (
                            <div className="space-y-1.5">
                              <label className={lc}>Aliquota IVA</label>
                              <select value={docToEdit.ivaRate ?? 22} onChange={e => setDocToEdit({ ...docToEdit, ivaRate: parseInt(e.target.value) })} className={ic}>
                                <option value={4}>4%</option>
                                <option value={5}>5%</option>
                                <option value={10}>10%</option>
                                <option value={22}>22%</option>
                              </select>
                            </div>
                          )}
                          {/* Opzioni fiscali */}
                          <div className="space-y-2 pt-1">
                            {(docToEdit.docRegime ?? 'forfettario') === 'ordinario' && (
                              <label className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                <span className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Rivalsa INPS (4%)</span>
                                <input type="checkbox" checked={docToEdit.rivalsaInps ?? false} onChange={e => setDocToEdit({ ...docToEdit, rivalsaInps: e.target.checked })} className="w-5 h-5 rounded text-primary focus:ring-primary" />
                              </label>
                            )}
                            <label className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                              <span className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Ritenuta d'acconto (20%)</span>
                              <input type="checkbox" checked={docToEdit.ritenuta ?? false} onChange={e => setDocToEdit({ ...docToEdit, ritenuta: e.target.checked })} className="w-5 h-5 rounded text-primary focus:ring-primary" />
                            </label>
                            {(docToEdit.docRegime ?? 'forfettario') === 'forfettario' && (
                              <label className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                <span className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Marca da bollo (€2)</span>
                                <input type="checkbox" checked={docToEdit.marcaBollo ?? false} onChange={e => setDocToEdit({ ...docToEdit, marcaBollo: e.target.checked })} className="w-5 h-5 rounded text-primary focus:ring-primary" />
                              </label>
                            )}
                          </div>
                        </>
                      )}
                      <div className="space-y-1.5">
                        <label className={lc}>Descrizione</label>
                        <input type="text" value={docToEdit.title} onChange={e => setDocToEdit({ ...docToEdit, title: e.target.value })} className={ic} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className={lc}>Importo €</label>
                          <input type="number" value={docToEdit.amount} onChange={e => setDocToEdit({ ...docToEdit, amount: parseFloat(e.target.value) || 0 })} className={ic} />
                        </div>
                        {docToEdit.type === 'expense' && (
                          <div className="space-y-1.5">
                            <label className={lc}>Data</label>
                            <input type="date" value={docToEdit.date} onChange={e => setDocToEdit({ ...docToEdit, date: e.target.value })} className={ic} />
                          </div>
                        )}
                      </div>
                      {docToEdit.type === 'invoice' && (
                        <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                          <CheckCircle2 size={20} className="text-emerald-500" />
                          <p className={`text-xs font-bold flex-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>Segna come Pagata</p>
                          <input type="checkbox" checked={docToEdit.status === 'paid'} onChange={e => setDocToEdit({ ...docToEdit, status: e.target.checked ? 'paid' : 'pending' })} className="w-5 h-5 rounded-lg border-emerald-200 text-emerald-500 focus:ring-emerald-500" />
                        </div>
                      )}
                    </div>
                  );
                })()}
                <button onClick={() => { onUpdateDocument(docToEdit); setDocToEdit(null); }} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all">Salva Modifiche</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {docToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDocToDelete(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl" style={{ backgroundColor: 'var(--color-card)' }}>
              <div className="p-8 space-y-5">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500"><Trash2 size={24} /></div>
                  <div>
                    <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Elimina documento</h2>
                    <p className="text-sm text-slate-500 mt-1">Vuoi eliminare <span className="font-bold">{docToDelete.client || docToDelete.title}</span>? L'operazione non può essere annullata.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={() => setDocToDelete(null)} className={`py-4 rounded-2xl font-bold active:scale-[0.98] transition-all ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{t('documents.cancel')}</button>
                  <button onClick={() => {
                    // IT-35: audit log per fatture eliminate (contatore non torna indietro)
                    if (docToDelete.type === 'invoice' && docToDelete.invoiceNumber) {
                      onUpdateProfile({
                        ...profile,
                        deletedInvoiceNumbers: [...(profile.deletedInvoiceNumbers ?? []), docToDelete.invoiceNumber],
                      });
                    }
                    onDeleteDocument(docToDelete.id);
                    setDocToDelete(null);
                  }} className="py-4 rounded-2xl font-bold bg-red-500 text-white shadow-xl shadow-red-500/30 active:scale-[0.98] transition-all">Elimina</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} documents={documents} selectedYear={selectedYear} profile={profile} accountant={accountant} darkMode={darkMode} />
      <PaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} darkMode={darkMode} />
      <ResumenTrimestralModal isOpen={isResumenOpen} onClose={() => setIsResumenOpen(false)} documents={documents} profile={profile} accountant={accountant} darkMode={darkMode} onNavigateToProfile={onNavigateToProfile} />
      <PdfPreviewModal isOpen={!!pdfPreview} onClose={() => setPdfPreview(null)} blob={pdfPreview?.blob ?? new Blob()} fileName={pdfPreview?.fileName ?? ''} darkMode={darkMode} />

    </motion.div>
  );
};

export default DocumentsView;
