import { $, $$, esc, shuffle, sample, toast, isTyping, isPhrase, normalizeAnswer, hintFor, lengthClass } from '../utils.js?v=12';
import { Store, clozeRegex } from '../store.js?v=12';
import { resolveWordSet } from './flashcards.js?v=12';
import { TTS } from '../tts.js?v=12';
import { setTitle, renderSidebar } from '../shell.js?v=12';
import { isModalOpen } from '../modal.js?v=12';
import { onLeave, go } from '../router.js?v=12';

const QUIZ_MODES = [
  { id: 'mc-en-vi', ic: '🇬🇧→🇻🇳', t: 'Chọn nghĩa', d: 'Nhìn từ tiếng Anh, chọn nghĩa đúng' },
  { id: 'mc-vi-en', ic: '🇻🇳→🇬🇧', t: 'Chọn từ', d: 'Nhìn nghĩa tiếng Việt, chọn từ đúng' },
  { id: 'listen', ic: '🎧', t: 'Nghe chọn từ', d: 'Nghe phát âm, chọn từ đúng' },
  { id: 'spell', ic: '⌨️', t: 'Nghe & viết', d: 'Nghe phát âm + xem nghĩa, gõ lại từ' },
  { id: 'cloze', ic: '✍️', t: 'Điền vào chỗ trống', d: 'Hoàn thành câu ví dụ bằng từ đúng' },
  { id: 'mix', ic: '🎲', t: 'Tổng hợp', d: 'Trộn ngẫu nhiên tất cả dạng' },
];

/* Màn hình chọn dạng quiz */
export function viewQuiz(el, { id, parts }) {
  const set = resolveWordSet(id, parts[2]);
  if (!set) { go('/'); return; }
  const topic = set;
  setTitle('Quiz · ' + set.name);
  const words = set.words;
  if (words.length < 2) { el.innerHTML = `<div class="card empty-state">Cần ít nhất 2 từ để làm quiz. <a class="btn mt" href="${set.backLink}">Quay lại</a></div>`; return; }
  let mode = 'mix';
  const maxN = 500; // có thể nhiều hơn số từ: từ sẽ lặp lại với dạng câu hỏi khác
  const defN = Store.settings.quizCount;
  const clozeCount = Store.clozeWords(words).length;
  el.innerHTML = `
    <div class="quiz-wrap">
      <div class="page-head"><div><h1>📝 Quiz · ${set.icon} ${esc(set.name)}</h1><p class="muted">Chọn dạng bài kiểm tra</p></div><a class="btn btn-sm" href="${set.backLink}">← Quay lại</a></div>
      <div class="mode-grid">${QUIZ_MODES.map(m => `<button class="mode-card ${m.id === mode ? 'active' : ''}" data-mode="${m.id}" ${m.id === 'cloze' && !clozeCount ? 'disabled title="Chưa có từ nào có câu ví dụ chứa chính từ đó"' : ''}><div class="ic">${m.ic}</div><div class="t">${m.t}</div><div class="d">${m.d}${m.id === 'cloze' ? ` (${clozeCount} từ)` : ''}</div></button>`).join('')}</div>
      <div class="card mt row between">
        <div class="row"><label>Số câu hỏi:</label><input type="number" class="input" id="qN" min="1" max="${maxN}" value="${defN}" style="width:90px"> <span class="muted small">(${words.length} từ · nhiều hơn thì từ sẽ lặp lại)</span></div>
        <label class="check"><input type="checkbox" id="qWeak"> Ưu tiên từ chưa thuộc</label>
        <button class="btn btn-primary btn-lg" id="qStart">Bắt đầu ▶</button>
      </div>
    </div>`;
  $$('.mode-card', el).forEach(b => b.addEventListener('click', () => { if (b.disabled) return; mode = b.dataset.mode; $$('.mode-card', el).forEach(x => x.classList.toggle('active', x === b)); }));
  $('#qStart', el).addEventListener('click', () => {
    const n = Math.max(1, Math.min(maxN, parseInt($('#qN', el).value) || defN));
    const base = mode === 'cloze' ? Store.clozeWords(words) : words; // điền chỗ trống chỉ dùng từ có ví dụ phù hợp
    if (!base.length) { toast('Không có từ phù hợp cho dạng này'); return; }
    // Ưu tiên từ chưa thuộc: chọn theo mức thấp trước; nếu cần nhiều hơn số từ thì lặp lại theo vòng
    const ordered = $('#qWeak', el).checked ? [...base].sort((a, b) => a.level - b.level || Math.random() - .5) : shuffle(base);
    const picked = [];
    while (picked.length < n) { const round = picked.length ? shuffle(ordered) : ordered; for (const w of round) { if (picked.length >= n) break; picked.push(w); } }
    runQuiz(el, { topic, words, picked: shuffle(picked), mode }); // luôn xáo trộn thứ tự câu hỏi
  });
}

function runQuiz(el, { topic, words, picked, mode }) {
  const modes = ['mc-en-vi', 'mc-vi-en', 'listen', 'spell'];
  const questions = picked.map(w => {
    if (mode !== 'mix') return { w, mode };
    // Tổng hợp: thêm dạng điền chỗ trống cho từ có ví dụ phù hợp
    const pool = w.example && clozeRegex(w.word).test(w.example) ? [...modes, 'cloze'] : modes;
    return { w, mode: pool[Math.floor(Math.random() * pool.length)] };
  });
  const st = { i: 0, correct: 0, wrong: [], answered: false };
  const allWords = Store.words();

  // 3 đáp án nhiễu: ưu tiên cùng chủ đề, thiếu thì lấy từ chủ đề khác
  const pickOptions = (w, key) => {
    // Đáp án nhiễu cùng loại (từ đơn ↔ từ đơn, cụm ↔ cụm) cho khó đoán hơn; thiếu thì lấy bất kỳ
    const sameKind = words.filter(x => x.id !== w.id && x[key] !== w[key] && isPhrase(x.word) === isPhrase(w.word));
    const same = sameKind.length >= 3 ? sameKind : words.filter(x => x.id !== w.id && x[key] !== w[key]);
    const others = allWords.filter(x => x.topicId !== w.topicId && x[key] !== w[key]);
    const dist = sample(same, 3);
    if (dist.length < 3) dist.push(...sample(others, 3 - dist.length));
    return shuffle([w, ...dist]);
  };

  const draw = () => {
    if (st.i >= questions.length) { drawResult(); return; }
    const q = questions[st.i], w = q.w;
    st.answered = false;
    let body = '';
    if (q.mode === 'mc-en-vi') {
      body = `<div class="q-sub">Nghĩa của từ này là gì?</div>
        <div class="q-prompt ${lengthClass(w.word)}">${esc(w.word)} <button class="btn-icon btn-speak" data-act="speak">🔊</button></div>
        <div class="ipa">${esc(w.phonetic)}</div>
        <div class="q-options">${pickOptions(w, 'meaning').map((o, i) => `<button class="q-opt" data-id="${o.id}"><span class="q-num">${i + 1}</span>${esc(o.meaning)}</button>`).join('')}</div>`;
    } else if (q.mode === 'mc-vi-en') {
      body = `<div class="q-sub">Từ tiếng Anh nào có nghĩa là:</div>
        <div class="q-prompt ${lengthClass(w.meaning)}">${esc(w.meaning)}</div>
        <div class="q-options">${pickOptions(w, 'word').map((o, i) => `<button class="q-opt" data-id="${o.id}"><span class="q-num">${i + 1}</span>${esc(o.word)}</button>`).join('')}</div>`;
    } else if (q.mode === 'listen') {
      body = `<div class="q-sub">Nghe và chọn từ đúng</div>
        <div class="q-prompt"><button class="btn-icon btn-speak q-big-speak" data-act="speak">🔊</button></div>
        <div class="q-options">${pickOptions(w, 'word').map((o, i) => `<button class="q-opt" data-id="${o.id}"><span class="q-num">${i + 1}</span>${esc(o.word)} <span class="small muted">– ${esc(o.meaning)}</span></button>`).join('')}</div>`;
    } else if (q.mode === 'cloze') {
      const blank = '<span class="cloze-blank">' + '_'.repeat(Math.min(12, Math.max(5, w.word.length))) + '</span>';
      body = `<div class="q-sub">Điền từ còn thiếu vào câu</div>
        <div class="cloze-sentence">${esc(w.example).replace(clozeRegex(w.word), blank)}</div>
        <div class="muted small" style="margin-bottom:12px">${w.exampleVi ? esc(w.exampleVi) + ' · ' : ''}Gợi ý nghĩa: <b>${esc(w.meaning)}</b></div>
        <input class="input q-input" id="qAns" placeholder="${isPhrase(w.word) ? 'Gõ cụm từ...' : 'Gõ từ...'}" autocomplete="off" autocapitalize="off" spellcheck="false">
        <div class="row mt" style="justify-content:center"><button class="btn btn-primary" data-act="check">Kiểm tra</button><button class="btn" data-act="hint">💡 Gợi ý</button><button class="btn-icon btn-speak" data-act="speak" title="Nghe từ">🔊</button></div>`;
    } else {
      body = `<div class="q-sub">Nghe và gõ lại ${isPhrase(w.word) ? 'cụm từ' : 'từ'} tiếng Anh</div>
        <div class="q-prompt"><button class="btn-icon btn-speak q-big-speak" data-act="speak">🔊</button></div>
        <div class="muted" style="margin-bottom:12px">Nghĩa: <b>${esc(w.meaning)}</b>${w.pos ? ` <span class="pos">${w.pos}</span>` : ''}</div>
        <input class="input q-input" id="qAns" placeholder="${isPhrase(w.word) ? 'Gõ cụm từ...' : 'Gõ từ...'}" autocomplete="off" autocapitalize="off" spellcheck="false">
        <div class="row mt" style="justify-content:center"><button class="btn btn-primary" data-act="check">Kiểm tra</button><button class="btn" data-act="hint">💡 Gợi ý</button></div>`;
    }
    el.innerHTML = `
      <div class="quiz-wrap">
        <div class="fc-top"><span class="muted">Câu <b>${st.i + 1}</b> / ${questions.length}</span><span class="muted">Đúng: <b style="color:var(--success)">${st.correct}</b> · Sai: <b style="color:var(--danger)">${st.wrong.length}</b></span><button class="btn btn-sm" data-act="quit">✕ Thoát</button></div>
        <div class="progress mb"><div style="width:${st.i / questions.length * 100}%"></div></div>
        <div class="card q-card">${body}<div id="qFeedback"></div></div>
      </div>`;
    if (q.mode === 'listen' || q.mode === 'spell') setTimeout(() => TTS.speakWord(w), 200);
    const inp = $('#qAns', el);
    if (inp) { inp.focus(); inp.addEventListener('keydown', e => { if (e.key === 'Enter') { if (st.answered) next(); else checkSpell(); } }); }
  };

  const showFeedback = (ok, w) => {
    const last = st.i + 1 >= questions.length;
    $('#qFeedback', el).innerHTML = `
      <div class="q-feedback ${ok ? 'ok' : 'bad'}">
        <div class="q-fb-text">
          <div class="q-fb-title">${ok ? '🎉 Chính xác!' : '❌ Chưa đúng'}</div>
          ${ok ? '' : `<div class="q-fb-ans">Đáp án: <b>${esc(w.word)}</b> <span class="ipa">${esc(w.phonetic)}</span> – ${esc(w.meaning)}</div>`}
        </div>
        <button class="btn ${ok ? 'btn-success' : 'btn-primary'}" data-act="next" autofocus>${last ? 'Xem kết quả' : 'Câu tiếp'} →</button>
      </div>
      <div class="muted small" style="text-align:right;margin-top:6px">Nhấn <span class="kbd">Enter</span> để tiếp tục</div>`;
    if (!ok) TTS.speakWord(w);
  };
  const answer = (ok) => {
    const w = questions[st.i].w;
    st.answered = true;
    Store.rate(w, ok);
    if (ok) st.correct++; else st.wrong.push(w);
    showFeedback(ok, w);
  };
  const checkSpell = () => {
    const inp = $('#qAns', el); if (!inp) return;
    const w = questions[st.i].w;
    const ok = normalizeAnswer(inp.value) === normalizeAnswer(w.word); // không phân biệt hoa/thường, dấu câu, khoảng trắng thừa
    inp.disabled = true; inp.classList.add(ok ? 'is-ok' : 'is-bad');
    answer(ok);
  };
  const next = () => { st.i++; draw(); };

  const drawResult = () => {
    const pct = Math.round(st.correct / questions.length * 100);
    el.innerHTML = `
      <div class="quiz-wrap"><div class="card q-card">
        <div style="font-size:3rem">${pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
        <h2>Kết quả</h2>
        <div class="result-score">${pct}%</div>
        <p class="muted">Đúng ${st.correct} / ${questions.length} câu · 🔥 chuỗi ${Store.streak()} ngày</p>
        <div class="row" style="justify-content:center">
          <button class="btn btn-primary" data-act="retry">🔁 Làm lại</button>
          ${st.wrong.length ? `<button class="btn btn-danger" data-act="retryWrong">Ôn lại ${st.wrong.length} từ sai</button>` : ''}
          <a class="btn" href="#/quiz/${topic.id}">Chọn dạng khác</a>
          <a class="btn" href="${topic.backLink}">← Quay lại</a>
        </div>
        ${st.wrong.length ? `<ul class="plain-list result-list">${st.wrong.map(w => `<li><button class="btn-icon sm btn-speak" data-act="speakId" data-id="${w.id}">🔊</button><div class="info"><b>${esc(w.word)}</b> <span class="ipa">${esc(w.phonetic)}</span><div class="small muted">${esc(w.meaning)}</div></div></li>`).join('')}</ul>` : '<p class="muted">Tuyệt vời, không sai câu nào!</p>'}
      </div></div>`;
    renderSidebar();
  };

  el.addEventListener('click', e => {
    const opt = e.target.closest('.q-opt');
    if (opt && !st.answered) {
      const w = questions[st.i].w;
      const ok = opt.dataset.id === w.id;
      $$('.q-opt', el).forEach(b => { b.disabled = true; if (b.dataset.id === w.id) b.classList.add('correct'); });
      if (!ok) opt.classList.add('wrong');
      answer(ok);
      return;
    }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'speak') TTS.speakWord(questions[st.i].w, b);
    else if (a === 'speakId') TTS.speakWord(Store.word(b.dataset.id), b);
    else if (a === 'check') checkSpell();
    else if (a === 'hint') { const w = questions[st.i].w; const inp = $('#qAns', el); const h = hintFor(w.word); toast(`Gợi ý: ${h}`, 4000); inp.placeholder = h; inp.focus(); }
    else if (a === 'next') next();
    else if (a === 'quit') location.hash = topic.backLink;
    else if (a === 'retry') runQuiz(el, { topic, words, picked: shuffle(picked), mode });
    else if (a === 'retryWrong') runQuiz(el, { topic, words, picked: shuffle(st.wrong), mode });
  });
  const onKey = e => {
    if (isModalOpen()) return;
    if (e.key === 'Enter' && st.answered && !isTyping(e)) { e.preventDefault(); next(); return; }
    if (!st.answered && /^[1-4]$/.test(e.key) && !isTyping(e)) { const o = $$('.q-opt', el)[+e.key - 1]; if (o) o.click(); }
  };
  document.addEventListener('keydown', onKey);
  onLeave(() => document.removeEventListener('keydown', onKey));
  draw();
}
