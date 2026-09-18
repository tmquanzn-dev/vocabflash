import { $, $$, esc, shuffle, sample, toast, isTyping, normalizeAnswer } from '../utils.js?v=13';
import { Store } from '../store.js?v=13';
import { TTS } from '../tts.js?v=13';
import { setTitle, renderSidebar } from '../shell.js?v=13';
import { isModalOpen } from '../modal.js?v=13';
import { onLeave, go } from '../router.js?v=13';
import { TENSES, TENSE_BY_ID, LEVELS } from '../grammar/tenses.js?v=13';
import { bankQuestions } from '../grammar/bank.js?v=13';
import { genMany } from '../grammar/gen.js?v=13';
import { timelineSVG } from '../grammar/timeline.js?v=13';
import { AI } from '../ai.js?v=13';

const GROUPS = ['Hiện tại', 'Quá khứ', 'Tương lai'];
const MIX = { id: 'mix', name: 'Mixed Tenses', vi: 'Tổng hợp 13 thì', icon: '🎲', short: 'Trộn ngẫu nhiên tất cả các thì – luyện phân biệt' };
// Tuỳ chọn luyện tập nhớ giữa các lần vào (không lưu cloud)
const opt = { n: 15, mode: 'mix', tab: 'theory', aiTopic: '', aiN: 10 };
const AI_TOPICS = ['Công nghệ', 'Du lịch', 'Công việc', 'Trường học', 'Thể thao', 'Ẩm thực', 'Gia đình', 'Môi trường', 'Phim & nhạc'];

/* Điều hướng: #/grammar · #/grammar/<thì> · #/grammar/<thì>/practice/<mức> */
export function viewGrammar(el, { id, parts }) {
  if (!id) return viewOverview(el);
  const tense = id === 'mix' ? MIX : TENSE_BY_ID[id];
  if (!tense) { go('/grammar'); return; }
  if (parts[2] === 'practice') return runPractice(el, tense, Math.min(3, Math.max(1, parseInt(parts[3]) || 1)));
  return viewTense(el, tense);
}

const bestOf = (tid) => Math.max(0, ...LEVELS.map(l => Store.grammarStat(tid, l.id).best));
const levelChips = (tid) => LEVELS.map(l => { const s = Store.grammarStat(tid, l.id); return `<span class="chip ${s.attempts ? (s.best >= 80 ? 'good' : s.best >= 50 ? 'warn' : 'bad') : ''}" title="${l.name}: ${s.attempts ? `tốt nhất ${s.best}% · ${s.attempts} lượt` : 'chưa luyện'}">${l.icon} ${s.attempts ? s.best + '%' : '–'}</span>`; }).join('');

/* ---------- Tổng quan 13 thì ---------- */
function viewOverview(el) {
  setTitle('Ngữ pháp – 13 thì');
  const done = TENSES.filter(t => bestOf(t.id) > 0).length;
  const attempts = TENSES.concat(MIX).reduce((s, t) => s + LEVELS.reduce((x, l) => x + Store.grammarStat(t.id, l.id).attempts, 0), 0);
  el.innerHTML = `
    <div class="page-head">
      <div><h1>📐 Ngữ pháp – 13 thì cơ bản</h1><p class="muted">Mỗi thì có công thức, cách dùng, dấu hiệu nhận biết, ví dụ và bài tập 3 mức. Bài tập được xáo trộn và sinh mới mỗi lần làm.</p></div>
      <a class="btn btn-primary" href="#/grammar/mix">🎲 Luyện tổng hợp</a>
    </div>
    <div class="stats">
      <div class="stat accent"><div class="n">${done}/13</div><div class="l">Thì đã luyện</div></div>
      <div class="stat"><div class="n">${attempts}</div><div class="l">Lượt luyện tập</div></div>
      <div class="stat good"><div class="n">${TENSES.filter(t => bestOf(t.id) >= 80).length}</div><div class="l">Thì đạt ≥ 80%</div></div>
    </div>
    ${GROUPS.map(g => `<h2 class="g-group">${g === 'Hiện tại' ? '🟢' : g === 'Quá khứ' ? '🟡' : '🔵'} Thì ${g.toLowerCase()}</h2>
      <div class="grid g-grid">${TENSES.filter(t => t.group === g).map(t => `<a class="card tense-card" href="#/grammar/${t.id}">
        <div class="row between"><span class="icon">${t.icon}</span><span class="row" style="gap:4px">${levelChips(t.id)}</span></div>
        <div class="name">${esc(t.name)}</div>
        <div class="vi">${esc(t.vi)}</div>
        <div class="desc">${esc(t.short)}</div>
        <div class="progress"><div style="width:${bestOf(t.id)}%"></div></div>
      </a>`).join('')}</div>`).join('')}
    <h2 class="g-group">🎲 Tổng hợp</h2>
    <div class="grid g-grid"><a class="card tense-card mix" href="#/grammar/mix">
      <div class="row between"><span class="icon">${MIX.icon}</span><span class="row" style="gap:4px">${levelChips('mix')}</span></div>
      <div class="name">${MIX.name}</div><div class="vi">${MIX.vi}</div><div class="desc">${MIX.short}</div>
    </a></div>`;
}

/* ---------- Một thì: lý thuyết + chọn bài tập ---------- */
function viewTense(el, t) {
  setTitle(t.vi);
  const isMix = t.id === 'mix';
  if (isMix) opt.tab = 'practice';
  const i = TENSES.findIndex(x => x.id === t.id);
  const prev = TENSES[i - 1], next = TENSES[i + 1];
  el.innerHTML = `
    <div class="page-head">
      <div><a class="muted small" href="#/grammar">← 13 thì</a><h1><span>${t.icon}</span> ${esc(t.name)}</h1><p class="muted">${esc(t.vi)} · ${esc(t.short)}</p></div>
      ${isMix ? '' : `<div class="row">${prev ? `<a class="btn btn-sm" href="#/grammar/${prev.id}" title="${esc(prev.vi)}">← ${prev.icon}</a>` : ''}${next ? `<a class="btn btn-sm" href="#/grammar/${next.id}" title="${esc(next.vi)}">${next.icon} →</a>` : ''}</div>`}
    </div>
    ${isMix ? '' : `<div class="seg mb" id="gTabs"><button class="${opt.tab === 'theory' ? 'active' : ''}" data-tab="theory">📖 Lý thuyết</button><button class="${opt.tab === 'practice' ? 'active' : ''}" data-tab="practice">✏️ Bài tập</button></div>`}
    <div id="gBody"></div>`;
  const body = $('#gBody', el);
  const drawTheory = () => {
    // Ví dụ mẫu cho 3 khối công thức: lấy câu khẳng định / phủ định / nghi vấn trong danh sách ví dụ
    const exFor = kind => t.examples.find(([en]) => kind === 'q' ? /\?$/.test(en) : kind === 'neg' ? /n't|\bnot\b/i.test(en) : !/\?$/.test(en) && !/n't|\bnot\b/i.test(en)) || t.examples[0];
    const fblock = (kind, cls, label, ic) => { const [en, vi] = exFor(kind); return `<div class="g-fblock ${cls}"><div class="g-fhead"><span>${ic}</span> ${label}</div><code>${t.formula[kind]}</code><div class="g-fex"><button class="btn-icon sm btn-speak" data-say="${esc(en)}">🔊</button><div><b>${esc(en)}</b><div class="small muted">${esc(vi)}</div></div></div></div>`; };
    body.innerHTML = `
      <div class="card g-tl-card">
        <div class="row between"><h3 style="margin:0">🕒 Trục thời gian</h3><span class="muted small">${esc(t.short)}</span></div>
        ${timelineSVG(t.id)}
      </div>
      <h3 class="g-h">🧮 Công thức</h3>
      <div class="g-fgrid">${fblock('aff', 'ok', 'Khẳng định', '✓')}${fblock('neg', 'bad', 'Phủ định', '✗')}${fblock('q', 'q', 'Nghi vấn', '?')}</div>
      <h3 class="g-h">🎯 Khi nào dùng? <span class="muted small" style="font-weight:500">– bấm vào câu ví dụ để xem nghĩa</span></h3>
      <div class="g-usegrid">${t.uses.map(([d, en, vi], i) => `<div class="g-use"><div class="g-usen">${i + 1}</div><div class="g-usebody"><b>${d}</b>
        <div class="g-flip" data-flip><button class="btn-icon sm btn-speak" data-say="${esc(en)}">🔊</button><span class="en">${esc(en)}</span><span class="vi">${esc(vi)}</span></div></div></div>`).join('')}</div>
      <div class="dash-grid mt">
        <div class="callout sig"><div class="callout-h">🔎 Dấu hiệu nhận biết</div><div class="row" style="gap:6px">${t.signals.map(s => `<span class="chip sig">${esc(s)}</span>`).join('')}</div><p class="small muted" style="margin:10px 0 0">Thấy các từ này trong câu → nghĩ ngay tới <b>${esc(t.vi)}</b>.</p></div>
        <div>
          <h3 class="g-h" style="margin-top:0">💬 Ví dụ thêm <span class="muted small" style="font-weight:500">– lật thẻ để xem nghĩa</span></h3>
          <div class="g-exgrid">${t.examples.map(([en, vi]) => `<div class="g-excard" data-flip><div class="g-exin"><div class="g-exface front"><button class="btn-icon sm btn-speak" data-say="${esc(en)}">🔊</button><b>${esc(en)}</b><span class="hint">bấm để lật</span></div><div class="g-exface back"><span>${esc(vi)}</span></div></div></div>`).join('')}</div>
        </div>
      </div>
      <h3 class="g-h">⚠️ Lưu ý & lỗi thường gặp</h3>
      <div class="stack">${t.notes.map(n => `<div class="callout warn"><span class="callout-ic">💡</span><div>${n}</div></div>`).join('')}</div>
      <div class="row mt" style="justify-content:center"><button class="btn btn-primary btn-lg" data-tab="practice">✏️ Làm bài tập ngay</button></div>`;
  };
  const drawPractice = () => {
    body.innerHTML = `
      <div class="g-levels">${LEVELS.map(l => { const s = Store.grammarStat(t.id, l.id); return `<div class="card g-level lv${l.id}">
        <div class="row between"><b>${l.icon} ${l.name}</b>${s.attempts ? `<span class="chip ${s.best >= 80 ? 'good' : s.best >= 50 ? 'warn' : 'bad'}">Tốt nhất ${s.best}%</span>` : '<span class="chip">Chưa luyện</span>'}</div>
        <p class="muted small">${l.desc}</p>
        ${s.attempts ? `<p class="small muted">${s.attempts} lượt · lần cuối ${s.last}% · đúng ${s.correct}/${s.total} câu</p>` : ''}
        <a class="btn ${l.id === 1 ? 'btn-success' : l.id === 2 ? 'btn-primary' : 'btn-danger'} btn-block" href="#/grammar/${t.id}/practice/${l.id}">Bắt đầu ▶</a>
      </div>`; }).join('')}</div>
      <div class="card mt row between">
        <div class="row"><label>Số câu:</label><select class="input" id="gN" style="width:auto">${[10, 15, 20, 30, 50].map(n => `<option value="${n}" ${opt.n === n ? 'selected' : ''}>${n} câu</option>`).join('')}</select></div>
        <div class="row"><label>Dạng bài:</label><div class="seg" id="gMode">${[['mix', '🎲 Trộn'], ['mc', '🔘 Trắc nghiệm'], ['fill', '⌨️ Tự gõ']].map(([m, l]) => `<button class="${opt.mode === m ? 'active' : ''}" data-mode="${m}">${l}</button>`).join('')}</div></div>
        <span class="muted small">Câu hỏi gồm bộ soạn tay + bộ sinh tự động, xáo trộn mỗi lần – không lần nào giống lần nào.</span>
      </div>
      <div class="card mt ai-key">
        <div class="row between"><div><h3 style="margin:0">✨ Sinh bài tập bằng AI</h3><div class="small muted">Gemini viết câu mới theo <b>chủ đề bạn chọn</b>, tự nhiên như sách giáo khoa, kèm giải thích tiếng Việt cho từng câu. Mức độ & dạng bài lấy theo lựa chọn phía trên.</div></div>${AI.available ? '' : '<a class="chip bad" href="#/ai">Chưa có AI – cấu hình</a>'}</div>
        <div class="row mt" style="gap:6px" id="gTopics">${AI_TOPICS.map(x => `<button class="chip sig g-topic ${opt.aiTopic === x ? 'on' : ''}" data-topic="${esc(x)}">${esc(x)}</button>`).join('')}</div>
        <div class="row mt">
          <input class="input" id="gTopic" placeholder="Hoặc gõ chủ đề bất kỳ: Harry Potter, bóng đá, du học…" value="${esc(opt.aiTopic)}" style="max-width:360px">
          <label>Mức:</label><div class="seg" id="gAiLv">${LEVELS.map(l => `<button class="${l.id === (opt.aiLv || 1) ? 'active' : ''}" data-lv="${l.id}">${l.icon} ${l.name}</button>`).join('')}</div>
          <select class="input" id="gAiN" style="width:auto">${[5, 10, 15].map(n => `<option value="${n}" ${opt.aiN === n ? 'selected' : ''}>${n} câu</option>`).join('')}</select>
          <button class="btn btn-primary" id="gAiRun" ${AI.available ? '' : 'disabled'}>✨ Sinh & làm bài</button>
        </div>
        <div class="ai-status muted small mt" id="gAiStatus"></div>
      </div>`;
    $('#gN', body).addEventListener('change', e => { opt.n = +e.target.value; });
    $('#gMode', body).addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) { opt.mode = b.dataset.mode; $$('[data-mode]', body).forEach(x => x.classList.toggle('active', x === b)); } });
    $('#gTopics', body).addEventListener('click', e => { const b = e.target.closest('[data-topic]'); if (!b) return; opt.aiTopic = b.dataset.topic; $('#gTopic', body).value = opt.aiTopic; $$('.g-topic', body).forEach(x => x.classList.toggle('on', x === b)); });
    $('#gTopic', body).addEventListener('input', e => { opt.aiTopic = e.target.value; $$('.g-topic', body).forEach(x => x.classList.toggle('on', x.dataset.topic === opt.aiTopic)); });
    $('#gAiLv', body).addEventListener('click', e => { const b = e.target.closest('[data-lv]'); if (b) { opt.aiLv = +b.dataset.lv; $$('#gAiLv button', body).forEach(x => x.classList.toggle('active', x === b)); } });
    $('#gAiN', body).addEventListener('change', e => { opt.aiN = +e.target.value; });
    $('#gAiRun', body).addEventListener('click', e => startAI(el, t, opt.aiLv || 1, e.currentTarget, $('#gAiStatus', body)));
  };
  const show = tab => { opt.tab = tab; $$('#gTabs button', el).forEach(b => b.classList.toggle('active', b.dataset.tab === tab)); tab === 'theory' ? drawTheory() : drawPractice(); window.scrollTo(0, 0); };
  el.addEventListener('click', e => {
    const s = e.target.closest('[data-say]'); if (s) { TTS.speakText(s.dataset.say, s); return; }
    const f = e.target.closest('[data-flip]'); if (f) { f.classList.toggle('show'); return; }
    const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab);
  });
  show(isMix ? 'practice' : opt.tab);
}

/* ---------- Sinh bộ câu hỏi bằng AI rồi vào làm bài ---------- */
async function startAI(el, t, lv, btn, statusEl) {
  const tenses = (t.id === 'mix' ? TENSES : [t]).map(x => ({ id: x.id, name: x.name }));
  const topic = (opt.aiTopic || '').trim();
  if (btn) { btn.disabled = true; btn.textContent = '⏳ AI đang soạn câu hỏi...'; }
  const t0 = Date.now(); let timer = null;
  if (statusEl) { const tick = () => { statusEl.textContent = `⏳ Đang sinh ${opt.aiN} câu chủ đề "${topic || 'đời sống'}"… ${Math.round((Date.now() - t0) / 1000)}s`; }; tick(); timer = setInterval(tick, 1000); }
  try {
    const qs = await AI.grammarQuestions({ tenses, level: lv, topic, n: opt.aiN, mode: opt.mode });
    clearInterval(timer);
    runPractice(el, t, lv, { questions: qs, topic });
  } catch (err) {
    clearInterval(timer);
    if (statusEl) { statusEl.textContent = '⚠️ ' + err.message; statusEl.style.color = 'var(--danger)'; }
    else toast('Lỗi AI: ' + err.message, 5000);
    if (btn) { btn.disabled = false; btn.textContent = '✨ Sinh & làm bài'; }
  }
}

/* ---------- Xây bộ câu hỏi: soạn tay + sinh tự động, xáo trộn ---------- */
function buildSet(tenseIds, lv, n, mode) {
  const perTense = Math.ceil(n / tenseIds.length);
  let hand = [], gen = [];
  for (const t of tenseIds) { hand.push(...bankQuestions(t, lv)); gen.push(...genMany(t, lv, perTense * 2)); }
  if (mode === 'fill') hand = hand.filter(q => q.kind !== 'pick'); // "chọn câu đúng" không gõ được
  // Khoảng một nửa lấy từ bộ soạn tay (nếu đủ), còn lại sinh tự động
  const nHand = Math.min(hand.length, Math.ceil(n / 2));
  let qs = [...sample(hand, nHand), ...sample(gen, n - nHand)];
  if (qs.length < n) qs.push(...sample(hand.filter(q => !qs.includes(q)), n - qs.length));
  return shuffle(qs).map(q => {
    let kind = q.kind;
    if (kind !== 'pick') kind = mode === 'mc' ? 'mc' : mode === 'fill' ? 'fill' : (lv === 3 ? (Math.random() < .6 ? 'fill' : 'mc') : (Math.random() < .3 ? 'fill' : 'mc'));
    return { ...q, kind, opts: shuffle(q.opts) };
  });
}

const same = (a, b) => { const f = s => normalizeAnswer(s).replace(/'/g, ''); return f(a) === f(b); };
const blankHTML = q => esc(q).replace(/___/g, '<span class="g-blank">____</span>').replace(/\(([^)]+)\)/g, '<span class="g-hint">($1)</span>');

/* ---------- Làm bài ---------- */
function runPractice(el, t, lv, preset) {
  const level = LEVELS.find(l => l.id === lv);
  const tenseIds = t.id === 'mix' ? TENSES.map(x => x.id) : [t.id];
  setTitle(`${t.vi} · ${level.name}`);
  const back = `#/grammar/${t.id}`;
  // preset: bộ câu hỏi do AI sinh ({ questions, topic }) – gán dạng bài theo lựa chọn giống bộ thường
  const questions = preset ? shuffle(preset.questions).map(q => {
    let kind = q.kind;
    if (kind !== 'pick') kind = opt.mode === 'mc' ? 'mc' : opt.mode === 'fill' ? 'fill' : (lv === 3 ? (Math.random() < .6 ? 'fill' : 'mc') : (Math.random() < .3 ? 'fill' : 'mc'));
    return { ...q, kind, opts: shuffle(q.opts) };
  }) : buildSet(tenseIds, lv, opt.n, opt.mode);
  if (!questions.length) { el.innerHTML = `<div class="card empty-state">Chưa có câu hỏi. <a class="btn mt" href="${back}">Quay lại</a></div>`; return; }
  const st = { i: 0, correct: 0, wrong: [], answered: false, userAns: '' };

  const draw = () => {
    if (st.i >= questions.length) { drawResult(); return; }
    const q = questions[st.i]; st.answered = false;
    const tense = TENSE_BY_ID[q.tense];
    const body = q.kind === 'fill'
      ? `<div class="g-q">${blankHTML(q.q)}</div>
         <input class="input q-input g-input" id="gAns" placeholder="${q.a.includes(' / ') ? 'Gõ các đáp án, cách nhau bằng /' : 'Gõ dạng đúng của động từ...'}" autocomplete="off" autocapitalize="off" spellcheck="false">
         <div class="row mt" style="justify-content:center"><button class="btn btn-primary" data-act="check">Kiểm tra</button><button class="btn" data-act="hint">💡 Gợi ý</button></div>`
      : `<div class="g-q">${q.kind === 'pick' ? esc(q.q) : blankHTML(q.q)}</div>
         <div class="q-options ${q.kind === 'pick' ? 'one-col' : ''}">${q.opts.map((o, i) => `<button class="q-opt" data-ans="${esc(o)}"><span class="q-num">${i + 1}</span>${esc(o)}</button>`).join('')}</div>`;
    el.innerHTML = `
      <div class="quiz-wrap">
        <div class="fc-top"><span class="muted">Câu <b>${st.i + 1}</b> / ${questions.length}</span><span class="muted">Đúng: <b style="color:var(--success)">${st.correct}</b> · Sai: <b style="color:var(--danger)">${st.wrong.length}</b></span><button class="btn btn-sm" data-act="quit">✕ Thoát</button></div>
        <div class="progress mb"><div style="width:${st.i / questions.length * 100}%"></div></div>
        <div class="card q-card">
          <div class="g-meta"><span class="chip">${level.icon} ${level.name}</span>${t.id === 'mix' ? `<span class="chip sig">${tense.icon} ${esc(tense.vi)}</span>` : ''}<span class="chip">${q.kind === 'fill' ? '⌨️ Tự gõ' : q.kind === 'pick' ? '✅ Chọn câu đúng' : '🔘 Trắc nghiệm'}</span>${q.ai ? `<span class="chip good">✨ AI${preset?.topic ? ' · ' + esc(preset.topic) : ''}</span>` : ''}</div>
          ${body}<div id="qFeedback"></div>
        </div>
      </div>`;
    const inp = $('#gAns', el);
    if (inp) { inp.focus(); inp.addEventListener('keydown', e => { if (e.key === 'Enter') { if (st.answered) next(); else check(inp.value); } }); }
  };

  const showFeedback = (ok, q) => {
    const tense = TENSE_BY_ID[q.tense];
    const last = st.i + 1 >= questions.length;
    $('#qFeedback', el).innerHTML = `
      <div class="q-feedback ${ok ? 'ok' : 'bad'}">
        <div class="q-fb-text">
          <div class="q-fb-title">${ok ? '🎉 Chính xác!' : '❌ Chưa đúng'}</div>
          ${ok && q.kind !== 'pick' ? '' : `<div class="q-fb-ans">Đáp án: <b>${esc(q.a)}</b></div>`}
          <div class="q-fb-ans muted">${q.x ? esc(q.x) : `${tense.icon} ${esc(tense.vi)}: <code>${tense.formula.aff}</code>`}${t.id === 'mix' || q.x ? ` · <a href="#/grammar/${tense.id}" target="_blank" style="color:var(--primary)">xem lý thuyết ${esc(tense.name)}</a>` : ''}</div>
          ${!ok && AI.available ? `<button class="btn btn-sm g-explain-btn" data-act="explain">✨ Nhờ AI giải thích kỹ hơn</button>` : ''}
        </div>
        <button class="btn ${ok ? 'btn-success' : 'btn-primary'}" data-act="next" autofocus>${last ? 'Xem kết quả' : 'Câu tiếp'} →</button>
      </div>
      <div id="gExplain"></div>
      <div class="muted small" style="text-align:right;margin-top:6px">Nhấn <span class="kbd">Enter</span> để tiếp tục</div>`;
  };
  // Gửi câu hỏi + đáp án của người học cho Gemini → giải thích dấu hiệu, vì sao dùng thì đó, vì sao sai
  const explain = async btn => {
    const q = questions[st.i]; const box = $('#gExplain', el); if (!box) return;
    btn.disabled = true; btn.textContent = '⏳ AI đang giải thích...';
    box.innerHTML = '';
    try {
      const text = await AI.explainGrammar({ q: q.q, a: q.a, user: st.userAns, tense: TENSE_BY_ID[q.tense].name });
      box.innerHTML = `<div class="callout ai"><div class="callout-h">✨ AI giải thích</div><div class="g-explain">${esc(text).replace(/\n/g, '<br>')}</div></div>`;
      btn.remove();
    } catch (err) { box.innerHTML = `<div class="callout warn"><span class="callout-ic">⚠️</span><div>${esc(err.message)}</div></div>`; btn.disabled = false; btn.textContent = '✨ Nhờ AI giải thích kỹ hơn'; }
  };
  const answer = ok => { const q = questions[st.i]; st.answered = true; if (ok) st.correct++; else st.wrong.push(q); showFeedback(ok, q); };
  const check = val => {
    const inp = $('#gAns', el); if (!inp || !val.trim()) { toast('Hãy nhập đáp án'); return; }
    const q = questions[st.i];
    const ok = same(val, q.a) || q.alts.some(a => same(val, a));
    st.userAns = val.trim();
    inp.disabled = true; inp.classList.add(ok ? 'is-ok' : 'is-bad');
    answer(ok);
  };
  const next = () => { st.i++; draw(); };

  const drawResult = () => {
    const pct = Math.round(st.correct / questions.length * 100);
    Store.recordGrammar(t.id, lv, st.correct, questions.length);
    renderSidebar();
    // Thống kê theo thì (khi luyện tổng hợp)
    const byTense = {};
    questions.forEach(q => { const b = byTense[q.tense] || (byTense[q.tense] = { n: 0, ok: 0 }); b.n++; if (!st.wrong.includes(q)) b.ok++; });
    el.innerHTML = `
      <div class="quiz-wrap"><div class="card q-card">
        <div style="font-size:3rem">${pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '👍' : '💪'}</div>
        <h2>${t.icon} ${esc(t.vi)} · ${level.icon} ${level.name}</h2>
        <div class="result-score">${pct}%</div>
        <p class="muted">Đúng ${st.correct} / ${questions.length} câu · tốt nhất ${Store.grammarStat(t.id, lv).best}% · 🔥 chuỗi ${Store.streak()} ngày</p>
        <div class="row" style="justify-content:center">
          ${preset ? `<button class="btn btn-primary" data-act="retryAI">✨ Sinh bộ AI mới${preset.topic ? ` (${esc(preset.topic)})` : ''}</button>` : ''}
          <a class="btn ${preset ? '' : 'btn-primary'}" href="#/grammar/${t.id}/practice/${lv}" data-act="retry">🔁 Làm bộ ${preset ? 'thường' : 'mới'}</a>
          ${lv < 3 && pct >= 80 ? `<a class="btn btn-success" href="#/grammar/${t.id}/practice/${lv + 1}">Lên mức ${LEVELS[lv].name} →</a>` : ''}
          <a class="btn" href="${back}">← Quay lại</a>
        </div>
        ${t.id === 'mix' ? `<div class="row mt" style="justify-content:center;gap:6px">${Object.entries(byTense).map(([id, b]) => `<a class="chip ${b.ok === b.n ? 'good' : b.ok / b.n >= .5 ? 'warn' : 'bad'}" href="#/grammar/${id}" title="${esc(TENSE_BY_ID[id].vi)}">${TENSE_BY_ID[id].icon} ${b.ok}/${b.n}</a>`).join('')}</div>` : ''}
        ${st.wrong.length ? `<div class="result-list"><h3>Câu sai – xem lại</h3>${st.wrong.map(q => `<div class="g-wrong">
          <div>${q.kind === 'pick' ? esc(q.q) : blankHTML(q.q)}</div>
          <div class="small">✅ <b>${esc(q.a)}</b>${q.x ? ` <span class="muted">– ${esc(q.x)}</span>` : ''} <a class="muted" href="#/grammar/${q.tense}">(${esc(TENSE_BY_ID[q.tense].vi)})</a></div>
        </div>`).join('')}</div>` : '<p class="muted">Tuyệt vời, không sai câu nào!</p>'}
      </div></div>`;
  };

  el.addEventListener('click', e => {
    const o = e.target.closest('.q-opt');
    if (o && !st.answered) {
      const q = questions[st.i]; const ok = o.dataset.ans === q.a; st.userAns = o.dataset.ans;
      $$('.q-opt', el).forEach(b => { b.disabled = true; if (b.dataset.ans === q.a) b.classList.add('correct'); });
      if (!ok) o.classList.add('wrong');
      answer(ok); return;
    }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'check') check($('#gAns', el)?.value || '');
    else if (a === 'hint') { const q = questions[st.i]; const tense = TENSE_BY_ID[q.tense]; toast(`💡 ${tense.vi}: ${tense.formula.aff.replace(/&nbsp;/g, ' ')}`, 4000); }
    else if (a === 'next') next();
    else if (a === 'explain') explain(b);
    else if (a === 'quit') location.hash = back;
    else if (a === 'retry') { e.preventDefault(); runPractice(el, t, lv); }
    else if (a === 'retryAI') { b.disabled = true; b.textContent = '⏳ AI đang soạn...'; startAI(el, t, lv, b, null); }
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
