import { CONFIG } from './config.js';
import { getSession, login, logout, addWord, pendingCount } from './api.js';

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

const quick = async () => {
  const word = $('#quickWord').value.replace(/\s+/g, ' ').trim(); if (!word) return;
  const b = $('#btnQuick'); b.disabled = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await addWord({ word, url: tab?.url && /^https?:/.test(tab.url) ? tab.url : '', title: tab?.title || '' });
    $('#quickWord').value = ''; msg($('#mainMsg'), `Đã thêm "${word}"`, true); render();
  } catch (e) { msg($('#mainMsg'), e.message, false); }
  finally { b.disabled = false; }
};
$('#btnQuick').addEventListener('click', quick);
$('#quickWord').addEventListener('keydown', e => { if (e.key === 'Enter') quick(); });
$('#openApp1').addEventListener('click', e => { e.preventDefault(); openApp('#/'); });
$('#openApp2').addEventListener('click', e => { e.preventDefault(); openApp('#/inbox'); });

render();
