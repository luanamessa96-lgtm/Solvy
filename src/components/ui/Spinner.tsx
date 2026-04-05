interface SpinnerProps {
  size?: number;
  className?: string;
}

// Spinner gradiente Solvy: teal → fuchsia
// Usa conic-gradient + mask — funziona su qualsiasi sfondo senza dipendere dal colore background
export default function Spinner({ size = 24, className = '' }: SpinnerProps) {
  const border = Math.max(2, Math.round(size * 0.12));
  return (
    <div
      className={`animate-spin shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'conic-gradient(from 0deg, #4CD9D0, #C855F7, #4CD9D0)',
        WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${border}px), white calc(100% - ${border}px))`,
        mask: `radial-gradient(farthest-side, transparent calc(100% - ${border}px), white calc(100% - ${border}px))`,
      }}
    />
  );
}
