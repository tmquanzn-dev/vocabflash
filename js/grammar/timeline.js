/**
 * Trục thời gian minh hoạ cho từng thì (SVG thuần, theo màu token nên hợp cả sáng / tối).
 * Vị trí tính theo % trên trục: 0 = quá khứ xa, 50 = bây giờ, 100 = tương lai xa.
 *   dot   { at, label }            – một hành động / mốc xảy ra tại một thời điểm
 *   span  { from, to, label, dashed, ongoing } – hành động kéo dài; dashed = nhấn mạnh quá trình; ongoing = còn tiếp diễn (mũi tên)
 *   dots  { at: [..], label }      – lặp lại nhiều lần (thói quen)
 *   arrow { from, to, label }      – hướng tới một mốc (kế hoạch, "by then")
 */
const T = {
  ps:   [{ type: 'dots', at: [14, 26, 38, 50, 62, 74, 86], label: 'lặp đi lặp lại, luôn đúng' }],
  pc:   [{ type: 'span', from: 42, to: 58, label: 'đang diễn ra lúc này', ongoing: true }],
  pp:   [{ type: 'span', from: 18, to: 50, label: 'bắt đầu trong quá khứ → còn liên hệ tới bây giờ' }, { type: 'dot', at: 50, label: 'kết quả' }],
  ppc:  [{ type: 'span', from: 18, to: 50, label: 'kéo dài liên tục đến bây giờ (nhấn mạnh quá trình)', dashed: true, ongoing: true }],
  pas:  [{ type: 'dot', at: 25, label: 'đã xảy ra & kết thúc (yesterday, in 2010…)' }],
  pac:  [{ type: 'span', from: 14, to: 36, label: 'đang diễn ra trong quá khứ…' }, { type: 'dot', at: 25, label: '…thì việc khác xen vào' }],
  pap:  [{ type: 'dot', at: 12, label: 'xảy ra TRƯỚC' }, { type: 'dot', at: 34, label: 'mốc trong quá khứ' }],
  papc: [{ type: 'span', from: 6, to: 30, label: 'kéo dài liên tục…', dashed: true }, { type: 'dot', at: 34, label: '…tới mốc trong quá khứ' }],
  fs:   [{ type: 'dot', at: 75, label: 'sẽ xảy ra (quyết định / dự đoán lúc nói)' }],
  fc:   [{ type: 'span', from: 64, to: 86, label: 'sẽ đang diễn ra tại một thời điểm tương lai' }, { type: 'dot', at: 75, label: 'at 8 pm tomorrow' }],
  fp:   [{ type: 'span', from: 50, to: 76, label: 'sẽ hoàn thành TRƯỚC mốc' }, { type: 'dot', at: 78, label: 'by 2030 / by the time…' }],
  fpc:  [{ type: 'span', from: 50, to: 76, label: 'sẽ kéo dài được X thời gian tính tới mốc', dashed: true }, { type: 'dot', at: 78, label: 'by next year' }],
  nf:   [{ type: 'arrow', from: 50, to: 76, label: 'đã có kế hoạch / dấu hiệu từ bây giờ' }, { type: 'dot', at: 78, label: 'sắp xảy ra' }],
};

const W = 640, H = 150, X0 = 36, X1 = 604, Y = 88;
const px = p => X0 + (X1 - X0) * p / 100;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function timelineSVG(tenseId) {
  const items = T[tenseId]; if (!items) return '';
  let body = '';
  items.forEach((it, i) => {
    const ly = 40 - (i % 2) * 22; // nhãn xen kẽ 2 tầng cho khỏi đè nhau
    if (it.type === 'dots') {
      body += it.at.map(a => `<circle cx="${px(a)}" cy="${Y}" r="7" class="tl-dot"/>`).join('');
      body += `<text x="${px(50)}" y="${ly}" class="tl-label" text-anchor="middle">${esc(it.label)}</text>`;
    } else if (it.type === 'dot') {
      body += `<circle cx="${px(it.at)}" cy="${Y}" r="8" class="tl-dot"/><line x1="${px(it.at)}" y1="${Y - 12}" x2="${px(it.at)}" y2="${ly + 6}" class="tl-lead"/><text x="${px(it.at)}" y="${ly}" class="tl-label" text-anchor="${it.at > 80 ? 'end' : it.at < 20 ? 'start' : 'middle'}">${esc(it.label)}</text>`;
    } else if (it.type === 'span') {
      const x1 = px(it.from), x2 = px(it.to), mid = (x1 + x2) / 2;
      body += `<rect x="${x1}" y="${Y - 11}" width="${x2 - x1}" height="22" rx="11" class="tl-span ${it.dashed ? 'dashed' : ''}"/>`;
      if (it.ongoing) body += `<path d="M${x2 - 2} ${Y - 11} l14 11 l-14 11 z" class="tl-span-arrow"/>`;
      body += `<line x1="${mid}" y1="${Y - 14}" x2="${mid}" y2="${ly + 6}" class="tl-lead"/><text x="${mid}" y="${ly}" class="tl-label" text-anchor="middle">${esc(it.label)}</text>`;
    } else if (it.type === 'arrow') {
      const x1 = px(it.from), x2 = px(it.to), mid = (x1 + x2) / 2;
      body += `<line x1="${x1}" y1="${Y}" x2="${x2 - 4}" y2="${Y}" class="tl-arrow"/><path d="M${x2 - 12} ${Y - 8} l12 8 l-12 8 z" class="tl-arrow-head"/>`;
      body += `<line x1="${mid}" y1="${Y - 12}" x2="${mid}" y2="${ly + 6}" class="tl-lead"/><text x="${mid}" y="${ly}" class="tl-label" text-anchor="middle">${esc(it.label)}</text>`;
    }
  });
  return `<svg class="tl" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trục thời gian">
    <line x1="${X0 - 20}" y1="${Y}" x2="${X1 + 20}" y2="${Y}" class="tl-axis"/>
    <path d="M${X1 + 20} ${Y - 7} l14 7 l-14 7 z" class="tl-axis-head"/>
    <line x1="${px(50)}" y1="${Y - 30}" x2="${px(50)}" y2="${Y + 30}" class="tl-now"/>
    <text x="${px(50)}" y="${Y + 48}" class="tl-zone now" text-anchor="middle">BÂY GIỜ</text>
    <text x="${px(18)}" y="${Y + 48}" class="tl-zone" text-anchor="middle">◀ QUÁ KHỨ</text>
    <text x="${px(82)}" y="${Y + 48}" class="tl-zone" text-anchor="middle">TƯƠNG LAI ▶</text>
    ${body}
  </svg>`;
}
