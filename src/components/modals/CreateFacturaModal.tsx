import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Plus, FileText, CheckCircle2 } from 'lucide-react';
import { Document, Profile } from '../../types';
import { todayLocalISO } from '../../utils/date';

interface CreateFacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: Document) => void;
  onUpdate?: (doc: Document) => void;
  onUpdateProfile: (p: Profile) => void;
  profile: Profile;
  documents: Document[];
  darkMode?: boolean;
  editDoc?: Document;
}

const IVA_OPTIONS = [0, 4, 10, 21] as const;

const CreateFacturaModal = ({ isOpen, onClose, onSave, onUpdate, onUpdateProfile, profile, documents, darkMode, editDoc }: CreateFacturaModalProps) => {
  const dragControls = useDragControls();
  const currentYear = new Date().getFullYear();
  const isEditMode = !!editDoc;

  const nextInvoiceNumber = useMemo(() => {
    const yearStr = String(currentYear);
    const existingCount = documents.filter(d => d.type === 'invoice' && new Date(d.date).getFullYear() === currentYear).length;
    const counter = profile.invoiceCounters?.[yearStr] ?? existingCount;
    return `${String(counter + 1).padStart(3, '0')}/${currentYear}`;
  }, [documents, profile.invoiceCounters, currentYear]);

  // 7% primeros 3 años de actividad, 15% a partir del 4º año
  const irpfRate = useMemo(() => {
    if (profile.annoInizioAttivita != null && currentYear - profile.annoInizioAttivita < 3) return 7;
    return 15;
  }, [profile.annoInizioAttivita, currentYear]);

  const defaultIva = profile.ivaHabitual ?? 21;

  const [form, setForm] = useState({
    date: todayLocalISO(),
    clientType: 'particular' as 'particular' | 'empresa',
    client: '',
    clientNif: '',
    clientAddress: '',
    title: '',
    amount: '',
    ivaRate: defaultIva as number,
    retencionIrpf: false,
    status: 'pending' as 'paid' | 'pending',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Sync form when modal opens — pre-fill in edit mode, reset in create mode
  useEffect(() => {
    if (!isOpen) return;
    if (editDoc) {
      setForm({
        date: editDoc.date,
        clientType: editDoc.clientPiva ? 'empresa' : 'particular',
        client: editDoc.client ?? '',
        clientNif: editDoc.clientPiva ?? editDoc.clientCf ?? '',
        clientAddress: editDoc.clientAddress ?? '',
        title: editDoc.title,
        amount: String(editDoc.amount),
        ivaRate: editDoc.ivaRate ?? (profile.ivaHabitual ?? 21),
        retencionIrpf: editDoc.ritenuta ?? false,
        status: (editDoc.status === 'paid' || editDoc.status === 'pending') ? editDoc.status : 'pending',
      });
    } else {
      setForm({
        date: todayLocalISO(),
        clientType: 'particular',
        client: '',
        clientNif: '',
        clientAddress: '',
        title: '',
        amount: '',
        ivaRate: profile.ivaHabitual ?? 21,
        retencionIrpf: false,
        status: 'pending',
      });
    }
    setTouched({});
  }, [isOpen, editDoc]);

  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) => setForm(f => ({ ...f, [key]: value }));
  const touch = (key: string) => setTouched(t => ({ ...t, [key]: true }));

  const base = parseFloat(form.amount.replace(',', '.')) || 0;
  const ivaAmount = base * form.ivaRate / 100;
  const irpfAmount = form.retencionIrpf ? base * irpfRate / 100 : 0;
  const total = base + ivaAmount - irpfAmount;

  const errors = {
    client: touched.client && !form.client.trim() ? 'Campo obligatorio' : '',
    clientNif: touched.clientNif && form.clientType === 'empresa' && !form.clientNif.trim() ? 'Campo obligatorio' : '',
    title: touched.title && !form.title.trim() ? 'Campo obligatorio' : '',
    amount: touched.amount && (base <= 0 || isNaN(base)) ? 'Introduce un importe válido' : '',
  };

  const validate = () => {
    setTouched({ client: true, clientNif: true, title: true, amount: true });
    if (!form.client.trim() || !form.title.trim() || base <= 0) return false;
    if (form.clientType === 'empresa' && !form.clientNif.trim()) return false;
    return true;
  };

  const incrementCounter = () => {
    const yearStr = String(currentYear);
    const existingCount = documents.filter(d => d.type === 'invoice' && new Date(d.date).getFullYear() === currentYear).length;
    const current = profile.invoiceCounters?.[yearStr] ?? existingCount;
    onUpdateProfile({ ...profile, invoiceCounters: { ...(profile.invoiceCounters ?? {}), [yearStr]: current + 1 } });
  };

  const buildDocFields = () => ({
    date: form.date,
    client: form.client,
    clientAddress: form.clientAddress,
    clientPiva: form.clientType === 'empresa' ? form.clientNif : undefined,
    clientCf: form.clientType === 'particular' && form.clientNif.trim() ? form.clientNif : undefined,
    title: form.title,
    amount: base,
    ivaRate: form.ivaRate,
    ritenuta: form.retencionIrpf,
    status: form.status,
  });

  const handleSubmit = () => {
    if (!validate()) return;
    if (isEditMode && editDoc && onUpdate) {
      onUpdate({ ...editDoc, ...buildDocFields() });
    } else {
      incrementCounter();
      onSave({
        id: Math.random().toString(36).substr(2, 9),
        type: 'invoice',
        invoiceNumber: nextInvoiceNumber,
        ...buildDocFields(),
      });
    }
    onClose();
  };

  // Spain-only modal
  if (profile.country !== 'Spain') return null;

  const ic = (err?: string) => `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
    err
      ? 'border-red-400 bg-red-50 text-red-900 focus:ring-red-200 placeholder:text-red-300'
      : darkMode
        ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:ring-primary/20'
        : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400 focus:ring-primary/20'
  }`;
  const lc = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1';
  const errMsg = (msg: string) => msg ? <p className="text-[10px] text-red-500 font-semibold ml-1 mt-0.5">{msg}</p> : null;

  const displayNumber = isEditMode ? (editDoc!.invoiceNumber ?? '') : nextInvoiceNumber;

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
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {isEditMode ? 'Editar Factura' : 'Nueva Factura'}
                  </h2>
                  <p className="text-sm text-slate-500">{displayNumber}</p>
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
                    <label className={lc}>Número factura</label>
                    <input
                      type="text"
                      value={displayNumber}
                      readOnly
                      className={`${ic()} opacity-60 cursor-default`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={lc}>Fecha emisión</label>
                    <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={ic()} />
                  </div>
                </div>
              </div>

              {/* Datos del cliente */}
              <div className="space-y-3">
                <label className={lc}>Datos del cliente</label>

                <div className={`p-1 rounded-2xl flex gap-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {(['particular', 'empresa'] as const).map(t => (
                    <button key={t} type="button"
                      onClick={() => set('clientType', t)}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${form.clientType === t ? 'bg-primary text-white shadow-lg shadow-primary/30' : (darkMode ? 'text-slate-400' : 'text-slate-500')}`}>
                      {t === 'particular' ? 'Particular' : 'Empresa'}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className={lc}>{form.clientType === 'empresa' ? 'Razón Social' : 'Nombre'}</label>
                  <input
                    type="text"
                    value={form.client}
                    onChange={e => set('client', e.target.value)}
                    onBlur={() => touch('client')}
                    placeholder={form.clientType === 'empresa' ? 'Ej. Empresa SL' : 'Ej. Juan García'}
                    className={ic(errors.client)}
                  />
                  {errMsg(errors.client)}
                </div>

                <div className="space-y-1.5">
                  <label className={lc}>
                    {form.clientType === 'empresa' ? 'NIF/CIF' : 'NIF/NIE'}{form.clientType === 'particular' ? ' (opcional)' : ''}
                  </label>
                  <input
                    type="text"
                    value={form.clientNif}
                    onChange={e => set('clientNif', e.target.value.toUpperCase())}
                    onBlur={() => touch('clientNif')}
                    placeholder={form.clientType === 'empresa' ? 'B12345678' : 'Opcional'}
                    className={ic(errors.clientNif)}
                  />
                  {errMsg(errors.clientNif)}
                </div>

                <div className="space-y-1.5">
                  <label className={lc}>Dirección</label>
                  <input
                    type="text"
                    value={form.clientAddress}
                    onChange={e => set('clientAddress', e.target.value)}
                    placeholder="Calle Mayor 1, 28001 Madrid"
                    className={ic()}
                  />
                </div>
              </div>

              {/* Servicio */}
              <div className="space-y-3">
                <label className={lc}>Servicio</label>
                <div className="space-y-1.5">
                  <label className={lc}>Descripción del servicio</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    onBlur={() => touch('title')}
                    placeholder="Ej. Diseño web — Mayo 2026"
                    className={ic(errors.title)}
                  />
                  {errMsg(errors.title)}
                </div>
                <div className="space-y-1.5">
                  <label className={lc}>Base imponible €</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={e => set('amount', e.target.value)}
                    onBlur={() => touch('amount')}
                    placeholder="0.00"
                    className={ic(errors.amount)}
                  />
                  {errMsg(errors.amount)}
                </div>
              </div>

              {/* IVA repercutida */}
              <div className="space-y-3">
                <label className={lc}>IVA Repercutida</label>
                <div className={`p-4 rounded-2xl border space-y-3 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex gap-2 flex-wrap">
                    {IVA_OPTIONS.map(rate => (
                      <button key={rate} type="button" onClick={() => set('ivaRate', rate)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${form.ivaRate === rate ? 'bg-primary text-white shadow-md shadow-primary/30' : (darkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 border border-slate-200')}`}>
                        {rate}%
                      </button>
                    ))}
                  </div>
                  {base > 0 && (
                    <p className="text-xs text-slate-400">
                      IVA {form.ivaRate}% = <span className="font-bold text-primary">€{ivaAmount.toFixed(2)}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Retención IRPF */}
              <div className={`flex items-center gap-3 p-4 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Retención IRPF {irpfRate}%
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {irpfRate === 7
                      ? 'Tipo reducido — primeros 3 años de actividad'
                      : 'Tipo general — a partir del 4º año'}
                    {base > 0 && form.retencionIrpf ? ` · −€${irpfAmount.toFixed(2)}` : ''}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.retencionIrpf}
                  onChange={e => set('retencionIrpf', e.target.checked)}
                  className="w-5 h-5 rounded-lg text-primary focus:ring-primary"
                />
              </div>

              {/* Resumen importes */}
              {base > 0 && (
                <div className={`rounded-2xl p-4 space-y-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div className="flex justify-between">
                    <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Base imponible</span>
                    <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>€{base.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-400">IVA {form.ivaRate}%</span>
                    <span className="text-sm font-bold text-slate-500">+€{ivaAmount.toFixed(2)}</span>
                  </div>
                  {form.retencionIrpf && (
                    <div className="flex justify-between">
                      <span className="text-sm text-red-400">Retención IRPF {irpfRate}%</span>
                      <span className="text-sm font-bold text-red-400">−€{irpfAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className={`flex justify-between pt-2 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Total factura</span>
                    <span className="text-sm font-bold text-emerald-500">€{total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Marcar como Pagada */}
              <div className={`flex items-center gap-3 p-4 rounded-2xl border ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                  <CheckCircle2 size={20} />
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-900'}`}>Marcar como Pagada</p>
                  <p className={`text-[10px] ${darkMode ? 'text-emerald-500/60' : 'text-emerald-600'}`}>Actualizará los ingresos en Inicio</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.status === 'paid'}
                  onChange={e => set('status', e.target.checked ? 'paid' : 'pending')}
                  className="w-5 h-5 rounded-lg border-emerald-200 text-emerald-500 focus:ring-emerald-500"
                />
              </div>

              {/* Disclaimer */}
              <div className={`flex items-start gap-3 p-4 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <span className="text-base leading-none mt-0.5">ℹ️</span>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Los cálculos mostrados son estimaciones basadas en los datos introducidos. No constituyen asesoramiento fiscal profesional. Consulta siempre con tu gestor o asesor fiscal.
                </p>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <FileText size={18} />
                {isEditMode ? 'Guardar Cambios' : 'Crear Factura'}
              </button>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateFacturaModal;
