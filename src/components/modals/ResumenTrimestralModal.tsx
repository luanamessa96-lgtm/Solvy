import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Lock, Check } from 'lucide-react';
import { Document, Profile } from '../../types';
import {
  calcularTrimestre,
  buildResumenPDFBlob,
  getCurrentQuarter,
  QUARTER_LABELS,
  generateLibroEmitidaBlob,
  generateLibroRecibidaBlob,
} from '../../services/modelosES';
import PdfPreviewModal from './PdfPreviewModal';
import { useToast } from '../ui/Toast';
import { getLocalYear } from '../../utils/date';
import { useProStatus } from '../../hooks/useProStatus';

interface ResumenTrimestralModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
  profile: Profile;
  darkMode?: boolean;
  onNavigateToProfile?: () => void;
}

export default function ResumenTrimestralModal({
  isOpen, onClose, documents, profile, darkMode, onNavigateToProfile,
}: ResumenTrimestralModalProps) {
  const { showToast } = useToast();
  const isPro = useProStatus(profile);

  const currentYear = new Date().getFullYear();
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(getCurrentQuarter());
  const [year, setYear] = useState<number>(currentYear);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ blob: Blob; fileName: string } | null>(null);
  const [includeLibroEmitidas, setIncludeLibroEmitidas] = useState(false);
  const [includeLibroRecibidas, setIncludeLibroRecibidas] = useState(false);

  const availableYears = useMemo(() => {
    const years = new Set(documents.map(d => getLocalYear(d.date)));
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [documents, currentYear]);

  const resumen = useMemo(
    () => calcularTrimestre(documents, quarter, year),
    [documents, quarter, year]
  );

  const hasTaxId = !!(profile.nie || profile.piva);

  const handleDownload = async () => {
    if (!isPro) return; // shouldn't happen, button is hidden — safety guard

    if (!hasTaxId) {
      showToast(
        'Añade tu NIF o NIE en el perfil para generar el resumen',
        'error',
        onNavigateToProfile
          ? { label: 'Ir al perfil', onClick: () => { onClose(); onNavigateToProfile(); } }
          : undefined
      );
      return;
    }

    setIsGenerating(true);
    try {
      const resumenResult = await buildResumenPDFBlob(documents, profile, quarter, year);
      const libroE = includeLibroEmitidas ? await generateLibroEmitidaBlob(documents, profile, year) : null;
      const libroR = includeLibroRecibidas ? await generateLibroRecibidaBlob(documents, profile, year) : null;

      // Decide what to show in preview:
      // - only Emitidas → preview Libro Emitidas (solo fatture)
      // - only Recibidas → preview Libro Recibidas (solo spese)
      // - both or neither → preview Resumen (tutto insieme)
      if (libroE && !libroR) {
        setPdfPreview(libroE);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(resumenResult.blob);
        a.download = resumenResult.fileName;
        a.click();
        URL.revokeObjectURL(a.href);
      } else if (libroR && !libroE) {
        setPdfPreview(libroR);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(resumenResult.blob);
        a.download = resumenResult.fileName;
        a.click();
        URL.revokeObjectURL(a.href);
      } else {
        setPdfPreview(resumenResult);
        if (libroE) {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(libroE.blob);
          a.download = libroE.fileName;
          a.click();
          URL.revokeObjectURL(a.href);
        }
        if (libroR) {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(libroR.blob);
          a.download = libroR.fileName;
          a.click();
          URL.revokeObjectURL(a.href);
        }
      }
    } catch {
      showToast('Error al generar el PDF', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const fmtPreview = (n: number) =>
    `€${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const dm = darkMode;

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            style={{ backgroundColor: 'var(--color-card)' }}
          >
            {/* Header */}
            <div className={`flex items-start justify-between p-6 pb-4 ${dm ? 'border-b border-slate-800' : 'border-b border-slate-100'}`}>
              <div>
                <h2 className={`text-xl font-bold ${dm ? 'text-white' : 'text-slate-900'}`}>Resumen Trimestral</h2>
                <p className="text-xs text-slate-400 mt-0.5">Modelos 130 + 303 en PDF</p>
              </div>
              <button onClick={onClose} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${dm ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}>
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto [padding-bottom:max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))]">

              {/* Quarter selector */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trimestre</p>
                <div className="grid grid-cols-4 gap-2">
                  {([1, 2, 3, 4] as const).map(q => (
                    <button
                      key={q}
                      onClick={() => setQuarter(q)}
                      className={`py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                        quarter === q
                          ? 'bg-primary text-white shadow-lg shadow-primary/30'
                          : dm ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      T{q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Year selector */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Año</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {availableYears.map(y => (
                    <button
                      key={y}
                      onClick={() => setYear(y)}
                      className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${
                        year === y
                          ? 'bg-primary text-white shadow-lg shadow-primary/40'
                          : dm ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* Period label */}
              <p className={`text-xs font-semibold ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                {QUARTER_LABELS[quarter]} {year}
              </p>

              {/* Preview cards */}
              <div className={`rounded-2xl border overflow-hidden ${dm ? 'border-slate-800' : 'border-slate-100'}`}>
                {/* Ingresos / Gastos */}
                <div className="grid grid-cols-2">
                  <div className={`p-4 border-r ${dm ? 'border-slate-800' : 'border-slate-100'}`}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 mb-1">Ingresos</p>
                    <p className={`text-base font-bold ${dm ? 'text-white' : 'text-slate-900'}`}>{fmtPreview(resumen.totalIngresos)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {resumen.invoices.length} factura{resumen.invoices.length !== 1 ? 's' : ''}
                      {resumen.rectificativas.length > 0 && ` · ${resumen.rectificativas.length} rect.`}
                    </p>
                  </div>
                  <div className="p-4">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-red-500 mb-1">Gastos</p>
                    <p className={`text-base font-bold ${dm ? 'text-white' : 'text-slate-900'}`}>{fmtPreview(resumen.totalGastos)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{resumen.expenses.length} gasto{resumen.expenses.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className={`border-t ${dm ? 'border-slate-800' : 'border-slate-100'}`} />

                {/* Modelo 130 / 303 */}
                <div className="grid grid-cols-2">
                  <div className={`p-4 border-r ${dm ? 'border-slate-800' : 'border-slate-100'}`}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-primary mb-1">Mod. 130 — IRPF</p>
                    <p className={`text-sm font-bold ${dm ? 'text-white' : 'text-slate-900'}`}>{fmtPreview(resumen.cuotaIRPF)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">cuota estimada</p>
                  </div>
                  <div className="p-4">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-primary mb-1">Mod. 303 — IVA</p>
                    <p className={`text-sm font-bold ${resumen.diferenciaIVA >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {resumen.diferenciaIVA >= 0 ? '' : '↓ '}{fmtPreview(Math.abs(resumen.diferenciaIVA))}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{resumen.diferenciaIVA >= 0 ? 'a ingresar' : 'a devolver'}</p>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Los valores son estimativos. Verifica los datos en la sede electrónica de la AEAT antes de presentar.
              </p>

              {/* Libro Registro toggles — Spain Pro */}
              {isPro && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Incluir también</p>
                  <button
                    onClick={() => setIncludeLibroEmitidas(p => !p)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98] ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${includeLibroEmitidas ? 'bg-blue-600 border-blue-600' : dm ? 'border-slate-600' : 'border-slate-300'}`}>
                      {includeLibroEmitidas && <Check size={12} strokeWidth={3} className="text-white" />}
                    </div>
                    <span className="text-xl shrink-0">📋</span>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${dm ? 'text-white' : 'text-slate-900'}`}>Libro Facturas Emitidas</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 shrink-0">AEAT</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">PDF anual con todos los campos obligatorios AEAT</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setIncludeLibroRecibidas(p => !p)}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98] ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${includeLibroRecibidas ? 'bg-blue-600 border-blue-600' : dm ? 'border-slate-600' : 'border-slate-300'}`}>
                      {includeLibroRecibidas && <Check size={12} strokeWidth={3} className="text-white" />}
                    </div>
                    <span className="text-xl shrink-0">📋</span>
                    <div className="text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${dm ? 'text-white' : 'text-slate-900'}`}>Libro Facturas Recibidas</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 shrink-0">AEAT</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">PDF anual de gastos con campos obligatorios AEAT</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Download button */}
              {isPro ? (
                <button
                  onClick={handleDownload}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white bg-primary shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  <Download size={18} />
                  {isGenerating ? 'Generando…' : 'Descargar PDF'}
                </button>
              ) : (
                <button
                  disabled
                  className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold opacity-50 ${dm ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
                >
                  <Lock size={16} />
                  Función Pro
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    <PdfPreviewModal
      isOpen={!!pdfPreview}
      onClose={() => setPdfPreview(null)}
      blob={pdfPreview?.blob ?? new Blob()}
      fileName={pdfPreview?.fileName ?? ''}
      darkMode={darkMode}
    />
    </>
  );
}
