import { $, $$, esc, toast, isPhrase, POS_LIST, EMOJIS } from '../utils.js?v=13';
import { Store } from '../store.js?v=13';
import { setTitle, renderSidebar } from '../shell.js?v=13';
import { AI } from '../ai.js?v=13';
import { lookupWord } from '../dictionary.js?v=13';
import { TTS } from '../tts.js?v=13';
import { go } from '../router.js?v=13';
import { confirmDuplicate } from '../forms.js?v=13';

/**
 * Thêm nhanh một từ từ bên ngoài (bookmarklet / link chia sẻ):
 * #/add?w=từ&c=câu chứa từ&u=link trang&t=tiêu đề trang
 */
export function viewAdd(el, { query }) {
  setTitle('Thêm từ nhanh');
  const q = query || new URLSearchParams();
  const raw = (q.get('w') || '').replace(/\s+/g, ' ').trim();
  // Bôi đen cả đoạn (dài / nhiều từ) → chế độ dịch đoạn thay vì thêm 1 từ
  if (raw.length > 80 || raw.split(' ').length > 8) return viewPassage(el, { text: raw, url: q.get('u') || '', title: q.get('t') || '' });
  const d = { word: raw, context: (q.get('c') || '').trim().slice(0, 400), url: q.get('u') || '', title: q.get('t') || '', phonetic: '', pos: '', meaning: '', exampleVi: '', note: '', synonyms: '', antonyms: '', audio: '' };
  const topics = Store.topics();
  const dupOf = () => { const t = Store.findDuplicates(d.word).map(x => Store.topic(x.topicId)).filter(Boolean)[0]; return t ? `${t.icon} ${t.name}` : ''; };
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
            <div class="field"><label>≈ Đồng nghĩa</label><input id="adSyn" value="${esc(d.synonyms)}" placeholder="big (to lớn), large (rộng)"></div>
            <div class="field"><label>≠ Trái nghĩa</label><input id="adAnt" value="${esc(d.antonyms)}" placeholder="small (nhỏ)"></div>
            <div class="field full"><label>Ghi chú</label><input id="adNote" value="${esc(d.note)}" placeholder="Định nghĩa tiếng Anh, collocations..."></div>
            ${dupOf() ? `<div class="field full"><span class="hint" style="color:var(--warn)">⚠️ Từ này đã có trong ${esc(dupOf())}</span></div>` : ''}
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
    const collect = () => Object.assign(d, { word: val('adWord').trim().replace(/\s+/g, ' '), phonetic: val('adPhon').trim(), pos: val('adPos'), meaning: val('adMean').trim(), context: val('adEx').trim(), exampleVi: val('adExVi').trim(), note: val('adNote').trim(), synonyms: val('adSyn').trim(), antonyms: val('adAnt').trim() });
    $('#adTopic', el)?.addEventListener('change', e => { $('#adNewName', el).hidden = e.target.value !== '__new__'; });
    $('#adSpeak', el).addEventListener('click', e => { collect(); if (d.word) TTS.speakWord({ word: d.word, audio: d.audio }, e.currentTarget); });
    $('#adDict', el).addEventListener('click', async e => {
      collect(); if (!d.word) { toast('Nhập từ trước'); return; }
      const b = e.currentTarget; b.disabled = true; b.textContent = '⏳';
      try { const x = await lookupWord(d.word); if (x.phonetic) d.phonetic = x.phonetic; if (x.audio) d.audio = x.audio; if (!d.pos && x.pos) d.pos = x.pos; if (!d.note && x.definition) d.note = 'EN: ' + x.definition; if (!d.synonyms && x.synonyms?.length) d.synonyms = x.synonyms.join(', '); if (!d.antonyms && x.antonyms?.length) d.antonyms = x.antonyms.join(', '); if (AI.available) { const [s, a] = await AI.glossRel(d.synonyms, d.antonyms); d.synonyms = s; d.antonyms = a; } toast('Đã tra xong'); draw(); }
      catch (err) { toast(err.message); b.disabled = false; b.textContent = '🔎 Tra'; }
    });
    $('#adAI', el).addEventListener('click', async e => {
      collect(); if (!d.word) { toast('Nhập từ trước'); return; }
      const b = e.currentTarget; b.disabled = true; b.textContent = '⏳ AI...';
      try { const [w] = await AI.defineWords([{ word: d.word, context: d.context }]); if (w.phonetic) d.phonetic = w.phonetic; if (w.pos) d.pos = w.pos; if (w.meaning) d.meaning = w.meaning; if (w.exampleVi) d.exampleVi = w.exampleVi; if (w.note) d.note = w.note; if (w.synonyms) d.synonyms = w.synonyms; if (w.antonyms) d.antonyms = w.antonyms; toast('AI đã điền'); draw(); }
      catch (err) { toast('Lỗi AI: ' + err.message, 5000); b.disabled = false; b.textContent = '✨ AI'; }
    });
    $('#adSave', el).addEventListener('click', async () => {
      collect();
      if (!d.word) { toast('Vui lòng nhập từ'); return; }
      if (!d.meaning) { toast('Vui lòng nhập nghĩa (hoặc bấm ✨ AI)'); $('#adMean', el).focus(); return; }
      const dups = Store.findDuplicates(d.word);
      if (dups.length && !(await confirmDuplicate(d.word, dups))) return;
      let topicId = $('#adTopic', el)?.value;
      if (!topicId || topicId === '__new__') { const name = val('adNewName').trim() || '📥 Từ web'; topicId = (Store.topics().find(t => t.name === name) || Store.addTopic({ name, icon: '📥', desc: 'Từ thêm nhanh từ trang web' })).id; }
      Store.addWord(topicId, { word: d.word, phonetic: d.phonetic, pos: POS_LIST.includes(d.pos) ? d.pos : (isPhrase(d.word) ? 'phrase' : ''), meaning: d.meaning, example: d.context, exampleVi: d.exampleVi, note: d.note, synonyms: d.synonyms, antonyms: d.antonyms, audio: d.audio });
      renderSidebar(); toast(`Đã thêm "${d.word}"`);
      history.replaceState(null, '', location.pathname + '#/topic/' + topicId); go('/topic/' + topicId);
    });
    $('#adMean', el).focus();
  };
  draw();
}

/* Dịch cả đoạn văn (từ bookmarklet): bản dịch + từ khó, mỗi từ có nút ＋ thêm vào chủ đề */
function viewPassage(el, { text, url, title }) {
  setTitle('Dịch đoạn văn');
  const topics = Store.topics();
  const state = { r: null, err: '', added: new Set() };
  const topicSel = () => `<select class="input" id="psTopic" style="max-width:260px">${topics.map(t => `<option value="${t.id}">${t.icon} ${esc(t.name)}</option>`).join('')}<option value="__new__">＋ Chủ đề mới "📥 Từ web"</option></select>`;
  const draw = () => {
    el.innerHTML = `
      <div class="quiz-wrap">
        <div class="page-head"><div><h1>🌐 Dịch đoạn văn</h1><p class="muted">${text.length.toLocaleString('vi-VN')} ký tự${title ? ` · từ <a href="${esc(url)}" target="_blank" rel="noopener" style="color:var(--primary)">${esc(title)}</a>` : ''}. AI dịch sang tiếng Việt và chọn từ khó – bấm ＋ để thêm vào chủ đề.</p></div></div>
        <div class="card"><div class="muted small" style="max-height:160px;overflow:auto;border-left:3px solid var(--border);padding-left:10px;white-space:pre-wrap">${esc(text)}</div></div>
        <div class="card mt" id="psOut">${state.err ? `<div class="empty-state">⚠️ ${esc(state.err)}<br><button class="btn mt" id="psRetry">Thử lại</button></div>`
          : !state.r ? `<div class="empty-state">⏳ Đang dịch bằng AI...</div>`
          : `<h3>Bản dịch</h3><div style="white-space:pre-wrap;font-size:1.05rem;line-height:1.7">${esc(state.r.translation)}</div>
             ${state.r.words.length ? `<h3 class="mt">Từ khó trong đoạn</h3>
             <div class="row mb"><label>Thêm vào:</label>${topicSel()}</div>
             <ul class="plain-list">${state.r.words.map((w, i) => `<li><div class="info"><b>${esc(w.word)}</b> <span class="ipa">${esc(w.phonetic)}</span>${w.pos ? ` <span class="pos">${esc(w.pos)}</span>` : ''}<div class="small">${esc(w.meaning)}${w.note ? ` <span class="muted">– ${esc(w.note)}</span>` : ''}</div></div><button class="btn btn-sm ${state.added.has(i) ? 'btn-success' : 'btn-primary'}" data-i="${i}" ${state.added.has(i) ? 'disabled' : ''}>${state.added.has(i) ? '✓ Đã thêm' : '＋ Thêm'}</button></li>`).join('')}</ul>
             <div class="row mt"><button class="btn btn-primary" id="psAll">＋ Thêm tất cả từ khó</button></div>` : '<p class="muted">AI không chọn được từ khó nào trong đoạn này.</p>'}`}
        </div>
      </div>`;
    $('#psRetry', el)?.addEventListener('click', run);
    // Thêm các từ theo chỉ số; từ đã có trong tài khoản bị bỏ qua (trả về số đã thêm / bỏ qua)
    const addWords = idxs => {
      idxs = idxs.filter(i => !state.added.has(i)); if (!idxs.length) return { added: [], skipped: [] };
      let topicId = $('#psTopic', el)?.value;
      if (!topicId || topicId === '__new__') topicId = (topics.find(t => t.name === '📥 Từ web') || Store.addTopic({ name: '📥 Từ web', icon: '📥', desc: 'Từ thêm nhanh từ trang web' })).id;
      const r = Store.addWords(topicId, idxs.map(i => { const w = state.r.words[i]; return { word: w.word, phonetic: w.phonetic, pos: POS_LIST.includes(w.pos) ? w.pos : (isPhrase(w.word) ? 'phrase' : ''), meaning: w.meaning, example: sentenceWith(text, w.word), note: w.note, synonyms: w.synonyms, antonyms: w.antonyms }; }));
      idxs.forEach(i => state.added.add(i));
      return r;
    };
    const report = r => { renderSidebar(); toast(r.added.length ? `Đã thêm ${r.added.length} từ${r.skipped.length ? ` · bỏ qua ${r.skipped.length} từ đã có` : ''}` : 'Từ này đã có trong tài khoản – không thêm lại', 4000); draw(); };
    $$('[data-i]', el).forEach(b => b.addEventListener('click', () => report(addWords([+b.dataset.i]))));
    $('#psAll', el)?.addEventListener('click', () => report(addWords(state.r.words.map((_, i) => i))));
  };
  const run = async () => { state.err = ''; state.r = null; draw(); try { state.r = await AI.translatePassage(text); } catch (e) { state.err = e.message; } draw(); };
  run();
}
// Câu trong đoạn có chứa từ (làm ví dụ)
function sentenceWith(text, word) {
  const m = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  return (m.find(s => s.toLowerCase().includes(word.toLowerCase())) || '').trim().slice(0, 300);
}
