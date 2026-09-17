import { $, $$, esc, levelBadge, normalizeAnswer, isPhrase, POS_SHORT } from '../utils.js';
import { Store } from '../store.js';
import { TTS } from '../tts.js';
import { setTitle } from '../shell.js';
import { wordForm } from '../forms.js';
import { openModal, closeModal } from '../modal.js';

let searchQ = '';
let searchMode = 'both'; // en | vi | both

/* Tìm kiếm theo từ / cụm từ tiếng Anh trong tất cả chủ đề */
export function viewSearch(el, { q } = {}) {
  setTitle('Tìm kiếm');
  if (q !== undefined) searchQ = q;

  const draw = () => {
    const raw = searchQ.trim();
    const nq = normalizeAnswer(raw);
    const box = $('#sRes', el);
    if (!nq) {
      box.innerHTML = `<div class="empty-state"><div class="big">🔍</div>Gõ từ tiếng Anh hoặc nghĩa tiếng Việt để tìm trong tất cả chủ đề.<br><span class="small">Ví dụ: <i>teacher</i>, <i>look forward to</i>, <i>giáo viên</i></span></div>`;
      return;
    }
    // Điểm khớp: trùng hoàn toàn 3 > bắt đầu bằng 2 > chứa 1. Tiếng Anh ưu tiên hơn tiếng Việt.
    const rank = (text) => { const t = normalizeAnswer(text); return t === nq ? 3 : t.startsWith(nq) ? 2 : t.includes(nq) ? 1 : 0; };
    const scored = Store.words().map(w => {
      const en = searchMode !== 'vi' ? rank(w.word) : 0;
      const vi = searchMode !== 'en' ? rank(w.meaning) : 0;
      return { w, score: en ? en + 3 : vi, by: en ? 'en' : vi ? 'vi' : '' };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.w.word.localeCompare(b.w.word));

    if (!scored.length) {
      box.innerHTML = `<div class="empty-state"><div class="big">🤷</div>
        <h3>Chưa có từ vựng "<span style="color:var(--primary)">${esc(raw)}</span>"</h3>
        <p class="muted">${searchMode === 'vi' ? 'Không có từ nào có nghĩa như vậy.' : searchMode === 'en' ? 'Bạn chưa thêm từ này vào chủ đề nào.' : 'Không khớp từ tiếng Anh lẫn nghĩa tiếng Việt nào.'}</p>
        <button class="btn btn-primary" data-act="addNew">＋ Thêm "${esc(raw)}" vào chủ đề</button></div>`;
      return;
    }
    box.innerHTML = `<div class="muted small mb">Tìm thấy ${scored.length} kết quả</div><ul class="plain-list">${scored.map(({ w, by }) => { const t = Store.topic(w.topicId); return `<li data-id="${w.id}">
        <button class="btn-icon btn-speak" data-act="speak">🔊</button>
        <div class="info"><div><b>${by === 'en' ? highlight(w.word, raw) : esc(w.word)}</b> <span class="ipa">${esc(w.phonetic)}</span> ${w.pos ? `<span class="pos">${POS_SHORT[w.pos] || w.pos}</span>` : ''} ${isPhrase(w.word) ? '<span class="pos">cụm từ</span>' : ''} ${levelBadge(w.level)} ${w.star ? '<span title="Đã đánh dấu">⭐</span>' : ''}</div>
        <div>${by === 'vi' ? highlight(w.meaning, raw) : esc(w.meaning)}</div>${w.example ? `<div class="small muted"><i>${esc(w.example)}</i></div>` : ''}
        <a class="topic-tag" href="#/topic/${w.topicId}">${t ? t.icon + ' ' + esc(t.name) : ''}</a></div>
        <button class="btn-icon sm" data-act="edit" title="Sửa">✏️</button>
      </li>`; }).join('')}</ul>`;
  };

  el.innerHTML = `
    <div class="page-head"><div><h1>🔍 Tìm kiếm từ vựng</h1><p class="muted">Trong ${Store.words().length} từ thuộc ${Store.topics().length} chủ đề · phím tắt <span class="kbd">Ctrl</span>+<span class="kbd">K</span></p></div></div>
    <div class="seg mb" id="sMode">
      <button class="${searchMode === 'both' ? 'active' : ''}" data-mode="both">Cả hai</button>
      <button class="${searchMode === 'en' ? 'active' : ''}" data-mode="en">🇬🇧 Từ tiếng Anh</button>
      <button class="${searchMode === 'vi' ? 'active' : ''}" data-mode="vi">🇻🇳 Nghĩa tiếng Việt</button>
    </div>
    <input class="input" id="sq" placeholder="${searchMode === 'vi' ? 'Nhập nghĩa tiếng Việt, vd: giáo viên' : searchMode === 'en' ? 'Nhập từ / cụm từ tiếng Anh, vd: teacher' : 'Nhập từ tiếng Anh hoặc nghĩa tiếng Việt...'}" value="${esc(searchQ)}" autocomplete="off" spellcheck="false" style="font-size:1.1rem;padding:14px">
    <div class="card mt" id="sRes"></div>`;
  const sq = $('#sq', el);
  sq.focus(); sq.setSelectionRange(sq.value.length, sq.value.length);
  sq.addEventListener('input', () => { searchQ = sq.value; draw(); });
  $('#sMode', el).addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) { searchMode = b.dataset.mode; viewSearch(el, {}); } });
  $('#sRes', el).addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'addNew') { pickTopicThen(topicId => wordForm(topicId, null, { word: searchQ.trim() })); return; }
    const w = Store.word(b.closest('li').dataset.id);
    if (b.dataset.act === 'speak') TTS.speakWord(w, b);
    else if (b.dataset.act === 'edit') wordForm(w.topicId, w);
  });
  draw();
}

function highlight(text, q) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
}

/* Chọn chủ đề rồi gọi callback(topicId) */
export function pickTopicThen(cb) {
  const topics = Store.topics();
  if (!topics.length) { wordFormNoTopic(); return; }
  if (topics.length === 1) { cb(topics[0].id); return; }
  openModal(`<h2>Thêm vào chủ đề nào?</h2>
    <div class="stack">${topics.map(t => `<button class="btn" data-t="${t.id}" style="justify-content:flex-start">${t.icon} ${esc(t.name)} <span class="muted small" style="margin-left:auto">${Store.wordsOf(t.id).length} từ</span></button>`).join('')}</div>
    <div class="modal-actions"><button class="btn" data-close>Huỷ</button></div>`, root => {
    $$('[data-t]', root).forEach(b => b.addEventListener('click', () => { closeModal(); cb(b.dataset.t); }));
  });
}
function wordFormNoTopic() {
  openModal(`<h2>Chưa có chủ đề</h2><p class="muted">Hãy tạo một chủ đề trước rồi thêm từ vào đó.</p><div class="modal-actions"><button class="btn" data-close>Đóng</button><a class="btn btn-primary" href="#/" data-close>Về trang chủ</a></div>`);
}
