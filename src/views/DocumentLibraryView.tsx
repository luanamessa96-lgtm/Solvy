import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, FileText } from 'lucide-react';
import { Document } from '../types';

interface DocumentLibraryViewProps {
  documents: Document[];
  onAddDocument: (doc: Document) => void;
  onDeleteDocument: (id: string) => void;
  darkMode?: boolean;
}

const categories = [
  { value: 'abbonamento', label: 'Abbonamento', emoji: '📦' },
  { value: 'materiale', label: 'Materiale', emoji: '🛠️' },
  { value: 'software', label: 'Software', emoji: '💻' },
  { value: 'formazione', label: 'Formazione', emoji: '📚' },
  { value: 'altro', label: 'Altro', emoji: '📎' },
];

function fileExtension(name: string) {
  return name.split('.').pop()?.toLowerCase() || 'file';
}

function FileIcon({ ext, darkMode }: { ext: string; darkMode?: boolean }) {
  const configs: Record<string, { bg: string; color: string; label: string }> = {
    pdf:  { bg: 'bg-red-50',    color: 'text-red-500',    label: 'PDF' },
    doc:  { bg: 'bg-blue-50',   color: 'text-blue-600',   label: 'DOC' },
    docx: { bg: 'bg-blue-50',   color: 'text-blue-600',   label: 'DOCX' },
    xls:  { bg: 'bg-emerald-50',color: 'text-emerald-600',label: 'XLS' },
    xlsx: { bg: 'bg-emerald-50',color: 'text-emerald-600',label: 'XLSX' },
    csv:  { bg: 'bg-emerald-50',color: 'text-emerald-600',label: 'CSV' },
    png:  { bg: 'bg-purple-50', color: 'text-purple-600', label: 'PNG' },
    jpg:  { bg: 'bg-purple-50', color: 'text-purple-600', label: 'JPG' },
    jpeg: { bg: 'bg-purple-50', color: 'text-purple-600', label: 'JPG' },
    txt:  { bg: 'bg-slate-100', color: 'text-slate-500',  label: 'TXT' },
    zip:  { bg: 'bg-amber-50',  color: 'text-amber-600',  label: 'ZIP' },
  };
  const cfg = configs[ext] ?? { bg: 'bg-indigo-50', color: 'text-indigo-500', label: ext.toUpperCase().slice(0, 4) };

  return (
    <div className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5 ${darkMode ? 'bg-slate-800' : cfg.bg}`}>
      <FileText size={32} className={cfg.color} strokeWidth={1.5} />
      <span className={`text-[11px] font-black tracking-wider ${cfg.color}`}>{cfg.label}</span>
    </div>
  );
}

export default function DocumentLibraryView({ documents, onAddDocument, onDeleteDocument, darkMode }: DocumentLibraryViewProps) {
  const docs = documents.filter(d => d.fileName);
  const [isAdding, setIsAdding] = React.useState(false);
  const [selectedDoc, setSelectedDoc] = React.useState<Document | null>(null);
  const [fileName, setFileName] = React.useState('');
  const [fileData, setFileData] = React.useState<string | null>(null);
  const [docType, setDocType] = React.useState<'invoice' | 'expense'>('expense');
  const [form, setForm] = React.useState({ title: '', client: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'altro' });
  const [amountError, setAmountError] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setFileData(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!fileData) return;
    const parsed = parseFloat(form.amount.replace(',', '.'));
    if (!form.amount.trim() || isNaN(parsed)) { setAmountError(true); return; }
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
      imageData: fileData,
      fileName,
    });
    setFileData(null);
    setFileName('');
    setForm({ title: '', client: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'altro' });
    setDocType('expense');
    setAmountError(false);
    setIsAdding(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = (id: string) => {
    onDeleteDocument(id);
    setSelectedDoc(null);
  };

  const inputClass = (error = false) =>
    `w-full px-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 border ${error ? 'border-red-400 focus:ring-red-400/20' : `focus:ring-primary/20 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`} ${darkMode ? 'bg-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 text-slate-900 placeholder:text-slate-400'}`;

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, scale: 0.92 }, show: { opacity: 1, scale: 1 } };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6 pb-24">
      <input ref={fileRef} type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,.pdf,.doc,.docx,.xlsx,.csv,.txt" className="hidden" onChange={handleFileChange} />

      {docs.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-4 text-center">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-300'}`}>
            <FileText size={36} />
          </div>
          <div>
            <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Nessun documento</p>
            <p className="text-sm text-slate-400 mt-1">Importa fatture e ricevute in PDF o Word</p>
          </div>
          <button onClick={() => setIsAdding(true)} className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 active:scale-95 transition-all">
            Aggiungi documento
          </button>
        </div>
      ) : (
        <>
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-3 gap-4">
            {docs.map(doc => (
              <motion.button key={doc.id} variants={item} onClick={() => setSelectedDoc(doc)} className="flex flex-col items-center gap-2 active:scale-[0.94] transition-all">
                <FileIcon ext={fileExtension(doc.fileName!)} darkMode={darkMode} />
                <div className="w-full text-center space-y-0.5 px-1">
                  <p className={`text-xs font-bold truncate ${darkMode ? 'text-white' : 'text-slate-800'}`}>{doc.title}</p>
                  <p className={`text-[10px] font-bold ${doc.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                    {doc.type === 'expense' ? '-' : '+'}€{doc.amount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400">{new Date(doc.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>

          <div className="fixed bottom-24 left-0 right-0 px-6 pointer-events-none">
            <div className="max-w-md mx-auto flex justify-end">
              <button onClick={() => setIsAdding(true)} className="w-14 h-14 bg-primary rounded-full shadow-xl shadow-primary/30 flex items-center justify-center text-white active:scale-90 transition-all pointer-events-auto">
                <Plus size={28} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAdding(false); setFileData(null); setFileName(''); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={`relative w-full max-w-md rounded-t-[32px] shadow-2xl ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
              <div className="overflow-y-auto max-h-[90vh] p-8 space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{fileData ? 'Dettagli' : 'Nuovo documento'}</h2>
                    <p className="text-sm text-slate-500">{fileData ? 'Compila le informazioni' : 'Seleziona un file'}</p>
                  </div>
                  <button onClick={() => { setIsAdding(false); setFileData(null); setFileName(''); }} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'}`}><X size={22} /></button>
                </div>

                {!fileData ? (
                  <button onClick={() => fileRef.current?.click()} className={`w-full h-44 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.98] ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary'}`}><FileText size={26} /></div>
                    <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Seleziona file</p>
                    <p className="text-xs text-slate-400">PDF, Word, Excel e altri</p>
                  </button>
                ) : (
                  <div className="space-y-5">
                    <div className={`flex items-center gap-3 p-4 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <div className="w-12 h-12 shrink-0">
                        <FileIcon ext={fileExtension(fileName)} darkMode={darkMode} />
                      </div>
                      <p className={`text-sm font-bold truncate flex-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{fileName}</p>
                      <button onClick={() => { setFileData(null); setFileName(''); }} className="text-slate-400"><X size={18} /></button>
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
                        <input type="text" placeholder="Es. Fattura Adobe" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputClass()} />
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

                    <button onClick={handleSave} className={`w-full py-4 rounded-2xl font-bold text-white shadow-xl active:scale-[0.98] transition-all ${docType === 'invoice' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-indigo-500 shadow-indigo-500/30'}`}>
                      Salva {docType === 'invoice' ? 'Fattura' : 'Spesa'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View doc modal */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedDoc(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={`relative w-full max-w-md rounded-t-[32px] shadow-2xl ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
              <div className="p-6 space-y-4">
                <div className={`p-5 rounded-2xl flex items-center gap-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div className="w-16 h-16 shrink-0">
                    <FileIcon ext={fileExtension(selectedDoc.fileName!)} darkMode={darkMode} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedDoc.title}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{selectedDoc.fileName}</p>
                    <p className={`text-sm font-bold mt-1 ${selectedDoc.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {selectedDoc.type === 'expense' ? '-' : '+'}€{selectedDoc.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(selectedDoc.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setSelectedDoc(null)} className={`py-4 rounded-2xl font-bold ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Chiudi</button>
                  <button onClick={() => handleDelete(selectedDoc.id)} className="py-4 rounded-2xl font-bold bg-red-500 text-white shadow-lg shadow-red-500/30">Elimina</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
