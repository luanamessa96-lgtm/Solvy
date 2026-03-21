import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY!;

// Hybrid storage: localStorage + cookie fallback per iOS PWA
// iOS svuota il localStorage delle PWA sotto pressione di memoria — il cookie persiste
const hybridStorage = {
  getItem: (key: string): string | null => {
    const fromLocal = localStorage.getItem(key);
    if (fromLocal) return fromLocal;
    const safeName = key.replace(/[^a-zA-Z0-9-_]/g, '_');
    const match = document.cookie.match(new RegExp('(^| )' + safeName + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
  },
  setItem: (key: string, value: string): void => {
    localStorage.setItem(key, value);
    const safeName = key.replace(/[^a-zA-Z0-9-_]/g, '_');
    document.cookie = `${safeName}=${encodeURIComponent(value)};max-age=31536000;path=/;SameSite=Lax`;
  },
  removeItem: (key: string): void => {
    localStorage.removeItem(key);
    const safeName = key.replace(/[^a-zA-Z0-9-_]/g, '_');
    document.cookie = `${safeName}=;max-age=0;path=/;SameSite=Lax`;
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
