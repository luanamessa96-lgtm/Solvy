import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Search, Plus, FileText, FileEdit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Document } from '../../types';

interface SearchOverlayProps {
  documents: Document[];
  onClose: () => void;
  onSelectDoc: (doc: Document) => void;
  darkMode?: boolean;
}

const SearchOverlay = ({ documents, onClose, onSelectDoc, darkMode }: SearchOverlayProps) => {
  const { t } = useTranslation();
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return documents.filter(d =>
      (d.title ?? '').toLowerCase().includes(q) ||
      (d.client ?? '').toLowerCase().includes(q) ||
      (d.category ?? '').toLowerCase().includes(q) ||
      String(d.amount).includes(q)
    );
  }, [documents, query]);

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }} className="fixed inset-0 z-[60] flex flex-col" style={{ backgroundColor: 'var(--color-card-bg)' }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <button type="button" onClick={onClose} className={`p-2 rounded-full transition-all active:scale-90 shrink-0 ${darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}>
          <ArrowLeft size={22} />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input ref={inputRef} type="text" placeholder={t('documents.search_placeholder')} value={query} onChange={e => setQuery(e.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} className={`w-full pl-9 pr-9 py-2.5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 text-white placeholder:text-slate-500' : 'bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200'}`} />
          {query.length > 0 && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Plus className="rotate-45" size={17} />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 pb-24">
        {query.trim() === '' ? (
          <div className="py-16 text-center space-y-2">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-300'}`}><Search size={28} /></div>
            <p className={`text-sm font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{t('documents.search_start_typing')}</p>
          </div>
        ) : results.length > 0 ? (
          <>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 pb-1">{results.length} {results.length === 1 ? 'risultato' : 'risultati'}</p>
            {results.map(doc => (
              <button key={doc.id} type="button" onClick={() => onSelectDoc(doc)} className="w-full p-4 border rounded-2xl flex items-center gap-4 transition-all active:scale-[0.98] text-left hover:border-primary/30 hover:shadow-md" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${doc.type === 'invoice' ? (darkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600') : (darkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-600')}`}>
                  {doc.type === 'invoice' ? <FileText size={18} /> : <FileEdit size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className={`text-sm font-bold truncate pr-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{doc.client || doc.title}</h3>
                    <p className={`text-sm font-bold shrink-0 ${doc.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>{doc.type === 'expense' ? '-' : '+'}€{doc.amount.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-slate-400">{new Date(doc.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {doc.category && <span className="text-[10px] font-medium text-slate-400">· {doc.category}</span>}
                  </div>
                </div>
              </button>
            ))}
          </>
        ) : (
          <div className="py-16 text-center space-y-2">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-300'}`}><Search size={28} /></div>
            <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-700'}`}>{t('documents.no_results_title', { query })}</p>
            <p className="text-xs text-slate-400">{t('documents.no_results_subtitle')}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SearchOverlay;
