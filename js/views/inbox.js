import { $, $$, esc, toast, isPhrase, POS_LIST } from '../utils.js?v=12';
import { Store } from '../store.js?v=12';
import { Auth } from '../auth.js?v=12';
import { setTitle, renderSidebar } from '../shell.js?v=12';
import { confirmModal } from '../modal.js?v=12';
import { Inbox } from '../inbox.js?v=12';
import { AI } from '../ai.js?v=12';
import { lookupWord } from '../dictionary.js?v=12';
import { go } from '../router.js?v=12';

const INBOX_TOPIC = '📥 Từ extension';
// Bản nháp nghĩa/phiên âm đã điền cho từng dòng inbox (giữ khi vẽ lại)
const drafts = {};
let curEl = null; // phần tử đang hiển thị (để listener realtime vẽ lại đúng màn hình)

/* Hộp thư từ: từ do extension Chrome gửi → điền nghĩa → thêm vào chủ đề */
export function viewInbox(el) {
  setTitle('Hộp thư từ');
  const head = `<div class="page-head"><div><h1>📥 Hộp thư từ</h1><p class="muted">Từ bạn bôi đen trên trang web rồi chọn <b>"Thêm vào VocabFlash"</b> bằng extension Chrome sẽ về đây. Điền nghĩa (hoặc để AI điền) rồi thêm vào chủ đề.</p></div><a class="btn btn-sm" href="#/settings">🧩 Cài extension</a></div>`;
  if (!Inbox.available) { el.innerHTML = head + `<div class="card empty-state"><div class="big">📥</div>${Auth.user?.guest ? 'Bạn đang dùng chế độ khách – <a href="#/register" style="color:var(--primary)">tạo tài khoản</a> để dùng extension.' : 'Cần kết nối Supabase (chế độ cloud).'}</div>`; return; }

  const draw = () => {
    const items = Inbox.items;
    const topics = Store.topics();
    const inboxTopic = topics.find(t => t.name === INBOX_TOPIC);
    el.innerHTML = head + (!items.length ? `<div class="card empty-state"><div class="big">📭</div>Chưa có từ nào. Cài extension (xem hướng dẫn trong Cài đặt), bôi đen từ trên bất kỳ trang web nào → chuột phải → <b>Thêm vào VocabFlash</b>.</div>` : `
      <div class="card">
        <div class="row between mb">
          <h3 style="margin:0">${items.length} từ đang chờ</h3>
          <div class="row"><button class="btn btn-sm" data-act="ai" title="Dùng Gemini điền phiên âm, loại từ, nghĩa theo ngữ cảnh">✨ AI điền nghĩa tất cả</button><button class="btn btn-sm" data-act="dict" title="Tra từ điển lấy phiên âm & audio">🔎 Tra từ điển</button></div>
        </div>
        <div class="table-wrap"><table style="min-width:720px"><thead><tr><th style="width:36px"><input type="checkbox" id="ibAll" checked></th><th>Từ</th><th>Phiên âm</th><th>Nghĩa tiếng Việt *</th><th>Ngữ cảnh</th><th style="width:40px"></th></tr></thead>
          <tbody>${items.map(it => { const d = drafts[it.id] || (drafts[it.id] = { word: it.word, phonetic: it.phonetic || '', pos: it.pos || '', meaning: it.meaning || '', exampleVi: it.example_vi || '', note: it.note || '', audio: '' }); return `<tr data-id="${it.id}">
            <td><input type="checkbox" class="sel" checked></td>
            <td><input class="input ib-word" value="${esc(d.word)}" style="min-width:140px">${d.pos ? `<div class="small muted">${esc(d.pos)}</div>` : ''}</td>
            <td><input class="input ib-phon ipa" value="${esc(d.phonetic)}" placeholder="/…/" style="min-width:120px">${d.audio ? '<div class="small muted">🎧 có audio</div>' : ''}</td>
            <td><input class="input ib-mean" value="${esc(d.meaning)}" placeholder="Nhập nghĩa hoặc bấm ✨ AI" style="min-width:180px">${d.note ? `<div class="small muted">${esc(d.note)}</div>` : ''}</td>
            <td class="small">${it.context ? `<div class="ex">${esc(it.context)}</div>` : ''}${d.exampleVi ? `<div class="muted">${esc(d.exampleVi)}</div>` : ''}${it.source_url ? `<a class="muted" href="${esc(it.source_url)}" target="_blank" rel="noopener" title="${esc(it.source_title)}">🔗 ${esc((it.source_title || it.source_url).slice(0, 40))}</a>` : ''}<div class="muted">${new Date(it.created_at).toLocaleString('vi-VN')}</div></td>
            <td><button class="btn-icon sm" data-act="del" title="Bỏ từ này">🗑️</button></td>
          </tr>`; }).join('')}</tbody></table></div>
        <div class="ai-create mt row">
          <label>Thêm vào chủ đề:</label>
          <select class="input" id="ibTopic" style="max-width:300px">
            <option value="__inbox__">${inboxTopic ? `${INBOX_TOPIC} (${Store.wordsOf(inboxTopic.id).length} từ)` : `＋ Tạo chủ đề "${INBOX_TOPIC}"`}</option>
            ${topics.filter(t => t !== inboxTopic).map(t => `<option value="${t.id}">${t.icon} ${esc(t.name)} (${Store.wordsOf(t.id).length} từ)</option>`).join('')}
          </select>
          <button class="btn btn-success btn-lg" data-act="add" style="margin-left:auto">✔ Thêm các từ đã chọn</button>
          <button class="btn btn-danger btn-sm" data-act="clear">Xoá hết hộp thư</button>
        </div>
      </div>`);
    bind();
  };

  const rows = () => $$('tbody tr', el).map(tr => ({ tr, id: +tr.dataset.id, item: Inbox.items.find(x => x.id === +tr.dataset.id), sel: $('input.sel', tr).checked }));
  const syncDraft = tr => { const d = drafts[+tr.dataset.id]; d.word = $('.ib-word', tr).value; d.phonetic = $('.ib-phon', tr).value; d.meaning = $('.ib-mean', tr).value; };

  function bind() {
    $('#ibAll', el)?.addEventListener('change', e => $$('tbody input.sel', el).forEach(c => { c.checked = e.target.checked; }));
    el.onclick = async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const a = b.dataset.act;
      $$('tbody tr', el).forEach(syncDraft);
      if (a === 'del') { const id = +b.closest('tr').dataset.id; try { await Inbox.remove([id]); delete drafts[id]; draw(); } catch (err) { toast('Lỗi: ' + err.message); } }
      else if (a === 'clear') { if (await confirmModal('Xoá hết hộp thư?', `${Inbox.items.length} từ đang chờ sẽ bị bỏ (không thêm vào chủ đề).`, 'Xoá hết')) { try { await Inbox.remove(Inbox.items.map(x => x.id)); draw(); } catch (err) { toast('Lỗi: ' + err.message); } } }
      else if (a === 'ai') {
        const list = rows().filter(r => r.sel); if (!list.length) { toast('Chưa chọn từ nào'); return; }
        b.disabled = true; b.textContent = '⏳ AI đang điền...';
        try {
          const out = await AI.defineWords(list.map(r => ({ word: drafts[r.id].word, context: r.item.context })));
          out.forEach((w, i) => { const d = drafts[list[i].id]; d.word = w.word || d.word; if (w.phonetic) d.phonetic = w.phonetic; d.pos = w.pos || d.pos; if (w.meaning) d.meaning = w.meaning; d.exampleVi = w.exampleVi || d.exampleVi; d.note = w.note || d.note; });
          toast(`AI đã điền ${out.length} từ`); draw();
        } catch (err) { toast('Lỗi AI: ' + err.message, 5000); b.disabled = false; b.textContent = '✨ AI điền nghĩa tất cả'; }
      }
      else if (a === 'dict') {
        const list = rows().filter(r => r.sel); if (!list.length) { toast('Chưa chọn từ nào'); return; }
        b.disabled = true; let i = 0;
        for (const r of list) { i++; b.textContent = `⏳ Tra ${i}/${list.length}...`; const d = drafts[r.id]; try { const x = await lookupWord(d.word); if (x.phonetic) d.phonetic = x.phonetic; if (x.audio) d.audio = x.audio; if (!d.pos && x.pos) d.pos = x.pos; if (!d.note && x.definition) d.note = 'EN: ' + x.definition; } catch { /* bỏ qua */ } }
        toast('Đã tra xong'); draw();
      }
      else if (a === 'add') {
        const list = rows().filter(r => r.sel); if (!list.length) { toast('Chưa chọn từ nào'); return; }
        const missing = list.filter(r => !drafts[r.id].meaning.trim());
        if (missing.length) { toast(`${missing.length} từ chưa có nghĩa – hãy điền hoặc bấm ✨ AI`, 4000); $('.ib-mean', missing[0].tr).focus(); return; }
        let topicId = $('#ibTopic', el).value;
        if (topicId === '__inbox__') { const t = Store.topics().find(x => x.name === INBOX_TOPIC) || Store.addTopic({ name: INBOX_TOPIC, icon: '📥', desc: 'Từ gửi từ extension Chrome' }); topicId = t.id; }
        list.forEach(r => { const d = drafts[r.id]; const word = d.word.trim().replace(/\s+/g, ' '); Store.addWord(topicId, { word, phonetic: d.phonetic, pos: POS_LIST.includes(d.pos) ? d.pos : (isPhrase(word) ? 'phrase' : ''), meaning: d.meaning, example: (r.item.context || '').slice(0, 300), exampleVi: d.exampleVi, note: d.note, audio: d.audio }); });
        try { await Inbox.remove(list.map(r => r.id)); } catch (err) { toast('Đã thêm từ nhưng chưa xoá được khỏi hộp thư: ' + err.message); }
        list.forEach(r => delete drafts[r.id]);
        renderSidebar(); toast(`Đã thêm ${list.length} từ vào chủ đề`);
        if (!Inbox.items.length) go('/topic/' + topicId); else draw();
      }
    };
  }
  const first = !curEl; curEl = el;
  draw();
  if (first) Inbox.onChange(() => {
    // Nghĩa do extension dịch xong tới sau → điền vào bản nháp còn trống
    Inbox.items.forEach(it => { const d = drafts[it.id]; if (d) { if (!d.meaning && it.meaning) d.meaning = it.meaning; if (!d.phonetic && it.phonetic) d.phonetic = it.phonetic; if (!d.pos && it.pos) d.pos = it.pos; if (!d.exampleVi && it.example_vi) d.exampleVi = it.example_vi; if (!d.note && it.note) d.note = it.note; if (it.word && d.word === it.word) d.word = it.word; } });
    if (location.hash === '#/inbox' && curEl?.isConnected) viewInbox(curEl);
  });
}
