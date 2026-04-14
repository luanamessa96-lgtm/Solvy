import { useEffect, useState } from 'react';
import { X, Share2, FileText, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  blob: Blob;
  fileName: string;
  darkMode?: boolean;
}

export default function PdfPreviewModal({ isOpen, onClose, blob, fileName, darkMode }: PdfPreviewModalProps) {
  const { t } = useTranslation();
  const [blocked, setBlocked] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !blob.size) return;
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    const win = window.open(url, '_blank');
    if (win) {
      // Delay revocation so the new tab has time to fully load the PDF
      // before the URL becomes invalid (prevents white pages race condition)
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      onClose();
      return;
    }
    setBlocked(true);
    return () => {
      URL.revokeObjectURL(url);
      setBlobUrl(null);
      setBlocked(false);
    };
  }, [isOpen, blob]);

  if (!isOpen || !blocked) return null;

  const handleShare = async () => {
    const file = new File([blob], fileName, { type: 'application/pdf' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: fileName });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleOpenManual = () => {
    if (blobUrl) window.open(blobUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ backgroundColor: darkMode ? '#0f172a' : '#f8fafc' }}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b shrink-0 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
        <button
          onClick={onClose}
          className={`p-2 rounded-full shrink-0 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}
        >
          <X size={20} />
        </button>
        <p className={`text-sm font-bold truncate flex-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{fileName}</p>
      </div>

      {/* Fallback (popup bloccato) */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8">
        <div className={`w-24 h-28 rounded-3xl flex flex-col items-center justify-center gap-1.5 shadow-lg ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
          <FileText size={40} className="text-red-500" strokeWidth={1.5} />
          <span className="text-xs font-black tracking-widest text-red-500">PDF</span>
        </div>
        <p className={`text-sm font-bold text-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>{fileName}</p>
        <p className="text-xs text-slate-400 text-center leading-relaxed">
          {t('pdf_preview.blocked_msg')}
        </p>
      </div>

      {/* Footer */}
      <div className={`px-4 py-4 border-t shrink-0 space-y-3 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
        <button
          onClick={handleOpenManual}
          className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'}`}
        >
          <ExternalLink size={18} />
          {t('pdf_preview.open_btn')}
        </button>
        <button
          onClick={handleShare}
          className="w-full py-4 rounded-2xl font-bold text-white bg-primary shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Share2 size={18} />
          {t('pdf_preview.download_btn')}
        </button>
      </div>
    </div>
  );
}
