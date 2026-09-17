import { $, $$, esc } from './utils.js';

export function openModal(html, onOpen) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  const bd = $('.modal-backdrop', root);
  bd.addEventListener('mousedown', e => { if (e.target === bd) closeModal(); });
  $$('[data-close]', root).forEach(b => b.addEventListener('click', closeModal));
  const first = $('input, textarea, select', root);
  if (first) setTimeout(() => first.focus(), 50);
  if (onOpen) onOpen(root);
  return root;
}

export function closeModal() { $('#modalRoot').innerHTML = ''; }
export const isModalOpen = () => $('#modalRoot').children.length > 0;

export function confirmModal(title, text, okLabel = 'Xoá', okClass = 'btn-danger') {
  return new Promise(resolve => {
    openModal(`
      <h2>${esc(title)}</h2>
      <p class="muted">${esc(text)}</p>
      <div class="modal-actions">
        <button class="btn" data-close>Huỷ</button>
        <button class="btn ${okClass}" id="mOk">${esc(okLabel)}</button>
      </div>`, root => {
      $('#mOk', root).addEventListener('click', () => { closeModal(); resolve(true); });
      $$('[data-close]', root).forEach(b => b.addEventListener('click', () => resolve(false)));
    });
  });
}
