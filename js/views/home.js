import { $, $$, esc } from '../utils.js';
import { Store } from '../store.js';
import { Auth } from '../auth.js';
import { TTS } from '../tts.js';
import { setTitle } from '../shell.js';
import { topicForm, libraryForm } from '../forms.js';

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
          <p class="muted small">${today.reviews >= goal ? 'Tuyệt vời, đã đạt mục tiêu!' : `Còn ${goal - today.reviews} lượt ôn nữa. Học flashcard hoặc quiz để tích luỹ.`}</p>
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

    <div class="row between mb"><h2 style="margin:0">Chủ đề của bạn</h2><span class="muted small">${words.length} từ</span></div>
    <div class="quick-actions mb">
      <a class="qa" href="#/flash/all" title="Học flashcard tất cả từ của mọi chủ đề"><span>🌐</span>Học tất cả</a>
      <a class="qa" href="#/quiz/all"><span>📝</span>Quiz tổng hợp</a>
      <a class="qa" href="#/flash/starred"><span>⭐</span>Từ đã đánh dấu <small>${Store.starredWords().length}</small></a>
      <a class="qa" href="#/match/all"><span>🎮</span>Nối từ</a>
      <a class="qa" href="#/audio/all"><span>🎧</span>Nghe tất cả</a>
      <button class="qa" data-act="library"><span>📚</span>Thư viện chủ đề</button>
    </div>
    ${topics.length ? `<div class="grid">${topics.map(t => {
      const n = Store.wordsOf(t.id).length, p = Store.topicProgress(t.id);
      return `<a class="card topic-card" href="#/topic/${t.id}">
        <div class="icon">${t.icon}</div>
        <div class="name">${esc(t.name)}</div>
        <div class="desc">${esc(t.desc)}</div>
        <div class="progress"><div style="width:${p}%"></div></div>
        <div class="meta"><span>${n} từ</span><span>${p}% đã thuộc</span></div>
      </a>`;
    }).join('')}</div>`
    : `<div class="card empty-state"><div class="big">📚</div><p>Bạn chưa có chủ đề nào.</p><div class="row" style="justify-content:center"><button class="btn btn-primary" data-act="newTopic">Tạo chủ đề đầu tiên</button><button class="btn" data-act="library">📚 Lấy từ thư viện</button></div></div>`}

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
    </div>`;

  $$('[data-act="newTopic"]', el).forEach(b => b.addEventListener('click', () => topicForm()));
  $$('[data-act="library"]', el).forEach(b => b.addEventListener('click', libraryForm));
  $$('[data-speak]', el).forEach(b => b.addEventListener('click', () => TTS.speakWord(Store.word(b.dataset.speak), b)));
}
