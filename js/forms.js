import { $, $$, esc, toast, isPhrase, EMOJIS, POS_LIST, POS_SHORT } from './utils.js';
import { openModal, closeModal, confirmModal } from './modal.js';
import { Store } from './store.js';
import { TTS } from './tts.js';
import { lookupWord } from './dictionary.js';
import { render, go } from './router.js';
import { LIBRARY, packToWords } from './library.js';

/* ---------- Form chủ đề ---------- */
export function topicForm(topic) {
  const isEdit = !!topic;
  const t = topic || { name: '', icon: '📚', desc: '' };
  openModal(`
    <h2>${isEdit ? 'Sửa chủ đề' : 'Tạo chủ đề mới'}</h2>
    <div class="field"><label>Tên chủ đề *</label><input id="tName" value="${esc(t.name)}" placeholder="Ví dụ: School, Travel, Food..."></div>
    <div class="field"><label>Mô tả</label><input id="tDesc" value="${esc(t.desc)}" placeholder="Mô tả ngắn (không bắt buộc)"></div>
    <div class="field"><label>Biểu tượng</label>
      <div class="emoji-picker" id="tEmoji">${EMOJIS.map(e => `<button type="button" class="${e === t.icon ? 'active' : ''}" data-e="${e}">${e}</button>`).join('')}</div>
    </div>
    <div class="modal-actions">
      ${isEdit ? `<button class="btn btn-danger" id="tDelete" style="margin-right:auto">Xoá chủ đề</button>` : ''}
      <button class="btn" data-close>Huỷ</button>
      <button class="btn btn-primary" id="tSave">${isEdit ? 'Lưu' : 'Tạo'}</button>
    </div>`, root => {
    let icon = t.icon;
    $('#tEmoji', root).addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      icon = b.dataset.e;
      $$('#tEmoji button', root).forEach(x => x.classList.toggle('active', x === b));
    });
    const save = () => {
      const name = $('#tName', root).value.trim();
      if (!name) { toast('Vui lòng nhập tên chủ đề'); return; }
      const desc = $('#tDesc', root).value;
      if (isEdit) { Store.updateTopic(topic.id, { name, desc, icon }); toast('Đã lưu chủ đề'); closeModal(); render(); }
      else { const nt = Store.addTopic({ name, desc, icon }); toast('Đã tạo chủ đề'); closeModal(); go('/topic/' + nt.id); }
    };
    $('#tSave', root).addEventListener('click', save);
    $('#tName', root).addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    if (isEdit) $('#tDelete', root).addEventListener('click', async () => {
      const n = Store.wordsOf(topic.id).length;
      if (await confirmModal('Xoá chủ đề?', `Chủ đề "${topic.name}" và ${n} từ vựng bên trong sẽ bị xoá vĩnh viễn.`)) {
        Store.deleteTopic(topic.id); toast('Đã xoá chủ đề'); go('/');
      }
    });
  });
}

/* ---------- Form từ vựng ---------- */
export function wordForm(topicId, word, preset = {}) {
  const isEdit = !!word;
  const w = word || { word: '', phonetic: '', pos: '', meaning: '', example: '', exampleVi: '', note: '', audio: '', ...preset };
  openModal(`
    <h2>${isEdit ? 'Sửa từ vựng' : 'Thêm từ vựng'}</h2>
    <div class="form-grid">
      <div class="field"><label>Từ / cụm từ tiếng Anh *</label>
        <div class="row nowrap">
          <input id="wWord" value="${esc(w.word)}" placeholder="apple  /  I like the beach" style="flex:1">
          <button class="btn-icon btn-speak" id="wSpeak" title="Nghe thử" type="button">🔊</button>
        </div>
      </div>
      <div class="field"><label>Phiên âm (IPA)</label>
        <div class="row nowrap">
          <input id="wPhon" value="${esc(w.phonetic)}" placeholder="/ˈæp.əl/" style="flex:1">
          <button class="btn btn-sm" id="wLookup" title="Tra từ điển online để lấy phiên âm, loại từ, ví dụ (cụm từ: ghép phiên âm từng từ)" type="button">🔎 Tra</button>
        </div>
      </div>
      <div class="field"><label>Loại từ</label>
        <select id="wPos">${POS_LIST.map(p => `<option value="${p}" ${p === w.pos ? 'selected' : ''}>${p ? `${p} (${POS_SHORT[p]})` : '— không chọn —'}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Nghĩa tiếng Việt *</label><input id="wMean" value="${esc(w.meaning)}" placeholder="quả táo  /  tôi thích bãi biển"></div>
      <div class="field full"><label>Câu ví dụ (EN)</label><input id="wEx" value="${esc(w.example)}" placeholder="I eat an apple every day."></div>
      <div class="field full"><label>Dịch câu ví dụ (VI)</label><input id="wExVi" value="${esc(w.exampleVi)}" placeholder="Tôi ăn một quả táo mỗi ngày."></div>
      <div class="field full"><label>Ghi chú / định nghĩa tiếng Anh</label><textarea id="wNote" placeholder="Ghi chú thêm, từ đồng nghĩa, collocations...">${esc(w.note)}</textarea></div>
      <div class="field full"><span class="hint" id="wAudioHint">${w.audio ? '🎧 Từ này có audio phát âm từ từ điển.' : ''}</span></div>
    </div>
    <div class="modal-actions">
      <button class="btn" data-close>Huỷ</button>
      ${isEdit ? '' : '<button class="btn" id="wSaveMore" title="Ctrl+Enter">Lưu & thêm tiếp</button>'}
      <button class="btn btn-primary" id="wSave">Lưu</button>
    </div>`, root => {
    let audio = w.audio || '';
    const val = id => $('#' + id, root).value;
    const collect = () => ({ word: val('wWord'), phonetic: val('wPhon'), pos: val('wPos'), meaning: val('wMean'), example: val('wEx'), exampleVi: val('wExVi'), note: val('wNote'), audio });

    $('#wSpeak', root).addEventListener('click', e => { const t = val('wWord').trim(); if (t) TTS.speakWord({ word: t, audio }, e.currentTarget); });

    $('#wLookup', root).addEventListener('click', async e => {
      const t = val('wWord').trim();
      if (!t) { toast('Nhập từ trước đã'); return; }
      const btn = e.currentTarget; btn.disabled = true; btn.textContent = '⏳';
      try {
        const d = await lookupWord(t);
        if (d.phonetic) $('#wPhon', root).value = d.phonetic;
        if (d.pos && POS_LIST.includes(d.pos) && !val('wPos')) $('#wPos', root).value = d.pos;
        if (d.example && !val('wEx')) $('#wEx', root).value = d.example;
        if (d.definition && !val('wNote')) $('#wNote', root).value = 'EN: ' + d.definition;
        if (d.audio) { audio = d.audio; $('#wAudioHint', root).textContent = '🎧 Đã lấy được audio phát âm từ từ điển.'; }
        toast(d.phonetic ? 'Đã tra xong ✔' : 'Tìm thấy từ nhưng không có phiên âm');
      } catch (err) { toast(err.message); }
      finally { btn.disabled = false; btn.textContent = '🔎 Tra'; }
    });

    const save = (more) => {
      const d = collect();
      if (!d.word.trim()) { toast('Vui lòng nhập từ tiếng Anh'); return; }
      if (!d.meaning.trim()) { toast('Vui lòng nhập nghĩa tiếng Việt'); return; }
      d.word = d.word.trim().replace(/\s+/g, ' ');
      if (!d.pos && isPhrase(d.word)) d.pos = 'phrase'; // cụm từ → tự gán loại "phrase"
      if (isEdit) { Store.updateWord(word.id, d); toast('Đã cập nhật từ'); closeModal(); render(); }
      else {
        Store.addWord(topicId, d); toast(`Đã thêm "${d.word.trim()}"`); render();
        if (more) wordForm(topicId); else closeModal();
      }
    };
    $('#wSave', root).addEventListener('click', () => save(false));
    if (!isEdit) $('#wSaveMore', root).addEventListener('click', () => save(true));
    root.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); save(!isEdit && e.ctrlKey); } });
  });
}

/* ---------- Nhập nhanh nhiều từ ---------- */
export function bulkForm(topicId) {
  openModal(`
    <h2>Nhập nhanh nhiều từ</h2>
    <p class="muted small">Mỗi dòng một từ <b>hoặc cụm từ</b>, các phần cách nhau bằng dấu <b>|</b> (hoặc Tab):<br>
      <code>từ | phiên âm | nghĩa | ví dụ | dịch ví dụ</code><br>
      Có thể bỏ trống phiên âm: <code>apple | | quả táo</code> hoặc chỉ ghi <code>apple | quả táo</code>.</p>
    <div class="field"><textarea id="bText" style="min-height:200px" placeholder="apple | /ˈæp.əl/ | quả táo | I eat an apple. | Tôi ăn một quả táo.
banana | quả chuối
I like the beach | tôi thích bãi biển
look forward to | /lʊk ˈfɔːrwərd tuː/ | mong chờ"></textarea></div>
    <label class="check"><input type="checkbox" id="bAuto" checked> Tự động tra phiên âm & audio cho các từ chưa có phiên âm (cần internet)</label>
    <div class="modal-actions">
      <button class="btn" data-close>Huỷ</button>
      <button class="btn btn-primary" id="bSave">Thêm từ</button>
    </div>`, root => {
    $('#bSave', root).addEventListener('click', async () => {
      const lines = $('#bText', root).value.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) { toast('Chưa có dòng nào'); return; }
      const items = [];
      for (const line of lines) {
        const parts = line.split(/\s*\|\s*|\t/).map(s => s.trim());
        if (parts.length < 2) continue;
        let [word, phonetic, meaning, example, exampleVi] = parts;
        if (parts.length === 2) { meaning = phonetic; phonetic = ''; }                       // "từ | nghĩa"
        else if (phonetic && !/^[\/\[]/.test(phonetic) && !meaning) { meaning = phonetic; phonetic = ''; } // phần 2 không phải phiên âm
        if (!word || !meaning) continue;
        word = word.replace(/\s+/g, ' ');
        items.push({ word, phonetic, meaning, example, exampleVi, pos: isPhrase(word) ? 'phrase' : '' });
      }
      if (!items.length) { toast('Không có dòng nào hợp lệ'); return; }
      const btn = $('#bSave', root); btn.disabled = true;
      if ($('#bAuto', root).checked) {
        let i = 0;
        for (const it of items) {
          i++; btn.textContent = `⏳ Đang tra ${i}/${items.length}...`;
          if (!it.phonetic) {
            try { const d = await lookupWord(it.word); it.phonetic = d.phonetic; it.audio = d.audio; it.pos = d.pos || it.pos; if (!it.example) it.example = d.example; } catch { /* bỏ qua từ không tra được */ }
          }
        }
      }
      items.forEach(it => Store.addWord(topicId, it));
      toast(`Đã thêm ${items.length} từ`);
      closeModal(); render();
    });
  });
}


/* ---------- Chia sẻ chủ đề: xuất ra văn bản để người khác dán vào "Nhập nhanh" ---------- */
export function shareTopicForm(topic) {
  const words = Store.wordsOf(topic.id);
  const text = words.map(w => [w.word, w.phonetic, w.meaning, w.example, w.exampleVi].map(x => (x || '').replace(/\|/g, '/')).join(' | ').replace(/( \| )+$/, '')).join('\n');
  openModal(`
    <h2>📤 Chia sẻ chủ đề "${esc(topic.name)}"</h2>
    <p class="muted small">Sao chép nội dung dưới đây gửi cho bạn bè – họ chỉ cần tạo chủ đề rồi dán vào <b>Nhập nhanh</b> là có đủ ${words.length} từ.</p>
    <div class="field"><textarea id="shText" style="min-height:220px;font-family:monospace;font-size:.85rem" readonly>${esc(text)}</textarea></div>
    <div class="modal-actions">
      <button class="btn" data-close>Đóng</button>
      <button class="btn" id="shDownload">⬇️ Tải file .txt</button>
      <button class="btn btn-primary" id="shCopy">📋 Sao chép</button>
    </div>`, root => {
    $('#shCopy', root).addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text); toast('Đã sao chép ' + words.length + ' từ'); }
      catch { $('#shText', root).select(); document.execCommand('copy'); toast('Đã sao chép'); }
    });
    $('#shDownload', root).addEventListener('click', () => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
      a.download = `${topic.name.replace(/[^\w\-]+/g, '_')}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  });
}

/* ---------- Thư viện chủ đề mẫu ---------- */
export function libraryForm() {
  const existing = new Set(Store.topics().map(t => t.name.toLowerCase()));
  openModal(`
    <h2>📚 Thư viện chủ đề</h2>
    <p class="muted small">Bộ từ vựng soạn sẵn kèm phiên âm & ví dụ. Thêm vào tài khoản rồi tuỳ ý sửa.</p>
    <div class="lib-grid">${LIBRARY.map(p => `<div class="lib-card">
      <div class="lib-ic">${p.icon}</div>
      <div class="lib-info"><b>${esc(p.name)}</b><div class="small muted">${esc(p.desc)} · ${p.words.length} từ · ${p.level}</div></div>
      <button class="btn btn-sm ${existing.has(p.name.toLowerCase()) ? '' : 'btn-primary'}" data-pack="${p.id}">${existing.has(p.name.toLowerCase()) ? 'Thêm lại' : '＋ Thêm'}</button>
    </div>`).join('')}</div>
    <div class="modal-actions"><button class="btn" data-close>Đóng</button></div>`, root => {
    $$('[data-pack]', root).forEach(b => b.addEventListener('click', () => {
      const p = LIBRARY.find(x => x.id === b.dataset.pack);
      const t = Store.addTopic({ name: p.name, icon: p.icon, desc: p.desc });
      packToWords(p).forEach(w => Store.addWord(t.id, w));
      toast(`Đã thêm chủ đề ${p.icon} ${p.name} (${p.words.length} từ)`);
      closeModal(); go('/topic/' + t.id);
    }));
  });
}
