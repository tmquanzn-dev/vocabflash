import { $, esc, toast } from '../utils.js';
import { Store } from '../store.js';
import { TTS } from '../tts.js';
import { setTitle, applyTheme } from '../shell.js';
import { openModal, closeModal, confirmModal } from '../modal.js';
import { render } from '../router.js';

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
