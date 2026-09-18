import { $, $$, esc, toast } from '../utils.js?v=13';
import { Auth } from '../auth.js?v=13';
import { CONFIG } from '../config.js?v=13';

const GOOGLE_SVG = `<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41 35.4 44 30.2 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;
const APPLE_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.7c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.8-1.7 0-3.2 1-4.1 2.5-1.8 3.1-.5 7.6 1.3 10.1.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.9-1.1-2.9-4.1zM14 5.3c.7-.9 1.2-2 1-3.2-1 0-2.2.7-3 1.5-.6.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.4z"/></svg>`;

// Trạng thái form (giữ lại email/tên khi chuyển tab)
const state = { email: '', name: '', step: 'form', demoCode: '', busy: false };
let resendTimer = null;

/* Trang đăng nhập / đăng ký */
export function viewAuth(el, { view }) {
  const isRegister = view === 'register';
  document.title = (isRegister ? 'Đăng ký' : 'Đăng nhập') + ' – ' + CONFIG.APP_NAME;
  clearInterval(resendTimer);
  state.step = 'form'; state.demoCode = ''; state.busy = false;

  const draw = () => {
    const local = Auth.mode !== 'cloud';
    el.innerHTML = `
      <div class="auth-wrap">
        <a class="land-brand" href="#/"><span>🎴</span> ${CONFIG.APP_NAME}</a>
        <div class="auth-card">
          <div class="auth-tabs">
            <a href="#/login" class="${isRegister ? '' : 'active'}">Đăng nhập</a>
            <a href="#/register" class="${isRegister ? 'active' : ''}">Đăng ký</a>
          </div>
          ${state.step === 'verify' ? verifyHTML() : `
          <h2>${isRegister ? 'Tạo tài khoản mới' : 'Chào mừng trở lại 👋'}</h2>
          <p class="muted small">${isRegister ? 'Miễn phí. Dữ liệu học được lưu riêng và đồng bộ theo tài khoản.' : 'Đăng nhập để tiếp tục học và đồng bộ tiến độ.'}</p>
          <div class="providers">
            <button class="btn btn-provider" data-provider="google">${GOOGLE_SVG} Tiếp tục với Google</button>
            <button class="btn btn-provider" data-provider="apple">${APPLE_SVG} Tiếp tục với Apple</button>
          </div>
          <div class="divider"><span>hoặc dùng email</span></div>
          <form id="authForm" novalidate>${isRegister ? registerHTML() : loginHTML()}</form>`}
          <div class="auth-msg" id="authMsg" hidden></div>
          <div class="auth-foot">
            ${isRegister ? 'Đã có tài khoản? <a href="#/login">Đăng nhập</a>' : 'Chưa có tài khoản? <a href="#/register">Đăng ký</a>'}
            <span>·</span>
            <button type="button" class="link" data-act="guest">Dùng thử với tư cách khách</button>
          </div>
        </div>
        <p class="muted small auth-mode">${local
          ? (Auth.cloudError ? '⚠️ ' + esc(Auth.cloudError) + ' Hãy kiểm tra <code>js/config.js</code> và kết nối mạng, rồi tải lại trang (Ctrl+F5).'
             : '💾 Đang chạy ở <b>chế độ local</b>: tài khoản lưu trong trình duyệt này, mã xác nhận hiển thị trên màn hình. Cấu hình Supabase trong <code>js/config.js</code> để gửi email thật & đăng nhập Google/Apple.')
          : '☁️ Đồng bộ đám mây đang bật. Bằng việc tiếp tục, bạn đồng ý với điều khoản sử dụng của ' + CONFIG.APP_NAME + '.'}</p>
      </div>`;
    bind();
  };

  const passwordField = (id, label, placeholder, autocomplete) => `
    <div class="field"><label>${label}</label>
      <div class="row nowrap"><input type="password" id="${id}" placeholder="${placeholder}" autocomplete="${autocomplete}" style="flex:1" required><button type="button" class="btn-icon" data-eye="${id}" title="Hiện/ẩn mật khẩu">👁️</button></div>
    </div>`;

  const loginHTML = () => `
    <div class="field"><label>Email</label><input type="email" id="aEmail" value="${esc(state.email)}" placeholder="ban@gmail.com" autocomplete="email" required></div>
    ${passwordField('aPass', 'Mật khẩu', '••••••••', 'current-password')}
    <button class="btn btn-primary btn-block" type="submit">Đăng nhập</button>
    <p class="hint"><button type="button" class="link" data-act="forgot">Quên mật khẩu?</button></p>`;

  const registerHTML = () => `
    <div class="field"><label>Họ và tên</label><input id="aName" value="${esc(state.name)}" placeholder="Nguyễn Văn A" autocomplete="name" required></div>
    <div class="field"><label>Email (dùng làm tên đăng nhập)</label><input type="email" id="aEmail" value="${esc(state.email)}" placeholder="ban@gmail.com" autocomplete="email" required></div>
    ${passwordField('aPass', 'Mật khẩu', 'Ít nhất 6 ký tự', 'new-password')}
    ${passwordField('aPass2', 'Nhập lại mật khẩu', '••••••••', 'new-password')}
    <button class="btn btn-primary btn-block" type="submit">Đăng ký</button>
    <p class="hint">Sau khi bấm Đăng ký, chúng tôi sẽ gửi mã xác nhận tới email của bạn.</p>`;

  const verifyHTML = () => `
    <h2>Xác nhận email 📩</h2>
    <p class="muted small">Chúng tôi đã gửi mã xác nhận tới <b>${esc(state.email)}</b>. Nhập mã để kích hoạt tài khoản.</p>
    ${state.demoCode ? `<div class="demo-otp">Bản chạy thử chưa kết nối máy chủ email nên mã được hiển thị tại đây: <b>${state.demoCode}</b></div>` : ''}
    <form id="authForm" novalidate>
      <div class="field"><label>Mã xác nhận</label><input id="aCode" class="otp-input" inputmode="numeric" pattern="[0-9]*" maxlength="10" placeholder="••••••" autocomplete="one-time-code" required></div>
      <button class="btn btn-primary btn-block" type="submit">Xác nhận & bắt đầu học</button>
    </form>
    <p class="hint"><button type="button" class="link" data-act="resend" id="btnResend">Gửi lại mã</button> · <button type="button" class="link" data-act="back">Sửa thông tin đăng ký</button></p>
    ${state.demoCode ? '' : '<p class="hint">Không thấy email? Kiểm tra mục Spam / Quảng cáo. Nếu email chứa <b>đường link</b>, bấm vào link cũng kích hoạt được.</p>'}`;

  const msg = (text, type = 'error') => { const m = $('#authMsg', el); m.textContent = text; m.className = 'auth-msg ' + type; m.hidden = !text; };
  const setBusy = b => { state.busy = b; $$('button', el).forEach(x => x.disabled = b); };
  const run = async fn => { if (state.busy) return; msg(''); setBusy(true); try { await fn(); } catch (e) { msg(e.message); } finally { if (document.body.contains(el)) setBusy(false); } };

  const startResendCountdown = () => {
    let s = 60; const b = $('#btnResend', el); if (!b) return;
    b.disabled = true; b.textContent = `Gửi lại mã (${s}s)`;
    resendTimer = setInterval(() => { s--; if (s <= 0) { clearInterval(resendTimer); b.disabled = false; b.textContent = 'Gửi lại mã'; } else b.textContent = `Gửi lại mã (${s}s)`; }, 1000);
  };

  function bind() {
    $$('[data-provider]', el).forEach(b => b.addEventListener('click', () => run(() => Auth.signInWithProvider(b.dataset.provider))));
    $$('[data-eye]', el).forEach(b => b.addEventListener('click', () => { const p = $('#' + b.dataset.eye, el); p.type = p.type === 'password' ? 'text' : 'password'; }));
    $('[data-act="guest"]', el).addEventListener('click', () => Auth.continueAsGuest());
    $('[data-act="back"]', el)?.addEventListener('click', () => { clearInterval(resendTimer); state.step = 'form'; draw(); });
    $('[data-act="resend"]', el)?.addEventListener('click', () => run(async () => {
      const r = await Auth.resendSignupCode(state.email);
      state.demoCode = r.demoCode || ''; draw(); startResendCountdown();
      toast(r.demoCode ? 'Mã mới hiển thị trên màn hình' : 'Đã gửi lại mã tới ' + state.email);
    }));
    $('[data-act="forgot"]', el)?.addEventListener('click', () => run(async () => {
      const email = $('#aEmail', el).value.trim();
      if (!email) throw new Error('Nhập email trước rồi bấm "Quên mật khẩu"');
      await Auth.resetPassword(email); msg('Đã gửi email đặt lại mật khẩu tới ' + email, 'ok');
    }));
    $('#aCode', el)?.addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });

    $('#authForm', el).addEventListener('submit', e => {
      e.preventDefault();
      run(async () => {
        if (state.step === 'verify') {
          const code = $('#aCode', el).value;
          if (!/^\d{6,10}$/.test(code)) throw new Error('Mã gồm 6–10 chữ số, hãy kiểm tra lại email');
          await Auth.verifySignup(state.email, code);
          msg('Đã xác nhận! Đang đăng nhập...', 'ok');
          return;
        }
        state.email = $('#aEmail', el).value.trim();
        const password = $('#aPass', el).value;
        if (isRegister) {
          state.name = $('#aName', el).value.trim();
          if (password !== $('#aPass2', el).value) throw new Error('Mật khẩu nhập lại không khớp');
          const r = await Auth.register({ name: state.name, email: state.email, password });
          if (r.needsCode) {
            clearInterval(resendTimer);
            state.step = 'verify'; state.demoCode = r.demoCode || ''; draw(); startResendCountdown();
            toast(r.demoCode ? 'Mã xác nhận hiển thị trên màn hình' : 'Đã gửi mã xác nhận tới ' + state.email);
          } else msg('Đăng ký thành công! Đang đăng nhập...', 'ok');
        } else {
          await Auth.signInPassword(state.email, password);
          msg('Đang đăng nhập...', 'ok');
        }
      });
    });
    const first = $('#aCode, #aName, #aEmail', el); if (first) first.focus();
  }

  draw();
}
