import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY!;

// Storage ibrido: localStorage + cookie di backup per iOS PWA
// iOS Safari cancella localStorage quando la PWA è in background — il cookie persiste
const hybridStorage = {
  getItem: (key: string): string | null => {
    const lsValue = localStorage.getItem(key);
    if (lsValue) return lsValue;
    const match = document.cookie.match(new RegExp('(^| )sb_bk_' + key.replace(/[^a-zA-Z0-9]/g, '_') + '=([^;]+)'));
    if (match) {
      const value = decodeURIComponent(match[2]);
      localStorage.setItem(key, value);
      return value;
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    localStorage.setItem(key, value);
    const cookieKey = 'sb_bk_' + key.replace(/[^a-zA-Z0-9]/g, '_');
    // max-age 1 anno, SameSite=Lax per compatibilità PWA
    try {
      document.cookie = `${cookieKey}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
    } catch (e) {
      console.error('[hybridStorage] Cookie write failed:', e);
    }
  },
  removeItem: (key: string): void => {
    localStorage.removeItem(key);
    const cookieKey = 'sb_bk_' + key.replace(/[^a-zA-Z0-9]/g, '_');
    document.cookie = `${cookieKey}=; path=/; max-age=0`;
  },
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: hybridStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
