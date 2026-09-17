import { $, esc, toast } from '../utils.js?v=10';
import { Store } from '../store.js?v=10';
import { Auth } from '../auth.js?v=10';
import { setTitle, avatarHTML, renderUserCard } from '../shell.js?v=10';
import { confirmModal } from '../modal.js?v=10';

const PROVIDER_LABEL = { google: 'Google', apple: 'Apple', email: 'Email', guest: 'Khách' };

/* Hồ sơ người dùng */
export function viewProfile(el) {
  setTitle('Hồ sơ');
  const u = Auth.user;
  const words = Store.words();
  const totalReviews = Object.values(Store.data.activity).reduce((s, a) => s + a.reviews, 0);
  const totalCorrect = Object.values(Store.data.activity).reduce((s, a) => s + a.correct, 0);
  const days = Object.keys(Store.data.activity).filter(k => Store.data.activity[k].reviews > 0).length;
  const acc = totalReviews ? Math.round(totalCorrect / totalReviews * 100) : 0;

  el.innerHTML = `
    <div class="page-head"><div><h1>👤 Hồ sơ</h1></div></div>
    <div class="stack">
      <div class="card profile-head">
        ${avatarHTML(u, 72)}
        <div style="flex:1">
          <h2 style="margin:0">${esc(u.name)}</h2>
          <div class="muted">${u.guest ? 'Chế độ khách – dữ liệu chỉ lưu trên trình duyệt này' : esc(u.email)}</div>
          <div class="small muted mt" style="margin-top:6px">Đăng nhập bằng: <b>${PROVIDER_LABEL[u.provider] || esc(u.provider)}</b> · ${Store.cloud ? '☁️ Đồng bộ đám mây' : '💾 Lưu cục bộ'}</div>
        </div>
        ${u.guest ? `<a class="btn btn-primary" href="#/register" data-act="upgrade">Tạo tài khoản để đồng bộ</a>` : ''}
      </div>

      <div class="stats" style="margin:0">
        <div class="stat accent"><div class="n">${Store.streak()}</div><div class="l">🔥 Ngày liên tiếp</div></div>
        <div class="stat"><div class="n">${days}</div><div class="l">Ngày đã học</div></div>
        <div class="stat"><div class="n">${totalReviews}</div><div class="l">Lượt ôn</div></div>
        <div class="stat good"><div class="n">${acc}%</div><div class="l">Tỉ lệ nhớ</div></div>
        <div class="stat good"><div class="n">${words.filter(w => w.level >= 5).length}</div><div class="l">Từ đã thuộc</div></div>
      </div>

      <div class="card">
        <h3>Thông tin</h3>
        <div class="field"><label>Tên hiển thị</label><div class="row nowrap"><input id="pName" value="${esc(u.name)}" style="flex:1"><button class="btn btn-primary" id="pSave">Lưu</button></div></div>
      </div>

      <div class="card">
        <h3>Tài khoản</h3>
        <div class="row">
          <button class="btn" id="pLogout">⏻ Đăng xuất</button>
          ${u.guest ? '' : `<button class="btn btn-danger" id="pWipe" style="margin-left:auto">Xoá dữ liệu học của tài khoản này</button>`}
        </div>
        ${u.guest ? `<p class="muted small mt">Khi bạn tạo tài khoản mới trên máy này, dữ liệu khách hiện tại sẽ tự động được chuyển sang tài khoản đó.</p>` : ''}
      </div>
    </div>`;

  $('#pSave', el).addEventListener('click', async () => {
    try { await Auth.updateProfile({ name: $('#pName', el).value }); renderUserCard(); Store.pushLeaderboard(); toast('Đã lưu'); viewProfile(el); }
    catch (e) { toast(e.message); }
  });
  $('#pLogout', el).addEventListener('click', async () => {
    if (await confirmModal('Đăng xuất?', u.guest ? 'Dữ liệu khách vẫn được giữ trên trình duyệt này.' : 'Bạn có thể đăng nhập lại bất cứ lúc nào.', 'Đăng xuất', 'btn-primary')) Auth.signOut();
  });
  $('#pWipe', el)?.addEventListener('click', async () => {
    if (await confirmModal('Xoá toàn bộ dữ liệu học?', 'Chủ đề, từ vựng và tiến độ của tài khoản này sẽ bị xoá (kể cả trên đám mây nếu đang đồng bộ).', 'Xoá tất cả')) { Store.clearAll(); toast('Đã xoá'); viewProfile(el); }
  });
}
