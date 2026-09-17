import { uid, INTERVALS, MAX_LEVEL, DAY, todayKey, weekKey, debounce, toast, isPhrase } from './utils.js';
import { Auth } from './auth.js';
import { CONFIG } from './config.js';

/**
 * Kho dữ liệu của người dùng đang đăng nhập.
 * Dữ liệu (chủ đề, từ vựng, tiến độ, cài đặt) giữ trong bộ nhớ, lưu xuống localStorage
 * theo từng tài khoản và – nếu bật Supabase – đồng bộ lên bảng `user_data` (1 dòng / người dùng).
 */
export const DEFAULT_SETTINGS = { voice: '', rate: 0.9, theme: 'light', autoSpeak: true, quizCount: 10, preferDictAudio: true, dailyGoal: 20, showOnLeaderboard: true };
const LEGACY_KEY = 'vocabflash.v1';

export function makeWord(topicId, w) {
  return {
    id: uid(), topicId,
    word: (w.word || '').trim(), phonetic: (w.phonetic || '').trim(), pos: w.pos || '',
    meaning: (w.meaning || '').trim(), example: (w.example || '').trim(), exampleVi: (w.exampleVi || '').trim(),
    note: (w.note || '').trim(), audio: w.audio || '',
    star: !!w.star,
    level: 0, nextReview: 0, lastReview: 0, correct: 0, wrong: 0, createdAt: Date.now(),
  };
}

export function seedData() {
  const t1 = uid(), t2 = uid();
  const mk = (t, word, phonetic, pos, meaning, example, exampleVi) => makeWord(t, { word, phonetic, pos, meaning, example, exampleVi });
  return {
    topics: [
      { id: t1, name: 'School', icon: '🏫', desc: 'Từ vựng về trường học', createdAt: Date.now() },
      { id: t2, name: 'Daily Life', icon: '🏠', desc: 'Cuộc sống hằng ngày', createdAt: Date.now() },
    ],
    words: [
      mk(t1, 'teacher', '/ˈtiːtʃər/', 'noun', 'giáo viên', 'My teacher is very kind.', 'Giáo viên của tôi rất tốt bụng.'),
      mk(t1, 'student', '/ˈstuːdənt/', 'noun', 'học sinh, sinh viên', 'She is a hard-working student.', 'Cô ấy là một học sinh chăm chỉ.'),
      mk(t1, 'classroom', '/ˈklæsruːm/', 'noun', 'phòng học', 'The classroom is very bright.', 'Phòng học rất sáng sủa.'),
      mk(t1, 'homework', '/ˈhoʊmwɜːrk/', 'noun', 'bài tập về nhà', 'I have a lot of homework tonight.', 'Tối nay tôi có rất nhiều bài tập về nhà.'),
      mk(t1, 'library', '/ˈlaɪbreri/', 'noun', 'thư viện', 'We study in the library after school.', 'Chúng tôi học ở thư viện sau giờ học.'),
      mk(t1, 'exam', '/ɪɡˈzæm/', 'noun', 'kỳ thi, bài kiểm tra', 'The final exam is next week.', 'Kỳ thi cuối kỳ là vào tuần sau.'),
      mk(t1, 'schedule', '/ˈskedʒuːl/', 'noun', 'thời khóa biểu, lịch trình', 'Check your class schedule.', 'Hãy kiểm tra thời khóa biểu của bạn.'),
      mk(t1, 'graduate', '/ˈɡrædʒueɪt/', 'verb', 'tốt nghiệp', 'He graduated from university last year.', 'Anh ấy tốt nghiệp đại học năm ngoái.'),
      mk(t2, 'breakfast', '/ˈbrekfəst/', 'noun', 'bữa sáng', 'I usually have breakfast at 7.', 'Tôi thường ăn sáng lúc 7 giờ.'),
      mk(t2, 'neighbor', '/ˈneɪbər/', 'noun', 'hàng xóm', 'Our neighbor has a big dog.', 'Hàng xóm của chúng tôi có một con chó to.'),
      mk(t2, 'grocery', '/ˈɡroʊsəri/', 'noun', 'hàng tạp hóa, thực phẩm', 'I need to buy some groceries.', 'Tôi cần mua một ít đồ tạp hóa.'),
      mk(t2, 'laundry', '/ˈlɔːndri/', 'noun', 'việc giặt giũ, quần áo giặt', 'I do the laundry on Sundays.', 'Tôi giặt đồ vào Chủ nhật.'),
      mk(t2, 'commute', '/kəˈmjuːt/', 'verb', 'đi lại (giữa nhà và nơi làm việc)', 'She commutes to work by bus.', 'Cô ấy đi làm bằng xe buýt.'),
      mk(t2, 'relax', '/rɪˈlæks/', 'verb', 'thư giãn', 'I like to relax at the weekend.', 'Tôi thích thư giãn vào cuối tuần.'),
      mk(t2, 'look forward to', '/lʊk ˈfɔːrwərd tuː/', 'phrase', 'mong chờ, trông đợi', 'I look forward to seeing you.', 'Tôi mong được gặp bạn.'),
      mk(t2, 'take a break', '/teɪk ə breɪk/', 'phrase', 'nghỉ giải lao', "Let's take a break for ten minutes.", 'Hãy nghỉ giải lao mười phút.'),
    ],
    settings: { ...DEFAULT_SETTINGS },
    activity: {},
    updatedAt: Date.now(),
  };
}

export const clozeRegex = word => new RegExp('\\b' + word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+') + '\\b', 'i');

function normalize(d) {
  d = d && typeof d === 'object' ? d : {};
  d.topics = Array.isArray(d.topics) ? d.topics : [];
  d.words = Array.isArray(d.words) ? d.words : [];
  d.settings = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
  d.activity = d.activity && typeof d.activity === 'object' ? d.activity : {};
  d.updatedAt = d.updatedAt || 0;
  return d;
}

// Mã định danh của tab này – để bỏ qua các bản cập nhật realtime do chính mình gửi
const CLIENT_ID = (() => { try { return sessionStorage.getItem('vocabflash.client') || (sessionStorage.setItem('vocabflash.client', uid()), sessionStorage.getItem('vocabflash.client')); } catch { return uid(); } })();

export const Store = {
  user: null,
  data: null,
  syncState: 'local',   // local | saving | synced | error
  _syncListeners: [],
  _changeListeners: [],
  _pushDebounced: null,
  _dirty: false,        // có thay đổi chưa đẩy lên cloud
  _channel: null,
  _onStorage: null,

  get cloud() { return Auth.mode === 'cloud' && this.user && !this.user.guest; },
  get key() { return `vocabflash.v2.${this.user.id}`; },
  get settings() { return this.data.settings; },
  onSync(cb) { this._syncListeners.push(cb); },
  _setSync(s) { this.syncState = s; this._syncListeners.forEach(cb => cb(s)); },
  /** Gọi khi dữ liệu bị thay đổi từ nơi khác (thiết bị khác / tab khác) */
  onRemoteChange(cb) { this._changeListeners.push(cb); },

  /* ---------- mở / đóng theo tài khoản ---------- */
  async open(user) {
    this.user = user;
    let local = null;
    try { local = JSON.parse(localStorage.getItem(this.key)); } catch { /* ignore */ }

    if (this.cloud) {
      this._pushDebounced = debounce(() => this._push(), 1500);
      const remote = await this._pull();
      if (remote && (!local || (remote.updatedAt || 0) >= (local.updatedAt || 0))) { this.data = normalize(remote); this._setSync('synced'); }
      else if (local) { this.data = normalize(local); this._dirty = true; this._push(); }
      else { this.data = this._initialData(); this._dirty = true; this._push(); }
      this._subscribeRealtime();
      this.pushLeaderboard();
    } else {
      this.data = local ? normalize(local) : this._initialData();
      this._setSync('local');
    }
    this._writeLocal();
    this._watchOtherTabs();
    return this.data;
  },

  /* ---------- đồng bộ giữa thiết bị / tab ---------- */
  // Nhận thay đổi của cùng tài khoản từ thiết bị khác qua Supabase Realtime
  _subscribeRealtime() {
    try {
      this._channel = Auth.sb.channel('user_data_' + this.user.id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_data', filter: `user_id=eq.${this.user.id}` },
          payload => this._applyRemote(payload.new?.data))
        .subscribe();
    } catch (e) { console.warn('Realtime không khả dụng', e); }
  },
  // Cùng trình duyệt mở nhiều tab: localStorage thay đổi → cập nhật tab này
  _watchOtherTabs() {
    this._onStorage = e => { if (e.key === this.key && e.newValue) { try { this._applyRemote(JSON.parse(e.newValue)); } catch { /* ignore */ } } };
    window.addEventListener('storage', this._onStorage);
  },
  _applyRemote(d) {
    if (!d || !this.data || d.client === CLIENT_ID) return;             // do chính tab này ghi
    if ((d.updatedAt || 0) <= (this.data.updatedAt || 0)) return;       // không mới hơn
    if (this._dirty) return;                                            // đang có thay đổi cục bộ chưa đẩy → giữ bản local (sẽ đẩy đè)
    this.data = normalize(d);
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch { /* ignore */ }
    this._setSync(this.cloud ? 'synced' : 'local');
    this._changeListeners.forEach(cb => cb());
  },

  // Dữ liệu khởi tạo cho tài khoản mới: kế thừa dữ liệu khách trên máy này (nếu có),
  // rồi tới dữ liệu phiên bản cũ (1 người dùng), cuối cùng mới dùng dữ liệu mẫu
  _initialData() {
    const tryKey = (key, remove) => {
      try {
        const d = JSON.parse(localStorage.getItem(key));
        if (d && Array.isArray(d.topics) && d.topics.length) { if (remove) localStorage.removeItem(key); return normalize(d); }
      } catch { /* ignore */ }
      return null;
    };
    if (!this.user.guest) {
      const guest = tryKey('vocabflash.v2.guest', false);
      if (guest && guest.modified) { toast('Đã chuyển dữ liệu khách sang tài khoản của bạn'); return guest; }
    }
    return tryKey(LEGACY_KEY, true) || seedData();
  },

  close() {
    if (this._pushDebounced && this._dirty) this._pushDebounced.flush();
    if (this._channel) { try { Auth.sb.removeChannel(this._channel); } catch { /* ignore */ } this._channel = null; }
    if (this._onStorage) { window.removeEventListener('storage', this._onStorage); this._onStorage = null; }
    this.user = null; this.data = null; this._pushDebounced = null; this._dirty = false;
  },

  /* ---------- lưu ---------- */
  _writeLocal() {
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); }
    catch (e) { toast('Không lưu được dữ liệu: ' + e.message); }
  },
  save() {
    if (!this.data) return;
    this.data.updatedAt = Date.now();
    this.data.modified = true; // đã có thay đổi của người dùng (khác dữ liệu mẫu)
    this.data.client = CLIENT_ID;
    this._writeLocal();
    if (this.cloud) { this._dirty = true; this._setSync('saving'); this._pushDebounced(); }
  },

  async _pull() {
    try {
      const { data, error } = await Auth.sb.from('user_data').select('data').eq('user_id', this.user.id).maybeSingle();
      if (error) throw error;
      return data?.data || null;
    } catch (e) { console.warn('Không tải được dữ liệu từ cloud', e); this._setSync('error'); return null; }
  },
  async _push() {
    if (!this.cloud || !this.data || !this._dirty) return;
    const snapshot = this.data.updatedAt;
    try {
      const { error } = await Auth.sb.from('user_data').upsert({ user_id: this.user.id, data: this.data, updated_at: new Date().toISOString() });
      if (error) throw error;
      if (this.data && this.data.updatedAt === snapshot) { this._dirty = false; this._setSync('synced'); }
    } catch (e) { console.warn('Không đồng bộ được', e); this._setSync('error'); }
  },
  retrySync() { if (this.cloud && this._dirty) { this._setSync('saving'); this._push(); } },
  // Gọi khi tab sắp đóng/ẩn: gửi ngay bằng fetch keepalive để không mất thay đổi cuối
  flushNow() {
    if (!this.cloud || !this.data || !this._dirty || !Auth.accessToken) return;
    try {
      fetch(`${CONFIG.SUPABASE_URL}/rest/v1/user_data?on_conflict=user_id`, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + Auth.accessToken, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: this.user.id, data: this.data, updated_at: new Date().toISOString() }),
      }).then(r => { if (r.ok) { this._dirty = false; this._setSync('synced'); } }).catch(() => {});
    } catch { /* ignore */ }
  },

  /* ---------- chủ đề ---------- */
  topics() { return this.data.topics; },
  topic(id) { return this.data.topics.find(t => t.id === id); },
  addTopic(t) { const topic = { id: uid(), name: t.name.trim(), icon: t.icon || '📚', desc: (t.desc || '').trim(), createdAt: Date.now() }; this.data.topics.push(topic); this.save(); return topic; },
  updateTopic(id, patch) { Object.assign(this.topic(id), patch); this.save(); },
  deleteTopic(id) { this.data.topics = this.data.topics.filter(t => t.id !== id); this.data.words = this.data.words.filter(w => w.topicId !== id); this.save(); },
  topicProgress(topicId) { const ws = this.wordsOf(topicId); return ws.length ? Math.round(ws.filter(w => w.level >= 3).length / ws.length * 100) : 0; },

  /* ---------- từ vựng ---------- */
  words() { return this.data.words; },
  word(id) { return this.data.words.find(w => w.id === id); },
  wordsOf(topicId) { return this.data.words.filter(w => w.topicId === topicId); },
  addWord(topicId, w) { const word = makeWord(topicId, w); this.data.words.push(word); this.save(); return word; },
  updateWord(id, patch) { Object.assign(this.word(id), patch); this.save(); },
  deleteWord(id) { this.data.words = this.data.words.filter(w => w.id !== id); this.save(); },
  toggleStar(id) { const w = this.word(id); w.star = !w.star; this.save(); return w.star; },
  starredWords() { return this.data.words.filter(w => w.star); },
  // Lọc theo loại: 'words' (từ đơn) | 'phrases' (cụm từ) | khác → tất cả
  byKind(list, kind) { return kind === 'words' ? list.filter(w => !isPhrase(w.word)) : kind === 'phrases' ? list.filter(w => isPhrase(w.word)) : list; },
  // Từ có câu ví dụ chứa chính từ đó → dùng được cho bài "điền vào chỗ trống"
  clozeWords(list = this.data.words) { return list.filter(w => w.example && clozeRegex(w.word).test(w.example)); },
  dueWords() { const now = Date.now(); return this.data.words.filter(w => w.lastReview && w.nextReview <= now); },
  hardWords(n = 5) { return this.data.words.filter(w => w.wrong > 0).sort((a, b) => (b.wrong - b.correct) - (a.wrong - a.correct) || b.wrong - a.wrong).slice(0, n); },

  // Đánh giá một từ sau khi ôn: nhớ → tăng mức, quên → về mức 0; đồng thời ghi nhận hoạt động trong ngày
  rate(word, remembered) {
    if (remembered) { word.level = Math.min(word.level + 1, MAX_LEVEL); word.correct++; }
    else { word.level = 0; word.wrong++; }
    word.lastReview = Date.now();
    word.nextReview = Date.now() + INTERVALS[word.level] * DAY;
    const k = todayKey();
    const a = this.data.activity[k] || (this.data.activity[k] = { reviews: 0, correct: 0 });
    a.reviews++; if (remembered) a.correct++;
    this.save();
    this._pushLeaderboardDebounced();
  },

  /* ---------- thống kê ---------- */
  todayActivity() { return this.data.activity[todayKey()] || { reviews: 0, correct: 0 }; },
  weekReviews() { const wk = weekKey(); return Object.entries(this.data.activity).reduce((s, [k, a]) => weekKey(new Date(k + 'T12:00:00')) === wk ? s + a.reviews : s, 0); },
  totalReviews() { return Object.values(this.data.activity).reduce((s, a) => s + a.reviews, 0); },

  /* ---------- bảng xếp hạng (bảng public.leaderboard, mỗi người 1 dòng) ---------- */
  leaderboardRow() {
    return {
      user_id: this.user.id, display_name: this.user.name, avatar: this.user.avatar || '',
      day_key: todayKey(), day_reviews: this.todayActivity().reviews,
      week_key: weekKey(), week_reviews: this.weekReviews(),
      total_reviews: this.totalReviews(), streak: this.streak(),
      mastered: this.data.words.filter(w => w.level >= 5).length,
      updated_at: new Date().toISOString(),
    };
  },
  _pushLeaderboardDebounced: debounce(function () { Store.pushLeaderboard(); }, 3000),
  async pushLeaderboard() {
    if (!this.cloud || !this.data || this.settings.showOnLeaderboard === false) return;
    try { const { error } = await Auth.sb.from('leaderboard').upsert(this.leaderboardRow()); if (error) throw error; }
    catch (e) { console.warn('Không cập nhật được bảng xếp hạng', e.message || e); }
  },
  async removeFromLeaderboard() {
    if (!this.cloud) return;
    try { await Auth.sb.from('leaderboard').delete().eq('user_id', this.user.id); } catch { /* ignore */ }
  },
  streak() {
    let n = 0; const d = new Date();
    if (!(this.data.activity[todayKey(d)]?.reviews > 0)) d.setDate(d.getDate() - 1); // hôm nay chưa học thì tính từ hôm qua
    while (this.data.activity[todayKey(d)]?.reviews > 0) { n++; d.setDate(d.getDate() - 1); }
    return n;
  },
  last7Days() {
    const out = []; const d = new Date(); d.setDate(d.getDate() - 6);
    for (let i = 0; i < 7; i++) { const k = todayKey(d); out.push({ key: k, label: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()], ...(this.data.activity[k] || { reviews: 0, correct: 0 }) }); d.setDate(d.getDate() + 1); }
    return out;
  },

  /* ---------- xuất / nhập ---------- */
  exportJSON() { return JSON.stringify(this.data, null, 2); },
  replaceAll(d) { this.data = normalize(d); this.save(); },
  mergeFrom(d) {
    const idMap = {};
    (d.topics || []).forEach(t => { const nt = { id: uid(), name: t.name || 'Chủ đề', icon: t.icon || '📚', desc: t.desc || '', createdAt: Date.now() }; this.data.topics.push(nt); idMap[t.id] = nt.id; });
    (d.words || []).forEach(w => { if (idMap[w.topicId]) { const nw = makeWord(idMap[w.topicId], w); Object.assign(nw, { level: w.level || 0, nextReview: w.nextReview || 0, lastReview: w.lastReview || 0, correct: w.correct || 0, wrong: w.wrong || 0 }); this.data.words.push(nw); } });
    this.save();
  },
  clearAll() { this.data = normalize({ settings: this.data.settings }); this.save(); },
};
