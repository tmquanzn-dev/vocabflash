import { $ } from '../utils.js?v=10';
import { Auth } from '../auth.js?v=10';
import { CONFIG } from '../config.js?v=10';
import { toggleTheme } from '../shell.js?v=10';

/* Trang giới thiệu cho người chưa đăng nhập */
export function viewLanding(el) {
  document.title = `${CONFIG.APP_NAME} – Học từ vựng tiếng Anh theo chủ đề`;
  el.innerHTML = `
    <header class="land-nav">
      <a href="#/" class="land-brand"><span>🎴</span> ${CONFIG.APP_NAME}</a>
      <nav class="row">
        <button class="btn-icon btn-theme" data-act="theme" title="Sáng / tối">🌙</button>
        <a class="btn" href="#/login">Đăng nhập</a>
        <a class="btn btn-primary" href="#/register">Đăng ký miễn phí</a>
      </nav>
    </header>

    <section class="hero">
      <div class="hero-text">
        <span class="pill">✨ Flashcard · Phát âm · Quiz · Ôn tập thông minh</span>
        <h1>Học từ vựng tiếng Anh <span class="grad">theo chủ đề của riêng bạn</span></h1>
        <p>Tự tạo chủ đề, nhập từ vựng, web sẽ sinh flashcard có phiên âm và phát âm. Ôn tập bằng quiz, nghe – viết chính tả, và hệ thống nhắc ôn đúng lúc để không bao giờ quên.</p>
        <div class="row hero-cta">
          <a class="btn btn-primary btn-lg" href="#/register">Bắt đầu ngay – miễn phí</a>
          <button class="btn btn-lg" data-act="guest">Dùng thử không cần tài khoản</button>
        </div>
        <div class="row hero-proof muted small">
          <span>🔒 Dữ liệu lưu theo tài khoản</span><span>☁️ Đồng bộ mọi thiết bị</span><span>📱 Dùng tốt trên điện thoại</span>
        </div>
      </div>
      <div class="hero-card">
        <div class="demo-card">
          <div class="tag">TIẾNG ANH</div>
          <div class="speak">🔊</div>
          <div class="w">schedule</div>
          <div class="ipa">/ˈskedʒuːl/</div>
          <span class="pos">noun</span>
          <div class="demo-back">
            <div class="m">thời khóa biểu</div>
            <div class="ex">"Check your class schedule."</div>
          </div>
        </div>
        <div class="demo-chip c1">✓ Đã nhớ</div>
        <div class="demo-chip c2">⏰ Ôn lại sau 3 ngày</div>
      </div>
    </section>

    <section class="features">
      <h2>Mọi thứ bạn cần để nhớ từ lâu</h2>
      <div class="feature-grid">
        ${[
          ['📚', 'Chủ đề tự tạo', 'School, Travel, Work… tự đặt tên, chọn icon, nhập từ vựng theo cách của bạn.'],
          ['🎴', 'Flashcard tự sinh', 'Thẻ lật hai mặt với phiên âm IPA, loại từ, ví dụ. Chế độ Anh→Việt và Việt→Anh.'],
          ['🔊', 'Phát âm chuẩn', 'Bấm loa để nghe, tự phát âm khi hiện thẻ, đọc cả danh sách, chọn giọng & tốc độ.'],
          ['🔎', 'Tra tự động', 'Gõ từ, bấm Tra: tự điền phiên âm, loại từ, định nghĩa, câu ví dụ và audio người thật.'],
          ['📝', 'Quiz 4 dạng', 'Chọn nghĩa, chọn từ, nghe chọn từ, nghe & gõ chính tả. Ôn lại từ sai ngay.'],
          ['⏰', 'Ôn tập đúng lúc', 'Spaced Repetition: từ hay quên được nhắc lại thường xuyên, từ đã thuộc giãn dần.'],
          ['🔥', 'Chuỗi ngày học', 'Mục tiêu mỗi ngày, streak và biểu đồ 7 ngày để giữ thói quen.'],
          ['☁️', 'Tài khoản & đồng bộ', 'Đăng nhập Google, Apple hoặc email (OTP). Dữ liệu riêng cho từng tài khoản.'],
        ].map(([ic, t, d]) => `<div class="feature"><div class="ic">${ic}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}
      </div>
    </section>

    <section class="how">
      <h2>3 bước để bắt đầu</h2>
      <div class="steps">
        <div class="step"><span>1</span><h3>Tạo chủ đề</h3><p>Ví dụ "School" 🏫 hoặc "Du lịch" ✈️</p></div>
        <div class="step"><span>2</span><h3>Nhập từ vựng</h3><p>Gõ từ + nghĩa, bấm Tra để lấy phiên âm & audio</p></div>
        <div class="step"><span>3</span><h3>Học & ôn mỗi ngày</h3><p>Flashcard → Quiz → Ôn tập theo lịch nhắc</p></div>
      </div>
      <div class="row" style="justify-content:center;margin-top:28px">
        <a class="btn btn-primary btn-lg" href="#/register">Tạo tài khoản miễn phí</a>
      </div>
    </section>

    <section class="how" style="background: linear-gradient(135deg, var(--surface-2), var(--primary-soft)); border-radius: 24px; margin: 40px auto; max-width: 600px; padding: 40px 20px; text-align: center; border: 1px solid var(--primary-2); box-shadow: var(--shadow);">
      <h2 style="color: var(--primary); margin-bottom: 8px;">💖 Donate Cho Anh Quân</h2>
      <p class="muted" style="margin-bottom: 24px;">Nếu bạn thấy dự án này hữu ích, hãy ủng hộ tác giả để duy trì và phát triển thêm nhé!</p>
      <img src="img/donate-qr.png" alt="QR Donate" style="max-width: 240px; border-radius: 12px; display: block; margin: 0 auto; box-shadow: 0 8px 24px rgba(0,0,0,0.15); border: 4px solid var(--surface); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
    </section>

    <footer class="land-footer muted small">
      © ${new Date().getFullYear()} ${CONFIG.APP_NAME} · Học từ vựng tiếng Anh hiệu quả ·
      ${Auth.mode === 'cloud' ? '☁️ Đồng bộ đám mây đang bật' : '💾 Đang chạy ở chế độ local (chưa cấu hình Supabase)'}
    </footer>`;

  $('[data-act="theme"]', el).addEventListener('click', toggleTheme);
  $('[data-act="guest"]', el).addEventListener('click', () => Auth.continueAsGuest());
}
