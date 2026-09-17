import { CONFIG } from './config.js';

/* Gọi Supabase trực tiếp bằng REST (không cần thư viện): đăng nhập email/mật khẩu, làm mới token, ghi vào bảng inbox_words */
const H = { 'Content-Type': 'application/json', apikey: CONFIG.SUPABASE_ANON_KEY };

async function authPost(path, body) {
  const r = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/${path}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.msg || d.error_description || d.error || d.message || `HTTP ${r.status}`);
  return d;
}
const saveSession = d => chrome.storage.local.set({ session: { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600), user: { id: d.user.id, email: d.user.email, name: d.user.user_metadata?.display_name || d.user.user_metadata?.full_name || d.user.email } } });

export async function getSession() { return (await chrome.storage.local.get('session')).session || null; }

export async function login(email, password) {
  try { const d = await authPost('token?grant_type=password', { email: email.trim().toLowerCase(), password }); await saveSession(d); return d.user; }
  catch (e) { throw new Error(/invalid/i.test(e.message) ? 'Email hoặc mật khẩu không đúng' : /not confirmed/i.test(e.message) ? 'Email chưa được xác nhận' : e.message); }
}
export async function logout() { await chrome.storage.local.remove('session'); }

/** Access token còn hạn (tự làm mới bằng refresh token khi sắp hết) */
export async function getToken() {
  let s = await getSession();
  if (!s) throw new Error('Chưa đăng nhập – bấm vào biểu tượng VocabFlash trên thanh công cụ để đăng nhập');
  if (Date.now() / 1000 > s.expires_at - 60) {
    try { const d = await authPost('token?grant_type=refresh_token', { refresh_token: s.refresh_token }); await saveSession(d); s = await getSession(); }
    catch { await logout(); throw new Error('Phiên đăng nhập đã hết hạn – hãy đăng nhập lại'); }
  }
  return s;
}

/** Gửi một từ vào Hộp thư từ của tài khoản */
export async function addWord({ word, context = '', url = '', title = '' }) {
  const s = await getToken();
  const r = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/inbox_words`, {
    method: 'POST',
    headers: { ...H, Authorization: 'Bearer ' + s.access_token, Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: s.user.id, word, context: context.slice(0, 500), source_url: url.slice(0, 500), source_title: title.slice(0, 200) }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    if (r.status === 404 || /inbox_words/.test(d.message || '')) throw new Error('Chưa có bảng inbox_words – chạy lại supabase/schema.sql');
    throw new Error(d.message || `HTTP ${r.status}`);
  }
}

/** Số từ đang chờ trong hộp thư */
export async function pendingCount() {
  const s = await getToken();
  const r = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/inbox_words?select=id&user_id=eq.${s.user.id}`, { headers: { ...H, Authorization: 'Bearer ' + s.access_token, Prefer: 'count=exact', Range: '0-0' } });
  const cr = r.headers.get('content-range') || '';
  return parseInt(cr.split('/')[1]) || 0;
}
