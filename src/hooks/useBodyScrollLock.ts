import { useEffect } from 'react';

/**
 * Blocca lo scroll del body quando isOpen è true.
 * Usa position:fixed invece di overflow:hidden — unica tecnica
 * che funziona su iOS Safari (overflow:hidden sul body è ignorato).
 */
export function useBodyScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);
}
