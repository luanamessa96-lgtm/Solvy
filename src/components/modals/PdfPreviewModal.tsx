import { X, Share2 } from 'lucide-react';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataUrl: string;
  fileName: string;
  darkMode?: boolean;
}

export default function PdfPreviewModal({ isOpen, onClose, dataUrl, fileName, darkMode }: PdfPreviewModalProps) {
  if (!isOpen) return null;

  const handleShare = async () => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
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
    } catch {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = fileName;
      a.click();
    }
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

      {/* PDF viewer */}
      <div className="flex-1 overflow-hidden">
        <iframe
          src={dataUrl}
          className="w-full h-full border-0"
          title={fileName}
        />
      </div>

      {/* Footer */}
      <div className={`px-4 py-4 border-t shrink-0 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
        <button
          onClick={handleShare}
          className="w-full py-4 rounded-2xl font-bold text-white bg-primary shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Share2 size={18} />
          Scarica / Condividi
        </button>
      </div>
    </div>
  );
}
