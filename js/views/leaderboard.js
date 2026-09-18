import { $, $$, esc, todayKey, weekKey } from '../utils.js?v=13';
import { Store } from '../store.js?v=13';
import { Auth } from '../auth.js?v=13';
import { setTitle, avatarHTML } from '../shell.js?v=13';

const TABS = [
  { id: 'day', label: '📅 Hôm nay', col: 'day_reviews', keyCol: 'day_key', unit: 'lượt ôn hôm nay' },
  { id: 'week', label: '🗓️ Tuần này', col: 'week_reviews', keyCol: 'week_key', unit: 'lượt ôn tuần này' },
  { id: 'total', label: '🏅 Tổng', col: 'total_reviews', keyCol: null, unit: 'lượt ôn tổng' },
];
const TOP_N = 20;
let tab = 'day';

/* Bảng xếp hạng top 20 theo ngày / tuần / tổng số lượt ôn */
export function viewLeaderboard(el) {
  setTitle('Bảng xếp hạng');
  const me = Store.leaderboardRow();
  el.innerHTML = `
    <div class="page-head"><div><h1>🏆 Bảng xếp hạng</h1><p class="muted">Top ${TOP_N} người học chăm chỉ nhất – tính theo số lượt ôn (flashcard, quiz, ôn tập).</p></div></div>
    <div class="seg mb" id="lbTabs">${TABS.map(t => `<button class="${t.id === tab ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}</div>
    <div class="dash-grid">
      <div class="card" id="lbList"><div class="empty-state">Đang tải...</div></div>
      <div class="card">
        <h3>Thành tích của bạn</h3>
        <div class="stats" style="margin:0;grid-template-columns:1fr 1fr">
          <div class="stat accent"><div class="n">${me.day_reviews}</div><div class="l">Hôm nay</div></div>
          <div class="stat"><div class="n">${me.week_reviews}</div><div class="l">Tuần này</div></div>
          <div class="stat"><div class="n">${me.total_reviews}</div><div class="l">Tổng lượt ôn</div></div>
          <div class="stat warn"><div class="n">${me.streak}</div><div class="l">🔥 Ngày liên tiếp</div></div>
        </div>
        <p class="muted small mt" id="lbMine"></p>
        ${!Store.cloud ? `<p class="muted small mt">${Auth.user?.guest ? 'Bạn đang dùng chế độ khách – <a href="#/register" style="color:var(--primary)">tạo tài khoản</a> để xuất hiện trên bảng xếp hạng.' : 'Bảng xếp hạng cần kết nối Supabase (chế độ cloud).'}</p>`
          : Store.settings.showOnLeaderboard === false ? '<p class="muted small mt">Bạn đang ẩn khỏi bảng xếp hạng. Bật lại trong <a href="#/settings" style="color:var(--primary)">Cài đặt</a>.</p>' : ''}
      </div>
    </div>`;
  $('#lbTabs', el).addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; $$('[data-tab]', el).forEach(x => x.classList.toggle('active', x === b)); load(); } });
  load();

  async function load() {
    const t = TABS.find(x => x.id === tab);
    const box = $('#lbList', el), mine = $('#lbMine', el);
    if (!Store.cloud) { box.innerHTML = `<div class="empty-state"><div class="big">🏆</div>Bảng xếp hạng chỉ hoạt động khi đăng nhập tài khoản (đồng bộ đám mây).</div>`; return; }
    try {
      await Store.pushLeaderboard(); // cập nhật số của mình trước khi xem
      let q = Auth.sb.from('leaderboard').select('user_id, display_name, avatar, day_reviews, week_reviews, total_reviews, streak, mastered').gt(t.col, 0).order(t.col, { ascending: false }).order('updated_at', { ascending: true }).limit(TOP_N);
      if (t.keyCol) q = q.eq(t.keyCol, t.id === 'day' ? todayKey() : weekKey());
      const { data, error } = await q;
      if (error) throw error;
      const rows = data || [];
      const myIdx = rows.findIndex(r => r.user_id === Auth.user.id);
      box.innerHTML = rows.length
        ? `<ul class="lb-list">${rows.map((r, i) => `<li class="${r.user_id === Auth.user.id ? 'me' : ''}">
            <div class="lb-rank ${i < 3 ? 'top' : ''}">${['🥇', '🥈', '🥉'][i] || i + 1}</div>
            ${avatarHTML({ name: r.display_name, avatar: r.avatar }, 36)}
            <div class="lb-name">${esc(r.display_name)}${r.user_id === Auth.user.id ? ' <span class="pos">bạn</span>' : ''}<small>🔥 ${r.streak} ngày · ${r.mastered} từ thuộc</small></div>
            <div class="lb-score">${r[t.col]} <small>${t.unit.split(' ')[0]}</small></div>
          </li>`).join('')}</ul>`
        : `<div class="empty-state"><div class="big">🌱</div>Chưa có ai ôn ${t.id === 'day' ? 'hôm nay' : t.id === 'week' ? 'tuần này' : ''}. Hãy là người đầu tiên!</div>`;
      // Thứ hạng của tôi nếu ngoài top
      const myScore = me[t.col];
      if (myIdx >= 0) mine.textContent = `Bạn đang đứng hạng ${myIdx + 1} (${t.unit}).`;
      else if (myScore > 0 && Store.settings.showOnLeaderboard !== false) {
        let cq = Auth.sb.from('leaderboard').select('user_id', { count: 'exact', head: true }).gt(t.col, myScore);
        if (t.keyCol) cq = cq.eq(t.keyCol, t.id === 'day' ? todayKey() : weekKey());
        const { count } = await cq;
        mine.textContent = `Bạn đang đứng hạng ${(count || 0) + 1} (${t.unit}) – ngoài top ${TOP_N}, cố lên!`;
      } else mine.textContent = myScore > 0 ? '' : `Ôn vài từ để có mặt trên bảng xếp hạng ${t.id === 'day' ? 'hôm nay' : ''}.`;
    } catch (e) {
      box.innerHTML = `<div class="empty-state">⚠️ Không tải được bảng xếp hạng: ${esc(e.message || e)}<br><span class="small">Nếu vừa cập nhật web, hãy chạy lại <code>supabase/schema.sql</code> để tạo bảng <code>leaderboard</code>.</span></div>`;
    }
  }
}
