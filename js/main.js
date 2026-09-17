import { $, $$, toast } from './utils.js?v=12';
import { Auth } from './auth.js?v=12';
import { Store } from './store.js?v=12';
import { TTS } from './tts.js?v=12';
import { applyTheme, toggleTheme, toggleSidebar, closeSidebar, renderSyncState, renderUserCard } from './shell.js?v=12';
import { closeModal, isModalOpen, confirmModal } from './modal.js?v=12';
import { topicForm } from './forms.js?v=12';
import { render, parseHash } from './router.js?v=12';
import { Inbox } from './inbox.js?v=12';

/* Điểm khởi động ứng dụng */
async function boot() {
  applyTheme();
  TTS.init();
  TTS.onVoicesChanged = () => { if (parseHash().view === 'settings' && Store.data) render(); };

  // Nút trong khung giao diện
  $('#btnNewTopic').addEventListener('click', () => topicForm());
  // Nút 🗑️ trong danh sách chủ đề ở sidebar
  $('#topicList').addEventListener('click', async e => {
    const b = e.target.closest('[data-del-topic]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const t = Store.topic(b.dataset.delTopic); if (!t) return;
    const n = Store.wordsOf(t.id).length;
    if (await confirmModal('Xoá chủ đề?', `Chủ đề "${t.name}" và ${n} từ vựng bên trong sẽ bị xoá vĩnh viễn.`, 'Xoá chủ đề')) {
      Store.deleteTopic(t.id); toast(`Đã xoá "${t.name}"`);
      if (location.hash.includes('/' + t.id)) location.hash = '#/'; else render();
    }
  });
  $$('.btn-theme').forEach(b => b.addEventListener('click', toggleTheme));
  $('#btnMenu').addEventListener('click', toggleSidebar);
  $('#sidebarBackdrop').addEventListener('click', closeSidebar);
  $('#userCard').addEventListener('click', e => { if (e.target.closest('#btnLogout')) Auth.signOut(); });
  $('#syncState').addEventListener('click', () => { if (Store.syncState === 'error') { Store.retrySync(); toast('Đang thử đồng bộ lại...'); } });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
    // Ctrl/Cmd + K: mở tìm kiếm nhanh
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && Store.data) { e.preventDefault(); if (location.hash === '#/search') { const i = $('#sq'); i?.focus(); i?.select(); } else location.hash = '#/search'; }
  });
  Store.onSync(renderSyncState);
  // Dữ liệu đổi từ thiết bị/tab khác → vẽ lại màn hình hiện tại
  Store.onRemoteChange(() => { if (!isModalOpen()) { render(); toast('Đã cập nhật dữ liệu từ thiết bị khác'); } });
  // Có mạng trở lại → đẩy các thay đổi còn dở
  window.addEventListener('online', () => Store.retrySync());
  // Tab sắp bị ẩn/đóng → gửi ngay thay đổi cuối cùng
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Store.flushNow(); });
  window.addEventListener('pagehide', () => Store.flushNow());

  // Đang quay về từ Google/Apple? (URL có ?code=... hoặc #access_token=...) – phải để nguyên URL
  // cho supabase-js đọc và đổi lấy phiên đăng nhập trong Auth.init(), rồi mới dọn URL.
  const oauthReturn = /[?&]code=/.test(location.search) || /access_token=|refresh_token=/.test(location.hash);
  const oauthError = new URLSearchParams(location.search + '&' + location.hash.replace(/^#\/?/, '')).get('error_description');

  await Auth.init();
  if (oauthReturn || oauthError) history.replaceState(null, '', location.pathname + '#/');
  if (Auth.user) { await Store.open(Auth.user); Inbox.init(); }
  hideSplash();
  if (Auth.cloudError) toast('⚠️ ' + Auth.cloudError, 6000);
  if (oauthError) toast('Đăng nhập thất bại: ' + oauthError, 6000);
  else if (oauthReturn && !Auth.user) toast('Không nhận được phiên đăng nhập từ Google – kiểm tra Redirect URLs trong Supabase', 7000);

  // Khi đăng nhập / đăng xuất / đổi tên
  Auth.onChange(async user => {
    if (user) {
      if (Store.user && Store.user.id === user.id) { renderUserCard(); return; } // chỉ cập nhật hồ sơ
      closeModal();
      Store.close(); Inbox.close();
      await Store.open(user); Inbox.init();
      const redirect = sessionStorage.getItem('vocabflash.redirect'); sessionStorage.removeItem('vocabflash.redirect');
      toast(`Xin chào, ${user.name}!`);
      goAndRender(redirect && !/#\/(login|register|landing)/.test(redirect) ? redirect : '#/');
    } else {
      closeModal();
      Store.close(); Inbox.close();
      goAndRender('#/');
    }
  });

  window.addEventListener('hashchange', render);
  render();
}

// Đổi hash rồi render; nếu hash không đổi thì render ngay (hashchange sẽ không bắn)
function goAndRender(hash) {
  if (location.hash === hash) render(); else location.hash = hash;
}

function hideSplash() {
  const s = $('#splash'); if (!s) return;
  s.classList.add('hide'); setTimeout(() => s.remove(), 350);
}


boot().catch(err => {
  console.error(err);
  hideSplash();
  document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif"><h2>Không khởi động được ứng dụng</h2><pre>${err.message}</pre><p>Hãy mở web qua một server (ví dụ chạy <code>start.bat</code>) thay vì mở trực tiếp file.</p></div>`;
});

