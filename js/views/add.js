import { $, $$, esc, toast, isPhrase, POS_LIST, EMOJIS } from '../utils.js?v=9';
import { Store } from '../store.js?v=9';
import { setTitle, renderSidebar } from '../shell.js?v=9';
import { AI } from '../ai.js?v=9';
import { lookupWord } from '../dictionary.js?v=9';
import { TTS } from '../tts.js?v=9';
import { go } from '../router.js?v=9';

/**
 * Thêm nhanh một từ từ bên ngoài (bookmarklet / link chia sẻ):
 * #/add?w=từ&c=câu chứa từ&u=link trang&t=tiêu đề trang
 */
export function viewAdd(el, { query }) {
  setTitle('Thêm từ nhanh');
  const q = query || new URLSearchParams();
  const d = { word: (q.get('w') || '').replace(/\s+/g, ' ').trim(), context: (q.get('c') || '').trim().slice(0, 400), url: q.get('u') || '', title: q.get('t') || '', phonetic: '', pos: '', meaning: '', exampleVi: '', note: '', audio: '' };
  const topics = Store.topics();
  const draw = () => {
    el.innerHTML = `
      <div class="quiz-wrap">
        <div class="page-head"><div><h1>➕ Thêm từ nhanh</h1><p class="muted">Từ lấy từ trang web qua bookmarklet. Điền nghĩa (hoặc để AI điền) rồi chọn chủ đề để lưu.</p></div></div>
        <div class="card">
          <div class="form-grid">
            <div class="field"><label>Từ / cụm từ tiếng Anh *</label><div class="row nowrap"><input id="adWord" value="${esc(d.word)}" style="flex:1"><button class="btn-icon btn-speak" id="adSpeak" type="button" title="Nghe">🔊</button></div></div>
            <div class="field"><label>Phiên âm</label><div class="row nowrap"><input id="adPhon" class="ipa" value="${esc(d.phonetic)}" placeholder="/…/" style="flex:1"><button class="btn btn-sm" id="adDict" type="button" title="Tra từ điển lấy phiên âm & audio">🔎 Tra</button></div></div>
            <div class="field"><label>Loại từ</label><select id="adPos">${POS_LIST.map(p => `<option value="${p}" ${p === d.pos ? 'selected' : ''}>${p || '— không chọn —'}</option>`).join('')}</select></div>
            <div class="field"><label>Nghĩa tiếng Việt *</label><div class="row nowrap"><input id="adMean" value="${esc(d.meaning)}" placeholder="Nhập hoặc bấm ✨ AI" style="flex:1"><button class="btn btn-sm btn-primary" id="adAI" type="button" title="Gemini điền phiên âm, loại từ, nghĩa theo ngữ cảnh">✨ AI</button></div></div>
            <div class="field full"><label>Câu ví dụ (lấy từ trang)</label><input id="adEx" value="${esc(d.context)}"></div>
            <div class="field full"><label>Dịch câu ví dụ</label><input id="adExVi" value="${esc(d.exampleVi)}"></div>
            <div class="field full"><label>Ghi chú</label><input id="adNote" value="${esc(d.note)}" placeholder="Định nghĩa tiếng Anh, từ đồng nghĩa..."></div>
            ${d.url ? `<div class="field full"><span class="hint">🔗 Nguồn: <a href="${esc(d.url)}" target="_blank" rel="noopener" style="color:var(--primary)">${esc(d.title || d.url)}</a>${d.audio ? ' · 🎧 có audio từ điển' : ''}</span></div>` : ''}
          </div>
          <div class="ai-create row">
            <label>Lưu vào chủ đề:</label>
            ${topics.length ? `<select class="input" id="adTopic" style="max-width:280px">${topics.map(t => `<option value="${t.id}">${t.icon} ${esc(t.name)} (${Store.wordsOf(t.id).length} từ)</option>`).join('')}<option value="__new__">＋ Chủ đề mới...</option></select>` : `<span class="muted small">Chưa có chủ đề – sẽ tạo mới:</span>`}
            <input class="input" id="adNewName" placeholder="Tên chủ đề mới" value="📥 Từ web" style="max-width:220px" ${topics.length ? 'hidden' : ''}>
            <button class="btn btn-success btn-lg" id="adSave" style="margin-left:auto">✔ Lưu từ</button>
          </div>
        </div>
      </div>`;
    const val = id => $('#' + id, el).value;
    const collect = () => Object.assign(d, { word: val('adWord').trim().replace(/\s+/g, ' '), phonetic: val('adPhon').trim(), pos: val('adPos'), meaning: val('adMean').trim(), context: val('adEx').trim(), exampleVi: val('adExVi').trim(), note: val('adNote').trim() });
    $('#adTopic', el)?.addEventListener('change', e => { $('#adNewName', el).hidden = e.target.value !== '__new__'; });
    $('#adSpeak', el).addEventListener('click', e => { collect(); if (d.word) TTS.speakWord({ word: d.word, audio: d.audio }, e.currentTarget); });
    $('#adDict', el).addEventListener('click', async e => {
      collect(); if (!d.word) { toast('Nhập từ trước'); return; }
      const b = e.currentTarget; b.disabled = true; b.textContent = '⏳';
      try { const x = await lookupWord(d.word); if (x.phonetic) d.phonetic = x.phonetic; if (x.audio) d.audio = x.audio; if (!d.pos && x.pos) d.pos = x.pos; if (!d.note && x.definition) d.note = 'EN: ' + x.definition; toast('Đã tra xong'); draw(); }
      catch (err) { toast(err.message); b.disabled = false; b.textContent = '🔎 Tra'; }
    });
    $('#adAI', el).addEventListener('click', async e => {
      collect(); if (!d.word) { toast('Nhập từ trước'); return; }
      const b = e.currentTarget; b.disabled = true; b.textContent = '⏳ AI...';
      try { const [w] = await AI.defineWords([{ word: d.word, context: d.context }]); if (w.phonetic) d.phonetic = w.phonetic; if (w.pos) d.pos = w.pos; if (w.meaning) d.meaning = w.meaning; if (w.exampleVi) d.exampleVi = w.exampleVi; if (w.note) d.note = w.note; toast('AI đã điền'); draw(); }
      catch (err) { toast('Lỗi AI: ' + err.message, 5000); b.disabled = false; b.textContent = '✨ AI'; }
    });
    $('#adSave', el).addEventListener('click', () => {
      collect();
      if (!d.word) { toast('Vui lòng nhập từ'); return; }
      if (!d.meaning) { toast('Vui lòng nhập nghĩa (hoặc bấm ✨ AI)'); $('#adMean', el).focus(); return; }
      let topicId = $('#adTopic', el)?.value;
      if (!topicId || topicId === '__new__') { const name = val('adNewName').trim() || '📥 Từ web'; topicId = (Store.topics().find(t => t.name === name) || Store.addTopic({ name, icon: '📥', desc: 'Từ thêm nhanh từ trang web' })).id; }
      Store.addWord(topicId, { word: d.word, phonetic: d.phonetic, pos: POS_LIST.includes(d.pos) ? d.pos : (isPhrase(d.word) ? 'phrase' : ''), meaning: d.meaning, example: d.context, exampleVi: d.exampleVi, note: d.note, audio: d.audio });
      renderSidebar(); toast(`Đã thêm "${d.word}"`);
      history.replaceState(null, '', location.pathname + '#/topic/' + topicId); go('/topic/' + topicId);
    });
    $('#adMean', el).focus();
  };
  draw();
}
