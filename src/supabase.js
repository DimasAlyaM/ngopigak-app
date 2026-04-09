import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if configured correctly. If missing or placeholder, provide a Proxy 
// that throws a clear error only when called, preventing top-level module crash.
const isConfigured = supabaseUrl && !supabaseUrl.includes('YOUR_SUPABASE_URL');

// Vercel environment variables added. Triggering redeploy...
export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseKey)
  : new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'then') return undefined; // Handle potential promise-like check
        throw new Error(`[CRITICAL] Supabase tidak terhubung. Cek Vercel Settings: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.`);
      }
    });
