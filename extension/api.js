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

/** Gọi Edge Function "gemini" (key Gemini nằm ở server) và trả về JSON đã parse. Ném lỗi kèm thông điệp dễ hiểu. */
async function askGemini(prompt, session, timeoutMs = 60000, model = CONFIG.GEMINI_MODEL) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), timeoutMs);
  let r;
  try { r = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/gemini`, { method: 'POST', signal: c.signal, headers: { ...H, Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify({ model, prompt }) }); }
  catch (e) { throw new Error(e.name === 'AbortError' ? 'AI không trả lời kịp – thử lại hoặc chọn đoạn ngắn hơn' : 'Không kết nối được: ' + e.message); }
  finally { clearTimeout(t); }
  if (r.status === 404) throw new Error('Chưa triển khai Edge Function "gemini" trên Supabase (xem README)');
  if (r.status === 429) throw new Error('AI đang quá tải (hết hạn mức phút này) – thử lại sau ít giây');
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error?.message || d.error || `AI lỗi HTTP ${r.status}`); }
  const d = await r.json();
  const raw = d.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  try { return JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { throw new Error('AI trả về dữ liệu không đọc được, thử lại'); }
}

/**
 * Dịch cả đoạn văn sang tiếng Việt + chọn tối đa 6 từ khó trong đoạn.
 * → { translation, words: [{ word, phonetic, pos, meaning, note }] }
 */
export async function translatePassage(text) {
  const s = await getToken();
  text = text.slice(0, 6000);
  const prompt = `You are a translator for a Vietnamese learner of English.
1) Translate the TEXT below into natural, fluent Vietnamese (keep paragraph breaks; do not add comments).
2) Pick up to 6 useful difficult vocabulary items (CEFR B2 or above; single words, phrasal verbs or collocations; skip names and easy words) that appear in the TEXT.
Return ONLY JSON: {"translation": "...", "words": [{"word": "dictionary form (keep phrases whole)", "phonetic": "IPA", "pos": "noun|verb|adjective|adverb|phrase|...", "meaning": "concise Vietnamese meaning as used in the text", "note": "short English definition"}]}
TEXT:
"""
${text}
"""`;
  const out = await askGemini(prompt, s, 90000);
  return { translation: String(out.translation || out.vi || '').trim(), words: (out.words || []).filter(w => w && w.word && w.meaning).map(w => ({ word: String(w.word).trim(), phonetic: String(w.phonetic || '').trim(), pos: String(w.pos || '').toLowerCase(), meaning: String(w.meaning).trim(), note: String(w.note || '').trim() })) };
}

/**
 * Dịch nghĩa nhiều từ trong MỘT lời gọi qua Edge Function "gemini" (key nằm ở server).
 * items: [{ word, context }] → mảng cùng thứ tự, phần tử null nếu không dịch được. Lỗi → toàn bộ null (vẫn thêm từ được).
 */
export async function defineWords(items) {
  try {
    const s = await getToken();
    const prompt = `You are an English–Vietnamese dictionary for a Vietnamese learner. For EACH item in INPUT return an object with keys:
- "word": the item text itself, cleaned. If it is a single word give its dictionary/base form; if it is a phrase / collocation / multi-word expression KEEP THE WHOLE PHRASE (never shorten it to one word)
- "phonetic": IPA of the whole item, e.g. "/rɪˈzɪliənt/"
- "pos": one of noun, verb, adjective, adverb, phrase, preposition, pronoun, conjunction, interjection
- "meaning": concise Vietnamese meaning; if "context" is given, the meaning as used in that context
- "exampleVi": Vietnamese translation of "context" ("" if no context)
- "note": short English definition (max 15 words)
Return ONLY a JSON array with exactly ${items.length} objects, same order as INPUT.
INPUT: ${JSON.stringify(items.map(i => ({ word: i.word, context: (i.context || '').slice(0, 300) })))}`;
    let out = await askGemini(prompt, s, 45000);
    if (!Array.isArray(out)) out = out.items || out.words || [out];
    return items.map((it, i) => {
      const w = out[i] || out.find(x => x && x.word && String(x.word).toLowerCase() === it.word.toLowerCase());
      return w && w.meaning ? { word: String(w.word || it.word), phonetic: String(w.phonetic || ''), pos: String(w.pos || '').toLowerCase(), meaning: String(w.meaning), exampleVi: String(w.exampleVi || ''), note: String(w.note || '') } : null;
    });
  } catch { return items.map(() => null); }
}
export const defineWord = async (word, context = '') => (await defineWords([{ word, context }]))[0];

/** Cập nhật nghĩa cho dòng inbox đã thêm (sau khi dịch xong) */
export async function updateWord(id, def) {
  const s = await getToken();
  await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/inbox_words?id=eq.${id}&user_id=eq.${s.user.id}`, {
    method: 'PATCH', headers: { ...H, Authorization: 'Bearer ' + s.access_token, Prefer: 'return=minimal' },
    body: JSON.stringify({ word: def.word || undefined, meaning: def.meaning, phonetic: def.phonetic, pos: def.pos, example_vi: def.exampleVi, note: def.note }),
  });
}

/** Gửi một từ vào Hộp thư từ của tài khoản (kèm nghĩa nếu đã dịch được). Trả về id dòng vừa thêm. */
export async function addWord({ word, context = '', url = '', title = '', def = null }) {
  const s = await getToken();
  const r = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/inbox_words?select=id`, {
    method: 'POST',
    headers: { ...H, Authorization: 'Bearer ' + s.access_token, Prefer: 'return=representation' },
    body: JSON.stringify({ user_id: s.user.id, word, context: context.slice(0, 500), source_url: url.slice(0, 500), source_title: title.slice(0, 200),
      meaning: def?.meaning || '', phonetic: def?.phonetic || '', pos: def?.pos || '', example_vi: def?.exampleVi || '', note: def?.note || '' }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    if (r.status === 404 || /inbox_words/.test(d.message || '')) throw new Error('Chưa có bảng inbox_words – chạy lại supabase/schema.sql');
    throw new Error(d.message || `HTTP ${r.status}`);
  }
  const rows = await r.json().catch(() => []);
  return rows[0]?.id;
}

/** Số từ đang chờ trong hộp thư */
export async function pendingCount() {
  const s = await getToken();
  const r = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/inbox_words?select=id&user_id=eq.${s.user.id}`, { headers: { ...H, Authorization: 'Bearer ' + s.access_token, Prefer: 'count=exact', Range: '0-0' } });
  const cr = r.headers.get('content-range') || '';
  return parseInt(cr.split('/')[1]) || 0;
}
