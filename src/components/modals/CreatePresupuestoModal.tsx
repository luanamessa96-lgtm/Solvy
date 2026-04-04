import { useState, useMemo } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Plus } from 'lucide-react';
import { Document, Profile } from '../../types';
import { todayLocalISO } from '../../utils/date';

interface CreatePresupuestoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: Document) => void;
  profile: Profile;
  documents: Document[];
  darkMode?: boolean;
}

const CreatePresupuestoModal = ({ isOpen, onClose, onSave, profile, documents, darkMode }: CreatePresupuestoModalProps) => {
  const nextNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const count = documents.filter(d => d.type === 'presupuesto' && new Date(d.date).getFullYear() === year).length + 1;
    return `PRS${String(count).padStart(3, '0')}/${year}`;
  }, [documents]);

  const defaultValidez = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };

  const [form, setForm] = useState({
    numero: '',
    date: todayLocalISO(),
    validezDate: defaultValidez(),
    client: '',
    clientAddress: '',
    title: '',
    amount: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) => setForm(f => ({ ...f, [key]: value }));
  const touch = (key: string) => setTouched(t => ({ ...t, [key]: true }));

  const amount = parseFloat(form.amount.replace(',', '.')) || 0;

  const errors = {
    client: touched.client && !form.client.trim() ? 'Campo obligatorio' : '',
    title: touched.title && !form.title.trim() ? 'Campo obligatorio' : '',
    amount: touched.amount && (amount <= 0 || isNaN(amount)) ? 'Introduce un importe válido' : '',
  };

  const reset = () => {
    setForm({ numero: '', date: todayLocalISO(), validezDate: defaultValidez(), client: '', clientAddress: '', title: '', amount: '' });
    setTouched({});
  };

  const handleSubmit = () => {
    setTouched({ client: true, title: true, amount: true });
    if (!form.client.trim() || !form.title.trim() || amount <= 0) return;
    onSave({
      id: Math.random().toString(36).substr(2, 9),
      type: 'presupuesto',
      status: 'pending',
      invoiceNumber: form.numero || nextNumber,
      date: form.date,
      validezDate: form.validezDate,
      client: form.client,
      clientAddress: form.clientAddress,
      title: form.title,
      amount,
    });
    reset();
    onClose();
  };

  const dragControls = useDragControls();

  const ic = (err?: string) => `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
    err
      ? 'border-red-400 bg-red-50 text-red-900 focus:ring-red-200 placeholder:text-red-300'
      : darkMode
        ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:ring-primary/20'
        : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400 focus:ring-primary/20'
  }`;
  const lc = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1';
  const errMsg = (msg: string) => msg ? <p className="text-[10px] text-red-500 font-semibold ml-1 mt-0.5">{msg}</p> : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            drag="y" dragControls={dragControls} dragListener={false}
            dragConstraints={{ top: 0 }} dragElastic={0.1}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose(); }}
            className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl"
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            <div onPointerDown={e => dragControls.start(e)} className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none">
              <div className={`w-10 h-1 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            </div>
            <div className="overflow-y-auto max-h-[92vh] p-8 space-y-6 [padding-bottom:max(2rem,calc(env(safe-area-inset-bottom)+1rem))]">

              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Nuevo Presupuesto</h2>
                  <p className="text-sm text-slate-500">{form.numero || nextNumber}</p>
                </div>
                <button onClick={onClose} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}>
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              {/* Datos del documento */}
              <div className="space-y-3">
                <label className={lc}>Datos del documento</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={lc}>Número</label>
                    <input type="text" value={form.numero || nextNumber} onChange={e => set('numero', e.target.value)} className={ic()} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={lc}>Fecha</label>
                    <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={ic()} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={lc}>Válido hasta</label>
                  <input type="date" value={form.validezDate} onChange={e => set('validezDate', e.target.value)} className={ic()} />
                  <p className="text-[10px] text-slate-400 ml-1">Por defecto 30 días desde hoy</p>
                </div>
              </div>

              {/* Datos del cliente */}
              <div className="space-y-3">
                <label className={lc}>Datos del cliente</label>
                <div className="space-y-1.5">
                  <label className={lc}>Nombre / Razón social</label>
                  <input type="text" value={form.client} onChange={e => set('client', e.target.value)} onBlur={() => touch('client')} placeholder="Ej. Empresa SL" className={ic(errors.client)} />
                  {errMsg(errors.client)}
                </div>
                <div className="space-y-1.5">
                  <label className={lc}>Dirección</label>
                  <input type="text" value={form.clientAddress} onChange={e => set('clientAddress', e.target.value)} placeholder="Calle Mayor 1, 28001 Madrid" className={ic()} />
                </div>
              </div>

              {/* Servicio */}
              <div className="space-y-3">
                <label className={lc}>Servicio</label>
                <div className="space-y-1.5">
                  <label className={lc}>Descripción del servicio</label>
                  <input type="text" value={form.title} onChange={e => set('title', e.target.value)} onBlur={() => touch('title')} placeholder="Ej. Diseño web — Mayo 2026" className={ic(errors.title)} />
                  {errMsg(errors.title)}
                </div>
                <div className="space-y-1.5">
                  <label className={lc}>Importe €</label>
                  <input type="text" inputMode="decimal" value={form.amount} onChange={e => set('amount', e.target.value)} onBlur={() => touch('amount')} placeholder="0.00" className={ic(errors.amount)} />
                  {errMsg(errors.amount)}
                </div>
              </div>

              {/* Nota */}
              <div className={`flex items-start gap-3 p-4 rounded-2xl border ${darkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-100'}`}>
                <span className="text-base leading-none mt-0.5">ℹ️</span>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                  <span className="font-bold">Documento no fiscal</span> — El presupuesto no cuenta para el facturado y no tiene validez fiscal. Puedes convertirlo en factura con un clic.
                </p>
              </div>

              <button onClick={handleSubmit} className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all">
                Guardar Presupuesto
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreatePresupuestoModal;
