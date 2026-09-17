import { CONFIG } from './config.js';
import { getSession, login, logout, addWord, defineWords, updateWord, pendingCount, translatePassage, diagnose } from './api.js';

const $ = s => document.querySelector(s);
const msg = (el, text, ok) => { el.textContent = text; el.className = 'msg ' + (text ? (ok ? 'ok' : 'err') : ''); };
const openApp = (hash = '') => chrome.tabs.create({ url: CONFIG.APP_URL + hash });

async function render() {
  const s = await getSession();
  $('#login').hidden = !!s; $('#main').hidden = !s;
  if (s) {
    $('#userName').textContent = s.user.name || s.user.email;
    try { const n = await pendingCount(); $('#pending').textContent = n ? `📥 ${n} từ đang chờ trên web` : 'Hộp thư trống'; }
    catch (e) { $('#pending').textContent = ''; msg($('#mainMsg'), e.message, false); if (/đăng nhập/i.test(e.message)) render(); }
    $('#quickWord').focus();
  } else $('#email').focus();
}

$('#btnLogin').addEventListener('click', async () => {
  const b = $('#btnLogin'); b.disabled = true; msg($('#loginMsg'), '');
  try { await login($('#email').value, $('#password').value); await render(); }
  catch (e) { msg($('#loginMsg'), e.message, false); }
  finally { b.disabled = false; }
});
$('#password').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btnLogin').click(); });
$('#btnLogout').addEventListener('click', async () => { await logout(); render(); });

// Thêm nhanh: nhiều từ cách nhau bằng dấu phẩy / chấm phẩy / xuống dòng → thêm hết, dịch cả loạt trong 1 lời gọi
const quick = async () => {
  const words = [...new Set($('#quickWord').value.split(/[,;\n]+/).map(w => w.replace(/\s+/g, ' ').trim()).filter(w => w && w.length <= 80))];
  if (!words.length) return;
  const b = $('#btnQuick'); b.disabled = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const src = { url: tab?.url && /^https?:/.test(tab.url) ? tab.url : '', title: tab?.title || '' };
    const ids = await Promise.all(words.map(word => addWord({ word, ...src })));
    $('#quickWord').value = ''; msg($('#mainMsg'), `Đã thêm ${words.length} từ – ⏳ đang dịch...`, true); render();
    const defs = await defineWords(words.map(word => ({ word })));
    await Promise.all(defs.map((def, i) => def && ids[i] ? updateWord(ids[i], def) : null));
    const lines = words.map((w, i) => defs[i] ? `✔ ${defs[i].word || w} ${defs[i].phonetic} = ${defs[i].meaning}` : `✔ ${w} (chưa dịch được)`);
    msg($('#mainMsg'), lines.join('\n'), true);
  } catch (e) { msg($('#mainMsg'), e.message, false); }
  finally { b.disabled = false; }
};
$('#btnQuick').addEventListener('click', quick);

// Dịch đoạn văn dán trong popup
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
$('#btnTranslate').addEventListener('click', async () => {
  const text = $('#passage').value.trim(); if (!text) { $('#passage').focus(); return; }
  const b = $('#btnTranslate'), out = $('#trOut'); b.disabled = true; b.textContent = '⏳ Đang dịch...'; out.hidden = false; out.textContent = 'Đang dịch ' + text.length + ' ký tự…';
  try {
    const r = await translatePassage(text);
    out.innerHTML = esc(r.translation) + r.words.map((w, i) => `<div class="w"><b>${esc(w.word)}</b> <span>${esc(w.meaning)}</span><button data-i="${i}" title="Thêm vào Hộp thư từ">＋</button></div>`).join('');
    out.querySelectorAll('button').forEach(btn => btn.addEventListener('click', async () => {
      const w = r.words[+btn.dataset.i]; btn.disabled = true; btn.textContent = '…';
      try { const id = await addWord({ word: w.word, context: text.slice(0, 400) }); if (id) await updateWord(id, { word: w.word, phonetic: w.phonetic, pos: w.pos, meaning: w.meaning, exampleVi: '', note: w.note }); btn.textContent = '✓'; render(); }
      catch (e) { btn.textContent = '!'; msg($('#mainMsg'), e.message, false); }
    }));
  } catch (e) { out.textContent = '⚠️ ' + e.message; }
  finally { b.disabled = false; b.textContent = '🌐 Dịch'; }
});
$('#quickWord').addEventListener('keydown', e => { if (e.key === 'Enter') quick(); });
$('#btnDiag').addEventListener('click', async () => {
  const box = $('#diag'); box.hidden = false; box.textContent = '⏳ Đang kiểm tra...';
  const rows = await diagnose();
  box.innerHTML = rows.map(([k, t]) => `<div class="${k}">${k === 'ok' ? '✔' : k === 'warn' ? '⚠' : '✖'} ${esc(t)}</div>`).join('');
});
$('#openApp1').addEventListener('click', e => { e.preventDefault(); openApp('#/'); });
$('#openApp2').addEventListener('click', e => { e.preventDefault(); openApp('#/inbox'); });

render();
