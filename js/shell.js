import { $, $$, esc, initials } from './utils.js?v=12';
import { Store } from './store.js?v=12';
import { Auth } from './auth.js?v=12';
import { CONFIG } from './config.js?v=12';
import { Inbox } from './inbox.js?v=12';

/* Khung giao diện chung: sidebar, thanh tiêu đề, giao diện sáng/tối, trạng thái đồng bộ */

export function setTitle(t) {
  $('#topbarTitle').textContent = t;
  document.title = t + ' – ' + CONFIG.APP_NAME;
}

export function applyTheme() {
  const t = Store.data ? Store.settings.theme : (localStorage.getItem('vocabflash.theme') || 'light');
  document.documentElement.dataset.theme = t;
  localStorage.setItem('vocabflash.theme', t);
  $$('.btn-theme').forEach(b => b.textContent = t === 'dark' ? '☀️' : '🌙');
}

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  if (Store.data) { Store.settings.theme = next; Store.save(); }
  else localStorage.setItem('vocabflash.theme', next);
  applyTheme();
}

export function avatarHTML(user, size = 36) {
  if (user.avatar) return `<img class="avatar" src="${esc(user.avatar)}" alt="" width="${size}" height="${size}" referrerpolicy="no-referrer">`;
  return `<span class="avatar avatar-text" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .4)}px">${user.guest ? '👤' : esc(initials(user.name))}</span>`;
}

export function renderSidebar(activeTopicId) {
  if (!Store.data) return;
  const topics = Store.topics();
  $('#topicList').innerHTML = topics.length
    ? topics.map(t => `<li><a href="#/topic/${t.id}" class="${activeTopicId === t.id ? 'active' : ''}">
        <span class="t-icon">${t.icon}</span><span class="t-name">${esc(t.name)}</span><span class="t-count">${Store.wordsOf(t.id).length}</span><button class="t-del" data-del-topic="${t.id}" title="Xoá chủ đề ${esc(t.name)}">🗑️</button></a></li>`).join('')
    : '<li class="empty">Chưa có chủ đề nào. Bấm ＋ để tạo.</li>';
  const due = Store.dueWords().length;
  $('#dueBadge').textContent = due ? due : '';
  Inbox.renderBadge();
  renderUserCard();
  renderSyncState(Store.syncState);
}

export function renderUserCard() {
  const u = Auth.user; if (!u) return;
  $('#userCard').innerHTML = `
    <a href="#/profile" class="user-link" title="Hồ sơ">
      ${avatarHTML(u, 38)}
      <span class="user-info"><b>${esc(u.name)}</b><small>${u.guest ? 'Chế độ khách' : esc(u.email)}</small></span>
    </a>
    <button class="btn-icon sm btn-ghost" id="btnLogout" title="Đăng xuất">⏻</button>`;
}

const SYNC_TEXT = {
  local: ['💾', 'Lưu trên máy này'],
  saving: ['⏳', 'Đang đồng bộ...'],
  synced: ['☁️', 'Đã đồng bộ'],
  error: ['⚠️', 'Lỗi đồng bộ – bấm để thử lại'],
};
export function renderSyncState(state) {
  const el = $('#syncState'); if (!el) return;
  const [ic, txt] = SYNC_TEXT[state] || SYNC_TEXT.local;
  el.innerHTML = `<span>${ic}</span> ${txt}`;
  el.dataset.state = state;
}

export function setNavActive(view) {
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === view));
}

export function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#sidebarBackdrop').classList.remove('show');
}
export function toggleSidebar() {
  $('#sidebar').classList.toggle('open');
  $('#sidebarBackdrop').classList.toggle('show');
}
