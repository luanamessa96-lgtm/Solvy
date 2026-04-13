import { useEffect } from 'react';

/**
 * Blocca document.body overflow quando isOpen è true.
 * Fix per iOS Safari: senza lock il body scrolla dietro i modal fixed.
 */
export function useBodyScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);
}
