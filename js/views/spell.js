import { $, $$, esc, shuffle, toast, isTyping, normalizeAnswer, hintFor, isPhrase } from '../utils.js?v=11';
import { Store } from '../store.js?v=11';
import { TTS } from '../tts.js?v=11';
import { setTitle, renderSidebar } from '../shell.js?v=11';
import { isModalOpen } from '../modal.js?v=11';
import { onLeave, go } from '../router.js?v=11';
import { resolveWordSet } from './flashcards.js?v=11';

// Tuỳ chọn nhớ giữa các lần: prompt = audio | meaning | both; requeue = gõ sai thì hỏi lại ở cuối
const opt = { prompt: 'audio', requeue: true, strict: false };

/* Chế độ Gõ chính tả: nghe phát âm (và/hoặc xem nghĩa) rồi gõ chính xác từ tiếng Anh */
export function viewSpell(el, { id, parts }) {
  const set = resolveWordSet(id, parts[2]);
  if (!set) { go('/'); return; }
  setTitle('Gõ chính tả · ' + set.name);
  if (!set.words.length) { el.innerHTML = `<div class="card empty-state"><div class="big">⌨️</div>Chưa có từ nào để luyện. <br><a class="btn mt" href="${set.backLink}">Quay lại</a></div>`; return; }
  const PROMPTS = [
    ['audio', '🔊 Chỉ nghe', 'Phát âm tiếng Anh, gõ lại từ – luyện nghe & mặt chữ'],
    ['meaning', '🇻🇳 Chỉ nghĩa', 'Hiện nghĩa tiếng Việt, gõ từ tiếng Anh – luyện nhớ từ'],
    ['both', '🔊 + 🇻🇳 Cả hai', 'Vừa nghe vừa xem nghĩa – dễ nhất'],
  ];
  el.innerHTML = `
    <div class="quiz-wrap">
      <div class="page-head"><div><h1>⌨️ Gõ chính tả · ${set.icon} ${esc(set.name)}</h1><p class="muted">Gõ chính xác từ tiếng Anh – chống "nhớ mang máng" mặt chữ. ${set.words.length} từ.</p></div><a class="btn btn-sm" href="${set.backLink}">← Quay lại</a></div>
      <div class="mode-grid">${PROMPTS.map(([k, t, d]) => `<button class="mode-card ${opt.prompt === k ? 'active' : ''}" data-prompt="${k}"><div class="ic">${t.split(' ')[0]}</div><div class="t">${t}</div><div class="d">${d}</div></button>`).join('')}</div>
      <div class="card mt row between">
        <label class="check"><input type="checkbox" id="spRequeue" ${opt.requeue ? 'checked' : ''}> Gõ sai → hỏi lại từ đó ở cuối</label>
        <label class="check"><input type="checkbox" id="spStrict" ${opt.strict ? 'checked' : ''}> Phân biệt hoa/thường & dấu câu</label>
        <button class="btn btn-primary btn-lg" id="spStart">Bắt đầu ▶</button>
      </div>
    </div>`;
  $$('[data-prompt]', el).forEach(b => b.addEventListener('click', () => { opt.prompt = b.dataset.prompt; $$('[data-prompt]', el).forEach(x => x.classList.toggle('active', x === b)); }));
  $('#spRequeue', el).addEventListener('change', e => { opt.requeue = e.target.checked; });
  $('#spStrict', el).addEventListener('change', e => { opt.strict = e.target.checked; });
  $('#spStart', el).addEventListener('click', () => runSpell(el, set));
}

function runSpell(el, set) {
  const st = { queue: shuffle(set.words), i: 0, correct: 0, wrong: [], answered: false, hints: 0 };
  const total0 = st.queue.length;
  const same = (a, b) => opt.strict ? a.trim() === b.trim() : normalizeAnswer(a) === normalizeAnswer(b);

  const draw = () => {
    if (st.i >= st.queue.length) { drawResult(); return; }
    const w = st.queue[st.i]; st.answered = false;
    const showMeaning = opt.prompt !== 'audio', showAudio = opt.prompt !== 'meaning';
    el.innerHTML = `
      <div class="quiz-wrap">
        <div class="fc-top"><span class="muted">Từ <b>${st.i + 1}</b> / ${st.queue.length}</span><span class="muted">Đúng: <b style="color:var(--success)">${st.correct}</b> · Sai: <b style="color:var(--danger)">${st.wrong.length}</b></span><button class="btn btn-sm" data-act="quit">✕ Thoát</button></div>
        <div class="progress mb"><div style="width:${st.i / st.queue.length * 100}%"></div></div>
        <div class="card q-card">
          <div class="q-sub">${showAudio ? 'Nghe và gõ lại' : 'Gõ từ tiếng Anh có nghĩa là'}${isPhrase(w.word) ? ' (cụm từ)' : ''}</div>
          ${showAudio ? `<div class="q-prompt"><button class="btn-icon btn-speak q-big-speak" data-act="speak" title="Nghe lại (Ctrl+Space)">🔊</button></div>` : ''}
          ${showMeaning ? `<div class="q-prompt ${w.meaning.length > 30 ? 'long' : ''}">${esc(w.meaning)}</div>${w.pos ? `<span class="pos">${w.pos}</span>` : ''}` : ''}
          ${!showMeaning && w.pos ? `<div class="muted small" style="margin-bottom:8px"><span class="pos">${w.pos}</span></div>` : ''}
          <input class="input q-input" id="spAns" placeholder="${isPhrase(w.word) ? 'Gõ cụm từ...' : 'Gõ từ...'}" autocomplete="off" autocapitalize="off" spellcheck="false" style="margin-top:12px">
          <div class="row mt" style="justify-content:center"><button class="btn btn-primary" data-act="check">Kiểm tra</button><button class="btn" data-act="hint">💡 Gợi ý</button>${showAudio ? '' : '<button class="btn-icon btn-speak" data-act="speak" title="Nghe từ">🔊</button>'}</div>
          <div id="qFeedback"></div>
        </div>
        <p class="muted small mt" style="text-align:center"><span class="kbd">Enter</span> kiểm tra / câu tiếp · <span class="kbd">Ctrl</span>+<span class="kbd">Space</span> nghe lại</p>
      </div>`;
    if (showAudio) setTimeout(() => TTS.speakWord(w), 200);
    const inp = $('#spAns', el); inp.focus();
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { st.answered ? next() : check(); } });
  };

  const check = () => {
    const inp = $('#spAns', el); if (!inp || st.answered) return;
    const w = st.queue[st.i];
    const val = inp.value; if (!val.trim()) { toast('Hãy gõ từ trước'); return; }
    const ok = same(val, w.word);
    st.answered = true; inp.disabled = true; inp.classList.add(ok ? 'is-ok' : 'is-bad');
    Store.rate(w, ok);
    if (ok) st.correct++; else { st.wrong.push(w); if (opt.requeue && !st.queue.slice(st.i + 1).includes(w)) st.queue.push(w); }
    const last = st.i + 1 >= st.queue.length;
    $('#qFeedback', el).innerHTML = `
      <div class="q-feedback ${ok ? 'ok' : 'bad'}">
        <div class="q-fb-text">
          <div class="q-fb-title">${ok ? '🎉 Chính xác!' : '❌ Chưa đúng'}</div>
          <div class="q-fb-ans">${ok ? '' : `Bạn gõ: <s>${esc(val)}</s> · `}Đáp án: <b>${esc(w.word)}</b> <span class="ipa">${esc(w.phonetic)}</span> – ${esc(w.meaning)}${w.example ? `<div class="small muted"><i>${esc(w.example)}</i></div>` : ''}</div>
        </div>
        <button class="btn ${ok ? 'btn-success' : 'btn-primary'}" data-act="next">${last ? 'Xem kết quả' : 'Từ tiếp'} →</button>
      </div>`;
    if (!ok || opt.prompt === 'meaning') TTS.speakWord(w);
  };
  const next = () => { st.i++; draw(); };

  const drawResult = () => {
    const uniqWrong = [...new Set(st.wrong)];
    const pct = Math.round((total0 - uniqWrong.length) / total0 * 100);
    renderSidebar();
    el.innerHTML = `
      <div class="quiz-wrap"><div class="card q-card">
        <div style="font-size:3rem">${pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
        <h2>Kết quả gõ chính tả</h2>
        <div class="result-score">${pct}%</div>
        <p class="muted">Gõ đúng ngay ${total0 - uniqWrong.length} / ${total0} từ${st.wrong.length ? ` · ${st.wrong.length} lần gõ sai` : ''} · 🔥 chuỗi ${Store.streak()} ngày</p>
        <div class="row" style="justify-content:center">
          <button class="btn btn-primary" data-act="retry">🔁 Làm lại</button>
          ${uniqWrong.length ? `<button class="btn btn-danger" data-act="retryWrong">Luyện lại ${uniqWrong.length} từ sai</button>` : ''}
          <a class="btn" href="#/spell/${set.id}${set.kind ? '/' + set.kind : ''}">Đổi chế độ</a>
          <a class="btn" href="${set.backLink}">← Quay lại</a>
        </div>
        ${uniqWrong.length ? `<ul class="plain-list result-list">${uniqWrong.map(w => `<li><button class="btn-icon sm btn-speak" data-act="speakId" data-id="${w.id}">🔊</button><div class="info"><b>${esc(w.word)}</b> <span class="ipa">${esc(w.phonetic)}</span><div class="small muted">${esc(w.meaning)}</div></div></li>`).join('')}</ul>` : '<p class="muted">Tuyệt vời, không sai từ nào!</p>'}
      </div></div>`;
  };

  el.onclick = e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'speak') TTS.speakWord(st.queue[st.i], b);
    else if (a === 'speakId') TTS.speakWord(Store.word(b.dataset.id), b);
    else if (a === 'check') check();
    else if (a === 'hint') { const w = st.queue[st.i]; const inp = $('#spAns', el); const h = hintFor(w.word); toast(`Gợi ý: ${h}`, 4000); if (inp) { inp.placeholder = h; inp.focus(); } }
    else if (a === 'next') next();
    else if (a === 'quit') location.hash = set.backLink;
    else if (a === 'retry') runSpell(el, set);
    else if (a === 'retryWrong') runSpell(el, { ...set, words: [...new Set(st.wrong)] });
  };
  const onKey = e => {
    if (isModalOpen()) return;
    if (e.ctrlKey && e.code === 'Space' && st.i < st.queue.length) { e.preventDefault(); TTS.speakWord(st.queue[st.i]); return; }
    if (e.key === 'Enter' && st.answered && !isTyping(e)) { e.preventDefault(); next(); }
  };
  document.addEventListener('keydown', onKey);
  onLeave(() => document.removeEventListener('keydown', onKey));
  draw();
}
