import { $, esc, toast } from '../utils.js?v=12';
import { Store } from '../store.js?v=12';
import { Auth } from '../auth.js?v=12';
import { TTS } from '../tts.js?v=12';
import { setTitle, applyTheme } from '../shell.js?v=12';
import { openModal, closeModal, confirmModal } from '../modal.js?v=12';
import { render } from '../router.js?v=12';

/* Mã bookmarklet: lấy chữ đang bôi đen + câu chứa nó, mở VocabFlash ở #/add?... */
function bookmarklet() {
  const app = location.origin + location.pathname;
  const code = `(function(){var s=String(getSelection()).replace(/\s+/g,' ').trim();if(!s){s=prompt('Từ tiếng Anh muốn thêm:');if(!s)return;}var c='';try{var n=getSelection().anchorNode;var p=n&&(n.nodeType==1?n:n.parentElement);while(p&&p.parentElement&&(p.innerText||'').length<60)p=p.parentElement;var t=(p&&p.innerText||'').replace(/\s+/g,' ');var m=t.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];for(var i=0;i<m.length;i++){if(m[i].toLowerCase().indexOf(s.toLowerCase())>-1){c=m[i].trim().slice(0,400);break;}}}catch(e){}window.open(${JSON.stringify(app)}+'#/add?w='+encodeURIComponent(s)+'&c='+encodeURIComponent(c)+'&u='+encodeURIComponent(location.href)+'&t='+encodeURIComponent(document.title),'_blank');})();`;
  return 'javascript:' + encodeURIComponent(code);
}

/* Cài đặt: phát âm, giao diện, mục tiêu, dữ liệu */
export function viewSettings(el) {
  setTitle('Cài đặt');
  const s = Store.settings;
  const voices = TTS.voices;
  el.innerHTML = `
    <div class="page-head"><div><h1>⚙️ Cài đặt</h1></div></div>
    <div class="stack">
      <div class="card">
        <h3>🔊 Phát âm</h3>
        <div class="field"><label>Giọng đọc (${voices.length} giọng tiếng Anh khả dụng)</label>
          <select id="sVoice"><option value="">Tự động (ưu tiên en-US)</option>${voices.map(v => `<option value="${esc(v.name)}" ${v.name === s.voice ? 'selected' : ''}>${esc(v.name)} (${v.lang})</option>`).join('')}</select>
          <span class="hint">Giọng đọc phụ thuộc vào trình duyệt/hệ điều hành. Chrome & Edge thường có giọng tự nhiên nhất.</span>
        </div>
        <div class="field"><label>Tốc độ đọc: <b id="sRateV">${s.rate}</b>x</label><input type="range" id="sRate" min="0.5" max="1.5" step="0.1" value="${s.rate}"></div>
        <label class="check"><input type="checkbox" id="sAuto" ${s.autoSpeak ? 'checked' : ''}> Tự động phát âm khi hiện thẻ flashcard</label>
        <label class="check mt"><input type="checkbox" id="sDict" ${s.preferDictAudio ? 'checked' : ''}> Ưu tiên audio người thật từ từ điển (nếu từ đã được "Tra")</label>
        <div class="row mt"><input class="input" id="sTest" value="Hello, nice to meet you!" style="max-width:320px"><button class="btn" id="sTestBtn">🔊 Nghe thử</button></div>
      </div>
      <div class="card">
        <h3>🎯 Học tập & giao diện</h3>
        <div class="form-grid">
          <div class="field"><label>Mục tiêu mỗi ngày (lượt ôn)</label><input type="number" id="sGoal" min="5" max="500" value="${s.dailyGoal}"></div>
          <div class="field"><label>Số câu quiz mặc định</label><input type="number" id="sQuiz" min="1" max="500" value="${s.quizCount}"><span class="hint">Nhiều hơn số từ thì từ sẽ lặp lại với dạng câu hỏi khác.</span></div>
          <div class="field"><label>Giao diện</label><select id="sTheme"><option value="light" ${s.theme === 'light' ? 'selected' : ''}>Sáng</option><option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Tối</option></select></div>
        </div>
      </div>
      <div class="card">
        <h3>🏆 Bảng xếp hạng</h3>
        <label class="check"><input type="checkbox" id="sLb" ${s.showOnLeaderboard !== false ? 'checked' : ''}> Hiển thị tên tôi trên bảng xếp hạng (số lượt ôn mỗi ngày / tuần)</label>
        <p class="hint mt" style="margin-top:8px">${Store.cloud ? 'Chỉ chia sẻ tên hiển thị, ảnh đại diện và số lượt ôn – không chia sẻ từ vựng của bạn.' : 'Cần đăng nhập tài khoản (chế độ cloud) để tham gia bảng xếp hạng.'}</p>
      </div>
      <div class="card">
        <h3>➕ Thêm từ ngay khi đang đọc báo</h3>
        <p class="muted small"><b>Cách 1 – Bookmarklet (không cần cài gì, mọi trình duyệt):</b> kéo nút dưới đây lên <b>thanh dấu trang</b> (Ctrl+Shift+B để hiện thanh). Khi đọc trang tiếng Anh, bôi đen <b>1 từ</b> rồi bấm nút đó → VocabFlash mở ra với từ + câu chứa từ, AI điền nghĩa; bôi đen <b>cả đoạn</b> → AI dịch nguyên đoạn và liệt kê từ khó để thêm. Không cần cài gì, chạy mọi trình duyệt.</p>
        <div class="row mb"><a class="btn btn-primary bookmarklet" id="sBm" href="${esc(bookmarklet())}" title="Kéo tôi lên thanh dấu trang" draggable="true">➕ VocabFlash</a><span class="hint">Kéo không được? Dùng cách thủ công bên dưới.</span></div>
        <details class="bm-manual mb"><summary>Tạo thủ công (20 giây, không cần kéo)</summary>
          <ol class="muted small" style="margin:8px 0 0;padding-left:18px">
            <li>Bấm <button class="btn btn-sm" id="sBmCopy">📋 Sao chép mã bookmarklet</button></li>
            <li>Nhấn <span class="kbd">Ctrl</span>+<span class="kbd">D</span> (hoặc bấm ⭐ trên thanh địa chỉ) → chọn <b>Thêm / Xong</b> để lưu trang này thành dấu trang.</li>
            <li>Chuột phải vào dấu trang vừa tạo trên thanh dấu trang → <b>Chỉnh sửa</b> → Tên: <code>➕ VocabFlash</code>, <b>URL: xoá hết rồi dán mã</b> vừa sao chép → Lưu.</li>
            <li>Mở một trang tiếng Anh, bôi đen từ, bấm dấu trang đó → VocabFlash mở với từ đã điền sẵn.</li>
          </ol>
          <p class="hint" style="margin-top:6px">Thanh dấu trang ẩn? Nhấn <span class="kbd">Ctrl</span>+<span class="kbd">Shift</span>+<span class="kbd">B</span>. Trên điện thoại (Chrome Android): tạo dấu trang bất kỳ rồi vào Dấu trang → ⋮ → Chỉnh sửa → dán mã vào URL; khi dùng, gõ tên "VocabFlash" vào thanh địa chỉ để gọi.</p>
        </details>
        <p class="muted small"><b>Cách 2 – Extension Chrome:</b> bôi đen → chuột phải → <b>Thêm vào VocabFlash</b> → từ về <a href="#/inbox" style="color:var(--primary)">📥 Hộp thư từ</a> (kèm câu chứa từ), điền nghĩa bằng AI rồi thêm vào chủ đề.</p>
        <ol class="muted small" style="margin:0 0 10px;padding-left:18px">
          <li><a href="extension/vocabflash-extension.zip" download style="color:var(--primary)">⬇️ Tải extension (.zip)</a> rồi giải nén ra một thư mục.</li>
          <li>Chrome → <code>chrome://extensions</code> → bật <b>Developer mode</b> (góc phải) → <b>Load unpacked</b> → chọn thư mục vừa giải nén.</li>
          <li>Bấm biểu tượng VocabFlash trên thanh công cụ → đăng nhập bằng <b>email + mật khẩu</b> của tài khoản này.</li>
        </ol>
        ${Store.cloud ? `<div class="row"><input class="input" type="password" id="sPass" placeholder="${Auth.user.provider === 'email' ? 'Đổi mật khẩu (≥ 6 ký tự)' : 'Đặt mật khẩu để đăng nhập extension (≥ 6 ký tự)'}" style="max-width:320px" autocomplete="new-password"><button class="btn" id="sPassBtn">🔑 ${Auth.user.provider === 'email' ? 'Đổi mật khẩu' : 'Đặt mật khẩu'}</button></div>
        <p class="hint" style="margin-top:6px">${Auth.user.provider === 'email' ? '' : `Bạn đăng nhập bằng ${Auth.user.provider === 'google' ? 'Google' : Auth.user.provider} – đặt mật khẩu để extension đăng nhập bằng email <b>${esc(Auth.user.email)}</b>.`}</p>` : '<p class="hint">Cần đăng nhập tài khoản (chế độ cloud) để dùng extension.</p>'}
      </div>
      <div class="card">
        <h3>💾 Dữ liệu</h3>
        <p class="muted small">${Store.cloud ? 'Dữ liệu được đồng bộ lên đám mây theo tài khoản của bạn.' : 'Dữ liệu được lưu trong trình duyệt này theo tài khoản.'} Xuất file để sao lưu hoặc chuyển sang máy khác.</p>
        <div class="row">
          <button class="btn" id="sExport">⬇️ Xuất dữ liệu (JSON)</button>
          <button class="btn" id="sImport">⬆️ Nhập dữ liệu</button>
          <input type="file" id="sFile" accept=".json,application/json" hidden>
          <button class="btn btn-danger" id="sReset" style="margin-left:auto">🗑️ Xoá toàn bộ</button>
        </div>
        <p class="muted small mt">${Store.topics().length} chủ đề · ${Store.words().length} từ</p>
      </div>
    </div>`;

  const save = () => Store.save();
  $('#sVoice', el).addEventListener('change', e => { s.voice = e.target.value; save(); });
  $('#sRate', el).addEventListener('input', e => { s.rate = parseFloat(e.target.value); $('#sRateV', el).textContent = s.rate; save(); });
  $('#sAuto', el).addEventListener('change', e => { s.autoSpeak = e.target.checked; save(); });
  $('#sDict', el).addEventListener('change', e => { s.preferDictAudio = e.target.checked; save(); });
  $('#sTestBtn', el).addEventListener('click', e => TTS.speakText($('#sTest', el).value, e.currentTarget));
  $('#sTheme', el).addEventListener('change', e => { s.theme = e.target.value; save(); applyTheme(); });
  $('#sQuiz', el).addEventListener('change', e => { s.quizCount = Math.min(500, Math.max(1, parseInt(e.target.value) || 10)); save(); });
  $('#sLb', el).addEventListener('change', e => { s.showOnLeaderboard = e.target.checked; save(); if (e.target.checked) Store.pushLeaderboard(); else Store.removeFromLeaderboard(); });
  $('#sGoal', el).addEventListener('change', e => { s.dailyGoal = Math.max(5, parseInt(e.target.value) || 20); save(); });

  $('#sBm', el).addEventListener('click', e => { e.preventDefault(); toast('Hãy KÉO nút này lên thanh dấu trang (Ctrl+Shift+B để hiện thanh), hoặc dùng cách thủ công bên dưới', 4000); $('.bm-manual', el).open = true; });
  // Cung cấp đầy đủ dữ liệu drag để Chrome/Edge tạo dấu trang khi thả lên thanh dấu trang
  $('#sBm', el).addEventListener('dragstart', e => { const u = bookmarklet(); e.dataTransfer.effectAllowed = 'copyLink'; e.dataTransfer.setData('text/uri-list', u); e.dataTransfer.setData('text/plain', u); e.dataTransfer.setData('text/x-moz-url', u + '\n➕ VocabFlash'); });
  $('#sBmCopy', el).addEventListener('click', async () => { try { await navigator.clipboard.writeText(bookmarklet()); toast('Đã sao chép – dán vào URL của một dấu trang'); } catch { toast('Không sao chép được'); } });
  $('#sPassBtn', el)?.addEventListener('click', async e => {
    const b = e.currentTarget; b.disabled = true;
    try { await Auth.setPassword($('#sPass', el).value); $('#sPass', el).value = ''; toast('Đã lưu mật khẩu – dùng email này để đăng nhập extension'); }
    catch (err) { toast('Lỗi: ' + err.message, 5000); }
    finally { b.disabled = false; }
  });
  $('#sExport', el).addEventListener('click', () => {
    const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `vocabflash-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Đã xuất file');
  });
  $('#sImport', el).addEventListener('click', () => $('#sFile', el).click());
  $('#sFile', el).addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.topics) || !Array.isArray(data.words)) throw new Error('File không đúng định dạng VocabFlash');
      openModal(`<h2>Nhập dữ liệu</h2><p class="muted">File có <b>${data.topics.length}</b> chủ đề và <b>${data.words.length}</b> từ. Bạn muốn:</p>
        <div class="modal-actions"><button class="btn" data-close>Huỷ</button><button class="btn" id="iMerge">Gộp vào dữ liệu hiện tại</button><button class="btn btn-danger" id="iReplace">Thay thế toàn bộ</button></div>`, root => {
        $('#iReplace', root).addEventListener('click', () => { Store.replaceAll(data); closeModal(); applyTheme(); toast('Đã nhập dữ liệu'); render(); });
        $('#iMerge', root).addEventListener('click', () => { Store.mergeFrom(data); closeModal(); toast('Đã gộp dữ liệu'); render(); });
      });
    } catch (err) { toast('Lỗi: ' + err.message); }
    e.target.value = '';
  });
  $('#sReset', el).addEventListener('click', async () => {
    if (await confirmModal('Xoá toàn bộ dữ liệu?', 'Tất cả chủ đề, từ vựng và tiến độ học sẽ bị xoá. Hãy xuất file sao lưu trước nếu cần.', 'Xoá tất cả')) {
      Store.clearAll(); toast('Đã xoá toàn bộ dữ liệu'); render();
    }
  });
}
