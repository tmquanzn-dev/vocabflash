import { addWord, defineWord, updateWord, translatePassage } from './api.js';

/* Menu chuột phải khi bôi đen chữ trên trang web:
   - "Thêm … vào VocabFlash": 1 từ / cụm từ → Hộp thư từ (dịch nghĩa chạy nền)
   - "Dịch đoạn này": dịch nguyên đoạn sang tiếng Việt, hiện thẻ nổi trên trang + từ khó trong đoạn */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'vf-add', title: 'Thêm "%s" vào VocabFlash', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'vf-translate', title: 'Dịch đoạn này (VocabFlash)', contexts: ['selection'] });
  });
});

const clean = s => (s || '').replace(/\s+/g, ' ').trim();
const isPassage = s => s.length > 80 || s.split(' ').length > 8;

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const sel = clean(info.selectionText);
  if (!sel) return;
  if (info.menuItemId === 'vf-translate' || (info.menuItemId === 'vf-add' && isPassage(sel))) return translateSelection(sel, tab);
  if (info.menuItemId !== 'vf-add') return;
  const word = sel.replace(/^[\s"'“”‘’(\[]+|[\s"'“”‘’.,;:!?)\]]+$/g, '');
  if (!word) return;
  // Lấy câu chứa từ để làm ví dụ (chạy trong trang; bỏ qua nếu trang không cho phép)
  let context = '';
  try {
    const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: sentenceAround, args: [word] });
    context = r?.result || '';
  } catch { /* ví dụ: trang chrome:// hoặc PDF */ }
  await addAndDefine({ word, context, url: info.pageUrl || tab.url || '', title: tab.title || '' });
});

/** Thêm từ ngay (web nhận tức thì), dịch nghĩa chạy nền rồi cập nhật; thông báo kết quả */
async function addAndDefine({ word, context = '', url = '', title = '' }) {
  try {
    const id = await addWord({ word, context, url, title });
    busy(true);
    const def = await defineWord(word, context); // qua Edge Function gemini (nếu đã triển khai)
    busy(false);
    if (def && id) await updateWord(id, def);
    notify(def ? `${def.word || word} ${def.phonetic ? def.phonetic + ' ' : ''}= ${def.meaning}` : `Đã thêm "${word}" vào Hộp thư từ VocabFlash`, def ? 'Đã thêm vào VocabFlash' : undefined);
    return def;
  } catch (e) { busy(false); notify('Không thêm được: ' + e.message); return null; }
}

/** Dịch cả đoạn: hiện thẻ nổi "đang dịch" trên trang, rồi điền bản dịch + từ khó */
async function translateSelection(text, tab) {
  const show = state => chrome.scripting.executeScript({ target: { tabId: tab.id }, func: overlay, args: [state] }).catch(() => null);
  const shown = await show({ status: 'loading', text });
  if (!shown) { notify('Trang này không cho phép hiện thẻ dịch – hãy dán đoạn văn vào web VocabFlash → ✨ AI trích xuất'); return; }
  busy(true);
  try {
    const r = await translatePassage(text);
    await show({ status: 'done', text, ...r });
  } catch (e) { await show({ status: 'error', text, error: e.message }); }
  finally { busy(false); }
}

// Nút "＋" trong thẻ nổi gửi từ về đây để thêm vào Hộp thư từ
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'vf-add') return;
  addAndDefine({ word: msg.word, context: msg.context || '', url: sender.tab?.url || '', title: sender.tab?.title || '' }).then(def => sendResponse({ ok: true, def }));
  return true; // trả lời bất đồng bộ
});

/* ---------- Các hàm dưới đây được TIÊM VÀO TRANG (chạy trong ngữ cảnh trang, không dùng biến bên ngoài) ---------- */

// Tìm câu chứa đoạn đang bôi đen
function sentenceAround(word) {
  try {
    const sel = window.getSelection(); if (!sel || !sel.rangeCount) return '';
    let node = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType !== 1) node = node.parentElement;
    let el = node; while (el && el.parentElement && (el.innerText || '').length < 60 && !/^(P|LI|TD|H\d|BLOCKQUOTE|ARTICLE|DIV)$/.test(el.tagName)) el = el.parentElement;
    const text = (el?.innerText || '').replace(/\s+/g, ' ').trim();
    const sentences = text.match(/[^.!?]+[.!?]+["'”’)]?|[^.!?]+$/g) || [text];
    const hit = sentences.find(s => s.toLowerCase().includes(word.toLowerCase())) || '';
    return hit.trim().slice(0, 400);
  } catch { return ''; }
}

// Thẻ nổi hiện bản dịch (Shadow DOM để không dính CSS của trang)
function overlay(state) {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let host = document.getElementById('vf-translate-overlay');
  if (!host) {
    host = document.createElement('div'); host.id = 'vf-translate-overlay';
    host.style.cssText = 'all:initial;position:fixed;right:16px;bottom:16px;z-index:2147483647;';
    document.documentElement.appendChild(host);
    host.attachShadow({ mode: 'open' });
  }
  const root = host.shadowRoot;
  const body = state.status === 'loading'
    ? `<div class="st">⏳ Đang dịch ${state.text.length} ký tự…</div>`
    : state.status === 'error'
      ? `<div class="st err">⚠️ ${esc(state.error)}</div>`
      : `<div class="tr">${esc(state.translation)}</div>
         ${state.words?.length ? `<div class="wh">Từ khó trong đoạn – bấm ＋ để thêm vào VocabFlash</div><div class="ws">${state.words.map((w, i) => `<div class="w"><b>${esc(w.word)}</b> <i>${esc(w.phonetic)}</i> <span>${esc(w.meaning)}</span><button data-i="${i}" title="Thêm vào Hộp thư từ">＋</button></div>`).join('')}</div>` : ''}`;
  root.innerHTML = `<style>
    .card{font:14px/1.5 "Segoe UI",system-ui,sans-serif;color:#1c2233;background:#fff;border:1px solid #e3e7f0;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.22);width:min(440px,calc(100vw - 32px));max-height:min(70vh,560px);display:flex;flex-direction:column;overflow:hidden}
    .hd{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#5b5ff7;color:#fff;font-weight:700}
    .hd span{flex:1}.hd button{all:unset;cursor:pointer;font-size:18px;line-height:1;padding:0 4px}
    .bd{padding:12px 14px;overflow:auto}
    .src{color:#6b7386;font-size:12px;max-height:60px;overflow:hidden;margin-bottom:8px;border-left:3px solid #e3e7f0;padding-left:8px}
    .tr{font-size:14.5px;white-space:pre-wrap}
    .st{color:#6b7386}.st.err{color:#e5484d}
    .wh{margin:12px 0 6px;font-size:12px;font-weight:700;color:#6b7386;text-transform:uppercase;letter-spacing:.04em}
    .w{display:flex;align-items:center;gap:6px;padding:6px 0;border-top:1px solid #f0f2f8;font-size:13px}
    .w i{color:#6b7386;font-style:normal;font-family:"Charis SIL","Times New Roman",serif}.w span{flex:1;color:#3c40b8}
    .w button{all:unset;cursor:pointer;background:#eceeff;color:#5b5ff7;border-radius:8px;padding:2px 9px;font-weight:700}
    .w button.done{background:#e3f7ee;color:#22a06b}.w button:disabled{opacity:.6;cursor:default}
    .ft{padding:8px 14px;border-top:1px solid #e3e7f0;font-size:11.5px;color:#6b7386}
  </style>
  <div class="card">
    <div class="hd"><span>🌐 VocabFlash – Dịch đoạn</span><button id="x" title="Đóng">×</button></div>
    <div class="bd"><div class="src">${esc(state.text.slice(0, 220))}${state.text.length > 220 ? '…' : ''}</div>${body}</div>
    <div class="ft">Dịch bởi Gemini · bôi đen 1 từ → chuột phải → "Thêm … vào VocabFlash" để lưu kèm câu ví dụ</div>
  </div>`;
  root.getElementById('x').onclick = () => host.remove();
  root.querySelectorAll('.w button').forEach(b => b.onclick = () => {
    const w = state.words[+b.dataset.i]; b.disabled = true; b.textContent = '…';
    chrome.runtime.sendMessage({ type: 'vf-add', word: w.word, context: state.text.slice(0, 400) }, res => { b.textContent = res?.ok ? '✓' : '!'; b.classList.add('done'); });
  });
}

// Dấu "…" trên icon khi đang dịch
function busy(on) { chrome.action.setBadgeText({ text: on ? '…' : '' }); if (on) chrome.action.setBadgeBackgroundColor({ color: '#5b5ff7' }); }

function notify(message, title = 'VocabFlash') {
  chrome.notifications.create({ type: 'basic', iconUrl: 'icon128.png', title, message, silent: true }, id => {
    setTimeout(() => chrome.notifications.clear(id), 6000);
  });
}
