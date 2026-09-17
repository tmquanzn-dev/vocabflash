import { $, $$, esc, shuffle, sample } from '../utils.js?v=9';
import { Store } from '../store.js?v=9';
import { TTS } from '../tts.js?v=9';
import { setTitle } from '../shell.js?v=9';
import { onLeave, go } from '../router.js?v=9';
import { resolveWordSet } from './flashcards.js?v=9';

/* Trò chơi nối từ – nghĩa: chọn 1 thẻ tiếng Anh + 1 thẻ nghĩa, đúng thì biến mất */
export function viewMatch(el, { id, parts }) {
  const set = resolveWordSet(id, parts[2]);
  if (!set) { go('/'); return; }
  setTitle('Nối từ · ' + set.name);
  if (set.words.length < 3) { el.innerHTML = `<div class="card empty-state">Cần ít nhất 3 từ để chơi. <a class="btn mt" href="${set.backLink}">Quay lại</a></div>`; return; }

  const PAIRS = Math.min(6, set.words.length);
  let round, timer;
  const startRound = () => {
    clearInterval(timer);
    const words = sample(set.words, PAIRS);
    round = {
      cards: shuffle([
        ...words.map(w => ({ id: w.id, side: 'en', text: w.word, w })),
        ...words.map(w => ({ id: w.id, side: 'vi', text: w.meaning, w })),
      ]),
      picked: null, matched: 0, moves: 0, wrong: 0, start: Date.now(), lock: false,
    };
    draw();
    timer = setInterval(() => { const t = $('#mTime', el); if (t) t.textContent = fmt(Date.now() - round.start); }, 500);
  };
  const fmt = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  const draw = () => {
    el.innerHTML = `
      <div class="quiz-wrap">
        <div class="fc-top">
          <a class="btn btn-sm" href="${set.backLink}">← Quay lại</a>
          <div class="muted">🎮 Nối từ · ${set.icon} ${esc(set.name)}</div>
          <div class="muted small">⏱ <b id="mTime">0:00</b> · Lượt: <b id="mMoves">0</b></div>
        </div>
        <p class="muted small" style="text-align:center">Bấm một thẻ <b>tiếng Anh</b> rồi bấm thẻ <b>nghĩa</b> tương ứng. ${PAIRS} cặp.</p>
        <div class="match-grid" id="mGrid">${round.cards.map((c, i) => `<button class="match-card ${c.side}" data-i="${i}"><span>${esc(c.text)}</span></button>`).join('')}</div>
      </div>`;
    $('#mGrid', el).addEventListener('click', e => {
      const b = e.target.closest('.match-card'); if (!b || round.lock || b.classList.contains('done')) return;
      pick(b);
    });
  };

  const pick = b => {
    const c = round.cards[+b.dataset.i];
    if (round.picked && round.picked.el === b) { b.classList.remove('sel'); round.picked = null; return; }
    if (!round.picked) { round.picked = { el: b, c }; b.classList.add('sel'); if (c.side === 'en') TTS.speakWord(c.w); return; }
    const p = round.picked;
    if (p.c.side === c.side) { p.el.classList.remove('sel'); round.picked = { el: b, c }; b.classList.add('sel'); if (c.side === 'en') TTS.speakWord(c.w); return; }
    round.moves++; $('#mMoves', el).textContent = round.moves;
    b.classList.add('sel');
    if (p.c.id === c.id) {
      round.matched++;
      [p.el, b].forEach(x => { x.classList.remove('sel'); x.classList.add('done'); });
      round.picked = null;
      if (round.matched === PAIRS) finish();
    } else {
      round.wrong++; round.lock = true;
      [p.el, b].forEach(x => x.classList.add('bad'));
      setTimeout(() => { [p.el, b].forEach(x => x.classList.remove('sel', 'bad')); round.picked = null; round.lock = false; }, 600);
    }
  };

  const finish = () => {
    clearInterval(timer);
    const ms = Date.now() - round.start;
    const acc = Math.round(PAIRS / Math.max(PAIRS, round.moves) * 100);
    const best = Store.settings.matchBest || {};
    const key = set.id;
    const isBest = !best[key] || ms < best[key];
    if (isBest) { best[key] = ms; Store.settings.matchBest = best; Store.save(); }
    setTimeout(() => {
      el.innerHTML = `
        <div class="quiz-wrap"><div class="card q-card">
          <div style="font-size:3rem">${acc >= 90 ? '🏆' : acc >= 70 ? '🎉' : '👍'}</div>
          <h2>Hoàn thành!</h2>
          <div class="result-score">${fmt(ms)}</div>
          <p class="muted">${PAIRS} cặp · ${round.moves} lượt · chính xác ${acc}% ${isBest ? '· 🥇 kỷ lục mới!' : `· kỷ lục: ${fmt(best[key])}`}</p>
          <div class="row" style="justify-content:center">
            <button class="btn btn-primary" id="mAgain">🔁 Chơi lại</button>
            <a class="btn" href="${set.backLink}">← Quay lại</a>
          </div>
        </div></div>`;
      $('#mAgain', el).addEventListener('click', startRound);
    }, 400);
  };

  onLeave(() => clearInterval(timer));
  startRound();
}
