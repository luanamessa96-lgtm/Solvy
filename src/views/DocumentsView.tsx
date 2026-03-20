import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Mail, Camera, ChevronRight, FileText, FileEdit, CheckCircle2, Trash2, CreditCard, Plus, Download, Copy, AlertTriangle } from 'lucide-react';

import { Document, Accountant, Profile } from '../types';
import CreateInvoiceModal from '../components/modals/CreateInvoiceModal';
import CreateExpenseModal from '../components/modals/CreateExpenseModal';
import SearchOverlay from '../components/modals/SearchOverlay';
import ExportModal from '../components/modals/ExportModal';
import { generateInvoicePDF } from '../lib/generateInvoicePDF';

interface DocumentsViewProps {
  documents: Document[];
  onAddDocument: (doc: Document) => void;
  onDeleteDocument: (id: string) => void;
  onUpdateDocument: (doc: Document) => void;
  onUpdateProfile: (p: Profile) => void;
  accountant: Accountant;
  profile: Profile;
  darkMode?: boolean;
  key?: string;
  onMediaLibraryClick?: () => void;
}

const DocumentsView = ({ documents, onAddDocument, onDeleteDocument, onUpdateDocument, onUpdateProfile, accountant, profile, darkMode, onMediaLibraryClick }: DocumentsViewProps) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isChoiceOpen, setIsChoiceOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [docToEdit, setDocToEdit] = useState<Document | null>(null);

  const initializedRef = useRef(false);
  const prevLengthRef = useRef(0);
  useEffect(() => {
    if (documents.length > 0 && !initializedRef.current) {
      const years = documents.map(d => new Date(d.date).getFullYear());
      setSelectedYear(Math.max(...years));
      initializedRef.current = true;
    } else if (documents.length > prevLengthRef.current && initializedRef.current) {
      // Nuovo documento aggiunto: switcha all'anno del documento appena salvato
      const newDoc = documents[0];
      if (newDoc) setSelectedYear(new Date(newDoc.date).getFullYear());
    }
    prevLengthRef.current = documents.length;
  }, [documents]);

  const availableYears = useMemo(() => {
    const years = new Set(documents.map(d => new Date(d.date).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [documents]);

  const yearDocuments = useMemo(() => documents.filter(d => new Date(d.date).getFullYear() === selectedYear), [documents, selectedYear]);

  const totals = useMemo(() => yearDocuments.reduce((acc, doc) => {
    if (doc.type === 'invoice' && doc.status === 'paid') acc.income += doc.amount;
    else if (doc.type === 'expense') acc.expenses += doc.amount;
    return acc;
  }, { income: 0, expenses: 0 }), [yearDocuments]);

  const balance = totals.income - totals.expenses;

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let docs = q ? documents : yearDocuments;
    if (filter === 'income') docs = docs.filter(d => d.type === 'invoice');
    if (filter === 'expense') docs = docs.filter(d => d.type === 'expense');
    if (statusFilter !== 'all') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (statusFilter === 'overdue') {
        docs = docs.filter(d => d.status === 'overdue' || (d.type === 'invoice' && d.status === 'pending' && new Date(d.date) < thirtyDaysAgo));
      } else if (statusFilter === 'pending') {
        docs = docs.filter(d => d.status === 'pending' && new Date(d.date) >= thirtyDaysAgo);
      } else {
        docs = docs.filter(d => d.status === statusFilter);
      }
    }
    if (q) docs = docs.filter(d => (d.title ?? '').toLowerCase().includes(q) || (d.client ?? '').toLowerCase().includes(q) || (d.category ?? '').toLowerCase().includes(q) || String(d.amount).includes(q));
    return docs;
  }, [documents, yearDocuments, filter, statusFilter, searchQuery]);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 15, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-6 space-y-8 pb-24">
      <button type="button" onClick={() => setIsSearchOpen(true)} className={`w-full flex items-center gap-3 pl-4 pr-4 py-3 border rounded-2xl text-sm text-left transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-600 hover:border-primary/30' : 'bg-white border-slate-100 text-slate-400 hover:border-primary/20'}`}>
        <Search size={18} className="shrink-0 text-slate-400" />
        <span className="flex-1">Cerca fatture e spese...</span>
      </button>

      <motion.button variants={item} onClick={() => setIsExportOpen(true)} className={`w-full p-6 border rounded-3xl flex items-center justify-between transition-all group active:scale-[0.98] ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${darkMode ? 'bg-slate-800 text-primary group-hover:bg-primary group-hover:text-white' : 'bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white'}`}><Mail size={28} strokeWidth={1.5} /></div>
          <div className="text-left">
            <p className={`text-base font-bold transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>Invia Documenti</p>
            <p className="text-xs text-slate-500">Al tuo commercialista</p>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${darkMode ? 'bg-slate-800 text-slate-600 group-hover:bg-primary/20 group-hover:text-primary' : 'bg-slate-50 text-slate-300 group-hover:bg-primary/10 group-hover:text-primary'}`}><ChevronRight size={20} /></div>
      </motion.button>

      <motion.div variants={item} className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Caricamento Rapido</span>
        </div>
        <button onClick={onMediaLibraryClick} className={`w-full p-5 rounded-3xl border flex items-center gap-4 transition-all active:scale-[0.96] ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-lg'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary'}`}><Camera size={22} /></div>
          <div className="text-left">
            <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Libreria</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Foto, scontrini e documenti</p>
          </div>
        </button>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Anno</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {availableYears.map(year => (
            <button key={year} onClick={() => setSelectedYear(year)} className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${selectedYear === year ? 'bg-primary text-white shadow-lg shadow-primary/40' : (darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}`}>{year}</button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item} className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Filtra per Categoria</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => setFilter('income')} className={`p-4 rounded-3xl border transition-all text-left space-y-2 active:scale-[0.95] ${filter === 'income' ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-500/40' : (darkMode ? 'bg-slate-900 border-slate-800 text-emerald-500 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10' : 'bg-white border-slate-100 text-emerald-600 hover:border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5')}`}>
            <p className={`text-[9px] font-bold uppercase tracking-wider ${filter === 'income' ? 'text-white/60' : (darkMode ? 'text-emerald-500/60' : 'text-emerald-600/60')}`}>Entrate</p>
            <p className="text-sm font-bold">€{totals.income.toLocaleString()}</p>
          </button>
          <button onClick={() => setFilter('expense')} className={`p-4 rounded-3xl border transition-all text-left space-y-2 active:scale-[0.95] ${filter === 'expense' ? 'bg-red-600 border-red-600 text-white shadow-xl shadow-red-500/40' : (darkMode ? 'bg-slate-900 border-slate-800 text-red-500 hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/10' : 'bg-white border-slate-100 text-red-600 hover:border-red-500/20 hover:shadow-lg hover:shadow-red-500/5')}`}>
            <p className={`text-[9px] font-bold uppercase tracking-wider ${filter === 'expense' ? 'text-white/60' : (darkMode ? 'text-red-500/60' : 'text-red-600/60')}`}>Uscite</p>
            <p className="text-sm font-bold">€{totals.expenses.toLocaleString()}</p>
          </button>
          <button onClick={() => setFilter('all')} className={`p-4 rounded-3xl border transition-all text-left space-y-2 active:scale-[0.95] ${filter === 'all' ? (darkMode ? 'bg-white border-white text-slate-900 shadow-xl shadow-white/20' : 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/40') : (darkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10' : 'bg-white border-slate-100 text-slate-600 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5')}`}>
            <p className={`text-[9px] font-bold uppercase tracking-wider ${filter === 'all' ? (darkMode ? 'text-slate-900/60' : 'text-white/60') : 'text-slate-400'}`}>Bilancio</p>
            <p className="text-sm font-bold">€{balance.toLocaleString()}</p>
          </button>
        </div>
      </motion.div>

      {filter === 'income' && (
        <motion.div variants={item} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {([
            { value: 'all', label: 'Tutte' },
            { value: 'paid', label: 'Saldate' },
            { value: 'pending', label: 'In attesa' },
            { value: 'overdue', label: 'Scadute' },
          ] as const).map(s => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)} className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${statusFilter === s.value ? (s.value === 'paid' ? 'bg-emerald-500 text-white' : s.value === 'overdue' ? 'bg-red-500 text-white' : s.value === 'pending' ? 'bg-amber-500 text-white' : 'bg-primary text-white') : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
              {s.label}
            </button>
          ))}
        </motion.div>
      )}

      <motion.div variants={item} className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            {searchQuery.trim() ? `${filteredDocuments.length} risultat${filteredDocuments.length === 1 ? 'o' : 'i'} per "${searchQuery}"` : filter === 'all' ? 'Cronologia Completa' : filter === 'income' ? 'Fatture Clienti' : 'Spese e Uscite'}
          </span>
          {(filter !== 'all' || statusFilter !== 'all' || searchQuery.trim()) && (
            <button onClick={() => { setFilter('all'); setStatusFilter('all'); setSearchQuery(''); }} className="text-[11px] font-bold text-primary uppercase tracking-wider active:scale-90 transition-all hover:drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]">Reset</button>
          )}
        </div>
        <div className="space-y-3">
          {filteredDocuments.length > 0 ? filteredDocuments.map(doc => (
            <motion.button variants={item} key={doc.id} onClick={() => setSelectedDoc(doc)} className={`w-full p-4 border rounded-2xl flex items-center gap-4 transition-all active:scale-[0.98] hover:shadow-xl text-left ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-primary/40 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${doc.type === 'invoice' ? (darkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600') : (darkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-600')}`}>
                {doc.type === 'invoice' ? <FileText size={18} /> : <FileEdit size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <h3 className={`text-sm font-bold truncate pr-2 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{doc.client || doc.title}</h3>
                  <p className={`text-sm font-bold shrink-0 ${doc.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>{doc.type === 'expense' ? '-' : '+'}€{doc.amount.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-slate-400">{new Date(doc.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {doc.type === 'invoice' && doc.status === 'paid' && <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">· Saldato</span>}
                  {doc.type === 'invoice' && doc.status === 'pending' && <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">· In attesa</span>}
                  {doc.type === 'invoice' && doc.status === 'overdue' && <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">· Scaduta</span>}
                  {doc.category && <span className="text-[10px] font-medium text-slate-400">· {doc.category}</span>}
                  {doc.type === 'invoice' && (!doc.title || !doc.clientAddress || !doc.clientPiva) && (
                    <AlertTriangle size={11} className="text-amber-400 shrink-0" />
                  )}
                </div>
              </div>
            </motion.button>
          )) : (
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
                    <p className="text-xs text-slate-400">Aggiungi la tua prima fattura o spesa</p>
                  </div>
                  <button onClick={() => setIsChoiceOpen(true)} className="mx-auto flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-all">
                    <Plus size={16} />
                    Aggiungi documento
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={item} className="fixed bottom-24 left-0 right-0 px-6 py-4 pointer-events-none">
        <div className="max-w-md mx-auto flex justify-end">
          <button onClick={() => setIsChoiceOpen(true)} className="w-14 h-14 bg-primary rounded-full shadow-xl shadow-primary/30 flex items-center justify-center text-white active:scale-90 transition-all pointer-events-auto">
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {isChoiceOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsChoiceOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className={`relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}>
              <div className="p-8 space-y-4">
                <div className="space-y-1">
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Cosa vuoi aggiungere?</h2>
                  <p className="text-sm text-slate-500">Scegli il tipo di documento</p>
                </div>
                <button onClick={() => { setIsChoiceOpen(false); setIsCreateOpen(true); }} className={`w-full p-5 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] hover:shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-primary/40 hover:shadow-primary/10' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-primary/5'}`}>
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30"><FileText size={22} /></div>
                  <div className="text-left">
                    <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Fattura</p>
                    <p className="text-sm text-slate-500">Entrata da un cliente</p>
                  </div>
                  <ChevronRight size={18} className="ml-auto text-slate-400" />
                </button>
                <button onClick={() => { setIsChoiceOpen(false); setIsExpenseOpen(true); }} className={`w-full p-5 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] hover:shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500/40 hover:shadow-indigo-500/10' : 'bg-white border-slate-100 hover:border-indigo-500/20 hover:shadow-indigo-500/5'}`}>
                  <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30"><CreditCard size={22} /></div>
                  <div className="text-left">
                    <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Spesa</p>
                    <p className="text-sm text-slate-500">Abbonamento, materiale, software…</p>
                  </div>
                  <ChevronRight size={18} className="ml-auto text-slate-400" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CreateInvoiceModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSave={onAddDocument} onUpdateProfile={onUpdateProfile} profile={profile} documents={documents} darkMode={darkMode} />
      <CreateExpenseModal isOpen={isExpenseOpen} onClose={() => setIsExpenseOpen(false)} onSave={onAddDocument} darkMode={darkMode} />

      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedDoc(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className={`relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}>
              <div className="p-6 space-y-4">
                <div className={`p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedDoc.client || selectedDoc.title}</p>
                  <p className={`text-sm font-bold mt-0.5 ${selectedDoc.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>{selectedDoc.type === 'expense' ? '-' : '+'}€{selectedDoc.amount.toLocaleString()}</p>
                </div>
                {selectedDoc.type === 'invoice' && selectedDoc.status !== 'paid' && (
                  <button onClick={() => { onUpdateDocument({ ...selectedDoc, status: 'paid' }); setSelectedDoc(null); }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500 text-white"><CheckCircle2 size={18} /></div>
                    <span className="font-bold text-emerald-600">Segna come Pagata</span>
                  </button>
                )}
                {selectedDoc.type === 'invoice' && (
                  <button onClick={() => { generateInvoicePDF(selectedDoc, profile); setSelectedDoc(null); }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-primary/10 border-primary/20' : 'bg-primary/5 border-primary/10'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary text-white"><Download size={18} /></div>
                    <span className="font-bold text-primary">Scarica PDF Fattura</span>
                  </button>
                )}
                {selectedDoc.type === 'invoice' && (
                  <button onClick={() => {
                    const year = new Date().getFullYear();
                    const count = documents.filter(d => d.type === 'invoice' && new Date(d.date).getFullYear() === year).length + 1;
                    const newDoc: Document = {
                      ...selectedDoc,
                      id: Math.random().toString(36).substr(2, 9),
                      date: new Date().toISOString().split('T')[0],
                      status: 'pending',
                      invoiceNumber: `${String(count).padStart(3, '0')}/${year}`,
                    };
                    onAddDocument(newDoc);
                    setSelectedDoc(null);
                  }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-700 text-amber-400' : 'bg-amber-50 text-amber-500'}`}><Copy size={18} /></div>
                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Duplica Fattura</span>
                  </button>
                )}
                <button onClick={() => { setDocToEdit({ ...selectedDoc }); setSelectedDoc(null); }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-700 text-primary' : 'bg-primary/10 text-primary'}`}><FileEdit size={18} /></div>
                  <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Modifica</span>
                </button>
                <button onClick={() => { setDocToDelete(selectedDoc); setSelectedDoc(null); }} className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 text-red-500"><Trash2 size={18} /></div>
                  <span className="font-bold text-red-500">Elimina</span>
                </button>
                <button onClick={() => setSelectedDoc(null)} className={`w-full py-4 rounded-2xl font-bold ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Annulla</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {docToEdit && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDocToEdit(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className={`relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}>
              <div className="overflow-y-auto max-h-[90vh] p-8 space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Modifica</h2>
                    <p className="text-sm text-slate-500">{docToEdit.type === 'invoice' ? `Fattura ${docToEdit.invoiceNumber || ''}` : 'Spesa'}</p>
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
                              <label className={lc}>N° Fattura</label>
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
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between ml-1">
                                <label className={lc}>P.IVA Cliente</label>
                                <button type="button" onClick={() => setDocToEdit({ ...docToEdit, clientPiva: docToEdit.clientPiva === 'Privato' ? '' : 'Privato' })} className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${docToEdit.clientPiva === 'Privato' ? 'bg-primary text-white' : (darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400')}`}>
                                  Privato
                                </button>
                              </div>
                              <input type="text" value={docToEdit.clientPiva || ''} onChange={e => setDocToEdit({ ...docToEdit, clientPiva: e.target.value })} disabled={docToEdit.clientPiva === 'Privato'} placeholder={docToEdit.clientPiva === 'Privato' ? 'Cliente privato' : ''} className={`${ic} ${docToEdit.clientPiva === 'Privato' ? 'opacity-40' : ''}`} />
                            </div>
                            <div className="space-y-1.5">
                              <label className={lc}>C.F. Cliente</label>
                              <input type="text" value={docToEdit.clientCf || ''} onChange={e => setDocToEdit({ ...docToEdit, clientCf: e.target.value.toUpperCase() })} className={ic} />
                            </div>
                          </div>
                          {/* Regime fiscale */}
                          <div className="space-y-1.5 pt-1">
                            <label className={lc}>Regime Fiscale</label>
                            <div className={`p-1 rounded-2xl flex gap-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                              {(['forfettario', 'ordinario'] as const).map(r => (
                                <button key={r} type="button" onClick={() => setDocToEdit({ ...docToEdit, docRegime: r })} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${(docToEdit.docRegime ?? 'forfettario') === r ? 'bg-primary text-white shadow-lg shadow-primary/30' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                                  {r.charAt(0).toUpperCase() + r.slice(1)}
                                </button>
                              ))}
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className={`relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'}`}>
              <div className="p-8 space-y-5">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500"><Trash2 size={24} /></div>
                  <div>
                    <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Elimina documento</h2>
                    <p className="text-sm text-slate-500 mt-1">Vuoi eliminare <span className="font-bold">{docToDelete.client || docToDelete.title}</span>? L'operazione non può essere annullata.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={() => setDocToDelete(null)} className={`py-4 rounded-2xl font-bold active:scale-[0.98] transition-all ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Annulla</button>
                  <button onClick={() => { onDeleteDocument(docToDelete.id); setDocToDelete(null); }} className="py-4 rounded-2xl font-bold bg-red-500 text-white shadow-xl shadow-red-500/30 active:scale-[0.98] transition-all">Elimina</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSearchOpen && <SearchOverlay documents={documents} onClose={() => setIsSearchOpen(false)} onSelectDoc={doc => { setIsSearchOpen(false); setSelectedDoc(doc); }} darkMode={darkMode} />}
      </AnimatePresence>

      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} documents={documents} selectedYear={selectedYear} profile={profile} accountant={accountant} darkMode={darkMode} />

    </motion.div>
  );
};

export default DocumentsView;
