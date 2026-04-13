import { useEffect } from 'react';

/**
 * Blocca lo scroll quando isOpen è true.
 * - position:fixed sul body (bug iOS Safari: overflow:hidden sul body è ignorato)
 * - overflow:hidden su <main> (il vero scroll container dell'app)
 * - touchmove preventDefault su document (WebKit/iOS PWA)
 *   Gli elementi con [data-scroll-lock-ignore] sono esentati e possono scrollare liberamente.
 */
export function useBodyScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    // Lock body
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    // Lock <main> — il vero scroll container dell'app
    const main = document.querySelector('main') as HTMLElement | null;
    const prevMainOverflow = main?.style.overflow ?? '';
    if (main) main.style.overflow = 'hidden';

    // iOS/WebKit: blocca touchmove su tutto il documento.
    // Esenzione: elementi con [data-scroll-lock-ignore] (scroll interno ai modal).
    const blockTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-scroll-lock-ignore]')) return;
      e.preventDefault();
    };
    document.addEventListener('touchmove', blockTouchMove, { passive: false });

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
      if (main) main.style.overflow = prevMainOverflow;
      document.removeEventListener('touchmove', blockTouchMove);
    };
  }, [isOpen]);
}
