import { esc, shuffle, fmtDue } from '../utils.js?v=11';
import { Store } from '../store.js?v=11';
import { setTitle } from '../shell.js?v=11';
import { runFlashSession } from './flashcards.js?v=11';

/* Ôn tập các từ đến hạn (Spaced Repetition) */
export function viewReview(el) {
  setTitle('Ôn tập hôm nay');
  const due = Store.dueWords();
  const learned = Store.words().filter(w => w.lastReview).length;
  if (!due.length) {
    const upcoming = Store.words().filter(w => w.lastReview && w.nextReview > Date.now()).sort((a, b) => a.nextReview - b.nextReview).slice(0, 6);
    el.innerHTML = `
      <div class="page-head"><div><h1>⏰ Ôn tập hôm nay</h1><p class="muted">Các từ đến hạn ôn lại theo phương pháp lặp lại ngắt quãng (Spaced Repetition).</p></div></div>
      <div class="card empty-state">
        <div class="big">✅</div>
        <h2>Không có từ nào cần ôn!</h2>
        <p class="muted">${learned ? 'Bạn đã ôn hết các từ đến hạn. Quay lại vào ngày mai nhé.' : 'Hãy học các chủ đề bằng Flashcard trước – những từ bạn đã đánh giá sẽ xuất hiện ở đây khi đến hạn ôn.'}</p>
        <a class="btn btn-primary" href="#/">Về trang chủ</a>
      </div>
      ${upcoming.length ? `<div class="card mt"><h3>Sắp đến hạn</h3><ul class="plain-list">${upcoming.map(w => `<li><div class="info"><b>${esc(w.word)}</b> <span class="ipa">${esc(w.phonetic)}</span> – ${esc(w.meaning)}</div><span class="muted small">${fmtDue(w.nextReview)}</span></li>`).join('')}</ul></div>` : ''}
      <p class="muted small mt">Tổng: ${Store.words().length} từ · đã học ${learned} từ.</p>`;
    return;
  }
  runFlashSession(el, {
    title: `Ôn tập (${due.length} từ)`,
    backLink: '#/',
    words: shuffle(due),
    requeueForgotten: true, // từ quên sẽ quay lại cuối hàng đợi trong cùng phiên
  });
}
