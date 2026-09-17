import { $, $$, esc, toast, debounce } from '../utils.js?v=11';
import { Store } from '../store.js?v=11';
import { Auth } from '../auth.js?v=11';
import { setTitle, avatarHTML, renderSidebar } from '../shell.js?v=11';
import { openModal, closeModal, confirmModal } from '../modal.js?v=11';
import { Community } from '../community.js?v=11';
import { go } from '../router.js?v=11';

const st = { q: '', sort: 'top', tab: 'all' };

/* Chợ chủ đề: duyệt, tìm kiếm, xem trước và clone bộ từ cộng đồng chia sẻ */
export function viewExplore(el) {
  setTitle('Chợ chủ đề');
  el.innerHTML = `
    <div class="page-head">
      <div><h1>🌍 Chợ chủ đề</h1><p class="muted">Bộ từ vựng do cộng đồng chia sẻ. Bấm <b>Clone</b> để lấy về tài khoản của bạn rồi tuỳ ý chỉnh sửa.</p></div>
      <span class="muted small">Muốn chia sẻ? Vào chủ đề → <b>📤 Chia sẻ</b> → <b>Đăng lên Chợ chủ đề</b></span>
    </div>
    ${!Community.available ? `<div class="card empty-state"><div class="big">🌍</div>${Auth.user?.guest ? 'Bạn đang dùng chế độ khách – <a href="#/register" style="color:var(--primary)">tạo tài khoản</a> để duyệt và clone bộ từ của cộng đồng.' : 'Chợ chủ đề cần kết nối Supabase (chế độ cloud).'}</div>` : `
    <div class="toolbar">
      <input class="input" id="exQ" placeholder="🔍 Tìm theo tên, mô tả, người đăng..." value="${esc(st.q)}">
      <div class="seg" id="exSort"><button class="${st.sort === 'top' ? 'active' : ''}" data-sort="top">🔥 Nhiều clone</button><button class="${st.sort === 'new' ? 'active' : ''}" data-sort="new">🆕 Mới nhất</button></div>
      <div class="seg" id="exTab"><button class="${st.tab === 'all' ? 'active' : ''}" data-tab="all">Tất cả</button><button class="${st.tab === 'mine' ? 'active' : ''}" data-tab="mine">Của tôi</button></div>
    </div>
    <div id="exList"><div class="card empty-state">Đang tải...</div></div>`}`;
  if (!Community.available) return;

  const load = async () => {
    const box = $('#exList', el);
    try {
      const rows = await Community.list({ q: st.q, sort: st.sort, mine: st.tab === 'mine' });
      const myTopics = Store.topics();
      box.innerHTML = rows.length ? `<div class="grid">${rows.map(r => {
        const mine = r.owner_id === Auth.user.id;
        const cloned = myTopics.some(t => t.clonedFrom === r.id);
        return `<div class="card ex-card" data-id="${r.id}">
          <div class="row between"><span class="icon">${r.icon || '📚'}</span><span class="chip ${r.clones ? 'good' : ''}" title="Số lượt clone">⬇️ ${r.clones}</span></div>
          <div class="name">${esc(r.name)}</div>
          <div class="desc">${esc(r.desc) || '<span class="muted">Không có mô tả</span>'}</div>
          <div class="row" style="gap:8px">${avatarHTML({ name: r.owner_name, avatar: r.owner_avatar }, 22)}<span class="small muted">${esc(r.owner_name)}${mine ? ' (bạn)' : ''}</span></div>
          <div class="meta"><span>${r.word_count} từ</span><span>${new Date(r.updated_at).toLocaleDateString('vi-VN')}</span></div>
          <div class="row">
            <button class="btn btn-sm" data-act="preview">👁 Xem</button>
            ${mine ? `<button class="btn btn-sm btn-danger" data-act="remove">Gỡ</button>` : `<button class="btn btn-sm btn-primary" data-act="clone">${cloned ? '⬇️ Clone lại' : '⬇️ Clone'}</button>`}
          </div>
        </div>`;
      }).join('')}</div>` : `<div class="card empty-state"><div class="big">🌱</div>${st.tab === 'mine' ? 'Bạn chưa đăng bộ từ nào. Vào một chủ đề → 📤 Chia sẻ → Đăng lên Chợ chủ đề.' : st.q ? 'Không tìm thấy bộ từ nào.' : 'Chưa có ai chia sẻ. Hãy là người đầu tiên!'}</div>`;
      box.onclick = async e => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        const row = rows.find(r => r.id === b.closest('.ex-card').dataset.id);
        if (b.dataset.act === 'preview') previewModal(row);
        else if (b.dataset.act === 'clone') cloneTopic(row, b);
        else if (b.dataset.act === 'remove') {
          if (await confirmModal('Gỡ khỏi chợ?', `Bộ "${row.name}" sẽ không còn hiện trên Chợ chủ đề (chủ đề trong tài khoản bạn vẫn giữ nguyên).`, 'Gỡ')) {
            try { const t = Store.topics().find(x => x.publicId === row.id); if (t) await Community.unpublish(t); else await Auth.sb.from('public_topics').delete().eq('id', row.id); toast('Đã gỡ'); load(); }
            catch (err) { toast('Lỗi: ' + err.message); }
          }
        }
      };
    } catch (err) { box.innerHTML = `<div class="card empty-state">⚠️ ${esc(err.message)}</div>`; }
  };
  const q = $('#exQ', el);
  q.addEventListener('input', debounce(() => { st.q = q.value; load(); }, 350));
  $('#exSort', el).addEventListener('click', e => { const b = e.target.closest('[data-sort]'); if (b) { st.sort = b.dataset.sort; $$('[data-sort]', el).forEach(x => x.classList.toggle('active', x === b)); load(); } });
  $('#exTab', el).addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { st.tab = b.dataset.tab; $$('[data-tab]', el).forEach(x => x.classList.toggle('active', x === b)); load(); } });
  load();
}

async function cloneTopic(row, btn) {
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
  try {
    const t = await Community.clone(row);
    renderSidebar();
    toast(`Đã clone "${row.name}" (${row.word_count} từ)`);
    closeModal(); go('/topic/' + t.id);
  } catch (err) { toast('Lỗi: ' + err.message); if (btn) { btn.disabled = false; btn.textContent = '⬇️ Clone'; } }
}

async function previewModal(row) {
  openModal(`<h2>${row.icon} ${esc(row.name)}</h2><p class="muted small">${esc(row.desc)} · ${row.word_count} từ · bởi ${esc(row.owner_name)}</p><div id="pvList" class="empty-state">Đang tải...</div>
    <div class="modal-actions"><button class="btn" data-close>Đóng</button>${row.owner_id !== Auth.user.id ? `<button class="btn btn-primary" id="pvClone">⬇️ Clone về tài khoản</button>` : ''}</div>`, async root => {
    $('#pvClone', root)?.addEventListener('click', e => cloneTopic(row, e.currentTarget));
    try {
      const words = await Community.words(row.id);
      $('#pvList', root).outerHTML = `<div class="table-wrap" style="max-height:50vh;overflow:auto"><table style="min-width:0"><thead><tr><th>Từ</th><th>Phiên âm</th><th>Nghĩa</th></tr></thead><tbody>${words.map(w => `<tr><td><b>${esc(w.word)}</b>${w.pos ? ` <span class="pos">${esc(w.pos)}</span>` : ''}</td><td class="ipa">${esc(w.phonetic)}</td><td>${esc(w.meaning)}${w.example ? `<div class="small muted"><i>${esc(w.example)}</i></div>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
    } catch (err) { $('#pvList', root).textContent = '⚠️ ' + err.message; }
  });
}
