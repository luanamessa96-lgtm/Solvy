import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Plus, CheckCircle2, ChevronDown } from 'lucide-react';
import { Document, Profile } from '../../types';
import { getLocalYear, todayLocalISO } from '../../utils/date';

const MOTIVOS = [
  'Error en datos',
  'Error en importe',
  'Devolución',
  'Descuento',
  'Otro',
] as const;

interface CreateFacturaRectificativaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: Document) => void;
  profile: Profile;
  documents: Document[];
  darkMode?: boolean;
}

const CreateFacturaRectificativaModal = ({
  isOpen, onClose, onSave, profile, documents, darkMode,
}: CreateFacturaRectificativaModalProps) => {
  const dragControls = useDragControls();

  const facturas = useMemo(
    () => documents.filter(d => d.type === 'invoice'),
    [documents],
  );

  const nextRectificativaNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const count = documents.filter(
      d => d.type === 'factura_rectificativa' && getLocalYear(d.date) === year,
    ).length + 1;
    return `FR${String(count).padStart(3, '0')}/${year}`;
  }, [documents]);

  const [selectedFacturaId, setSelectedFacturaId] = useState('');
  const [motivo, setMotivo] = useState<typeof MOTIVOS[number]>('Error en datos');
  const [date, setDate] = useState(todayLocalISO());
  const [touched, setTouched] = useState(false);
  const [facturaPickerOpen, setFacturaPickerOpen] = useState(false);
  const [motivoPickerOpen, setMotivoPickerOpen] = useState(false);

  const selectedFactura = useMemo(
    () => facturas.find(f => f.id === selectedFacturaId) ?? null,
    [facturas, selectedFacturaId],
  );

  const getQuarterFromDateStr = (dateStr: string): 1 | 2 | 3 | 4 => {
    const month = parseInt(dateStr.substring(5, 7), 10); // 1-based
    return Math.ceil(month / 3) as 1 | 2 | 3 | 4;
  };

  const facturaQuarter = useMemo(
    () => selectedFactura ? getQuarterFromDateStr(selectedFactura.date) : null,
    [selectedFactura],
  );
  const rectificativaQuarter = useMemo(() => getQuarterFromDateStr(date), [date]);
  const showQuarterWarning = selectedFactura !== null && facturaQuarter !== null && facturaQuarter !== rectificativaQuarter;

  useEffect(() => {
    if (!isOpen) {
      setSelectedFacturaId('');
      setMotivo('Error en datos');
      setDate(todayLocalISO());
      setTouched(false);
      setFacturaPickerOpen(false);
      setMotivoPickerOpen(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    setTouched(true);
    if (!selectedFactura) return;

    const doc: Document = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'factura_rectificativa',
      invoiceNumber: nextRectificativaNumber,
      amount: selectedFactura.amount,
      date,
      status: 'paid',
      client: selectedFactura.client,
      clientAddress: selectedFactura.clientAddress,
      clientPiva: selectedFactura.clientPiva,
      ivaRate: selectedFactura.ivaRate ?? profile.ivaHabitual ?? 21,
      ritenuta: selectedFactura.ritenuta,
      category: selectedFactura.invoiceNumber ?? selectedFactura.id,
      title: `Factura rectificativa — ${motivo}`,
    };
    onSave(doc);
    onClose();
  };

  const ic = `w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`;
  const lc = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div
            drag="y" dragControls={dragControls} dragListener={false}
            dragConstraints={{ top: 0 }} dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => { if (info.offset.y > 80) onClose(); }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl"
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            <div
              onPointerDown={e => dragControls.start(e)}
              className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
            >
              <div className="w-10 h-1 rounded-full bg-slate-300/50" />
            </div>

            <div className="overflow-y-auto max-h-[90dvh] px-8 pb-8 pt-4 space-y-5 [padding-bottom:max(2rem,calc(env(safe-area-inset-bottom)+1rem))]">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Factura Rectificativa
                  </h2>
                  <p className="text-sm text-slate-500">Referencia a factura original</p>
                </div>
                <button
                  onClick={onClose}
                  className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-400'}`}
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              {/* Número */}
              <div className="space-y-1.5">
                <label className={lc}>Número</label>
                <div className={`${ic} opacity-60 cursor-not-allowed`}>{nextRectificativaNumber}</div>
              </div>

              {/* Fecha */}
              <div className="space-y-1.5">
                <label className={lc}>Fecha</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={ic} />
              </div>

              {/* Factura original */}
              <div className="space-y-1.5">
                <label className={lc}>Factura original *</label>
                <button
                  type="button"
                  onClick={() => { setFacturaPickerOpen(o => !o); setMotivoPickerOpen(false); }}
                  className={`w-full px-4 py-3 border rounded-xl text-sm text-left flex items-center justify-between transition-all active:scale-[0.98] ${touched && !selectedFacturaId ? 'border-red-400 ring-1 ring-red-300' : ''} ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
                >
                  <span className={selectedFactura ? '' : 'text-slate-400'}>
                    {selectedFactura
                      ? `${selectedFactura.invoiceNumber ? selectedFactura.invoiceNumber + ' — ' : ''}${selectedFactura.client || selectedFactura.title}`
                      : 'Selecciona una factura…'}
                  </span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${facturaPickerOpen ? 'rotate-180' : ''}`} />
                </button>
                {facturaPickerOpen && (
                  <div className={`rounded-xl border overflow-hidden shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    {facturas.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-slate-400">No hay facturas disponibles</p>
                    ) : (
                      facturas.map(inv => (
                        <button
                          key={inv.id}
                          type="button"
                          onClick={() => { setSelectedFacturaId(inv.id); setFacturaPickerOpen(false); }}
                          className={`w-full px-4 py-3 flex items-center justify-between text-left border-b last:border-b-0 transition-all active:scale-[0.98] ${darkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-50 hover:bg-slate-50'} ${inv.id === selectedFacturaId ? (darkMode ? 'bg-primary/10' : 'bg-primary/5') : ''}`}
                        >
                          <div className="min-w-0">
                            <p className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {inv.invoiceNumber ? `${inv.invoiceNumber} — ` : ''}{inv.client || inv.title || 'Factura'}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(inv.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} · €{inv.amount.toLocaleString('es-ES')}
                            </p>
                          </div>
                          {inv.id === selectedFacturaId && <CheckCircle2 size={16} className="text-primary shrink-0 ml-2" />}
                        </button>
                      ))
                    )}
                  </div>
                )}
                {touched && !selectedFacturaId && <p className="text-xs text-red-500 ml-1">Campo obligatorio</p>}
              </div>

              {/* Motivo rectificación */}
              <div className="space-y-1.5">
                <label className={lc}>Motivo rectificación *</label>
                <button
                  type="button"
                  onClick={() => { setMotivoPickerOpen(o => !o); setFacturaPickerOpen(false); }}
                  className={`w-full px-4 py-3 border rounded-xl text-sm text-left flex items-center justify-between transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
                >
                  <span>{motivo}</span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${motivoPickerOpen ? 'rotate-180' : ''}`} />
                </button>
                {motivoPickerOpen && (
                  <div className={`rounded-xl border overflow-hidden shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    {MOTIVOS.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setMotivo(m); setMotivoPickerOpen(false); }}
                        className={`w-full px-4 py-3 flex items-center justify-between text-left border-b last:border-b-0 transition-all active:scale-[0.98] ${darkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-50 hover:bg-slate-50'} ${m === motivo ? (darkMode ? 'bg-primary/10' : 'bg-primary/5') : ''}`}
                      >
                        <span className={`text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{m}</span>
                        {m === motivo && <CheckCircle2 size={16} className="text-primary shrink-0 ml-2" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview importi */}
              {selectedFactura && (
                <div className="space-y-2">
                  <div className={`px-4 py-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'} space-y-1.5`}>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Base imponible rectificada</span>
                      <span className="font-bold text-red-500">-€{selectedFactura.amount.toLocaleString('es-ES')}</span>
                    </div>
                    {(selectedFactura.ivaRate ?? profile.ivaHabitual ?? 21) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">IVA {selectedFactura.ivaRate ?? profile.ivaHabitual ?? 21}%</span>
                        <span className="font-bold text-red-500">
                          -€{(selectedFactura.amount * ((selectedFactura.ivaRate ?? profile.ivaHabitual ?? 21) / 100)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 ml-1">Importes negativos calculados automáticamente</p>
                </div>
              )}

              {/* Avviso trimestre diverso */}
              {showQuarterWarning && (
                <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                  ℹ️ La factura original pertenece al T{facturaQuarter}. Esta rectificativa se declarará en el T{rectificativaQuarter} (trimestre actual). El importe negativo se incluirá en el Modelo 303 y 130 del T{rectificativaQuarter}, reduciendo tu base imponible e IVA. La AEAT compensará la diferencia en este trimestre. Es el procedimiento estándar — tu gestor lo gestionará sin problema.
                </div>
              )}

              <button
                onClick={handleSave}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
              >
                Crear Factura Rectificativa
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateFacturaRectificativaModal;
