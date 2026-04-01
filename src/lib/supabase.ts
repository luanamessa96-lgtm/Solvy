import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL_DEV ?? import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY_DEV ?? import.meta.env.VITE_SUPABASE_KEY;

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

// Persistent storage for profile-specific fields not in Supabase schema (nie, retaMensile)
// Uses same hybrid localStorage+cookie pattern as session storage to survive iOS PWA background
export const profileStorage = {
  get: (key: string): string | null => {
    const lsValue = localStorage.getItem(key);
    if (lsValue) return lsValue;
    const ck = 'ps_' + key.replace(/[^a-zA-Z0-9]/g, '_');
    const match = document.cookie.match(new RegExp('(^| )' + ck + '=([^;]+)'));
    if (match) {
      const value = decodeURIComponent(match[2]);
      localStorage.setItem(key, value);
      return value;
    }
    return null;
  },
  set: (key: string, value: string): void => {
    localStorage.setItem(key, value);
    const ck = 'ps_' + key.replace(/[^a-zA-Z0-9]/g, '_');
    try {
      document.cookie = `${ck}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
    } catch (e) {
      console.error('[profileStorage] Cookie write failed:', e);
    }
  },
};

let _client: SupabaseClient | null = null;

export const supabaseReady: Promise<SupabaseClient> = import('@supabase/supabase-js').then(
  ({ createClient }) => {
    _client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: hybridStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return _client;
  }
);

export function getClient(): SupabaseClient {
  if (!_client) throw new Error('[supabase] getClient() called before init resolved');
  return _client;
}
