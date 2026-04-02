import { useState, useEffect, FocusEvent } from 'react';

/**
 * Returns the height (px) of the on-screen keyboard on iOS Safari via visualViewport.
 * Falls back to 0 on browsers that don't support the API.
 */
export function useKeyboardPadding(): number {
  const [padding, setPadding] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // keyboard height = difference between window height and visible viewport
      const kbHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setPadding(kbHeight);
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return padding;
}

/** Call on any input/select focus event to scroll it above the keyboard. */
export function scrollFieldIntoView(e: FocusEvent<HTMLElement>) {
  const el = e.target;
  setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 320);
}
