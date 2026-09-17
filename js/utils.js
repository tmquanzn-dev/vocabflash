/* Tiện ích dùng chung */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const sample = (arr, n) => shuffle(arr).slice(0, n);
export const isTyping = e => !!(e.target && e.target.closest && e.target.closest('input, textarea, select'));
export const DAY = 86400000;
export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Khoá tuần ISO, vd "2026-W38" (tuần bắt đầu thứ Hai)
export const weekKey = (d = new Date()) => {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return `${x.getUTCFullYear()}-W${String(Math.ceil(((x - y0) / DAY + 1) / 7)).padStart(2, '0')}`;
};
export const isValidEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/* Từ đơn & cụm từ */
export const isPhrase = s => /\s/.test(String(s || '').trim());
// Chuẩn hoá để so sánh câu trả lời: bỏ hoa/thường, dấu câu, khoảng trắng thừa
export const normalizeAnswer = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, ' ').replace(/\s+/g, ' ').trim();
// Gợi ý chính tả: chữ cái đầu mỗi từ + gạch dưới, vd "I like beach" → "I l___ b____"
export const hintFor = s => String(s || '').trim().split(/\s+/).map(w => w[0] + '_'.repeat(Math.max(0, w.length - 1))).join(' ');
// Lớp CSS thu nhỏ chữ cho từ/cụm dài
export const lengthClass = s => { const n = String(s || '').length; return n > 34 ? 'xlong' : n > 16 ? 'long' : ''; };

export const fetchTimeout = (url, ms, opts = {}) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
};

export function debounce(fn, ms) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  return d;
}

/* Hằng số học tập */
// Khoảng cách ôn tập (ngày) theo từng mức độ thuộc (Leitner)
export const INTERVALS = [0, 1, 3, 7, 14, 30, 60];
export const MAX_LEVEL = INTERVALS.length - 1;
export const LEVEL_LABEL = ['Mới', 'Đang học', 'Đang học', 'Quen', 'Quen', 'Thuộc', 'Thuộc'];
export const POS_LIST = ['', 'noun', 'verb', 'adjective', 'adverb', 'phrase', 'preposition', 'pronoun', 'conjunction', 'interjection'];
export const POS_SHORT = { noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv', phrase: 'phr', preposition: 'prep', pronoun: 'pron', conjunction: 'conj', interjection: 'interj' };
export const EMOJIS = ['📚', '🏫', '🏠', '🍔', '✈️', '💼', '🏥', '⚽', '🎵', '🌳', '🐶', '🛒', '💻', '🎬', '🚗', '👨‍👩‍👧', '🌦️', '💪', '🎨', '🔬', '💰', '❤️', '🗣️', '🧠'];

/* Toast */
let toastTimer;
export function toast(msg, ms = 2400) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export const levelBadge = l => `<span class="lvl lvl-${l}">${LEVEL_LABEL[l]}</span>`;
export const fmtDue = ts => { const d = Math.ceil((ts - Date.now()) / DAY); return d <= 0 ? 'hôm nay' : d === 1 ? 'ngày mai' : `sau ${d} ngày`; };
export const initials = name => (name || '?').trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();
