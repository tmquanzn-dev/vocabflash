import { CONFIG, isCloudEnabled } from './config.js?v=11';

/* Tải supabase-js từ CDN chỉ khi đã cấu hình – web vẫn chạy offline khi chưa cấu hình */
let clientPromise = null;

export function getSupabase() {
  if (!isCloudEnabled()) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
      .then(({ createClient }) => createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
        auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
      }))
      .catch(err => { console.error('Không tải được supabase-js', err); clientPromise = null; return null; });
  }
  return clientPromise;
}
