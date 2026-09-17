import { addWord, defineWord, updateWord } from './api.js';

/* Menu chuột phải "Thêm vào VocabFlash" khi bôi đen chữ trên trang web */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'vf-add', title: 'Thêm "%s" vào VocabFlash', contexts: ['selection'] });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'vf-add') return;
  const word = (info.selectionText || '').replace(/\s+/g, ' ').trim().replace(/^[\s"'“”‘’(\[]+|[\s"'“”‘’.,;:!?)\]]+$/g, '');
  if (!word) return;
  if (word.length > 80) { notify('Chỉ nên chọn một từ hoặc cụm từ ngắn (tối đa 80 ký tự)'); return; }
  // Lấy câu chứa từ để làm ví dụ (chạy trong trang; bỏ qua nếu trang không cho phép)
  let context = '';
  try {
    const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: sentenceAround, args: [word] });
    context = r?.result || '';
  } catch { /* ví dụ: trang chrome:// hoặc PDF */ }
  try {
    // Thêm ngay (web nhận được tức thì qua realtime), dịch nghĩa chạy nền rồi cập nhật sau
    const id = await addWord({ word, context, url: info.pageUrl || tab.url || '', title: tab.title || '' });
    busy(true);
    const def = await defineWord(word, context); // qua Edge Function gemini (nếu đã triển khai)
    busy(false);
    if (def && id) await updateWord(id, def);
    notify(def ? `${def.word || word} ${def.phonetic ? def.phonetic + ' ' : ''}= ${def.meaning}` : `Đã thêm "${word}" vào Hộp thư từ VocabFlash`, def ? 'Đã thêm vào VocabFlash' : undefined);
  } catch (e) { busy(false); notify('Không thêm được: ' + e.message); }
});

// Hàm này được tiêm vào trang: tìm câu chứa đoạn đang bôi đen
function sentenceAround(word) {
  try {
    const sel = window.getSelection(); if (!sel || !sel.rangeCount) return '';
    let node = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType !== 1) node = node.parentElement;
    // Leo lên tới khối văn bản đủ dài (đoạn văn), tránh lấy cả trang
    let el = node; while (el && el.parentElement && (el.innerText || '').length < 60 && !/^(P|LI|TD|H\d|BLOCKQUOTE|ARTICLE|DIV)$/.test(el.tagName)) el = el.parentElement;
    const text = (el?.innerText || '').replace(/\s+/g, ' ').trim();
    const sentences = text.match(/[^.!?]+[.!?]+["'”’)]?|[^.!?]+$/g) || [text];
    const hit = sentences.find(s => s.toLowerCase().includes(word.toLowerCase())) || '';
    return hit.trim().slice(0, 400);
  } catch { return ''; }
}

// Dấu "…" trên icon khi đang dịch
function busy(on) { chrome.action.setBadgeText({ text: on ? '…' : '' }); if (on) chrome.action.setBadgeBackgroundColor({ color: '#5b5ff7' }); }

function notify(message, title = 'VocabFlash') {
  chrome.notifications.create({ type: 'basic', iconUrl: 'icon128.png', title, message, silent: true }, id => {
    setTimeout(() => chrome.notifications.clear(id), 6000);
  });
}
