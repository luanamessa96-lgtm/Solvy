import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Lock, Check, Mail } from 'lucide-react';
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
  const [isSending, setIsSending] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ blob: Blob; fileName: string } | null>(null);
  const [includeLibroEmitidas, setIncludeLibroEmitidas] = useState(false);
  const [includeLibroRecibidas, setIncludeLibroRecibidas] = useState(false);
  const [includeFacturas, setIncludeFacturas] = useState(false);
  const [includeGastos, setIncludeGastos] = useState(false);

  // Reset toggles every time the modal closes so stale selections don't bleed into the next session
  useEffect(() => {
    if (!isOpen) {
      setIncludeLibroEmitidas(false);
      setIncludeLibroRecibidas(false);
      setIncludeFacturas(false);
      setIncludeGastos(false);
    }
  }, [isOpen]);

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

  const downloadBlob = (file: { blob: Blob; fileName: string }) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file.blob);
    a.download = file.fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const generateAll = async () => {
    const resumenResult = await buildResumenPDFBlob(documents, profile, quarter, year);
    const libroE = includeLibroEmitidas ? await generateLibroEmitidaBlob(documents, profile, year) : null;
    const libroR = includeLibroRecibidas ? await generateLibroRecibidaBlob(documents, profile, year) : null;
    const facturasResult = includeFacturas
      ? await generateFacturasTrimestreBlob([...resumen.invoices, ...resumen.rectificativas], profile, quarter, year)
      : null;
    const gastosResult = includeGastos
      ? await generateGastosTrimestreBlob(resumen.expenses, profile, quarter, year)
      : null;
    return { resumenResult, libroE, libroR, facturasResult, gastosResult };
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
      const { resumenResult, libroE, libroR, facturasResult, gastosResult } = await generateAll();

      // Decide what to show in preview:
      // - only Emitidas → preview Libro Emitidas
      // - only Recibidas → preview Libro Recibidas
      // - only Facturas → preview Facturas trimestre
      // - only Gastos → preview Gastos trimestre
      // - anything else / none → preview Resumen
      const extras = [libroE, libroR, facturasResult, gastosResult].filter(Boolean);
      if (extras.length === 1) {
        setPdfPreview(extras[0]!);
        downloadBlob(resumenResult);
      } else {
        setPdfPreview(resumenResult);
        if (libroE) downloadBlob(libroE);
        if (libroR) downloadBlob(libroR);
        if (facturasResult) downloadBlob(facturasResult);
        if (gastosResult) downloadBlob(gastosResult);
      }
    } catch {
      showToast('Error al generar el PDF', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendGestor = async () => {
    if (!accountant) return;
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

    setIsSending(true);
    try {
      const { resumenResult, libroE, libroR, facturasResult, gastosResult } = await generateAll();

      // Download all files to Downloads folder
      downloadBlob(resumenResult);
      if (libroE) downloadBlob(libroE);
      if (libroR) downloadBlob(libroR);
      if (facturasResult) downloadBlob(facturasResult);
      if (gastosResult) downloadBlob(gastosResult);

      // Build file list for body
      const fileNames: string[] = [
        resumenResult.fileName,
        ...(libroE ? [libroE.fileName] : []),
        ...(libroR ? [libroR.fileName] : []),
        ...(facturasResult ? [facturasResult.fileName] : []),
        ...(gastosResult ? [gastosResult.fileName] : []),
      ];

      const subject = encodeURIComponent(`Documentos T${quarter} ${year} — Solvy`);
      const body = encodeURIComponent(
        `Hola ${accountant.firstName},\n\n` +
        `te envío los documentos del trimestre T${quarter} ${year}.\n\n` +
        `Archivos descargados:\n${fileNames.map(n => `- ${n}`).join('\n')}\n\n` +
        `Encuéntralos en la carpeta Descargas — adjúntalos manualmente al email.\n\n` +
        `Gracias`
      );
      window.location.href = `mailto:${accountant.email}?subject=${subject}&body=${body}`;
    } catch {
      showToast('Error al generar los PDFs', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const fmtPreview = (n: number) =>
    `€${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const dm = darkMode;
  const isWorking = isGenerating || isSending;

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

              {/* Toggles — Spain Pro */}
              {isPro && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Incluir también</p>
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
                </div>
              )}

              {/* Download button */}
              {isPro ? (
                <div className="space-y-3">
                  <button
                    onClick={handleDownload}
                    disabled={isWorking}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white bg-primary shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    <Download size={18} />
                    {isGenerating ? 'Generando…' : 'Descargar PDF'}
                  </button>
                  {accountant && (
                    <button
                      onClick={handleSendGestor}
                      disabled={isWorking}
                      className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] disabled:opacity-60 ${dm ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'}`}
                    >
                      <Mail size={18} />
                      {isSending ? 'Preparando…' : `Enviar al Gestor · ${accountant.email}`}
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
