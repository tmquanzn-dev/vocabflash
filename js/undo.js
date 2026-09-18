import { toast } from './utils.js?v=13';
import { Store } from './store.js?v=13';
import { render } from './router.js?v=13';

/** Toast sau khi xoá, kèm nút ↩ Hoàn tác (khôi phục lần xoá gần nhất rồi vẽ lại màn hình) */
export function deletedToast(msg) {
  toast(msg, 7000, {
    label: '↩ Hoàn tác',
    onClick() {
      const t = Store.undoDelete();
      if (!t) { toast('Không còn gì để hoàn tác'); return; }
      const n = t.topics.length ? `${t.topics.length} chủ đề` : `${t.words.length} từ`;
      toast(`Đã khôi phục ${n}`);
      render();
    },
  });
}
