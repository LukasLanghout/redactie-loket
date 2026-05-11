import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in.');
}

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'placeholder', {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const isSupabaseConfigured = Boolean(url && anonKey);
