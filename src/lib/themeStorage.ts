/**
 * themeStorage — persistenza tema su iOS Safari PWA
 *
 * iOS Safari svuota localStorage quando la PWA è in background.
 * Il cookie (max-age 1 anno) sopravvive. Leggiamo cookie prima,
 * localStorage come cache veloce. Scrittura sempre su entrambi.
 *
 * Chiave cookie: prefisso "st_" + nome chiave con caratteri non-alfanumerici → "_"
 * Esempio: theme → st_theme | theme_abc-123 → st_theme_abc_123
 */

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 anno in secondi

function ck(key: string): string {
  return 'st_' + key.replace(/[^a-zA-Z0-9]/g, '_');
}

export const themeStorage = {
  getItem(key: string): string | null {
    // Cookie prima (fonte più affidabile su iOS PWA)
    try {
      const cookieName = ck(key);
      const match = document.cookie.match(
        new RegExp('(?:^|; )' + cookieName + '=([^;]*)')
      );
      if (match) {
        const val = decodeURIComponent(match[1]);
        // Sincronizza localStorage come cache locale
        try { localStorage.setItem(key, val); } catch {}
        return val;
      }
    } catch {}
    // Fallback localStorage (e migra al cookie se trovato)
    try {
      const val = localStorage.getItem(key);
      if (val) this.setItem(key, val); // migrazione automatica
      return val;
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch {}
    try {
      document.cookie = `${ck(key)}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    } catch {}
  },

  removeItem(key: string): void {
    try { localStorage.removeItem(key); } catch {}
    try {
      document.cookie = `${ck(key)}=; path=/; max-age=0`;
    } catch {}
  },
};
