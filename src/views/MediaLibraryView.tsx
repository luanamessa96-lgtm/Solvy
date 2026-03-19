import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, FileText, Image as ImageIcon, Pencil } from 'lucide-react';
import { Document } from '../types';

interface MediaLibraryViewProps {
  documents: Document[];
  onAddDocument: (doc: Document) => void;
  onDeleteDocument: (id: string) => void;
  onUpdateDocument: (doc: Document) => void;
  darkMode?: boolean;
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
  return new Date(dateStr).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
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

function FileThumbnail({ doc, darkMode }: { doc: Document; darkMode?: boolean }) {
  if (doc.imageData && !doc.fileName) {
    return (
      <img
        src={doc.imageData}
        alt={doc.title}
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

export default function MediaLibraryView({ documents, onAddDocument, onDeleteDocument, onUpdateDocument, darkMode }: MediaLibraryViewProps) {
  const items = documents.filter(d => d.imageData || d.fileName);
  const groups = groupByMonth(items);
  const monthKeys = Object.keys(groups);

  const [isAdding, setIsAdding] = React.useState(false);
  const [addType, setAddType] = React.useState<'image' | 'file'>('image');
  const [selectedItem, setSelectedItem] = React.useState<Document | null>(null);
  const [editItem, setEditItem] = React.useState<Document | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState('');
  const [docType, setDocType] = React.useState<'invoice' | 'expense'>('expense');
  const [form, setForm] = React.useState({ title: '', client: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'altro' });
  const [amountError, setAmountError] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState('');
  const imageRef = React.useRef<HTMLInputElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!preview) return;
    const parsed = parseFloat(form.amount.replace(',', '.'));
    if (!form.amount.trim() || isNaN(parsed)) { setAmountError(true); return; }
    setUploading(true);
    setUploadError('');
    try {
      const id = Math.random().toString(36).substr(2, 9);
      onAddDocument({
        id,
        type: docType,
        status: 'paid',
        title: form.title || form.category,
        client: docType === 'invoice' ? form.client : undefined,
        amount: parsed,
        date: form.date,
        category: form.category,
        imageData: preview,
        fileName: addType === 'file' ? fileName : undefined,
      });
      reset();
    } catch (err: any) {
      setUploading(false);
      setUploadError(err?.message || 'Errore durante il salvataggio.');
    }
  };

  const reset = () => {
    setPreview(null);
    setFileName('');
    setForm({ title: '', client: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'altro' });
    setDocType('expense');
    setAmountError(false);
    setIsAdding(false);
    setUploading(false);
    if (imageRef.current) imageRef.current.value = '';
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = (doc: Document) => {
    onDeleteDocument(doc.id);
    setSelectedItem(null);
  };

  const inputClass = (error = false) =>
    `w-full px-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 border ${error ? 'border-red-400 focus:ring-red-400/20' : `focus:ring-primary/20 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`} ${darkMode ? 'bg-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 text-slate-900 placeholder:text-slate-400'}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={fileRef} type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,.pdf,.doc,.docx,.xlsx,.csv,.txt" className="hidden" onChange={handleFileChange} />

      {items.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-4 text-center px-6">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-300'}`}>
            <ImageIcon size={36} />
          </div>
          <div>
            <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Nessun file</p>
            <p className="text-sm text-slate-400 mt-1">Aggiungi foto, scontrini e documenti</p>
          </div>
          <button onClick={() => setIsAdding(true)} className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 active:scale-95 transition-all">
            Aggiungi
          </button>
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          {monthKeys.map(month => (
            <div key={month}>
              <h2 className={`text-xl font-bold capitalize px-5 pb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{month}</h2>
              <div className={`mx-4 rounded-2xl overflow-hidden border ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                {groups[month].map((item, i) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSelectedItem(item)}
                    className={`w-full flex items-center gap-3 px-4 py-3 active:opacity-60 transition-opacity text-left ${i < groups[month].length - 1 ? (darkMode ? 'border-b border-slate-800' : 'border-b border-slate-100') : ''}`}
                  >
                    {/* Thumbnail */}
                    <div className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 border ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                      <FileThumbnail doc={item} darkMode={darkMode} />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(item.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {item.fileName && ` · ${item.fileName.split('.').pop()?.toUpperCase()}`}
                      </p>
                    </div>
                    {/* Amount */}
                    <p className={`text-sm font-bold shrink-0 ${item.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {item.type === 'expense' ? '-' : '+'}€{item.amount.toLocaleString()}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-24 left-0 right-0 px-6 pointer-events-none">
        <div className="max-w-md mx-auto flex justify-end">
          <button onClick={() => setIsAdding(true)} className="w-14 h-14 bg-primary rounded-full shadow-xl shadow-primary/30 flex items-center justify-center text-white active:scale-90 transition-all pointer-events-auto">
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Add modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={reset} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={`relative w-full max-w-md rounded-t-[32px] shadow-2xl ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
              <div className="overflow-y-auto max-h-[92vh] p-8 space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{preview ? 'Dettagli' : 'Aggiungi file'}</h2>
                    <p className="text-sm text-slate-500">{preview ? 'Compila le informazioni' : 'Scegli il tipo di file'}</p>
                  </div>
                  <button onClick={reset} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'}`}><X size={22} /></button>
                </div>

                {!preview ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { setAddType('image'); imageRef.current?.click(); }} className={`h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.97] ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><ImageIcon size={22} /></div>
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Foto</p>
                    </button>
                    <button onClick={() => { setAddType('file'); fileRef.current?.click(); }} className={`h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.97] ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary'}`}><FileText size={22} /></div>
                      <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Documento</p>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="relative w-full h-40 rounded-2xl overflow-hidden">
                      {addType === 'image' ? (
                        <img src={preview} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex flex-col items-center justify-center gap-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                          <FileText size={36} className="text-primary" strokeWidth={1.5} />
                          <p className={`text-sm font-bold truncate px-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{fileName}</p>
                        </div>
                      )}
                      <button onClick={() => { setPreview(null); setFileName(''); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"><X size={16} /></button>
                    </div>

                    <div className={`p-1 rounded-2xl flex ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <button onClick={() => setDocType('invoice')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${docType === 'invoice' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>Fattura</button>
                      <button onClick={() => setDocType('expense')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${docType === 'expense' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>Spesa</button>
                    </div>

                    <div className="space-y-3">
                      {docType === 'invoice' && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</label>
                          <input type="text" placeholder="Es. Mario Rossi" value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} className={inputClass()} />
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descrizione</label>
                        <input type="text" placeholder="Es. Scontrino pranzo" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputClass()} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className={`text-xs font-bold uppercase tracking-wider ${amountError ? 'text-red-500' : 'text-slate-400'}`}>Importo €</label>
                          <input type="text" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={e => { setAmountError(false); setForm(p => ({ ...p, amount: e.target.value })); }} className={inputClass(amountError)} />
                          {amountError && <p className="text-xs font-bold text-red-500">⚠️ Obbligatorio</p>}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data</label>
                          <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inputClass()} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</label>
                        <div className="flex flex-wrap gap-2">
                          {categories.map(c => (
                            <button key={c.value} type="button" onClick={() => setForm(p => ({ ...p, category: c.value }))} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${form.category === c.value ? 'bg-primary text-white shadow-lg shadow-primary/30' : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
                              {c.emoji} {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {uploadError && (
                      <p className="text-xs font-bold text-red-500 text-center px-2">⚠️ {uploadError}</p>
                    )}
                    <button onClick={handleSave} disabled={uploading} className={`w-full py-4 rounded-2xl font-bold text-white shadow-xl active:scale-[0.98] transition-all disabled:opacity-60 ${docType === 'invoice' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-indigo-500 shadow-indigo-500/30'}`}>
                      {uploading ? 'Caricamento...' : `Salva ${docType === 'invoice' ? 'Fattura' : 'Spesa'}`}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex flex-col">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedItem(null)} className="absolute inset-0 bg-black/85" />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative flex flex-col h-full">
              {/* Preview */}
              <div className="flex-1 flex items-center justify-center p-6">
                {selectedItem.imageData && !selectedItem.fileName ? (
                  <img src={selectedItem.imageData} alt={selectedItem.title} className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl" />
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
              <div className={`rounded-t-[32px] p-6 space-y-4 ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className={`text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedItem.title}</p>
                    {selectedItem.client && <p className="text-sm text-slate-500 mt-0.5">Cliente: <span className="font-semibold">{selectedItem.client}</span></p>}
                    {selectedItem.fileName && <p className="text-xs text-slate-400 mt-0.5">{selectedItem.fileName}</p>}
                  </div>
                  <p className={`text-xl font-bold shrink-0 ${selectedItem.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                    {selectedItem.type === 'expense' ? '-' : '+'}€{selectedItem.amount.toLocaleString()}
                  </p>
                </div>
                <div className={`rounded-2xl p-3 grid grid-cols-2 gap-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data</p>
                    <p className={`text-sm font-semibold mt-0.5 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{new Date(selectedItem.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</p>
                    <p className={`text-sm font-semibold mt-0.5 ${selectedItem.type === 'expense' ? 'text-indigo-500' : 'text-emerald-500'}`}>{selectedItem.type === 'invoice' ? 'Fattura' : 'Spesa'}</p>
                  </div>
                  {selectedItem.category && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categoria</p>
                      <p className={`text-sm font-semibold mt-0.5 capitalize ${darkMode ? 'text-white' : 'text-slate-800'}`}>{selectedItem.category}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stato</p>
                    <p className={`text-sm font-semibold mt-0.5 ${selectedItem.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>{selectedItem.status === 'paid' ? 'Saldato' : 'In attesa'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedItem(null)} className={`flex-1 py-3 rounded-2xl font-bold ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Chiudi</button>
                  <button onClick={() => { setEditItem({ ...selectedItem }); setSelectedItem(null); }} className="flex-1 py-3 rounded-2xl font-bold bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center gap-2">
                    <Pencil size={16} /> Modifica
                  </button>
                  <button onClick={() => handleDelete(selectedItem)} className="py-3 px-4 rounded-2xl font-bold bg-red-500 text-white shadow-lg shadow-red-500/30">Elimina</button>
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
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={`relative w-full max-w-md rounded-t-[32px] shadow-2xl ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
              <div className="overflow-y-auto max-h-[90vh] p-8 space-y-5">
                <div className="flex justify-between items-center">
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Modifica</h2>
                  <button onClick={() => setEditItem(null)} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'}`}><X size={22} /></button>
                </div>
                <div className="space-y-3">
                  {editItem.type === 'invoice' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</label>
                      <input type="text" value={editItem.client || ''} onChange={e => setEditItem({ ...editItem, client: e.target.value })} className={inputClass()} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descrizione</label>
                    <input type="text" value={editItem.title} onChange={e => setEditItem({ ...editItem, title: e.target.value })} className={inputClass()} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Importo €</label>
                      <input type="number" value={editItem.amount} onChange={e => setEditItem({ ...editItem, amount: parseFloat(e.target.value) || 0 })} className={inputClass()} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data</label>
                      <input type="date" value={editItem.date} onChange={e => setEditItem({ ...editItem, date: e.target.value })} className={inputClass()} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(c => (
                        <button key={c.value} type="button" onClick={() => setEditItem({ ...editItem, category: c.value })} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${editItem.category === c.value ? 'bg-primary text-white' : (darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
                          {c.emoji} {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {editItem.type === 'invoice' && (
                    <div className={`flex items-center gap-3 p-4 rounded-2xl border ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                      <p className={`text-xs font-bold flex-1 ${darkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>Saldato</p>
                      <input type="checkbox" checked={editItem.status === 'paid'} onChange={e => setEditItem({ ...editItem, status: e.target.checked ? 'paid' : 'pending' })} className="w-5 h-5 rounded-lg border-emerald-200 text-emerald-500" />
                    </div>
                  )}
                </div>
                <button onClick={() => { onUpdateDocument(editItem); setEditItem(null); }} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all">
                  Salva Modifiche
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
