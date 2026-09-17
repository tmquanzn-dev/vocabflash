import { CONFIG, isCloudEnabled } from './config.js';
import { getSupabase } from './supabase.js';
import { uid, isValidEmail, fetchTimeout } from './utils.js';

/**
 * Xác thực người dùng.
 *  - mode 'cloud': Supabase Auth (Google, Apple, OTP email, email + mật khẩu)
 *  - mode 'local': tài khoản lưu trong localStorage (demo / dùng offline). OTP được giả lập.
 */
const LS_USERS = 'vocabflash.users';
const LS_SESSION = 'vocabflash.session';
// Địa chỉ web hiện tại (không kèm hash/query) – dùng làm nơi quay về sau OAuth / link email
const siteUrl = () => location.origin + location.pathname;
const GUEST = { id: 'guest', email: '', name: 'Khách', avatar: '', provider: 'guest', guest: true };

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const writeJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

function mapSupabaseUser(u) {
  if (!u) return null;
  const m = u.user_metadata || {};
  return {
    id: u.id,
    email: u.email || '',
    name: m.display_name || m.full_name || m.name || (u.email ? u.email.split('@')[0] : 'Người dùng'),
    avatar: m.avatar_url || m.picture || '',
    provider: u.app_metadata?.provider || 'email',
    guest: false,
  };
}

export const Auth = {
  mode: 'local',
  user: null,
  sb: null,
  cloudError: '',    // lý do không bật được chế độ cloud (nếu có)
  accessToken: null, // JWT của phiên Supabase (dùng cho fetch keepalive khi đóng tab)
  _listeners: [],
  _pendingSignup: null,

  async init() {
    if (isCloudEnabled()) {
      // Kiểm tra nhanh Supabase có truy cập được không; nếu không → chạy local để web vẫn dùng được
      const reachable = await fetchTimeout(CONFIG.SUPABASE_URL + '/auth/v1/health', 8000, { headers: { apikey: CONFIG.SUPABASE_ANON_KEY } }).then(r => r.ok).catch(() => false);
      if (!reachable) this.cloudError = 'Không kết nối được Supabase (' + CONFIG.SUPABASE_URL + '). Đang chạy ở chế độ local.';
      else {
        this.sb = await getSupabase();
        if (this.sb) this.mode = 'cloud';
        else this.cloudError = 'Không tải được thư viện supabase-js từ CDN (cdn.jsdelivr.net). Đang chạy ở chế độ local.';
      }
      if (this.cloudError) console.warn(this.cloudError);
    }
    if (this.mode === 'cloud') {
      const { data: { session } } = await this.sb.auth.getSession();
      this.user = mapSupabaseUser(session?.user);
      this.accessToken = session?.access_token || null;
      // Khách (guest) không dùng Supabase → vẫn lưu session local
      if (!this.user && readJSON(LS_SESSION, null)?.guest) this.user = { ...GUEST };
      this.sb.auth.onAuthStateChange((_event, s) => {
        this.accessToken = s?.access_token || null;
        const u = mapSupabaseUser(s?.user);
        if ((u?.id || null) !== (this.user?.id || null)) { this.user = u; this._emit(); }
      });
    } else {
      const s = readJSON(LS_SESSION, null);
      if (s?.guest) this.user = { ...GUEST };
      else if (s?.userId) {
        const u = readJSON(LS_USERS, []).find(x => x.id === s.userId);
        this.user = u ? this._pub(u) : null;
      }
    }
    return this.user;
  },

  onChange(cb) { this._listeners.push(cb); },
  _emit() { this._listeners.forEach(cb => cb(this.user)); },
  _pub(u) { return { id: u.id, email: u.email, name: u.name, avatar: u.avatar || '', provider: 'email', guest: false }; },
  _setLocalSession(u) { writeJSON(LS_SESSION, u.guest ? { guest: true } : { userId: u.id }); this.user = u; this._emit(); },

  /* ---------- Google / Apple ---------- */
  async signInWithProvider(provider) {
    if (this.mode !== 'cloud') throw new Error('Đăng nhập bằng ' + (provider === 'google' ? 'Google' : 'Apple') + ' cần cấu hình Supabase (xem README.md). Bạn có thể dùng email hoặc chế độ Khách.');
    const { error } = await this.sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: siteUrl() },
    });
    if (error) throw new Error(error.message);
  },

  /* ---------- Đăng ký: điền thông tin → gửi mã về email → nhập mã để kích hoạt ---------- */
  async register({ name, email, password }) {
    email = email.trim().toLowerCase(); name = (name || '').trim();
    if (!name) throw new Error('Vui lòng nhập họ tên');
    if (!isValidEmail(email)) throw new Error('Email không hợp lệ');
    if (!password || password.length < 6) throw new Error('Mật khẩu cần ít nhất 6 ký tự');
    if (this.mode === 'cloud') {
      const { data, error } = await this.sb.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: siteUrl() } });
      if (error) {
        if (/already|registered|exists/i.test(error.message)) throw new Error('Email này đã được đăng ký, hãy đăng nhập');
        if (/rate limit|too many/i.test(error.message)) throw new Error('Gửi email quá nhiều lần, hãy thử lại sau ít phút');
        throw new Error(error.message);
      }
      // Supabase trả về user "giả" (identities rỗng) khi email đã tồn tại và đang bật xác nhận email
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('Email này đã được đăng ký, hãy đăng nhập');
      if (data.session) return { needsCode: false, demoCode: null }; // project tắt "Confirm email" → vào luôn
      return { needsCode: true, demoCode: null };                     // đã gửi mã xác nhận tới email
    }
    // Local: giả lập gửi mã – hiển thị mã cho người dùng
    const users = readJSON(LS_USERS, []);
    if (users.some(x => x.email === email)) throw new Error('Email này đã được đăng ký, hãy đăng nhập');
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this._pendingSignup = { name, email, passHash: await sha256(password), code, exp: Date.now() + 10 * 60000 };
    return { needsCode: true, demoCode: code };
  },

  async verifySignup(email, token) {
    email = email.trim().toLowerCase(); token = token.replace(/\s+/g, '');
    if (this.mode === 'cloud') {
      const { data, error } = await this.sb.auth.verifyOtp({ email, token, type: 'signup' });
      if (error) throw new Error(/expired|invalid|not found/i.test(error.message) ? 'Mã không đúng hoặc đã hết hạn' : error.message);
      return mapSupabaseUser(data.user); // onAuthStateChange sẽ cập nhật this.user
    }
    const p = this._pendingSignup;
    if (!p || p.email !== email || p.exp < Date.now()) throw new Error('Mã đã hết hạn, hãy đăng ký lại');
    if (p.code !== token) throw new Error('Mã không đúng');
    this._pendingSignup = null;
    const users = readJSON(LS_USERS, []);
    const u = { id: uid(), email, name: p.name, passHash: p.passHash, createdAt: Date.now() };
    users.push(u); writeJSON(LS_USERS, users);
    this._setLocalSession(this._pub(u));
    return this.user;
  },

  async resendSignupCode(email) {
    email = email.trim().toLowerCase();
    if (this.mode === 'cloud') {
      const { error } = await this.sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: siteUrl() } });
      if (error) throw new Error(/rate limit|too many/i.test(error.message) ? 'Gửi email quá nhiều lần, hãy thử lại sau ít phút' : error.message);
      return { demoCode: null };
    }
    const p = this._pendingSignup;
    if (!p || p.email !== email) throw new Error('Hãy điền lại form đăng ký');
    p.code = String(Math.floor(100000 + Math.random() * 900000)); p.exp = Date.now() + 10 * 60000;
    return { demoCode: p.code };
  },

  /* ---------- Đăng nhập email + mật khẩu ---------- */
  async signInPassword(email, password) {
    email = email.trim().toLowerCase();
    if (!isValidEmail(email)) throw new Error('Email không hợp lệ');
    if (this.mode === 'cloud') {
      const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
      if (error) {
        if (/not confirmed/i.test(error.message)) throw new Error('Email chưa được xác nhận. Hãy đăng ký lại để nhận mã kích hoạt.');
        throw new Error(/invalid/i.test(error.message) ? 'Email hoặc mật khẩu không đúng' : error.message);
      }
      return mapSupabaseUser(data.user);
    }
    const u = readJSON(LS_USERS, []).find(x => x.email === email);
    if (!u || !u.passHash || u.passHash !== await sha256(password)) throw new Error('Email hoặc mật khẩu không đúng');
    this._setLocalSession(this._pub(u));
    return this.user;
  },

  async resetPassword(email) {
    if (this.mode !== 'cloud') throw new Error('Ở chế độ local không thể gửi email đặt lại mật khẩu.');
    const { error } = await this.sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: siteUrl() });
    if (error) throw new Error(error.message);
  },

  /* ---------- Khách ---------- */
  continueAsGuest() { this._setLocalSession({ ...GUEST }); return this.user; },

  async updateProfile({ name }) {
    name = (name || '').trim();
    if (!name) throw new Error('Tên không được để trống');
    if (this.user.guest) { this.user.name = name; this._emit(); return; }
    if (this.mode === 'cloud') {
      const { error } = await this.sb.auth.updateUser({ data: { display_name: name } });
      if (error) throw new Error(error.message);
    } else {
      const users = readJSON(LS_USERS, []);
      const u = users.find(x => x.id === this.user.id); if (u) { u.name = name; writeJSON(LS_USERS, users); }
    }
    this.user.name = name; this._emit();
  },

  async signOut() {
    if (this.mode === 'cloud' && this.user && !this.user.guest) await this.sb.auth.signOut();
    localStorage.removeItem(LS_SESSION);
    this.user = null;
    this._emit();
  },
};
