import { fetchTimeout } from './utils.js?v=12';
import { CONFIG, isCloudEnabled } from './config.js?v=12';
import { Auth } from './auth.js?v=12';

/**
 * AI trích xuất từ vựng: dùng Gemini API (Google AI Studio) với API key của chính người dùng, lưu trên máy này.
 * Web tĩnh nên không có server trung gian – key chỉ nằm trong localStorage của trình duyệt.
 */
const LS_KEY = 'vocabflash.gemini.key';
const LS_MODEL = 'vocabflash.gemini.model';
// Chỉ giữ 2 model đang dùng tốt: flash-lite (nhanh) và pro (kỹ hơn, chậm hơn)
export const AI_MODELS = [
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite – nhanh (khuyên dùng)' },
  { id: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro – kỹ hơn, chậm hơn' },
];
const MODEL_IDS = AI_MODELS.map(m => m.id);
export const AI_TIMEOUT = 240000; // 4 phút – model pro suy nghĩ khá lâu với bài dài
const BASE = 'https://generativelanguage.googleapis.com/v1beta';
export const AI_LEVELS = [
  { id: 'B1-B2', label: 'B1 – B2 (trung cấp)' },
  { id: 'B2-C1', label: 'B2 – C1 (khó, nâng cao)' },
  { id: 'C1-C2', label: 'C1 – C2 (rất khó, học thuật)' },
];

export const AI = {
  // Key riêng của người dùng (localStorage) ưu tiên hơn key mặc định trong config.js
  get ownKey() { try { return localStorage.getItem(LS_KEY) || ''; } catch { return ''; } },
  get key() { return this.ownKey || CONFIG.GEMINI_API_KEY || ''; },
  get usingDefault() { return !this.ownKey && !!CONFIG.GEMINI_API_KEY; },
  // Không có key trong trình duyệt → gọi qua Supabase Edge Function "gemini" (key bí mật nằm ở server, mọi người dùng chung)
  get usingProxy() { return !this.key && isCloudEnabled(); },
  get available() { return !!this.key || isCloudEnabled(); },
  set key(v) { try { v ? localStorage.setItem(LS_KEY, v.trim()) : localStorage.removeItem(LS_KEY); } catch { /* ignore */ } },
  get model() { try { const m = localStorage.getItem(LS_MODEL); return MODEL_IDS.includes(m) ? m : this.defaultModel; } catch { return this.defaultModel; } },
  set model(v) { try { v ? localStorage.setItem(LS_MODEL, v) : localStorage.removeItem(LS_MODEL); } catch { /* ignore */ } },
  get defaultModel() { return MODEL_IDS.includes(CONFIG.GEMINI_MODEL) ? CONFIG.GEMINI_MODEL : MODEL_IDS[0]; },


  /** Lấy nội dung văn bản của một trang web qua r.jina.ai (đọc được bài báo, bỏ quảng cáo / menu; hỗ trợ CORS) */
  async fetchUrl(url) {
    url = url.trim(); if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const r = await fetchTimeout('https://r.jina.ai/' + url, 25000, { headers: { Accept: 'text/plain', 'X-Return-Format': 'text' } });
    if (!r.ok) throw new Error(`Không tải được trang (HTTP ${r.status}). Hãy thử copy nội dung bài rồi dán vào ô văn bản.`);
    const text = (await r.text()).trim();
    if (text.length < 200) throw new Error('Trang này có quá ít nội dung văn bản – hãy dán trực tiếp đoạn văn.');
    return text;
  },

  /** Gửi prompt tới Gemini, trả về JSON đã parse */
  async _ask(prompt, model = this.model) {
    let r;
    try {
      if (this.key) {
        // Gemini 3: giảm mức "suy nghĩ" để trả lời nhanh; model không nhận tham số (400) thì gọi lại không kèm
        const direct = extra => fetchTimeout(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, AI_TIMEOUT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.key },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.3, ...extra } }),
        });
        r = await direct(model.startsWith('gemini-3') ? { thinkingConfig: { thinkingLevel: 'low' } } : {});
        if (r.status === 400 && model.startsWith('gemini-3')) r = await direct({});
      } else if (isCloudEnabled()) {
        r = await fetchTimeout(`${CONFIG.SUPABASE_URL}/functions/v1/gemini`, AI_TIMEOUT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + (Auth.accessToken || CONFIG.SUPABASE_ANON_KEY) },
          body: JSON.stringify({ model, prompt }),
        });
        if (r.status === 404) throw Object.assign(new Error('Chưa triển khai Edge Function "gemini" trên Supabase (xem supabase/functions/gemini/index.ts) – hoặc dán key riêng ở trang AI.'), { code: 'noproxy' });
      } else throw new Error('Chưa có Gemini API key.');
    } catch (e) {
      if (e.code === 'noproxy') throw e;
      if (e.name === 'AbortError' || /abort/i.test(e.message)) throw new Error(`Model "${model}" không trả lời trong ${AI_TIMEOUT / 60000} phút. Hãy chọn model flash / flash-lite (nhanh hơn nhiều) hoặc rút ngắn đoạn văn.`);
      throw new Error('Không kết nối được tới Gemini: ' + e.message);
    }
    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      try { msg = (await r.json()).error?.message || msg; } catch { /* ignore */ }
      if (r.status === 400 && /api key/i.test(msg)) throw new Error('API key không hợp lệ – kiểm tra lại key Gemini.');
      if (r.status === 403) throw new Error('API key bị từ chối (403): ' + msg);
      if (r.status === 404) throw Object.assign(new Error(`Model "${model}" không còn khả dụng – hãy chọn model khác trong danh sách.`), { code: 404 });
      if (r.status === 429) throw new Error('Vượt giới hạn miễn phí của Gemini, hãy thử lại sau ít phút.');
      throw new Error('Gemini lỗi: ' + msg);
    }
    const data = await r.json();
    const raw = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    try { return JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { throw new Error('AI trả về dữ liệu không đọc được, hãy thử lại.'); }
  },

  /**
   * Phân tích đoạn văn → danh sách từ khó kèm định nghĩa theo ngữ cảnh.
   * → { title, words: [{ word, phonetic, pos, meaning, example, exampleVi, note, cefr }] }
   */
  async extract({ text, level = 'B2-C1', max = 20 }) {
    if (!this.available) throw new Error('Chưa có Gemini API key. Lấy key miễn phí tại aistudio.google.com/apikey rồi dán vào ô bên trên.');
    try { return await this._extract({ text, level, max, model: this.model }); }
    catch (e) {
      // Model đã lưu không còn tồn tại → tự quay về model mặc định rồi thử lại một lần
      if (e.code === 404 && this.model !== this.defaultModel) { this.model = ''; return await this._extract({ text, level, max, model: this.defaultModel }); }
      throw e;
    }
  },
  async _extract({ text, level, max, model }) {
    text = text.trim().slice(0, 24000); // ~6k token – đủ cho một bài báo dài
    if (text.length < 80) throw new Error('Đoạn văn quá ngắn (cần ít nhất vài câu).');
    const prompt = `You are an English teacher helping a Vietnamese learner. Read the TEXT below and extract up to ${max} of the most useful *difficult* vocabulary items at CEFR level ${level} (single words, phrasal verbs or short collocations). Skip proper nouns, numbers, and easy A1–B1 words.

For each item return:
- "word": base/dictionary form (lowercase unless proper), e.g. "resilient", "phase out"
- "phonetic": IPA transcription, e.g. "/rɪˈzɪliənt/"
- "pos": one of noun, verb, adjective, adverb, phrase, preposition, pronoun, conjunction, interjection
- "meaning": concise Vietnamese meaning *as used in this text*
- "example": the exact sentence (or shortened clause, max 25 words) from the text that contains the word
- "exampleVi": natural Vietnamese translation of that example
- "note": short English definition (max 15 words)
- "cefr": estimated CEFR level, e.g. "B2", "C1"

Also return "title": a short topic name in English (max 5 words) describing the text.
Return ONLY valid JSON: {"title": "...", "words": [ ... ]}

TEXT:
"""
${text}
"""`;
    const out = await this._ask(prompt, model);
    const list = Array.isArray(out) ? out : (out.words || out.items || []);
    const words = list.filter(w => w && w.word).map(w => ({
      word: String(w.word).trim(), phonetic: String(w.phonetic || '').trim(), pos: String(w.pos || '').toLowerCase().trim(),
      meaning: String(w.meaning || w.meaning_vi || '').trim(), example: String(w.example || '').trim(), exampleVi: String(w.exampleVi || w.example_vi || '').trim(),
      note: String(w.note || w.definition || '').trim(), cefr: String(w.cefr || '').toUpperCase().trim(),
    })).filter(w => w.meaning);
    if (!words.length) throw new Error('AI không tìm được từ nào phù hợp – thử mức dễ hơn hoặc đoạn văn khác.');
    return { title: String((Array.isArray(out) ? '' : out.title) || '').trim(), words };
  },

  /**
   * Điền nghĩa cho danh sách từ (từ extension gửi lên): items = [{ word, context }]
   * → [{ word, phonetic, pos, meaning, exampleVi, note }] theo đúng thứ tự
   */
  async defineWords(items) {
    if (!this.available) throw new Error('Chưa có Gemini API key.');
    const prompt = `You are an English–Vietnamese dictionary for a Vietnamese learner. For each item below give:
- "word": the dictionary/base form of the item (keep phrasal verbs / collocations as they are)
- "phonetic": IPA, e.g. "/rɪˈzɪliənt/"
- "pos": one of noun, verb, adjective, adverb, phrase, preposition, pronoun, conjunction, interjection
- "meaning": concise Vietnamese meaning; if "context" is given, the meaning *as used in that context*
- "exampleVi": Vietnamese translation of "context" (empty string if no context)
- "note": short English definition (max 15 words)
Return ONLY a JSON array in the same order as the input.

INPUT:
${JSON.stringify(items.map(i => ({ word: i.word, context: (i.context || '').slice(0, 300) })))}`;
    let out;
    try { out = await this._ask(prompt, this.model); }
    catch (e) { if (e.code === 404 && this.model !== this.defaultModel) { this.model = ''; out = await this._ask(prompt, this.defaultModel); } else throw e; }
    const list = Array.isArray(out) ? out : (out.items || out.words || []);
    return items.map((it, i) => { const w = list[i] || list.find(x => x && x.word && x.word.toLowerCase() === it.word.toLowerCase()) || {}; return {
      word: String(w.word || it.word).trim(), phonetic: String(w.phonetic || '').trim(), pos: String(w.pos || '').toLowerCase().trim(),
      meaning: String(w.meaning || '').trim(), exampleVi: String(w.exampleVi || '').trim(), note: String(w.note || '').trim(),
    }; });
  },

  /**
   * Dịch cả đoạn văn sang tiếng Việt + chọn tối đa 6 từ khó trong đoạn (dùng cho bookmarklet / trang ➕).
   * → { translation, words: [{ word, phonetic, pos, meaning, note }] }
   */
  async translatePassage(text) {
    if (!this.available) throw new Error('Chưa có Gemini API key.');
    text = String(text || '').trim().slice(0, 8000);
    if (text.length < 20) throw new Error('Đoạn văn quá ngắn.');
    const prompt = `You are a translator for a Vietnamese learner of English.
1) Translate the TEXT below into natural, fluent Vietnamese (keep paragraph breaks; do not add comments).
2) Pick up to 6 useful difficult vocabulary items (CEFR B2 or above; single words, phrasal verbs or collocations; skip names and easy words) that appear in the TEXT.
Return ONLY JSON: {"translation": "...", "words": [{"word": "dictionary form (keep phrases whole)", "phonetic": "IPA", "pos": "noun|verb|adjective|adverb|phrase|...", "meaning": "concise Vietnamese meaning as used in the text", "note": "short English definition"}]}
TEXT:
"""
${text}
"""`;
    let out;
    try { out = await this._ask(prompt, this.model); }
    catch (e) { if (e.code === 404 && this.model !== this.defaultModel) { this.model = ''; out = await this._ask(prompt, this.defaultModel); } else throw e; }
    return { translation: String(out.translation || '').trim(), words: (out.words || []).filter(w => w && w.word && w.meaning).map(w => ({ word: String(w.word).trim(), phonetic: String(w.phonetic || '').trim(), pos: String(w.pos || '').toLowerCase().trim(), meaning: String(w.meaning).trim(), note: String(w.note || '').trim() })) };
  },
};
