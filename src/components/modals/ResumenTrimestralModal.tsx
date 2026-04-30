import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Lock, Check, Share2, Eye } from 'lucide-react';
import { Document, Profile, Accountant } from '../../types';
import {
  calcularTrimestre,
  buildResumenPDFBlob,
  getCurrentQuarter,
  QUARTER_LABELS,
  generateLibroEmitidaBlob,
  generateLibroRecibidaBlob,
  generateFacturasTrimestreBlob,
  generateGastosTrimestreBlob,
  generateResumenAnualBlob,
  generateResumenAnualIVABlob,
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
  accountant?: Accountant;
  darkMode?: boolean;
  onNavigateToProfile?: () => void;
}

export default function ResumenTrimestralModal({
  isOpen, onClose, documents, profile, accountant, darkMode, onNavigateToProfile,
}: ResumenTrimestralModalProps) {
  const { showToast } = useToast();
  const isPro = useProStatus(profile);

  const currentYear = new Date().getFullYear();
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4>(getCurrentQuarter());
  const [year, setYear] = useState<number>(currentYear);
  const [isGenerating, setIsGenerating] = useState(false);

  const [isSharing, setIsSharing] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ blob: Blob; fileName: string } | null>(null);
  const [includeLibroEmitidas, setIncludeLibroEmitidas] = useState(false);
  const [includeLibroRecibidas, setIncludeLibroRecibidas] = useState(false);
  const [includeFacturas, setIncludeFacturas] = useState(false);
  const [includeGastos, setIncludeGastos] = useState(false);
  const [includeResumenAnual, setIncludeResumenAnual] = useState(false);
  const [includeResumenAnualIVA, setIncludeResumenAnualIVA] = useState(false);
  const [includeResumenPDF, setIncludeResumenPDF] = useState(true);
  const [readyBlob, setReadyBlob] = useState<{
    files: { blob: Blob; fileName: string; type?: string }[];
  } | null>(null);

  // Reset toggles and readyBlob every time the modal closes
  useEffect(() => {
    if (!isOpen) {
      setIncludeLibroEmitidas(false);
      setIncludeLibroRecibidas(false);
      setIncludeFacturas(false);
      setIncludeGastos(false);
      setIncludeResumenAnual(false);
      setIncludeResumenAnualIVA(false);
      setIncludeResumenPDF(true);
      setReadyBlob(null);
    }
  }, [isOpen]);

  // Reset readyBlob whenever the user changes quarter, year or document selection
  useEffect(() => {
    setReadyBlob(null);
  }, [quarter, year, includeResumenPDF, includeLibroEmitidas, includeLibroRecibidas, includeFacturas, includeGastos, includeResumenAnual, includeResumenAnualIVA]);

  const availableYears = useMemo(() => {
    const years = new Set(documents.map(d => getLocalYear(d.date)));
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [documents, currentYear]);

  const esRetencionRate = useMemo(() => {
    if (!profile.annoInizioAttivita) return 0.15;
    const yearsActive = currentYear - profile.annoInizioAttivita;
    return yearsActive < 3 ? 0.07 : 0.15;
  }, [profile.annoInizioAttivita, currentYear]);

  const resumen = useMemo(
    () => calcularTrimestre(documents, quarter, year, esRetencionRate, profile.annoInizioAttivita),
    [documents, quarter, year, esRetencionRate, profile.annoInizioAttivita]
  );

  const hasTaxId = !!(profile.nie || profile.piva);

  const downloadBlob = (file: { blob: Blob; fileName: string }) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file.blob);
    a.download = file.fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Converte le foto allegate ai gastos in file scaricabili/condivisibili
  const buildImageFiles = async (expenses: typeof resumen.expenses): Promise<{ blob: Blob; fileName: string }[]> => {
    const sorted = [...expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const withImages = sorted.filter(d => d.imageData);
    const results: { blob: Blob; fileName: string }[] = [];
    for (let i = 0; i < withImages.length; i++) {
      const doc = withImages[i];
      try {
        let blob: Blob;
        if (doc.imageData!.startsWith('http')) {
          const res = await fetch(doc.imageData!);
          blob = await res.blob();
        } else {
          const mimeMatch = doc.imageData!.match(/^data:(image\/\w+);base64,/);
          const mime = mimeMatch?.[1] ?? 'image/jpeg';
          const base64 = doc.imageData!.split(',')[1];
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
          blob = new Blob([bytes], { type: mime });
        }
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        const ref = `FREC${String(i + 1).padStart(3, '0')}_${year}`;
        results.push({ blob, fileName: `${ref}_justificante.${ext}` });
      } catch { /* skip immagini non raggiungibili */ }
    }
    return results;
  };

  const generateAll = async () => {
    const resumenResult = includeResumenPDF ? await buildResumenPDFBlob(documents, profile, quarter, year) : null;
    const libroE = includeLibroEmitidas ? await generateLibroEmitidaBlob(documents, profile, year) : null;
    const libroR = includeLibroRecibidas ? await generateLibroRecibidaBlob(documents, profile, year) : null;
    const facturasResult = includeFacturas
      ? await generateFacturasTrimestreBlob([...resumen.invoices, ...resumen.rectificativas], profile, quarter, year)
      : null;
    const gastosResult = includeGastos
      ? await generateGastosTrimestreBlob(resumen.expenses, profile, quarter, year)
      : null;
    const anualResult = includeResumenAnual
      ? await generateResumenAnualBlob(documents, profile, year)
      : null;
    const anualIVAResult = includeResumenAnualIVA
      ? await generateResumenAnualIVABlob(documents, profile, year)
      : null;
    return { resumenResult, libroE, libroR, facturasResult, gastosResult, anualResult, anualIVAResult };
  };

  const handleDownload = async () => {
    if (!isPro) return;
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
      const { resumenResult, libroE, libroR, facturasResult, gastosResult, anualResult, anualIVAResult } = await generateAll();

      const files: { blob: Blob; fileName: string; type?: string }[] = [];
      if (resumenResult) files.push(resumenResult);
      if (libroE) files.push(libroE);
      if (libroR) files.push(libroR);
      if (facturasResult) files.push(facturasResult);
      if (gastosResult) {
        files.push(gastosResult);
        const imgFiles = await buildImageFiles(resumen.expenses);
        imgFiles.forEach(f => files.push({ ...f, type: f.blob.type }));
      }
      if (anualResult) files.push(anualResult);
      if (anualIVAResult) files.push(anualIVAResult);
      setReadyBlob({ files });
    } catch {
      showToast('Error al generar el PDF', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareJustificantes = async () => {
    setIsSharing(true);
    try {
      const imgFiles = await buildImageFiles(resumen.expenses);
      if (imgFiles.length === 0) return;
      const files = imgFiles.map(f => new File([f.blob], f.fileName, { type: f.blob.type }));
      if (navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({ files, title: `Justificantes T${quarter} ${year}` });
      } else {
        imgFiles.forEach(f => downloadBlob(f));
      }
    } catch {
      showToast('Error al compartir los justificantes', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const justificanteCount = resumen.expenses.filter(e => e.imageData).length;

  const fmtPreview = (n: number) =>
    `${n < 0 ? '-' : ''}€${Math.abs(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const dm = darkMode;
  const isWorking = isGenerating || isSharing;
  const gastosDificilImporte = Math.max(0, resumen.ingresosCumulativos - resumen.gastosCumulativos - resumen.baseImponible130);

  const Toggle = ({
    checked, onToggle, emoji, label, badge, subtitle,
  }: {
    checked: boolean;
    onToggle: () => void;
    emoji: string;
    label: string;
    badge?: string;
    subtitle: string;
  }) => (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98] ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}
    >
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-blue-600 border-blue-600' : dm ? 'border-slate-600' : 'border-slate-300'}`}>
        {checked && <Check size={12} strokeWidth={3} className="text-white" />}
      </div>
      <span className="text-xl shrink-0">{emoji}</span>
      <div className="text-left flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-bold ${dm ? 'text-white' : 'text-slate-900'}`}>{label}</p>
          {badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 shrink-0">{badge}</span>}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
      </div>
    </button>
  );

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
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

            <div className="flex-1 min-h-0 p-6 space-y-5 overflow-y-auto [padding-bottom:max(3rem,calc(env(safe-area-inset-bottom)+2rem))]">

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

                <div className="grid grid-cols-2">
                  <div className={`p-4 border-r ${dm ? 'border-slate-800' : 'border-slate-100'}`}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-primary mb-1">Mod. 130 — IRPF</p>
                    <p className={`text-sm font-bold ${dm ? 'text-white' : 'text-slate-900'}`}>{fmtPreview(resumen.cuotaIRPF)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">cuota a ingresar</p>
                  </div>
                  <div className="p-4">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-primary mb-1">Mod. 303 — {profile.territory === 'canarias' ? 'IGIC' : 'IVA'}</p>
                    <p className={`text-sm font-bold ${resumen.diferenciaIVA >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {resumen.diferenciaIVA >= 0 ? '' : '↓ '}{fmtPreview(Math.abs(resumen.diferenciaIVA))}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{resumen.diferenciaIVA >= 0 ? 'a ingresar' : 'a devolver'}</p>
                  </div>
                </div>
              </div>

              {/* Esenzione minimo €1.000 Modelo 130 */}
              {resumen.exentoMinimo && (
                <div className={`flex items-start gap-3 p-4 rounded-2xl border ${dm ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                  <span className="text-base leading-none mt-0.5">ℹ️</span>
                  <p className={`text-xs leading-relaxed ${dm ? 'text-blue-300' : 'text-blue-800'}`}>
                    <span className="font-bold">Rendimiento anual estimado inferior a €1.000</span> — exento de pago fraccionado (Mod. 130).
                  </p>
                </div>
              )}

              {/* Reducción inicio de actividad — art. 32.3 LIRPF */}
              {profile.country === 'Spain' && resumen.reduccionInicioRate > 0 && (
                <div className={`flex items-start gap-3 p-4 rounded-2xl border ${dm ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                  <span className="text-base leading-none mt-0.5">ℹ️</span>
                  <p className={`text-xs leading-relaxed ${dm ? 'text-blue-300' : 'text-blue-800'}`}>
                    <span className="font-bold">Reducción inicio de actividad ({(resumen.reduccionInicioRate * 100).toFixed(0)}%) aplicada</span> — art. 32.3 LIRPF. El rendimiento neto se reduce antes del cálculo del Mod. 130.
                  </p>
                </div>
              )}

              {/* Gastos de difícil justificación — art. 30 RIRPF */}
              {profile.country === 'Spain' && gastosDificilImporte > 0 && (
                <div className={`flex items-start gap-3 p-4 rounded-2xl border ${dm ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                  <span className="text-base leading-none mt-0.5">ℹ️</span>
                  <p className={`text-xs leading-relaxed ${dm ? 'text-blue-300' : 'text-blue-800'}`}>
                    <span className="font-bold">Gastos de difícil justificación aplicados: {fmtPreview(gastosDificilImporte)}</span> — 5% del rendimiento neto, máx. €2.000 (art. 30 RIRPF). Deducción automática incluida en el Mod. 130.
                  </p>
                </div>
              )}

              {/* Modelo 349 — alert operaciones intracomunitarias */}
              {resumen.invoices.some(d => d.intracomunitaria) && (
                <div className={`flex items-start gap-3 p-4 rounded-2xl border ${dm ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                  <span className="text-base leading-none mt-0.5 shrink-0">🌍</span>
                  <div>
                    <p className={`text-xs font-bold ${dm ? 'text-amber-300' : 'text-amber-800'}`}>Modelo 349 — Operaciones intracomunitarias</p>
                    <p className={`text-[10px] leading-relaxed mt-0.5 ${dm ? 'text-amber-400' : 'text-amber-700'}`}>
                      Este trimestre tiene {resumen.invoices.filter(d => d.intracomunitaria).length} factura{resumen.invoices.filter(d => d.intracomunitaria).length !== 1 ? 's' : ''} intracomunitaria{resumen.invoices.filter(d => d.intracomunitaria).length !== 1 ? 's' : ''}. Recuerda presentar el <span className="font-bold">Modelo 349</span> (Declaración recapitulativa de operaciones intracomunitarias) antes de la misma fecha de vencimiento. Consulta a tu gestor.
                    </p>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Los valores son estimativos. Verifica los datos en la sede electrónica de la AEAT antes de presentar.
              </p>

              {/* Toggles — Spain Pro */}
              {isPro && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Incluir en el paquete</p>
                  <Toggle
                    checked={includeResumenPDF}
                    onToggle={() => setIncludeResumenPDF(p => !p)}
                    emoji="📑"
                    label="Resumen Trimestral"
                    badge="130+303"
                    subtitle={`Mod. 130 + Mod. 303 — T${quarter} ${year}`}
                  />
                  <Toggle
                    checked={includeLibroEmitidas}
                    onToggle={() => setIncludeLibroEmitidas(p => !p)}
                    emoji="📋"
                    label="Libro Facturas Emitidas"
                    badge="AEAT"
                    subtitle="PDF anual con todos los campos obligatorios AEAT"
                  />
                  <Toggle
                    checked={includeLibroRecibidas}
                    onToggle={() => setIncludeLibroRecibidas(p => !p)}
                    emoji="📋"
                    label="Libro Facturas Recibidas"
                    badge="AEAT"
                    subtitle="PDF anual de gastos con campos obligatorios AEAT"
                  />
                  <Toggle
                    checked={includeFacturas}
                    onToggle={() => setIncludeFacturas(p => !p)}
                    emoji="📄"
                    label="Facturas del trimestre"
                    subtitle={`Solo facturas emitidas — T${quarter} ${year}`}
                  />
                  <Toggle
                    checked={includeGastos}
                    onToggle={() => setIncludeGastos(p => !p)}
                    emoji="💳"
                    label="Gastos del trimestre"
                    subtitle={`Solo gastos — T${quarter} ${year}`}
                  />
                  <Toggle
                    checked={includeResumenAnual}
                    onToggle={() => setIncludeResumenAnual(p => !p)}
                    emoji="📊"
                    label="Resumen Anual"
                    badge="PRO"
                    subtitle={`Ingresos, gastos por categoría, ${profile.territory === 'canarias' ? 'IGIC' : 'IVA'} y estimación Mod. 100 · ${year}`}
                  />
                  <Toggle
                    checked={includeResumenAnualIVA}
                    onToggle={() => setIncludeResumenAnualIVA(p => !p)}
                    emoji="📊"
                    label={`Resumen Anual ${profile.territory === 'canarias' ? 'IGIC' : 'IVA'}`}
                    badge="PRO"
                    subtitle={`${profile.territory === 'canarias' ? 'IGIC' : 'IVA'} por aliquota, diferencia trimestral, Mod. 390 · ${year}`}
                  />
                </div>
              )}

              {/* Download / ready card */}
              {isPro ? (
                <div className="space-y-3">
                  {readyBlob ? (
                    <>
                      <button
                        onClick={() => { const first = readyBlob.files.find(f => f.fileName.endsWith('.pdf')); if (first) setPdfPreview(first); }}
                        className={`w-full rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.98] ${dm ? 'bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'}`}
                      >
                        <div className="min-w-0 flex-1 text-left space-y-1.5">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Listo para enviar</p>
                          {includeResumenPDF && <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500 shrink-0" /><p className="text-[11px] text-emerald-600 font-medium">Resumen Trimestral T{quarter} {year}</p></div>}
                          {includeLibroEmitidas && <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500 shrink-0" /><p className="text-[11px] text-emerald-600 font-medium">+ Libro Facturas Emitidas {year}</p></div>}
                          {includeLibroRecibidas && <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500 shrink-0" /><p className="text-[11px] text-emerald-600 font-medium">+ Libro Facturas Recibidas {year}</p></div>}
                          {includeFacturas && <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500 shrink-0" /><p className="text-[11px] text-emerald-600 font-medium">+ Facturas T{quarter} {year}</p></div>}
                          {includeGastos && <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500 shrink-0" /><p className="text-[11px] text-emerald-600 font-medium">+ Gastos T{quarter} {year}</p></div>}
                          {includeResumenAnual && <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500 shrink-0" /><p className="text-[11px] text-emerald-600 font-medium">+ Resumen Anual {year}</p></div>}
                          {includeResumenAnualIVA && <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500 shrink-0" /><p className="text-[11px] text-emerald-600 font-medium">+ Resumen Anual {profile.territory === 'canarias' ? 'IGIC' : 'IVA'} {year}</p></div>}
                        </div>
                        <div className="flex items-center gap-1.5 text-primary shrink-0">
                          <Eye size={16} />
                          <span className="text-xs font-bold">Vista previa</span>
                        </div>
                      </button>
                      <button
                        onClick={async () => {
                          const pdfBlobs = readyBlob.files.filter(f => !f.type || f.type === 'application/pdf');
                          const imgFiles = readyBlob.files.filter(f => f.type?.startsWith('image/'));
                          const { PDFDocument } = await import('pdf-lib');
                          const merged = await PDFDocument.create();
                          for (const f of pdfBlobs) {
                            const arrayBuffer = await f.blob.arrayBuffer();
                            const doc = await PDFDocument.load(arrayBuffer);
                            const pages = await merged.copyPages(doc, doc.getPageIndices());
                            pages.forEach(p => merged.addPage(p));
                          }
                          const mergedBytes = await merged.save();
                          const mergedBlob = new Blob([mergedBytes], { type: 'application/pdf' });
                          const nif = (profile.nie || profile.piva || 'ES').replace(/\s/g, '');
                          const zipFileName = `ES_${nif}_T${quarter}_${year}.zip`;
                          const { default: JSZip } = await import('jszip');
                          const zip = new JSZip();
                          zip.file(`ES_${nif}_T${quarter}_${year}.pdf`, mergedBlob);
                          imgFiles.forEach(f => zip.file(f.fileName, f.blob));
                          const zipBlob = await zip.generateAsync({ type: 'blob' });
                          const zipFile = new File([zipBlob], zipFileName, { type: 'application/zip' });
                          const downloadAll = () => downloadBlob({ blob: zipBlob, fileName: zipFileName });
                          try {
                            if (navigator.share && navigator.canShare?.({ files: [zipFile] })) {
                              await navigator.share({ files: [zipFile], title: zipFileName });
                            } else {
                              downloadAll();
                            }
                          } catch (err) {
                            if (err instanceof Error && err.name === 'AbortError') return;
                            downloadAll();
                          }
                        }}
                        className="w-full py-4 rounded-2xl font-bold text-white bg-primary shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                      >
                        <Share2 size={18} />
                        Compartir / Adjuntar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleDownload}
                      disabled={isWorking || (!includeResumenPDF && !includeLibroEmitidas && !includeLibroRecibidas && !includeFacturas && !includeGastos && !includeResumenAnual && !includeResumenAnualIVA)}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white bg-primary shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      <Download size={18} />
                      {isGenerating ? 'Generando…' : 'Descargar PDF'}
                    </button>
                  )}

                  {justificanteCount > 0 && (
                    <button
                      onClick={handleShareJustificantes}
                      disabled={isWorking}
                      className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-60 ${dm ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'}`}
                    >
                      <Share2 size={18} />
                      {isSharing ? 'Preparando…' : `Compartir justificantes · ${justificanteCount} foto${justificanteCount !== 1 ? 's' : ''}`}
                    </button>
                  )}
                </div>
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
