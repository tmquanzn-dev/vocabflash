import { $, $$, esc, shuffle, sleep, isTyping, lengthClass, normalizeAnswer, toast } from '../utils.js?v=12';
import { Store } from '../store.js?v=12';
import { TTS } from '../tts.js?v=12';
import { setTitle } from '../shell.js?v=12';
import { isModalOpen } from '../modal.js?v=12';
import { onLeave, go } from '../router.js?v=12';
import { resolveWordSet } from './flashcards.js?v=12';

const DEFAULTS = { repeats: 3, gap: 0.8, wordGap: 1.6, sayMeaning: false, loop: false, shuffle: false, hideText: false };

/* Audition – nghe cả chủ đề như một bản audio: mỗi từ đọc N lần có ngắt quãng */
export function viewAudio(el, { id, parts }) {
  const set = resolveWordSet(id, parts[2]);
  if (!set) { go('/'); return; }
  setTitle('Audition · ' + set.name);
  if (!set.words.length) { el.innerHTML = `<div class="card empty-state"><div class="big">🎧</div>Chưa có từ nào để nghe. <br><a class="btn mt" href="${set.backLink}">Quay lại</a></div>`; return; }

  const cfg = Object.assign({}, DEFAULTS, Store.settings.audio || {});
  const saveCfg = () => { Store.settings.audio = { ...cfg }; Store.save(); };
  const viVoice = () => ('speechSynthesis' in window) ? speechSynthesis.getVoices().find(v => /^vi/i.test(v.lang)) : null;

  // dictation: kết quả gõ của từ hiện tại (null = chưa gõ, 'ok' | 'bad'); tries = số lần gõ sai từ này; score = đúng/sai cả phiên
  const st = { list: cfg.shuffle ? shuffle(set.words) : [...set.words], i: 0, rep: 0, done: 0, playing: false, token: 0, peek: false, dict: null, tries: 0, score: { ok: 0, bad: 0 } };
  // Chế độ chỉ nghe: thẻ không hiện từ / phiên âm / nghĩa (trừ khi bấm 👁 xem tạm)
  const hidden = () => cfg.hideText && !st.peek;

  const draw = () => {
    const w = st.list[st.i];
    el.innerHTML = `
      <div class="fc-wrap">
        <div class="fc-top">
          <a class="btn btn-sm" href="${set.backLink}">← Quay lại</a>
          <div class="muted">🎧 Audition · ${set.icon} ${esc(set.name)}</div>
          <div class="muted small"><b id="auPos">${st.i + 1}</b> / ${st.list.length}</div>
        </div>
        <div class="progress"><div id="auBar" style="width:${st.i / st.list.length * 100}%"></div></div>

        <div class="card au-stage ${hidden() ? 'hidden-text' : ''}" id="auStage">
          <div class="au-hidden" id="auHidden"><span class="au-ear">🎧</span><small>Chế độ chỉ nghe – nghe rồi gõ lại từ bạn nghe được</small>
            <div class="au-dict">
              <input class="input" id="auAns" placeholder="Gõ từ bạn nghe được..." autocomplete="off" autocapitalize="off" spellcheck="false">
              <button class="btn btn-primary" data-act="check">Kiểm tra</button>
              <button class="btn btn-sm" data-act="peek" title="Xem đáp án (tính là chưa nhớ)">👁 Xem</button>
            </div>
            <div class="au-dict-res" id="auRes"></div>
            <div class="small muted">Điểm: <b style="color:var(--success)" id="auOk">${st.score.ok}</b> đúng · <b style="color:var(--danger)" id="auBad">${st.score.bad}</b> sai</div>
          </div>
          <div class="au-word ${lengthClass(w.word)}" id="auWord">${esc(w.word)}</div>
          <div class="ipa" id="auIpa">${esc(w.phonetic)}</div>
          <div class="au-meaning" id="auMeaning">${esc(w.meaning)}</div>
          <div class="au-dots" id="auDots">${dotsHTML()}</div>
        </div>

        <div class="au-controls">
          <button class="btn-icon" data-act="prev" title="Từ trước (←)">⏮</button>
          <button class="btn-icon au-play ${st.playing ? 'playing' : ''}" data-act="toggle" title="Phát / tạm dừng (Space)" id="auPlay">${st.playing ? '⏸' : '▶'}</button>
          <button class="btn-icon" data-act="next" title="Từ tiếp (→)">⏭</button>
        </div>

        <div class="card au-settings">
          <div class="au-set"><label>Lặp mỗi từ</label><div class="seg">${[1, 2, 3, 4, 5].map(n => `<button class="${cfg.repeats === n ? 'active' : ''}" data-rep="${n}">${n}×</button>`).join('')}</div></div>
          <div class="au-set"><label>Nghỉ giữa các lần: <b id="gapV">${cfg.gap}s</b></label><input type="range" id="auGap" min="0.3" max="3" step="0.1" value="${cfg.gap}"></div>
          <div class="au-set"><label>Nghỉ giữa các từ: <b id="wgapV">${cfg.wordGap}s</b></label><input type="range" id="auWGap" min="0.5" max="5" step="0.1" value="${cfg.wordGap}"></div>
          <div class="au-set"><label>Tốc độ đọc: <b id="rateV">${Store.settings.rate}x</b></label><input type="range" id="auRate" min="0.5" max="1.5" step="0.1" value="${Store.settings.rate}"></div>
          <div class="au-set row">
            <label class="check"><input type="checkbox" id="auMean" ${cfg.sayMeaning ? 'checked' : ''}> Đọc nghĩa tiếng Việt sau mỗi từ${viVoice() ? '' : ' <span class="muted small">(máy chưa có giọng tiếng Việt – sẽ chỉ hiển thị)</span>'}</label>
            <label class="check"><input type="checkbox" id="auLoop" ${cfg.loop ? 'checked' : ''}> 🔁 Lặp lại cả danh sách</label>
            <label class="check"><input type="checkbox" id="auShuffle" ${cfg.shuffle ? 'checked' : ''}> 🔀 Xáo trộn</label>
            <label class="check"><input type="checkbox" id="auHide" ${cfg.hideText ? 'checked' : ''}> 🙈 Chỉ nghe – ẩn từ, phiên âm, nghĩa</label>
          </div>
        </div>
        <p class="muted small" style="text-align:center">Phím tắt: <span class="kbd">Space</span> phát/dừng · <span class="kbd">←</span> <span class="kbd">→</span> chuyển từ. Bạn có thể chuyển sang tab khác, âm thanh vẫn phát.</p>
      </div>`;
    bind();
  };

  const dotsHTML = () => Array.from({ length: cfg.repeats }, (_, k) => `<span class="${k < st.done ? 'on' : ''}"></span>`).join('');
  const updateStage = () => {
    const w = st.list[st.i];
    $('#auWord', el).textContent = w.word; $('#auWord', el).className = 'au-word ' + lengthClass(w.word);
    $('#auIpa', el).textContent = w.phonetic; $('#auMeaning', el).textContent = w.meaning;
    $('#auPos', el).textContent = st.i + 1; $('#auBar', el).style.width = (st.i / st.list.length * 100) + '%';
    $('#auDots', el).innerHTML = dotsHTML();
    $('#auStage', el).classList.toggle('speaking', st.playing);
    $('#auStage', el).classList.toggle('hidden-text', hidden());
    // Sang từ khác → ô gõ về trạng thái ban đầu
    const inp = $('#auAns', el); if (inp && st.dict === null) { inp.value = ''; inp.disabled = false; inp.className = 'input'; $('#auRes', el).innerHTML = ''; }
    $('#auOk', el).textContent = st.score.ok; $('#auBad', el).textContent = st.score.bad;
  };
  // Chấm từ vừa gõ ở chế độ chỉ nghe: đúng → ✅ hiện đáp án, sang từ tiếp sau 1,2s; sai → ❌ cho gõ lại
  const checkDictation = () => {
    const inp = $('#auAns', el); if (!inp || inp.disabled) return;
    const w = st.list[st.i]; const val = inp.value.trim(); if (!val) { inp.focus(); return; }
    const ok = normalizeAnswer(val) === normalizeAnswer(w.word);
    if (st.tries === 0 && st.dict === null) Store.rate(w, ok); // chỉ tính lần gõ đầu tiên vào lịch ôn
    if (ok) {
      st.dict = 'ok'; st.score.ok++; inp.disabled = true; inp.className = 'input is-ok';
      $('#auRes', el).innerHTML = `<span class="au-tick ok">✅ Chính xác!</span> <b>${esc(w.word)}</b> <span class="ipa">${esc(w.phonetic)}</span> – ${esc(w.meaning)}`;
      $('#auOk', el).textContent = st.score.ok;
      const cur = st.i; setTimeout(() => { if (st.i === cur && st.dict === 'ok') jump(1); }, 1400);
    } else {
      st.tries++; if (st.tries === 1) { st.score.bad++; $('#auBad', el).textContent = st.score.bad; }
      inp.className = 'input is-bad'; inp.select();
      $('#auRes', el).innerHTML = `<span class="au-tick bad">❌ Chưa đúng</span> <span class="muted">– nghe lại rồi gõ lại nhé${st.tries >= 2 ? ` · gợi ý: <b>${esc(w.word[0] + '_'.repeat(Math.max(0, w.word.length - 1)))}</b>` : ''}</span>`;
      setTimeout(() => { inp.className = 'input'; }, 600);
    }
  };
  const setPlayBtn = () => { const b = $('#auPlay', el); if (b) { b.textContent = st.playing ? '⏸' : '▶'; b.classList.toggle('playing', st.playing); } $('#auStage', el)?.classList.toggle('speaking', st.playing); };

  // Đọc một lần và chờ đọc xong (ưu tiên audio từ điển nếu có)
  const speakOnce = (w, token) => new Promise(res => {
    if (token !== st.token) { res(); return; }
    if (Store.settings.preferDictAudio && w.audio) {
      const a = new Audio(w.audio); a.playbackRate = Math.max(0.5, Math.min(1.5, Store.settings.rate));
      a.onended = a.onerror = () => res(); a.play().catch(() => { speakTts(w.word, token).then(res); });
      return;
    }
    speakTts(w.word, token).then(res);
  });
  const speakTts = (text, token, lang) => new Promise(res => {
    if (!('speechSynthesis' in window) || token !== st.token) { res(); return; }
    const u = lang === 'vi' ? Object.assign(new SpeechSynthesisUtterance(text), { voice: viVoice(), lang: 'vi-VN', rate: Store.settings.rate }) : TTS.makeUtterance(text);
    u.onend = u.onerror = () => res();
    speechSynthesis.speak(u);
    // Phòng trường hợp trình duyệt không bắn onend
    setTimeout(res, Math.max(2500, text.length * 200));
  });

  const run = async () => {
    const token = ++st.token;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    while (st.playing && token === st.token) {
      const w = st.list[st.i];
      st.done = 0; $('#auDots', el).innerHTML = dotsHTML();
      for (let r = 0; r < cfg.repeats; r++) {
        await speakOnce(w, token); if (token !== st.token) return;
        st.done = r + 1; $('#auDots', el).innerHTML = dotsHTML();
        if (r < cfg.repeats - 1) { await sleep(cfg.gap * 1000); if (token !== st.token) return; }
      }
      if (cfg.sayMeaning && viVoice()) { await sleep(400); await speakTts(w.meaning, token, 'vi'); if (token !== st.token) return; }
      await sleep(cfg.wordGap * 1000); if (token !== st.token) return;
      // Sang từ tiếp
      if (st.i + 1 < st.list.length) { st.i++; st.done = 0; resetDict(); updateStage(); }
      else if (cfg.loop) { st.i = 0; st.done = 0; resetDict(); if (cfg.shuffle) st.list = shuffle(st.list); updateStage(); }
      else { st.playing = false; st.done = 0; setPlayBtn(); $('#auBar', el).style.width = '100%'; return; }
    }
  };
  const play = () => { if (st.playing) return; st.playing = true; setPlayBtn(); run(); };
  const pause = () => { st.playing = false; st.token++; if ('speechSynthesis' in window) speechSynthesis.cancel(); st.done = 0; setPlayBtn(); $('#auDots', el).innerHTML = dotsHTML(); };
  const resetDict = () => { st.dict = null; st.tries = 0; st.peek = false; };
  const jump = d => { const was = st.playing; pause(); st.i = (st.i + d + st.list.length) % st.list.length; resetDict(); updateStage(); if (was) play(); };

  function bind() {
    el.onclick = e => {
      const b = e.target.closest('[data-act], [data-rep]'); if (!b) return;
      if (b.dataset.rep) { cfg.repeats = +b.dataset.rep; saveCfg(); $$('[data-rep]', el).forEach(x => x.classList.toggle('active', x === b)); st.done = Math.min(st.done, cfg.repeats); $('#auDots', el).innerHTML = dotsHTML(); return; }
      const a = b.dataset.act;
      if (a === 'toggle') st.playing ? pause() : play();
      else if (a === 'next') jump(1);
      else if (a === 'prev') jump(-1);
      else if (a === 'peek') { st.peek = true; if (st.dict === null) { st.dict = 'bad'; st.score.bad++; Store.rate(st.list[st.i], false); const inp = $('#auAns', el); if (inp) inp.disabled = true; } updateStage(); }
      else if (a === 'check') checkDictation();
    };
    $('#auGap', el).addEventListener('input', e => { cfg.gap = +e.target.value; $('#gapV', el).textContent = cfg.gap + 's'; saveCfg(); });
    $('#auWGap', el).addEventListener('input', e => { cfg.wordGap = +e.target.value; $('#wgapV', el).textContent = cfg.wordGap + 's'; saveCfg(); });
    $('#auRate', el).addEventListener('input', e => { Store.settings.rate = +e.target.value; $('#rateV', el).textContent = Store.settings.rate + 'x'; Store.save(); });
    $('#auMean', el).addEventListener('change', e => { cfg.sayMeaning = e.target.checked; saveCfg(); });
    $('#auLoop', el).addEventListener('change', e => { cfg.loop = e.target.checked; saveCfg(); });
    $('#auHide', el).addEventListener('change', e => { cfg.hideText = e.target.checked; st.peek = false; saveCfg(); updateStage(); if (cfg.hideText) $('#auAns', el)?.focus(); });
    $('#auAns', el).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); checkDictation(); } });
    $('#auShuffle', el).addEventListener('change', e => { cfg.shuffle = e.target.checked; saveCfg(); const was = st.playing; pause(); st.list = cfg.shuffle ? shuffle(set.words) : [...set.words]; st.i = 0; updateStage(); if (was) play(); });
  }

  const onKey = e => {
    if (isTyping(e) || isModalOpen()) return;
    if (e.code === 'Space') { e.preventDefault(); st.playing ? pause() : play(); }
    else if (e.key === 'ArrowRight') jump(1);
    else if (e.key === 'ArrowLeft') jump(-1);
  };
  document.addEventListener('keydown', onKey);
  onLeave(() => { document.removeEventListener('keydown', onKey); st.token++; st.playing = false; if ('speechSynthesis' in window) speechSynthesis.cancel(); });
  draw();
  // Tự phát nếu người dùng đã tương tác với trang (trình duyệt chặn phát âm khi chưa có thao tác)
  if (navigator.userActivation?.hasBeenActive) play();
}
