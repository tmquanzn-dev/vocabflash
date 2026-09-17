import { $, $$, esc, toast } from '../utils.js?v=9';
import { Store } from '../store.js?v=9';
import { Auth } from '../auth.js?v=9';
import { TTS } from '../tts.js?v=9';
import { setTitle } from '../shell.js?v=9';
import { confirmModal } from '../modal.js?v=9';
import { topicForm, libraryForm } from '../forms.js?v=9';
import { render } from '../router.js?v=9';

// Chế độ quản lý chủ đề: chọn nhiều chủ đề để xoá
const mg = { on: false, sel: new Set() };

/* Trang tổng quan sau khi đăng nhập */
export function viewHome(el) {
  setTitle('Trang chủ');
  const topics = Store.topics(), words = Store.words();
  const mastered = words.filter(w => w.level >= 5).length;
  const learning = words.filter(w => w.level > 0 && w.level < 5).length;
  const due = Store.dueWords().length;
  const today = Store.todayActivity();
  const goal = Store.settings.dailyGoal;
  const goalPct = Math.min(100, Math.round(today.reviews / goal * 100));
  const streak = Store.streak();
  const week = Store.last7Days();
  const maxWeek = Math.max(goal, ...week.map(d => d.reviews));
  const hard = Store.hardWords(5);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  if (!topics.length) { mg.on = false; }
  const ids = new Set(topics.map(t => t.id)); mg.sel.forEach(x => { if (!ids.has(x)) mg.sel.delete(x); });

  el.innerHTML = `
    <div class="page-head">
      <div><h1>${greet}, ${esc(Auth.user.name)}! 👋</h1><p class="muted">${due ? `Bạn có <b>${due}</b> từ đến hạn ôn hôm nay.` : today.reviews >= goal ? 'Bạn đã hoàn thành mục tiêu hôm nay 🎉' : 'Hôm nay bạn muốn học gì?'}</p></div>
      <div class="row">
        ${due ? `<a class="btn btn-success" href="#/review">⏰ Ôn ${due} từ đến hạn</a>` : ''}
        <button class="btn btn-primary" data-act="newTopic">＋ Chủ đề mới</button>
      </div>
    </div>

    <div class="dash-grid">
      <div class="card goal-card">
        <div class="goal-ring" style="--p:${goalPct}"><div><b>${today.reviews}</b><small>/ ${goal}</small></div></div>
        <div>
          <h3>Mục tiêu hôm nay</h3>
          <p class="muted small">${today.reviews >= goal ? 'Tuyệt vời, đã đạt mục tiêu!' : `Còn ${goal - today.reviews} lượt ôn nữa. Học flashcard, quiz hoặc luyện ngữ pháp để tích luỹ.`}</p>
          <div class="streak">🔥 <b>${streak}</b> ngày liên tiếp</div>
        </div>
      </div>
      <div class="card">
        <h3>7 ngày gần đây</h3>
        <div class="week-bars" role="img" aria-label="Số lượt ôn 7 ngày gần đây">
          ${week.map((d, i) => `<div class="wb ${i === 6 ? 'today' : ''}" title="${d.key}: ${d.reviews} lượt ôn, ${d.correct} đúng"><div class="bar" style="height:${maxWeek ? Math.round(d.reviews / maxWeek * 100) : 0}%"></div><span>${d.label}</span></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="stats">
      <div class="stat accent"><div class="n">${topics.length}</div><div class="l">Chủ đề</div></div>
      <div class="stat"><div class="n">${words.length}</div><div class="l">Tổng từ vựng</div></div>
      <div class="stat warn"><div class="n">${learning}</div><div class="l">Đang học</div></div>
      <div class="stat good"><div class="n">${mastered}</div><div class="l">Đã thuộc</div></div>
      <div class="stat ${due ? 'warn' : ''}"><div class="n">${due}</div><div class="l">Cần ôn hôm nay</div></div>
    </div>

    <div class="section-links mb">
      <a class="card section-link" href="#/grammar"><span class="ic">📐</span><div><b>Ngữ pháp – 13 thì cơ bản</b><small>Công thức, ví dụ, bài tập 3 mức độ xáo trộn mỗi lần</small></div><span class="go">→</span></a>
      <a class="card section-link" href="#/explore"><span class="ic">🌍</span><div><b>Chợ chủ đề</b><small>Khám phá bộ từ cộng đồng chia sẻ, clone về tài khoản</small></div><span class="go">→</span></a>
      <a class="card section-link" href="#/ai"><span class="ic">✨</span><div><b>AI trích xuất từ vựng</b><small>Dán bài báo / đoạn văn → AI lọc từ khó B2–C1 thành chủ đề</small></div><span class="go">→</span></a>
    </div>

    <div class="row between mb"><h2 style="margin:0">Chủ đề của bạn</h2><div class="row"><span class="muted small">${words.length} từ</span>${topics.length ? `<button class="btn btn-sm ${mg.on ? 'btn-primary' : ''}" data-act="manage" title="Chọn nhiều chủ đề để xoá">${mg.on ? '✕ Xong' : '☑️ Quản lý'}</button>` : ''}</div></div>
    <div class="quick-actions mb">
      <a class="qa" href="#/flash/all" title="Học flashcard tất cả từ của mọi chủ đề"><span>🌐</span>Học tất cả</a>
      <a class="qa" href="#/quiz/all"><span>📝</span>Quiz tổng hợp</a>
      <a class="qa" href="#/flash/starred"><span>⭐</span>Từ đã đánh dấu <small>${Store.starredWords().length}</small></a>
      <a class="qa" href="#/match/all"><span>🎮</span>Nối từ</a>
      <a class="qa" href="#/spell/all" title="Nghe / xem nghĩa rồi gõ chính xác từ"><span>⌨️</span>Gõ chính tả</a>
      <a class="qa" href="#/audio/all"><span>🎧</span>Nghe tất cả</a>
      <button class="qa" data-act="library"><span>📚</span>Thư viện chủ đề</button>
    </div>
    ${mg.on ? `<div class="sel-bar" id="mgBar">
      <label class="check"><input type="checkbox" id="mgAll" ${mg.sel.size === topics.length ? 'checked' : ''}> Chọn tất cả (${topics.length} chủ đề)</label>
      <span class="muted">Đã chọn <b id="mgCount">${mg.sel.size}</b> chủ đề</span>
      <button class="btn btn-sm btn-danger" data-act="delSel" ${mg.sel.size ? '' : 'disabled'}>🗑️ Xoá đã chọn</button>
      <button class="btn btn-sm btn-danger" data-act="delAllTopics">🗑️ Xoá tất cả chủ đề</button>
    </div>` : ''}
    ${topics.length ? `<div class="grid" id="topicGrid">${topics.map(t => {
      const n = Store.wordsOf(t.id).length, p = Store.topicProgress(t.id);
      return `<a class="card topic-card ${mg.on ? 'selectable' : ''} ${mg.sel.has(t.id) ? 'selected' : ''}" href="#/topic/${t.id}" data-id="${t.id}">
        ${mg.on ? `<span class="sel-mark">${mg.sel.has(t.id) ? '☑' : '☐'}</span>` : `<button class="btn-icon sm btn-ghost card-del" data-del="${t.id}" title="Xoá chủ đề ${esc(t.name)}">🗑️</button>`}
        <div class="icon">${t.icon}</div>
        <div class="name">${esc(t.name)}</div>
        <div class="desc">${esc(t.desc)}</div>
        <div class="progress"><div style="width:${p}%"></div></div>
        <div class="meta"><span>${n} từ</span><span>${p}% đã thuộc</span></div>
      </a>`;
    }).join('')}</div>`
    : `<div class="card empty-state"><div class="big">📚</div><p>Bạn chưa có chủ đề nào.</p><div class="row" style="justify-content:center"><button class="btn btn-primary" data-act="newTopic">Tạo chủ đề đầu tiên</button><button class="btn" data-act="library">📚 Lấy từ thư viện</button><a class="btn" href="#/explore">🌍 Chợ chủ đề</a></div></div>`}

    <div class="dash-grid mt">
      ${hard.length ? `<div class="card">
        <h3>🎯 Từ hay sai nhất</h3>
        <ul class="plain-list">${hard.map(w => `<li><button class="btn-icon sm btn-speak" data-speak="${w.id}">🔊</button><div class="info"><b>${esc(w.word)}</b> <span class="ipa">${esc(w.phonetic)}</span><div class="small muted">${esc(w.meaning)}</div></div><span class="small muted">${w.wrong}✗ ${w.correct}✓</span></li>`).join('')}</ul>
      </div>` : ''}
      <div class="card">
        <h3>💡 Mẹo học hiệu quả</h3>
        <ul class="muted small" style="margin:0;padding-left:18px">
          <li>Tạo chủ đề theo tình huống thực tế (School, Travel, Work...) để dễ liên tưởng.</li>
          <li>Học bằng <b>Flashcard</b> trước, sau đó kiểm tra lại bằng <b>Quiz</b>.</li>
          <li>Mỗi ngày vào <b>Ôn tập hôm nay</b> – từ hay quên sẽ được nhắc lại đúng lúc.</li>
          <li>Bấm 🔊 và đọc to theo để luyện phát âm.</li>
        </ul>
      </div>
      <div class="card donate-card" style="text-align: center; border-color: var(--primary-2); background: linear-gradient(135deg, var(--surface), var(--primary-soft)); grid-column: 1 / -1; padding: 24px;">
        <h3 style="color: var(--primary); font-size: 1.3rem; margin-bottom: 8px;">💖 Donate Cho Anh Quân</h3>
        <p class="muted small" style="margin-bottom: 16px; font-size: 0.95rem;">Nếu bạn thấy ứng dụng này hữu ích, hãy ủng hộ mình một ly cà phê nhé!</p>
        <img src="img/donate-qr.png" alt="QR Donate" style="max-width: 240px; border-radius: 12px; display: block; margin: 0 auto; box-shadow: 0 8px 24px rgba(0,0,0,0.15); border: 4px solid var(--surface); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
      </div>
    </div>`;

  $$('[data-act="newTopic"]', el).forEach(b => b.addEventListener('click', () => topicForm()));
  $$('[data-act="library"]', el).forEach(b => b.addEventListener('click', libraryForm));
  $$('[data-speak]', el).forEach(b => b.addEventListener('click', () => TTS.speakWord(Store.word(b.dataset.speak), b)));

  // Xoá một chủ đề ngay trên thẻ
  $$('[data-del]', el).forEach(b => b.addEventListener('click', async e => {
    e.preventDefault(); e.stopPropagation();
    const t = Store.topic(b.dataset.del); if (!t) return;
    const n = Store.wordsOf(t.id).length;
    if (await confirmModal('Xoá chủ đề?', `Chủ đề "${t.name}" và ${n} từ vựng bên trong sẽ bị xoá vĩnh viễn.`, 'Xoá chủ đề')) { Store.deleteTopic(t.id); toast(`Đã xoá "${t.name}"`); render(); }
  }));

  /* ----- quản lý (chọn nhiều / xoá tất cả) chủ đề ----- */
  $('[data-act="manage"]', el)?.addEventListener('click', () => { mg.on = !mg.on; mg.sel.clear(); viewHome(el); });
  const syncBar = () => { $('#mgCount', el).textContent = mg.sel.size; $('[data-act="delSel"]', el).disabled = !mg.sel.size; $('#mgAll', el).checked = mg.sel.size === topics.length; };
  $('#mgAll', el)?.addEventListener('change', e => {
    topics.forEach(t => e.target.checked ? mg.sel.add(t.id) : mg.sel.delete(t.id));
    $$('.topic-card', el).forEach(c => { const on = mg.sel.has(c.dataset.id); c.classList.toggle('selected', on); $('.sel-mark', c).textContent = on ? '☑' : '☐'; });
    syncBar();
  });
  if (mg.on) $('#topicGrid', el)?.addEventListener('click', e => {
    const c = e.target.closest('.topic-card'); if (!c) return;
    e.preventDefault(); // đang quản lý: bấm thẻ = chọn, không mở chủ đề
    const on = !mg.sel.has(c.dataset.id); on ? mg.sel.add(c.dataset.id) : mg.sel.delete(c.dataset.id);
    c.classList.toggle('selected', on); $('.sel-mark', c).textContent = on ? '☑' : '☐';
    syncBar();
  });
  $('[data-act="delSel"]', el)?.addEventListener('click', async () => {
    const list = topics.filter(t => mg.sel.has(t.id)); if (!list.length) return;
    const nw = list.reduce((s, t) => s + Store.wordsOf(t.id).length, 0);
    if (await confirmModal('Xoá các chủ đề đã chọn?', `${list.length} chủ đề (${list.map(t => t.name).join(', ')}) cùng ${nw} từ bên trong sẽ bị xoá vĩnh viễn.`, `Xoá ${list.length} chủ đề`)) {
      Store.deleteTopics(list.map(t => t.id)); mg.sel.clear(); toast(`Đã xoá ${list.length} chủ đề`); render();
    }
  });
  $('[data-act="delAllTopics"]', el)?.addEventListener('click', async () => {
    if (await confirmModal('Xoá tất cả chủ đề?', `Toàn bộ ${topics.length} chủ đề và ${words.length} từ vựng sẽ bị xoá vĩnh viễn. Tiến độ, cài đặt và ngữ pháp vẫn được giữ. Hãy xuất file sao lưu trong Cài đặt trước nếu cần.`, 'Xoá tất cả')) {
      Store.deleteTopics(topics.map(t => t.id)); mg.on = false; mg.sel.clear(); toast('Đã xoá tất cả chủ đề'); render();
    }
  });
}
