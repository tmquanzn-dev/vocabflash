import { $, toast } from './utils.js?v=9';
import { Auth } from './auth.js?v=9';
import { Store } from './store.js?v=9';

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
    try {
      this._channel = Auth.sb.channel('inbox_' + this.user())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inbox_words', filter: `user_id=eq.${this.user()}` }, payload => {
          if (payload.eventType === 'INSERT' && payload.new) { if (!this.items.some(x => x.id === payload.new.id)) { this.items.push(payload.new); toast(`📥 Nhận từ mới từ extension: "${payload.new.word}"`, 3500); } }
          else if (payload.eventType === 'DELETE' && payload.old) this.items = this.items.filter(x => x.id !== payload.old.id);
          this._emit();
        }).subscribe();
    } catch (e) { console.warn('Realtime inbox không khả dụng', e); }
  },
  user() { return Auth.user?.id; },
  close() {
    if (this._channel) { try { Auth.sb.removeChannel(this._channel); } catch { /* ignore */ } this._channel = null; }
    this.items = []; this.renderBadge();
  },
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
