import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Image as ImageIcon } from 'lucide-react';

interface LibraryImage {
  id: string;
  data: string;
  title: string;
  amount: number;
  date: string;
  docType: 'invoice' | 'expense';
  category: string;
  client?: string;
}

interface ImageLibraryViewProps {
  onAddDocument: (doc: any) => void;
  darkMode?: boolean;
  key?: string;
}

const STORAGE_KEY = 'imageLibrary';

function loadImages(): LibraryImage[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveImages(items: LibraryImage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

const categories = [
  { value: 'abbonamento', label: 'Abbonamento', emoji: '📦' },
  { value: 'materiale', label: 'Materiale', emoji: '🛠️' },
  { value: 'software', label: 'Software', emoji: '💻' },
  { value: 'formazione', label: 'Formazione', emoji: '📚' },
  { value: 'altro', label: 'Altro', emoji: '📎' },
];

export default function ImageLibraryView({ onAddDocument, darkMode }: ImageLibraryViewProps) {
  const [images, setImages] = React.useState<LibraryImage[]>(loadImages);
  const [isAdding, setIsAdding] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<LibraryImage | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [docType, setDocType] = React.useState<'invoice' | 'expense'>('expense');
  const [form, setForm] = React.useState({ title: '', client: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'altro' });
  const [amountError, setAmountError] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!preview) return;
    const parsed = parseFloat(form.amount.replace(',', '.'));
    if (!form.amount.trim() || isNaN(parsed)) { setAmountError(true); return; }
    const id = Math.random().toString(36).substr(2, 9);
    const newItem: LibraryImage = {
      id, data: preview, title: form.title || form.category,
      amount: parsed, date: form.date, docType,
      category: form.category, client: docType === 'invoice' ? form.client : undefined,
    };
    const updated = [newItem, ...images];
    setImages(updated);
    try { saveImages(updated); } catch {}
    onAddDocument({
      id, type: docType, status: 'paid',
      title: newItem.title, client: newItem.client, amount: parsed,
      date: form.date, category: form.category,
    });
    setPreview(null);
    setForm({ title: '', client: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'altro' });
    setDocType('expense');
    setAmountError(false);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    const updated = images.filter(i => i.id !== id);
    setImages(updated);
    saveImages(updated);
    setSelectedImage(null);
  };

  const inputClass = (error = false) =>
    `w-full px-4 py-3 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 border ${error ? 'border-red-400 focus:ring-red-400/20' : `focus:ring-primary/20 ${darkMode ? 'border-slate-700' : 'border-slate-100'}`} ${darkMode ? 'bg-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 text-slate-900 placeholder:text-slate-400'}`;

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6 pb-24">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {images.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-4 text-center">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-300'}`}>
            <ImageIcon size={36} />
          </div>
          <div>
            <p className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Nessuna immagine</p>
            <p className="text-sm text-slate-400 mt-1">Aggiungi scontrini e ricevute dalla galleria</p>
          </div>
          <button onClick={() => setIsAdding(true)} className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/30 active:scale-95 transition-all">
            Aggiungi immagine
          </button>
        </div>
      ) : (
        <>
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
            {images.map(img => (
              <motion.button key={img.id} variants={item} onClick={() => setSelectedImage(img)} className="relative rounded-2xl overflow-hidden aspect-square active:scale-[0.97] transition-all">
                <img src={img.data} alt={img.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                  <p className="text-white text-xs font-bold truncate">{img.title}</p>
                  <p className={`text-xs font-bold ${img.docType === 'expense' ? 'text-red-300' : 'text-emerald-300'}`}>
                    {img.docType === 'expense' ? '-' : '+'}€{img.amount.toLocaleString()}
                  </p>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsAdding(false); setPreview(null); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={`relative w-full max-w-md rounded-t-[32px] shadow-2xl ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
              <div className="overflow-y-auto max-h-[90vh] p-8 space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{preview ? 'Dettagli' : 'Nuova immagine'}</h2>
                    <p className="text-sm text-slate-500">{preview ? 'Compila le informazioni' : 'Seleziona dalla galleria'}</p>
                  </div>
                  <button onClick={() => { setIsAdding(false); setPreview(null); }} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'}`}><X size={22} /></button>
                </div>

                {!preview ? (
                  <button onClick={() => fileRef.current?.click()} className={`w-full h-44 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.98] ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${darkMode ? 'bg-primary/10 text-primary' : 'bg-primary/5 text-primary'}`}><ImageIcon size={26} /></div>
                    <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Apri galleria</p>
                    <p className="text-xs text-slate-400">Scontrino, ricevuta o foto</p>
                  </button>
                ) : (
                  <div className="space-y-5">
                    <div className="relative w-full h-44 rounded-2xl overflow-hidden">
                      <img src={preview} alt="preview" className="w-full h-full object-cover" />
                      <button onClick={() => setPreview(null)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"><X size={16} /></button>
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

      {/* View image modal */}
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedImage(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className={`relative w-full max-w-md rounded-t-[32px] overflow-hidden shadow-2xl ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
              <img src={selectedImage.data} alt={selectedImage.title} className="w-full h-56 object-cover" />
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedImage.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(selectedImage.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <p className={`text-xl font-bold ${selectedImage.docType === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                    {selectedImage.docType === 'expense' ? '-' : '+'}€{selectedImage.amount.toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedImage(null)} className={`flex-1 py-3 rounded-2xl font-bold ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Chiudi</button>
                  <button onClick={() => handleDelete(selectedImage.id)} className="flex-1 py-3 rounded-2xl font-bold bg-red-500 text-white shadow-lg shadow-red-500/30">Elimina</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
