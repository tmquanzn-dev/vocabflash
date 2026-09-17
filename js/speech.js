import { normalizeAnswer } from './utils.js?v=11';

/* Luyện phát âm: nhận dạng giọng nói (Chrome / Edge / Safari) + ghi âm để nghe lại.
   listen(word) → Promise<{ heard, ok, score, audioUrl }> */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

export const Speech = {
  supported: !!SR,
  _rec: null,
  _recorder: null,
  _lastUrl: null,

  stop() {
    try { this._rec?.abort(); } catch { /* ignore */ }
    this._rec = null;
    this._stopRecorder();
  },

  // Ghi âm song song với nhận dạng để người dùng nghe lại giọng mình
  async _startRecorder() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise(res => { mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); res(chunks.length ? new Blob(chunks, { type: mr.mimeType || 'audio/webm' }) : null); }; });
      mr.start();
      this._recorder = { mr, done };
      return this._recorder;
    } catch { return null; }
  },
  _stopRecorder() {
    const r = this._recorder; this._recorder = null;
    if (!r) return Promise.resolve(null);
    try { if (r.mr.state !== 'inactive') r.mr.stop(); } catch { /* ignore */ }
    return r.done;
  },

  /** Nghe người dùng nói và so với từ mục tiêu. */
  listen(target, { onStart } = {}) {
    return new Promise(async (resolve, reject) => {
      if (!SR) { reject(new Error('Trình duyệt này không hỗ trợ nhận dạng giọng nói. Hãy dùng Chrome hoặc Edge.')); return; }
      this.stop();
      if (this._lastUrl) { URL.revokeObjectURL(this._lastUrl); this._lastUrl = null; }
      await this._startRecorder();
      const rec = new SR();
      this._rec = rec;
      rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 5; rec.continuous = false;
      let done = false;
      const finish = async fn => {
        if (done) return; done = true; this._rec = null;
        const blob = await this._stopRecorder();
        const audioUrl = blob ? (this._lastUrl = URL.createObjectURL(blob)) : null;
        fn(audioUrl);
      };
      rec.onstart = () => onStart && onStart();
      rec.onresult = e => {
        const alts = [...e.results[0]].map(a => a.transcript);
        const want = normalizeAnswer(target);
        // Chọn phương án giống nhất trong các kết quả trình duyệt đưa ra
        let best = { heard: alts[0] || '', score: 0 };
        for (const t of alts) { const s = similarity(normalizeAnswer(t), want); if (s > best.score) best = { heard: t, score: s }; }
        finish(audioUrl => resolve({ heard: best.heard, score: Math.round(best.score * 100), ok: best.score >= 0.8, audioUrl }));
      };
      rec.onerror = e => finish(() => reject(new Error(
        e.error === 'not-allowed' ? 'Bạn chưa cho phép dùng micro. Hãy bật quyền micro cho trang này.'
        : e.error === 'no-speech' ? 'Không nghe thấy gì, hãy thử lại và nói to hơn.'
        : e.error === 'audio-capture' ? 'Không tìm thấy micro.'
        : 'Lỗi nhận dạng: ' + e.error)));
      rec.onend = () => finish(() => reject(new Error('Không nghe thấy gì, hãy thử lại.')));
      try { rec.start(); } catch (err) { finish(() => reject(err)); }
    });
  },
};

// Độ giống 0..1 dựa trên khoảng cách Levenshtein
function similarity(a, b) {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}
