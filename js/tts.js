import { Store } from './store.js?v=11';
import { toast } from './utils.js?v=11';

/* Phát âm: Web Speech API của trình duyệt, ưu tiên audio từ điển (người thật) nếu có */
export const TTS = {
  voices: [],
  audioEl: null,
  onVoicesChanged: null,

  init() {
    if (!('speechSynthesis' in window)) return;
    const load = () => {
      this.voices = speechSynthesis.getVoices().filter(v => /^en[-_]/i.test(v.lang));
      if (this.onVoicesChanged) this.onVoicesChanged(this.voices);
    };
    load();
    speechSynthesis.onvoiceschanged = load;
  },

  pickVoice() {
    const s = Store.data ? Store.settings : {};
    return this.voices.find(v => v.name === s.voice)
      || this.voices.find(v => /en[-_]US/i.test(v.lang) && /natural|google|zira|aria|jenny/i.test(v.name))
      || this.voices.find(v => /en[-_]US/i.test(v.lang))
      || this.voices[0];
  },

  stop() { if ('speechSynthesis' in window) speechSynthesis.cancel(); if (this.audioEl) { this.audioEl.pause(); } },

  makeUtterance(text) {
    const u = new SpeechSynthesisUtterance(text);
    const v = this.pickVoice();
    if (v) u.voice = v;
    u.lang = v ? v.lang : 'en-US';
    u.rate = Store.data ? Store.settings.rate : 0.9;
    return u;
  },

  speakText(text, btn) {
    if (!('speechSynthesis' in window)) { toast('Trình duyệt không hỗ trợ phát âm'); return; }
    speechSynthesis.cancel();
    const u = this.makeUtterance(text);
    if (btn) { btn.classList.add('playing'); u.onend = u.onerror = () => btn.classList.remove('playing'); }
    speechSynthesis.speak(u);
  },

  speakWord(word, btn) {
    if (Store.data && Store.settings.preferDictAudio && word.audio) {
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      if (!this.audioEl) this.audioEl = new Audio();
      const a = this.audioEl;
      a.src = word.audio;
      a.playbackRate = Math.max(0.5, Math.min(1.5, Store.settings.rate));
      if (btn) { btn.classList.add('playing'); a.onended = () => btn.classList.remove('playing'); }
      a.play().catch(() => { if (btn) btn.classList.remove('playing'); this.speakText(word.word, btn); });
      return;
    }
    this.speakText(word.word, btn);
  },

  // Đọc lần lượt một danh sách từ
  speakList(words, gapMs = 500) {
    if (!('speechSynthesis' in window) || !words.length) return;
    speechSynthesis.cancel();
    let i = 0;
    const next = () => {
      if (i >= words.length) return;
      const u = this.makeUtterance(words[i++].word);
      u.onend = () => setTimeout(next, gapMs);
      speechSynthesis.speak(u);
    };
    next();
  },
};
