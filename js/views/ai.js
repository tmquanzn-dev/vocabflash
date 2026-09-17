import { $, $$, esc, toast, isPhrase, POS_LIST, EMOJIS } from '../utils.js?v=9';
import { Store } from '../store.js?v=9';
import { setTitle, renderSidebar } from '../shell.js?v=9';
import { go } from '../router.js?v=9';
import { AI, AI_MODELS, AI_LEVELS, AI_TIMEOUT } from '../ai.js?v=9';
import { lookupWord } from '../dictionary.js?v=9';

const keyState = () => AI.ownKey ? '✔ Key riêng' : AI.usingDefault ? '✔ Key mặc định' : AI.usingProxy ? '✔ Dùng AI của VocabFlash' : 'Chưa có key';
// Giữ kết quả khi quay lại trang trong cùng phiên
const st = { src: 'text', text: '', url: '', level: 'B2-C1', max: 20, result: null, picked: new Set() };

/* AI trích xuất từ vựng từ đoạn văn / link bài báo → tạo chủ đề */
export function viewAI(el) {
  setTitle('AI trích xuất từ vựng');
  el.innerHTML = `
    <div class="page-head">
      <div><h1>✨ AI trích xuất từ vựng</h1><p class="muted">Dán một đoạn văn tiếng Anh hoặc link bài báo – AI (Gemini) sẽ lọc ra các từ khó (B2–C1) kèm phiên âm, nghĩa theo đúng ngữ cảnh bài, câu ví dụ trích từ bài và tạo thành chủ đề mới.</p></div>
    </div>
    <div class="card ai-key">
      <div class="row between">
        <div><b>🔑 Gemini API key</b><div class="small muted">${AI.usingDefault || AI.usingProxy ? 'AI của VocabFlash sẵn sàng – bạn dùng được ngay, không cần key. Muốn dùng hạn mức riêng thì dán key của bạn (miễn phí tại ' : 'Miễn phí tại '}<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:var(--primary)">aistudio.google.com/apikey</a>${AI.usingDefault ? ')' : ''} · key riêng chỉ lưu trên trình duyệt này, không gửi lên máy chủ của VocabFlash.</div></div>
        <span class="chip ${AI.available ? 'good' : 'bad'}" id="aiKeyState">${keyState()}</span>
      </div>
      <div class="row mt">
        <input class="input" type="password" id="aiKey" placeholder="${AI.usingDefault || AI.usingProxy ? 'Dán key riêng (không bắt buộc)' : 'AIza...'}" value="${esc(AI.ownKey)}" style="max-width:360px" autocomplete="off">
        <select class="input" id="aiModel" style="width:auto">${AI_MODELS.map(m => `<option value="${m.id}" ${m.id === AI.model ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select>
        <button class="btn btn-sm" id="aiSaveKey">💾 Lưu key</button>
      </div>
    </div>

    <div class="card mt">
      <div class="seg mb" id="aiSrc"><button class="${st.src === 'text' ? 'active' : ''}" data-src="text">📝 Dán văn bản</button><button class="${st.src === 'url' ? 'active' : ''}" data-src="url">🔗 Link bài báo</button></div>
      <div class="field" id="aiTextBox" ${st.src === 'text' ? '' : 'hidden'}><textarea id="aiText" style="min-height:180px" placeholder="Dán đoạn văn / bài báo tiếng Anh vào đây (tối đa ~24.000 ký tự)...">${esc(st.text)}</textarea></div>
      <div class="field" id="aiUrlBox" ${st.src === 'url' ? '' : 'hidden'}><input id="aiUrl" placeholder="https://www.bbc.com/news/..." value="${esc(st.url)}"><span class="hint">Nội dung trang được đọc qua dịch vụ r.jina.ai (bỏ menu, quảng cáo). Trang chặn bot hoặc cần đăng nhập thì hãy dán văn bản trực tiếp.</span></div>
      <div class="row">
        <label>Mức từ:</label><select class="input" id="aiLevel" style="width:auto">${AI_LEVELS.map(l => `<option value="${l.id}" ${l.id === st.level ? 'selected' : ''}>${l.label}</option>`).join('')}</select>
        <label>Số từ tối đa:</label><select class="input" id="aiMax" style="width:auto">${[10, 15, 20, 30, 40].map(n => `<option value="${n}" ${n === st.max ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <button class="btn btn-primary btn-lg" id="aiRun" style="margin-left:auto">✨ Phân tích</button>
      </div>
      <div class="ai-status muted small mt" id="aiStatus"></div>
    </div>
    <div id="aiResult" class="mt"></div>`;

  $('#aiSaveKey', el).addEventListener('click', () => { AI.key = $('#aiKey', el).value; AI.model = $('#aiModel', el).value; const c = $('#aiKeyState', el); c.textContent = keyState(); c.className = 'chip ' + (AI.available ? 'good' : 'bad'); toast(AI.ownKey ? 'Đã lưu key riêng trên máy này' : AI.available ? 'Đã bỏ key riêng – dùng AI của VocabFlash' : 'Đã xoá key'); });
  $('#aiModel', el).addEventListener('change', e => { AI.model = e.target.value; });
  $('#aiSrc', el).addEventListener('click', e => { const b = e.target.closest('[data-src]'); if (!b) return; st.src = b.dataset.src; $$('[data-src]', el).forEach(x => x.classList.toggle('active', x === b)); $('#aiTextBox', el).hidden = st.src !== 'text'; $('#aiUrlBox', el).hidden = st.src !== 'url'; });
  $('#aiText', el).addEventListener('input', e => { st.text = e.target.value; });
  $('#aiUrl', el).addEventListener('input', e => { st.url = e.target.value; });
  $('#aiLevel', el).addEventListener('change', e => { st.level = e.target.value; });
  $('#aiMax', el).addEventListener('change', e => { st.max = +e.target.value; });

  let timer = null;
  const status = (msg, err) => { const s = $('#aiStatus', el); if (!s) return; s.textContent = msg; s.style.color = err ? 'var(--danger)' : ''; };
  // Trong lúc chờ AI: hiện số giây đã trôi qua để người dùng biết vẫn đang chạy (model pro có thể mất 1–3 phút)
  const waiting = msg => { clearInterval(timer); const t0 = Date.now(); const tick = () => status(`${msg} (${Math.round((Date.now() - t0) / 1000)}s · model ${AI.model} · tối đa ${AI_TIMEOUT / 60000} phút)`); tick(); timer = setInterval(tick, 1000); };
  const stopWaiting = () => { clearInterval(timer); timer = null; };
  $('#aiRun', el).addEventListener('click', async e => {
    const btn = e.currentTarget;
    if ($('#aiKey', el).value.trim() !== AI.ownKey) { AI.key = $('#aiKey', el).value; AI.model = $('#aiModel', el).value; }
    btn.disabled = true; btn.textContent = '⏳ Đang phân tích...';
    try {
      let text = st.text;
      if (st.src === 'url') { if (!st.url.trim()) throw new Error('Hãy nhập link bài báo'); status('Đang tải nội dung trang...'); text = await AI.fetchUrl(st.url); }
      waiting('⏳ AI đang phân tích...');
      st.result = await AI.extract({ text, level: st.level, max: st.max });
      stopWaiting();
      st.picked = new Set(st.result.words.map((_, i) => i));
      status(`✔ AI tìm được ${st.result.words.length} từ.`);
      drawResult();
    } catch (err) { stopWaiting(); status('⚠️ ' + err.message, true); }
    finally { btn.disabled = false; btn.textContent = '✨ Phân tích'; }
  });

  function drawResult() {
    const r = st.result, box = $('#aiResult', el); if (!r) { box.innerHTML = ''; return; }
    const topics = Store.topics();
    box.innerHTML = `
      <div class="card">
        <div class="row between mb"><h3 style="margin:0">📋 Kết quả (${r.words.length} từ)</h3><label class="check"><input type="checkbox" id="aiAll" ${st.picked.size === r.words.length ? 'checked' : ''}> Chọn tất cả (<span id="aiN">${st.picked.size}</span>)</label></div>
        <div class="table-wrap"><table style="min-width:640px"><thead><tr><th style="width:36px"></th><th>Từ</th><th>Phiên âm</th><th>Nghĩa (theo ngữ cảnh)</th><th>Ví dụ trong bài</th><th>Mức</th></tr></thead>
          <tbody>${r.words.map((w, i) => `<tr data-i="${i}" class="${st.picked.has(i) ? 'selected' : ''}">
            <td><input type="checkbox" class="sel" ${st.picked.has(i) ? 'checked' : ''}></td>
            <td><b>${esc(w.word)}</b>${w.pos ? ` <span class="pos">${esc(w.pos)}</span>` : ''}</td>
            <td class="ipa">${esc(w.phonetic)}</td>
            <td>${esc(w.meaning)}${w.note ? `<div class="small muted">${esc(w.note)}</div>` : ''}</td>
            <td><div class="ex">${esc(w.example)}</div>${w.exampleVi ? `<div class="small muted">${esc(w.exampleVi)}</div>` : ''}</td>
            <td><span class="chip">${esc(w.cefr) || '–'}</span></td>
          </tr>`).join('')}</tbody></table></div>
        <div class="ai-create mt">
          <div class="seg" id="aiDest"><button class="active" data-dest="new">＋ Tạo chủ đề mới</button><button data-dest="existing" ${topics.length ? '' : 'disabled'}>📂 Thêm vào chủ đề có sẵn</button></div>
          <div class="row mt" id="aiNewBox">
            <select class="input" id="aiIcon" style="width:auto;font-size:1.2rem">${['📰', ...EMOJIS].map(e => `<option value="${e}">${e}</option>`).join('')}</select>
            <input class="input" id="aiName" placeholder="Tên chủ đề" value="${esc(r.title || 'AI vocabulary')}" style="max-width:320px">
          </div>
          <div class="row mt" id="aiExistBox" hidden><select class="input" id="aiTopic" style="max-width:320px">${topics.map(t => `<option value="${t.id}">${t.icon} ${esc(t.name)} (${Store.wordsOf(t.id).length} từ)</option>`).join('')}</select></div>
          <div class="row mt">
            <label class="check"><input type="checkbox" id="aiAudio" checked> Tra thêm audio người thật từ từ điển (cần internet, hơi lâu)</label>
            <button class="btn btn-success btn-lg" id="aiCreate" style="margin-left:auto">✔ Lưu <span id="aiN2">${st.picked.size}</span> từ</button>
          </div>
        </div>
      </div>`;
    const syncN = () => { $('#aiN', box).textContent = st.picked.size; $('#aiN2', box).textContent = st.picked.size; $('#aiAll', box).checked = st.picked.size === r.words.length; };
    $('#aiAll', box).addEventListener('change', e => { st.picked = new Set(e.target.checked ? r.words.map((_, i) => i) : []); $$('tbody tr', box).forEach(tr => { $('input.sel', tr).checked = e.target.checked; tr.classList.toggle('selected', e.target.checked); }); syncN(); });
    $('tbody', box).addEventListener('change', e => { if (!e.target.classList.contains('sel')) return; const tr = e.target.closest('tr'), i = +tr.dataset.i; e.target.checked ? st.picked.add(i) : st.picked.delete(i); tr.classList.toggle('selected', e.target.checked); syncN(); });
    let dest = 'new';
    $('#aiDest', box).addEventListener('click', e => { const b = e.target.closest('[data-dest]'); if (!b || b.disabled) return; dest = b.dataset.dest; $$('[data-dest]', box).forEach(x => x.classList.toggle('active', x === b)); $('#aiNewBox', box).hidden = dest !== 'new'; $('#aiExistBox', box).hidden = dest !== 'existing'; });
    $('#aiCreate', box).addEventListener('click', async e => {
      const items = r.words.filter((_, i) => st.picked.has(i));
      if (!items.length) { toast('Hãy chọn ít nhất 1 từ'); return; }
      const btn = e.currentTarget; btn.disabled = true;
      if ($('#aiAudio', box).checked) {
        let i = 0;
        for (const it of items) { i++; btn.textContent = `⏳ Tra audio ${i}/${items.length}...`; try { const d = await lookupWord(it.word); if (d.audio) it.audio = d.audio; if (!it.phonetic && d.phonetic) it.phonetic = d.phonetic; } catch { /* bỏ qua */ } }
      }
      let topicId;
      if (dest === 'new') {
        const name = $('#aiName', box).value.trim() || 'AI vocabulary';
        topicId = Store.addTopic({ name, icon: $('#aiIcon', box).value, desc: `Trích xuất bằng AI · ${st.src === 'url' ? st.url.slice(0, 80) : 'từ đoạn văn'}` }).id;
      } else topicId = $('#aiTopic', box).value;
      items.forEach(w => Store.addWord(topicId, { ...w, pos: POS_LIST.includes(w.pos) ? w.pos : (isPhrase(w.word) ? 'phrase' : ''), note: [w.cefr ? `CEFR ${w.cefr}` : '', w.note ? 'EN: ' + w.note : ''].filter(Boolean).join(' · ') }));
      renderSidebar();
      toast(`Đã lưu ${items.length} từ`);
      st.result = null; st.picked = new Set();
      go('/topic/' + topicId);
    });
  }
  if (st.result) drawResult();
}
