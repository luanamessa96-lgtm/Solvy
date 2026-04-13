import { useEffect } from 'react';

/**
 * Blocca lo scroll quando isOpen è true.
 * - position:fixed sul body (bug iOS Safari: overflow:hidden sul body è ignorato)
 * - overflow:hidden su <main> (il vero scroll container dell'app)
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

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
      if (main) main.style.overflow = prevMainOverflow;
    };
  }, [isOpen]);
}
