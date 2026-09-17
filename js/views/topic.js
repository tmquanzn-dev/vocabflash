import { $, $$, esc, toast, levelBadge, isPhrase, POS_SHORT } from '../utils.js';
import { Store } from '../store.js';
import { TTS } from '../tts.js';
import { setTitle } from '../shell.js';
import { confirmModal } from '../modal.js';
import { topicForm, wordForm, bulkForm, shareTopicForm } from '../forms.js';
import { render } from '../router.js';

const st = { q: '', filter: 'all', sort: 'new', kind: 'all' };

/* Chi tiết một chủ đề: danh sách từ + thao tác */
export function viewTopic(el, { id }) {
  const topic = Store.topic(id);
  if (!topic) { el.innerHTML = `<div class="card empty-state">Không tìm thấy chủ đề. <a href="#/" class="btn mt">Về trang chủ</a></div>`; return; }
  setTitle(topic.name);
  const all = Store.wordsOf(id);
  const nWords = all.filter(w => !isPhrase(w.word)).length, nPhrases = all.length - nWords;
  let list = Store.byKind(all, st.kind);
  if (st.q) { const q = st.q.toLowerCase(); list = list.filter(w => w.word.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q) || w.phonetic.toLowerCase().includes(q)); }
  if (st.filter === 'new') list = list.filter(w => w.level === 0);
  else if (st.filter === 'learning') list = list.filter(w => w.level > 0 && w.level < 5);
  else if (st.filter === 'mastered') list = list.filter(w => w.level >= 5);
  else if (st.filter === 'starred') list = list.filter(w => w.star);
  const sorters = { az: (a, b) => a.word.localeCompare(b.word), old: (a, b) => a.createdAt - b.createdAt, level: (a, b) => a.level - b.level, new: (a, b) => b.createdAt - a.createdAt };
  list = [...list].sort(sorters[st.sort] || sorters.new);

  const p = Store.topicProgress(id);
  const kindList = Store.byKind(all, st.kind);
  const kindPath = st.kind === 'all' ? '' : '/' + st.kind;
  const count = f => kindList.filter(f).length;
  el.innerHTML = `
    <div class="page-head">
      <div>
        <h1><span>${topic.icon}</span> ${esc(topic.name)} <button class="btn-icon sm btn-ghost" data-act="editTopic" title="Sửa chủ đề">✏️</button></h1>
        <p class="muted">${esc(topic.desc) || 'Chưa có mô tả'} · ${all.length} từ · ${p}% đã thuộc</p>
        <div class="progress" style="max-width:320px"><div style="width:${p}%"></div></div>
      </div>
      <div class="row">
        <a class="btn btn-primary ${kindList.length ? '' : 'disabled'}" href="#/flash/${id}${kindPath}">🎴 Flashcard</a>
        <a class="btn ${kindList.length >= 2 ? '' : 'disabled'}" href="#/quiz/${id}${kindPath}">📝 Quiz</a>
        <a class="btn ${kindList.length >= 3 ? '' : 'disabled'}" href="#/match/${id}${kindPath}" title="Trò chơi nối từ – nghĩa">🎮 Nối từ</a>
        <button class="btn btn-success" data-act="add">＋ Thêm từ</button>
        <button class="btn" data-act="bulk" title="Nhập nhiều từ cùng lúc">📋 Nhập nhanh</button>
        <button class="btn" data-act="share" title="Sao chép danh sách từ để gửi cho người khác">📤 Chia sẻ</button>
      </div>
    </div>
    <a class="audition-btn ${kindList.length ? '' : 'disabled'}" href="#/audio/${id}${kindPath}">
      <span class="au-ic">🎧</span>
      <span class="au-text"><b>Audition – nghe cả chủ đề</b><small>Đọc lần lượt ${kindList.length} từ, mỗi từ 3 lần có ngắt quãng · vừa làm việc vừa nghe</small></span>
      <span class="au-go">▶ Nghe ngay</span>
    </a>
    <div class="seg mb" id="tkind" role="tablist">
      <button class="${st.kind === 'all' ? 'active' : ''}" data-kind="all">Tất cả <small>${all.length}</small></button>
      <button class="${st.kind === 'words' ? 'active' : ''}" data-kind="words">🔤 Từ đơn <small>${nWords}</small></button>
      <button class="${st.kind === 'phrases' ? 'active' : ''}" data-kind="phrases">🧩 Cụm từ <small>${nPhrases}</small></button>
    </div>
    <div class="toolbar">
      <input class="input" id="tq" placeholder="🔍 Lọc từ trong chủ đề..." value="${esc(st.q)}">
      <select class="input" id="tfilter">
        <option value="all" ${st.filter === 'all' ? 'selected' : ''}>Mọi mức (${kindList.length})</option>
        <option value="new" ${st.filter === 'new' ? 'selected' : ''}>Mới (${count(w => w.level === 0)})</option>
        <option value="learning" ${st.filter === 'learning' ? 'selected' : ''}>Đang học (${count(w => w.level > 0 && w.level < 5)})</option>
        <option value="mastered" ${st.filter === 'mastered' ? 'selected' : ''}>Đã thuộc (${count(w => w.level >= 5)})</option>
        <option value="starred" ${st.filter === 'starred' ? 'selected' : ''}>⭐ Đã đánh dấu (${count(w => w.star)})</option>
      </select>
      <select class="input" id="tsort">
        <option value="new" ${st.sort === 'new' ? 'selected' : ''}>Mới thêm trước</option>
        <option value="old" ${st.sort === 'old' ? 'selected' : ''}>Cũ trước</option>
        <option value="az" ${st.sort === 'az' ? 'selected' : ''}>A → Z</option>
        <option value="level" ${st.sort === 'level' ? 'selected' : ''}>Chưa thuộc trước</option>
      </select>
      <button class="btn btn-sm" data-act="speakAll" title="Đọc lần lượt các từ trong danh sách">🔊 Đọc tất cả</button>
    </div>
    ${all.length === 0 ? `<div class="card empty-state"><div class="big">📝</div><p>Chủ đề này chưa có từ nào.</p><div class="row" style="justify-content:center"><button class="btn btn-primary" data-act="add">＋ Thêm từ đầu tiên</button><button class="btn" data-act="bulk">📋 Nhập nhanh</button></div></div>`
    : list.length === 0 ? `<div class="card empty-state">${st.kind === 'phrases' && !nPhrases ? 'Chủ đề này chưa có cụm từ nào. Thêm từ có khoảng trắng (vd <i>look forward to</i>) sẽ được xếp vào đây.' : st.kind === 'words' && !nWords ? 'Chủ đề này chưa có từ đơn nào.' : 'Không có từ nào khớp bộ lọc.'}</div>`
    : `<div class="table-wrap"><table>
        <thead><tr><th style="width:36px">#</th><th style="width:36px"></th><th>Từ vựng</th><th>Phiên âm</th><th>Nghĩa</th><th>Ví dụ</th><th>Mức</th><th style="width:100px"></th></tr></thead>
        <tbody>${list.map((w, i) => `<tr data-id="${w.id}">
          <td class="muted">${i + 1}</td>
          <td><button class="btn-icon sm star ${w.star ? 'on' : ''}" data-row="star" title="${w.star ? 'Bỏ đánh dấu' : 'Đánh dấu ⭐'}">${w.star ? '⭐' : '☆'}</button></td>
          <td><div class="row nowrap" style="gap:6px"><button class="btn-icon sm btn-speak" data-row="speak" title="Phát âm">🔊</button><span class="word">${esc(w.word)}</span> ${w.pos ? `<span class="pos">${POS_SHORT[w.pos] || w.pos}</span>` : ''}</div></td>
          <td class="ipa">${esc(w.phonetic) || '<span class="muted">—</span>'}</td>
          <td>${esc(w.meaning)}</td>
          <td>${w.example ? `<div class="ex">${esc(w.example)}</div>` : ''}${w.exampleVi ? `<div class="small muted">${esc(w.exampleVi)}</div>` : ''}${w.note ? `<div class="small muted">📌 ${esc(w.note)}</div>` : ''}</td>
          <td>${levelBadge(w.level)}${w.correct + w.wrong ? `<div class="small muted">${w.correct}✓ ${w.wrong}✗</div>` : ''}</td>
          <td><div class="actions"><button class="btn-icon sm" data-row="edit" title="Sửa">✏️</button><button class="btn-icon sm" data-row="del" title="Xoá">🗑️</button></div></td>
        </tr>`).join('')}</tbody></table></div>`}`;

  $('[data-act="editTopic"]', el).addEventListener('click', () => topicForm(topic));
  $$('[data-act="add"]', el).forEach(b => b.addEventListener('click', () => wordForm(id)));
  $$('[data-act="bulk"]', el).forEach(b => b.addEventListener('click', () => bulkForm(id)));
  $('[data-act="share"]', el).addEventListener('click', () => shareTopicForm(topic));
  $$('a.disabled', el).forEach(a => a.addEventListener('click', e => { e.preventDefault(); toast(a.href.includes('quiz') ? 'Cần ít nhất 2 từ để làm quiz' : a.href.includes('match') ? 'Cần ít nhất 3 từ để chơi nối từ' : 'Hãy thêm từ vựng trước'); }));
  const tq = $('#tq', el);
  tq.addEventListener('input', () => { st.q = tq.value; const pos = tq.selectionStart; viewTopic(el, { id }); const n = $('#tq', el); n.focus(); n.setSelectionRange(pos, pos); });
  $('#tfilter', el).addEventListener('change', e => { st.filter = e.target.value; viewTopic(el, { id }); });
  $('#tkind', el).addEventListener('click', e => { const b = e.target.closest('[data-kind]'); if (b) { st.kind = b.dataset.kind; viewTopic(el, { id }); } });
  $('#tsort', el).addEventListener('change', e => { st.sort = e.target.value; viewTopic(el, { id }); });
  $('[data-act="speakAll"]', el).addEventListener('click', () => TTS.speakList(list));
  const tbody = $('tbody', el);
  if (tbody) tbody.addEventListener('click', async e => {
    const b = e.target.closest('[data-row]'); if (!b) return;
    const w = Store.word(b.closest('tr').dataset.id);
    if (b.dataset.row === 'speak') TTS.speakWord(w, b);
    else if (b.dataset.row === 'star') { const on = Store.toggleStar(w.id); b.textContent = on ? '⭐' : '☆'; b.classList.toggle('on', on); b.title = on ? 'Bỏ đánh dấu' : 'Đánh dấu ⭐'; }
    else if (b.dataset.row === 'edit') wordForm(id, w);
    else if (b.dataset.row === 'del') { if (await confirmModal('Xoá từ?', `Xoá từ "${w.word}" khỏi chủ đề này?`)) { Store.deleteWord(w.id); toast('Đã xoá'); render(); } }
  });
}
