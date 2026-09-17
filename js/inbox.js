import { $, toast } from './utils.js?v=12';
import { Auth } from './auth.js?v=12';
import { Store } from './store.js?v=12';

/**
 * Hộp thư từ: các từ do extension Chrome gửi lên bảng public.inbox_words.
 * Web tải về, hiện badge ở sidebar; người dùng điền nghĩa rồi thêm vào chủ đề, dòng inbox được xoá.
 */
export const Inbox = {
  items: [],
  _channel: null,
  _listeners: [],
  get available() { return Store.cloud; },
  onChange(cb) { this._listeners.push(cb); },
  _emit() { this.renderBadge(); this._listeners.forEach(cb => cb(this.items)); },

  async init() {
    this.close();
    if (!this.available) return;
    await this.load();
  },
  // Sự kiện realtime (đi qua kênh chung của Store): thêm / cập nhật nghĩa (extension dịch xong) / xoá
  _onRealtime(payload) {
    if (!this.available) return;
    if (payload.eventType === 'INSERT' && payload.new) { if (!this.items.some(x => x.id === payload.new.id)) { this.items.push(payload.new); toast(`📥 Nhận từ mới từ extension: "${payload.new.word}"`, 3500); } }
    else if (payload.eventType === 'UPDATE' && payload.new) { const i = this.items.findIndex(x => x.id === payload.new.id); if (i >= 0) this.items[i] = { ...this.items[i], ...payload.new }; else this.items.push(payload.new); }
    else if (payload.eventType === 'DELETE' && payload.old) this.items = this.items.filter(x => x.id !== payload.old.id);
    this._emit();
  },
  user() { return Auth.user?.id; },
  close() { this.items = []; this.renderBadge(); },
  async load() {
    if (!this.available) return [];
    try {
      const { data, error } = await Auth.sb.from('inbox_words').select('*').eq('user_id', this.user()).order('created_at', { ascending: true });
      if (error) throw error;
      this.items = data || [];
    } catch (e) { console.warn('Không tải được hộp thư từ', e.message || e); }
    this._emit();
    return this.items;
  },
  async remove(ids) {
    if (!ids.length) return;
    const { error } = await Auth.sb.from('inbox_words').delete().in('id', ids);
    if (error) throw new Error(error.message);
    this.items = this.items.filter(x => !ids.includes(x.id));
    this._emit();
  },
  renderBadge() { const b = $('#inboxBadge'); if (b) b.textContent = this.items.length || ''; },
};
Store.onInbox(p => Inbox._onRealtime(p));
