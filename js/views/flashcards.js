import { $, esc, shuffle, toast, isTyping, lengthClass } from '../utils.js';
import { Store } from '../store.js';
import { TTS } from '../tts.js';
import { Speech } from '../speech.js';
import { setTitle, renderSidebar } from '../shell.js';
import { isModalOpen } from '../modal.js';
import { onLeave, go } from '../router.js';

/**
 * Bộ từ để học theo id trên URL: id chủ đề, 'all' (mọi chủ đề) hoặc 'starred' (từ đã đánh dấu ⭐)
 * → { id, name, icon, words, backLink } hoặc null
 */
export function resolveWordSet(id, kind) {
  let set = null;
  if (id === 'all') set = { id, name: 'Tất cả chủ đề', icon: '🌐', words: Store.words(), backLink: '#/' };
  else if (id === 'starred') set = { id, name: 'Từ đã đánh dấu', icon: '⭐', words: Store.starredWords(), backLink: '#/' };
  else { const t = Store.topic(id); if (t) set = { id, name: t.name, icon: t.icon, words: Store.wordsOf(id), backLink: '#/topic/' + id }; }
  if (!set) return null;
  // Đoạn thứ 3 trên URL: /words (chỉ từ đơn) hoặc /phrases (chỉ cụm từ)
  if (kind === 'words' || kind === 'phrases') { set.words = Store.byKind(set.words, kind); set.name += kind === 'words' ? ' · từ đơn' : ' · cụm từ'; set.kind = kind; }
  return set;
}

/* Học flashcard */
export function viewFlash(el, { id, parts }) {
  const set = resolveWordSet(id, parts[2]);
  if (!set) { go('/'); return; }
  setTitle('Flashcard · ' + set.name);
  if (!set.words.length) {
    el.innerHTML = `<div class="card empty-state"><div class="big">${set.icon}</div>${id === 'starred' ? 'Bạn chưa đánh dấu ⭐ từ nào. Bấm ⭐ trong bảng từ hoặc trên flashcard để đánh dấu.' : 'Chưa có từ nào để học.'} <br><a class="btn mt" href="${set.backLink}">Quay lại</a></div>`;
    return;
  }
  runFlashSession(el, { title: `${set.icon} ${esc(set.name)}`, backLink: set.backLink, words: shuffle(set.words), requeueForgotten: false });
}

/**
 * Phiên học thẻ dùng chung cho Flashcard và Ôn tập.
 * opts: { title, backLink, words, requeueForgotten }
 */
export function runFlashSession(el, opts) {
  const st = { queue: [...opts.words], i: 0, flipped: false, mode: 'en', known: 0, forgot: 0 };

  const draw = () => {
    if (st.i >= st.queue.length) { drawDone(); return; }
    const w = st.queue[st.i];
    const frontIsEn = st.mode === 'en';
    const topic = Store.topic(w.topicId);
    const wordFace = `
      <div class="tag">Tiếng Anh${opts.showTopic && topic ? ` · ${topic.icon} ${esc(topic.name)}` : ''}</div>
      <div class="fc-tools">
        <button class="btn-icon ${w.star ? 'star on' : 'star'}" data-act="star" title="Đánh dấu từ này (F)">${w.star ? '⭐' : '☆'}</button>
        <button class="btn-icon btn-speak speak" data-act="speak" title="Phát âm (S)">🔊</button>
      </div>
      <div class="w ${lengthClass(w.word)}">${esc(w.word)}</div>
      <div class="ipa">${esc(w.phonetic)}</div>
      ${w.pos ? `<span class="pos">${w.pos}</span>` : ''}
      ${frontIsEn ? '' : `<div class="ex">${esc(w.example)}</div>`}
      <div class="mic-row"><button class="btn btn-sm" data-act="mic" title="Bấm rồi đọc to từ này">🎤 Luyện nói</button><span class="mic-result" id="micResult"></span></div>
      <div class="mic-row" id="micActions" hidden>
        <button class="btn btn-sm" data-act="replay" title="Nghe lại giọng bạn vừa nói">▶️ Nghe lại giọng bạn</button>
        <button class="btn btn-sm" data-act="speak2" title="Nghe phát âm mẫu">🔊 Nghe mẫu</button>
        <button class="btn btn-sm" data-act="mic" title="Nói lại">🔁 Nói lại</button>
      </div>`;
    const meanFace = `
      <div class="tag">Nghĩa</div>
      ${frontIsEn ? '<div class="fc-tools"><button class="btn-icon btn-speak speak" data-act="speak" title="Phát âm (S)">🔊</button></div>' : ''}
      <div class="m ${lengthClass(w.meaning)}">${esc(w.meaning)}</div>
      ${frontIsEn && w.example ? `<div class="ex">"${esc(w.example)}"</div>` : ''}
      ${w.exampleVi ? `<div class="exvi">${esc(w.exampleVi)}</div>` : ''}
      ${w.note ? `<div class="exvi">📌 ${esc(w.note)}</div>` : ''}`;
    el.innerHTML = `
      <div class="fc-wrap">
        <div class="fc-top">
          <a class="btn btn-sm" href="${opts.backLink}">← Quay lại</a>
          <div class="muted"><b>${st.i + 1}</b> / ${st.queue.length} &nbsp;·&nbsp; ${opts.title}</div>
          <select class="input" id="fcMode" style="width:auto">
            <option value="en" ${st.mode === 'en' ? 'selected' : ''}>Anh → Việt</option>
            <option value="vi" ${st.mode === 'vi' ? 'selected' : ''}>Việt → Anh</option>
          </select>
        </div>
        <div class="progress"><div style="width:${st.i / st.queue.length * 100}%"></div></div>
        <div class="fc-scene">
          <div class="fc-card ${st.flipped ? 'flipped' : ''}" id="fcCard">
            <div class="fc-face front">${frontIsEn ? wordFace : meanFace}<div class="hint">Bấm vào thẻ hoặc <span class="kbd">Space</span> để lật</div></div>
            <div class="fc-face back">${frontIsEn ? meanFace : wordFace}<div class="hint">Bấm để lật lại</div></div>
          </div>
        </div>
        <div class="fc-controls">
          <button class="btn" data-act="prev" ${st.i === 0 ? 'disabled' : ''}>← Trước</button>
          <button class="btn" data-act="flip">🔄 Lật thẻ</button>
          <button class="btn" data-act="shuffle" title="Xáo trộn lại">🔀</button>
          <button class="btn" data-act="next">Bỏ qua →</button>
        </div>
        <div class="fc-rate">
          <button class="btn btn-danger" data-act="forgot">✗ Chưa nhớ <span class="kbd on-dark">1</span></button>
          <button class="btn btn-success" data-act="know">✓ Đã nhớ <span class="kbd on-dark">2</span></button>
        </div>
        <p class="muted small mt" style="text-align:center">Phím tắt: <span class="kbd">Space</span> lật · <span class="kbd">←</span> <span class="kbd">→</span> chuyển thẻ · <span class="kbd">S</span> phát âm · <span class="kbd">M</span> luyện nói · <span class="kbd">F</span> đánh dấu · <span class="kbd">1</span>/<span class="kbd">2</span> đánh giá</p>
      </div>`;
    $('#fcMode', el).addEventListener('change', e => { st.mode = e.target.value; st.flipped = false; draw(); });
    $('#fcCard', el).addEventListener('click', e => { if (e.target.closest('[data-act]') || e.target.closest('.mic-row')) return; flip(); });
    if (Store.settings.autoSpeak && frontIsEn && !st.flipped) setTimeout(() => TTS.speakWord(w), 150);
  };

  const drawDone = () => {
    const total = st.known + st.forgot;
    const pct = total ? Math.round(st.known / total * 100) : 0;
    el.innerHTML = `
      <div class="fc-wrap"><div class="card fc-done">
        <div class="big">${pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
        <h2>Hoàn thành phiên học!</h2>
        <p class="muted">Đã nhớ <b style="color:var(--success)">${st.known}</b> · Chưa nhớ <b style="color:var(--danger)">${st.forgot}</b> ${total ? `· ${pct}%` : ''}</p>
        <p class="muted small">🔥 Chuỗi ${Store.streak()} ngày · Hôm nay ${Store.todayActivity().reviews}/${Store.settings.dailyGoal} lượt ôn</p>
        <div class="row" style="justify-content:center">
          <button class="btn btn-primary" data-act="restart">🔁 Học lại</button>
          <a class="btn" href="${opts.backLink}">← Quay lại</a>
        </div>
      </div></div>`;
  };

  const flip = () => {
    st.flipped = !st.flipped;
    const c = $('#fcCard', el); if (c) c.classList.toggle('flipped', st.flipped);
    if (st.flipped && Store.settings.autoSpeak && st.mode === 'vi') TTS.speakWord(st.queue[st.i]);
  };
  const goTo = d => { Speech.stop(); st.i = Math.max(0, st.i + d); st.flipped = false; draw(); };
  const rate = ok => {
    const w = st.queue[st.i];
    Store.rate(w, ok);
    if (ok) st.known++; else { st.forgot++; if (opts.requeueForgotten) st.queue.push(w); }
    renderSidebar();
    goTo(1);
  };
  const toggleStar = () => {
    const w = st.queue[st.i];
    const on = Store.toggleStar(w.id);
    const b = $('[data-act="star"]', el); if (b) { b.textContent = on ? '⭐' : '☆'; b.classList.toggle('on', on); }
    toast(on ? 'Đã đánh dấu ⭐' : 'Đã bỏ đánh dấu');
  };
  const practice = async () => {
    const w = st.queue[st.i];
    const out = $('#micResult', el); const btn = $('[data-act="mic"]', el);
    if (!Speech.supported) { toast('Trình duyệt không hỗ trợ nhận dạng giọng nói – hãy dùng Chrome/Edge'); return; }
    TTS.stop();
    if (out) { out.textContent = '🎙️ Đang nghe... hãy đọc: ' + w.word; out.className = 'mic-result'; }
    btn?.classList.add('listening');
    const actions = $('#micActions', el); if (actions) actions.hidden = true;
    try {
      const r = await Speech.listen(w.word);
      st.lastAudio = r.audioUrl;
      if (out) { out.innerHTML = r.ok ? `✅ Bạn nói: "<b>${esc(r.heard)}</b>" – ${r.score}% giống` : `❌ Bạn nói: "<b>${esc(r.heard)}</b>" – ${r.score}% giống, thử lại nhé`; out.className = 'mic-result ' + (r.ok ? 'ok' : 'bad'); }
      if (actions) { actions.hidden = false; $('[data-act="replay"]', actions).disabled = !r.audioUrl; }
      // Tự phát: giọng bạn → rồi mẫu chuẩn để so sánh
      if (r.audioUrl) { await playUrl(r.audioUrl); await new Promise(res => setTimeout(res, 250)); }
      TTS.speakWord(w);
    } catch (e) { if (out) { out.textContent = '⚠️ ' + e.message; out.className = 'mic-result bad'; } }
    finally { btn?.classList.remove('listening'); }
  };
  const playUrl = url => new Promise(res => { const a = new Audio(url); a.onended = a.onerror = () => res(); a.play().catch(() => res()); });

  el.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'speak') TTS.speakWord(st.queue[st.i], b);
    else if (a === 'flip') flip();
    else if (a === 'prev') goTo(-1);
    else if (a === 'next') goTo(1);
    else if (a === 'shuffle') { st.queue = shuffle(st.queue.slice(st.i)); st.i = 0; st.flipped = false; draw(); toast('Đã xáo trộn'); }
    else if (a === 'forgot') rate(false);
    else if (a === 'know') rate(true);
    else if (a === 'star') toggleStar();
    else if (a === 'mic') practice();
    else if (a === 'replay') { if (st.lastAudio) { TTS.stop(); playUrl(st.lastAudio); } }
    else if (a === 'speak2') TTS.speakWord(st.queue[st.i], b);
    else if (a === 'restart') { Object.assign(st, { queue: shuffle(opts.words), i: 0, flipped: false, known: 0, forgot: 0 }); draw(); }
  });
  const onKey = e => {
    if (isTyping(e) || isModalOpen() || st.i >= st.queue.length) return;
    const k = e.key.toLowerCase();
    if (e.code === 'Space') { e.preventDefault(); flip(); }
    else if (e.key === 'ArrowRight') goTo(1);
    else if (e.key === 'ArrowLeft') goTo(-1);
    else if (k === 's') TTS.speakWord(st.queue[st.i], $('.fc-face .speak', el));
    else if (k === 'm') practice();
    else if (k === 'f') toggleStar();
    else if (e.key === '1') rate(false);
    else if (e.key === '2') rate(true);
  };
  document.addEventListener('keydown', onKey);
  onLeave(() => { document.removeEventListener('keydown', onKey); Speech.stop(); });
  draw();
}
