import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Document } from '../types';
import { uploadFile } from '../lib/db';

interface MediaLibraryViewProps {
  documents: Document[];
  onAddDocument: (doc: Document) => void;
  onDeleteDocument: (id: string) => void;
  onUpdateDocument: (doc: Document) => void;
  darkMode?: boolean;
  addTrigger?: number;
}

const categories = [
  { value: 'abbonamento', label: 'Abbonamento', emoji: '📦' },
  { value: 'materiale', label: 'Materiale', emoji: '🛠️' },
  { value: 'software', label: 'Software', emoji: '💻' },
  { value: 'formazione', label: 'Formazione', emoji: '📚' },
  { value: 'altro', label: 'Altro', emoji: '📎' },
];

const fileColors: Record<string, { bg: string; text: string }> = {
  pdf:  { bg: '#FEE2E2', text: '#EF4444' },
  doc:  { bg: '#DBEAFE', text: '#2563EB' },
  docx: { bg: '#DBEAFE', text: '#2563EB' },
  xls:  { bg: '#D1FAE5', text: '#059669' },
  xlsx: { bg: '#D1FAE5', text: '#059669' },
  csv:  { bg: '#D1FAE5', text: '#059669' },
  txt:  { bg: '#F1F5F9', text: '#64748B' },
  zip:  { bg: '#FEF3C7', text: '#D97706' },
};

function ext(name: string) { return name.split('.').pop()?.toLowerCase() || 'file'; }

function monthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function groupByMonth(items: Document[]) {
  const groups: Record<string, Document[]> = {};
  [...items]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach(item => {
      const key = monthLabel(item.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
  return groups;
}

function PdfPreview({ url, fileName, loading }: { url: string | null; fileName?: string; loading?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="w-64 rounded-3xl overflow-hidden shadow-2xl bg-white flex flex-col">
      {/* PDF icon area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10 bg-red-50">
        <div className="w-20 h-24 rounded-2xl bg-white shadow-lg flex flex-col items-center justify-center gap-1 border border-red-100">
          <FileText size={36} className="text-red-500" strokeWidth={1.5} />
          <span className="text-xs font-black tracking-widest text-red-500">PDF</span>
        </div>
        {fileName && (
          <p className="text-xs font-semibold text-red-400 text-center px-4 truncate max-w-[220px]">{fileName}</p>
        )}
      </div>
      {/* Open button */}
      {loading ? (
        <div className="w-full py-4 bg-red-400 text-white font-bold text-sm tracking-wide text-center opacity-80">
          {t('common.preparing')}
        </div>
      ) : url ? (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="block w-full py-4 bg-red-500 text-white font-bold text-sm tracking-wide text-center active:scale-[0.98] transition-all">
          {t('pdf_preview.open_btn')}
        </a>
      ) : (
        <div className="w-full py-4 bg-red-400 text-white font-bold text-sm tracking-wide text-center opacity-80">
          {t('common.preparing')}
        </div>
      )}
    </div>
  );
}

function TextPreview({ imageData, fileName }: { imageData: string; fileName?: string }) {
  const { t } = useTranslation();
  const [content, setContent] = React.useState('');

  React.useEffect(() => {
    if (imageData.startsWith('http')) {
      fetch(imageData).then(r => r.text()).then(setContent).catch(() => setContent(t('media_library.content_unreadable')));
    } else {
      try {
        const b64 = imageData.split(',')[1] || '';
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        setContent(new TextDecoder('utf-8').decode(bytes));
      } catch { setContent(t('media_library.content_unreadable')); }
    }
  }, [imageData, t]);

  return (
    <div className="w-full max-h-72 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/80">
        <FileText size={14} className="text-slate-400" />
        <span className="text-xs font-semibold text-slate-500 truncate">{fileName}</span>
      </div>
      <div className="overflow-y-auto flex-1 px-5 py-4">
        <p className="text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed">{content || '…'}</p>
      </div>
    </div>
  );
}

function FileThumbnail({ doc }: { doc: Document; darkMode?: boolean }) {
  if (doc.imageData && !doc.fileName) {
    return (
      <img
        src={doc.imageData}
        alt={doc.title}
        loading="lazy"
        className="w-full h-full object-cover"
      />
    );
  }
  const e = ext(doc.fileName || '');
  const cfg = fileColors[e] ?? { bg: '#EDE9FE', text: '#7C3AED' };
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ backgroundColor: cfg.bg }}>
      <FileText size={40} style={{ color: cfg.text }} strokeWidth={1.5} />
      <span className="text-xs font-black tracking-widest" style={{ color: cfg.text }}>
        {e.toUpperCase().slice(0, 4)}
      </span>
    </div>
  );
}

export default function MediaLibraryView({ documents, onDeleteDocument, onUpdateDocument, darkMode }: MediaLibraryViewProps) {
  const { t } = useTranslation();
  const items = documents.filter(d => d.imageData || d.fileName);
  const groups = groupByMonth(items);
  const monthKeys = Object.keys(groups);

  const [selectedItem, setSelectedItem] = React.useState<Document | null>(null);
  const [editItem, setEditItem] = React.useState<Document | null>(null);
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = React.useState(false);

  // Auto-upload base64 PDF to Storage when detail modal opens
  React.useEffect(() => {
    if (!selectedItem) { setPdfUrl(null); return; }
    const isPdf = ext(selectedItem.fileName || '') === 'pdf';
    if (!isPdf || !selectedItem.imageData) { setPdfUrl(null); return; }
    if (selectedItem.imageData.startsWith('http')) {
      setPdfUrl(selectedItem.imageData);
      return;
    }
    // base64 → upload automatically
    setPdfLoading(true);
    setPdfUrl(null);
    uploadFile(selectedItem.imageData, selectedItem.fileName || `pdf_${selectedItem.id}.pdf`)
      .then(url => {
        const updated = { ...selectedItem, imageData: url };
        setPdfUrl(url);
        setSelectedItem(updated);
        onUpdateDocument(updated);
      })
      .catch(() => setPdfUrl(null))
      .finally(() => setPdfLoading(false));
  }, [selectedItem?.id]);

  const handleDelete = (doc: Document) => {
    onDeleteDocument(doc.id);
    setSelectedItem(null);
  };

  const inputClass = (error = false) =>
    `w-full px-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 border ${error ? 'border-red-400 focus:ring-red-400/20' : `focus:ring-primary/20 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`} ${darkMode ? 'bg-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 text-slate-900 placeholder:text-slate-400'}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
      {items.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-4 text-center px-6">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-300'}`}>
            <ImageIcon size={36} />
          </div>
          <div>
            <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('media_library.no_files_title')}</p>
            <p className="text-sm text-slate-400 mt-1">Adjunta scontrinos o facturas al crear un gasto — aparecerán aquí automáticamente.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          {monthKeys.map(month => (
            <div key={month}>
              <h2 className={`text-xl font-bold capitalize px-5 pb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{month}</h2>
              <div className="mx-4 rounded-2xl overflow-hidden border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                {groups[month].map((item, i) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSelectedItem(item)}
                    className={`w-full flex items-center gap-3 px-4 py-3 active:opacity-60 transition-opacity text-left ${i < groups[month].length - 1 ? 'border-b' : ''}`}
                    style={i < groups[month].length - 1 ? { borderColor: 'var(--color-border)' } : undefined}
                  >
                    {/* Thumbnail */}
                    <div className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                      <FileThumbnail doc={item} darkMode={darkMode} />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(item.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        {item.fileName && ` · ${item.fileName.split('.').pop()?.toUpperCase()}`}
                      </p>
                    </div>
                    {/* Amount */}
                    <p className={`text-sm font-bold shrink-0 ${item.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {item.type === 'expense' ? '-' : '+'}€{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex flex-col">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedItem(null)} className="absolute inset-0 bg-black/85" />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative flex flex-col h-full">
              {/* Preview */}
              <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
                {selectedItem.imageData && !selectedItem.fileName ? (
                  <img src={selectedItem.imageData} alt={selectedItem.title} className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl" />
                ) : selectedItem.imageData && ext(selectedItem.fileName || '') === 'pdf' ? (
                  <PdfPreview url={pdfUrl} fileName={selectedItem.fileName} loading={pdfLoading} />
                ) : selectedItem.imageData && ['txt', 'csv'].includes(ext(selectedItem.fileName || '')) ? (
                  <TextPreview imageData={selectedItem.imageData} fileName={selectedItem.fileName} />
                ) : (
                  <div className="w-48 h-56 rounded-3xl flex flex-col items-center justify-center gap-3" style={{ backgroundColor: fileColors[ext(selectedItem.fileName || '')]?.bg ?? '#EDE9FE' }}>
                    <FileText size={56} strokeWidth={1.5} style={{ color: fileColors[ext(selectedItem.fileName || '')]?.text ?? '#7C3AED' }} />
                    <span className="text-sm font-black tracking-widest" style={{ color: fileColors[ext(selectedItem.fileName || '')]?.text ?? '#7C3AED' }}>
                      {ext(selectedItem.fileName || '').toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              {/* Info panel */}
              <div className="rounded-t-[32px] p-6 space-y-4" style={{ backgroundColor: 'var(--color-card)' }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className={`text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedItem.title}</p>
                    {selectedItem.client && <p className="text-sm text-slate-500 mt-0.5">{t('common.client')}: <span className="font-semibold">{selectedItem.client}</span></p>}
                    {selectedItem.fileName && <p className="text-xs text-slate-400 mt-0.5">{selectedItem.fileName}</p>}
                  </div>
                  <p className={`text-xl font-bold shrink-0 ${selectedItem.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                    {selectedItem.type === 'expense' ? '-' : '+'}€{selectedItem.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-2xl p-3 grid grid-cols-2 gap-2" style={{ backgroundColor: 'var(--color-card-bg)' }}>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('media_library.detail_date')}</p>
                    <p className={`text-sm font-semibold mt-0.5 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{new Date(selectedItem.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('media_library.detail_type')}</p>
                    <p className={`text-sm font-semibold mt-0.5 ${selectedItem.type === 'expense' ? 'text-indigo-500' : 'text-emerald-500'}`}>{selectedItem.type === 'invoice' ? t('media_library.type_invoice') : t('media_library.type_expense')}</p>
                  </div>
                  {selectedItem.category && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('media_library.detail_category')}</p>
                      <p className={`text-sm font-semibold mt-0.5 capitalize ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedItem.category}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('media_library.detail_status')}</p>
                    <p className={`text-sm font-semibold mt-0.5 ${selectedItem.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>{selectedItem.status === 'paid' ? t('media_library.status_paid') : t('media_library.status_pending')}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedItem(null)} className={`flex-1 py-3 rounded-2xl font-bold ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{t('media_library.btn_close')}</button>
                  <button onClick={() => handleDelete(selectedItem)} className="flex-1 py-3 rounded-2xl font-bold bg-red-500 text-white shadow-lg shadow-red-500/30">{t('media_library.btn_delete')}</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit modal */}
      <AnimatePresence>
        {editItem && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditItem(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="relative w-full max-w-md rounded-t-[32px] shadow-2xl" style={{ backgroundColor: 'var(--color-card)' }}>
              <div className="overflow-y-auto max-h-[90vh] p-8 space-y-5">
                <div className="flex justify-between items-center">
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t('media_library.edit_title')}</h2>
                  <button onClick={() => setEditItem(null)} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'}`}><X size={22} /></button>
                </div>
                <div className="space-y-3">
                  {editItem.type === 'invoice' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('common.client')}</label>
                      <input type="text" value={editItem.client || ''} onChange={e => setEditItem({ ...editItem, client: e.target.value })} className={inputClass()} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('common.description')}</label>
                    <input type="text" value={editItem.title} onChange={e => setEditItem({ ...editItem, title: e.target.value })} className={inputClass()} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('common.amount')}</label>
                      <input type="number" value={editItem.amount} onChange={e => setEditItem({ ...editItem, amount: parseFloat(e.target.value) || 0 })} className={inputClass()} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('common.date')}</label>
                      <input type="date" value={editItem.date} onChange={e => setEditItem({ ...editItem, date: e.target.value })} className={inputClass()} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('common.category')}</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(c => (
                        <button key={c.value} type="button" onClick={() => setEditItem({ ...editItem, category: c.value })} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${editItem.category === c.value ? 'bg-primary text-white' : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
                          {c.emoji} {t(`media_library.cat_${c.value}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {editItem.type === 'invoice' && (
                    <div className={`flex items-center gap-3 p-4 rounded-2xl border ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                      <p className={`text-xs font-bold flex-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>{t('media_library.edit_paid')}</p>
                      <input type="checkbox" checked={editItem.status === 'paid'} onChange={e => setEditItem({ ...editItem, status: e.target.checked ? 'paid' : 'pending' })} className="w-5 h-5 rounded-lg border-emerald-200 text-emerald-500" />
                    </div>
                  )}
                </div>
                <button onClick={() => { onUpdateDocument(editItem); setEditItem(null); }} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all">
                  {t('media_library.save_changes_btn')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
