import { Auth } from './auth.js?v=11';
import { Store } from './store.js?v=11';

/**
 * Chợ chủ đề (cộng đồng): bảng public.public_topics trên Supabase.
 * Ai đăng nhập cũng đọc được; mỗi người chỉ sửa / xoá bộ của mình. Xem supabase/schema.sql.
 */
const PUBLIC_FIELDS = ['word', 'phonetic', 'pos', 'meaning', 'example', 'exampleVi', 'note', 'audio'];
const COLS = 'id, owner_id, owner_name, owner_avatar, source_id, name, icon, desc, word_count, clones, created_at, updated_at';

export const Community = {
  get available() { return Store.cloud; },
  _need() { if (!this.available) throw new Error(Auth.user?.guest ? 'Hãy đăng nhập tài khoản để dùng Chợ chủ đề' : 'Chợ chủ đề cần kết nối Supabase (chế độ cloud)'); },

  /** Đăng (hoặc cập nhật) một chủ đề lên chợ. Trả về id công khai. */
  async publish(topic) {
    this._need();
    const words = Store.wordsOf(topic.id).map(w => Object.fromEntries(PUBLIC_FIELDS.map(k => [k, w[k] || ''])));
    if (!words.length) throw new Error('Chủ đề chưa có từ nào để chia sẻ');
    const row = {
      owner_id: Auth.user.id, owner_name: Auth.user.name, owner_avatar: Auth.user.avatar || '',
      source_id: topic.id, name: topic.name, icon: topic.icon, desc: topic.desc || '',
      words, word_count: words.length, updated_at: new Date().toISOString(),
    };
    if (topic.publicId) row.id = topic.publicId;
    const { data, error } = await Auth.sb.from('public_topics').upsert(row, { onConflict: 'owner_id,source_id' }).select('id').single();
    if (error) throw new Error(friendly(error));
    Store.updateTopic(topic.id, { publicId: data.id, publishedAt: Date.now() });
    return data.id;
  },

  async unpublish(topic) {
    this._need();
    if (topic.publicId) { const { error } = await Auth.sb.from('public_topics').delete().eq('id', topic.publicId); if (error) throw new Error(friendly(error)); }
    Store.updateTopic(topic.id, { publicId: '', publishedAt: 0 });
  },

  /** Danh sách trên chợ. q: từ khoá, sort: 'new' | 'top', mine: chỉ của tôi */
  async list({ q = '', sort = 'top', mine = false, limit = 40, offset = 0 } = {}) {
    this._need();
    let qr = Auth.sb.from('public_topics').select(COLS);
    if (mine) qr = qr.eq('owner_id', Auth.user.id);
    if (q.trim()) { const k = q.trim().replace(/[%,()]/g, ' '); qr = qr.or(`name.ilike.%${k}%,desc.ilike.%${k}%,owner_name.ilike.%${k}%`); }
    qr = sort === 'new' ? qr.order('updated_at', { ascending: false }) : qr.order('clones', { ascending: false }).order('updated_at', { ascending: false });
    const { data, error } = await qr.range(offset, offset + limit - 1);
    if (error) throw new Error(friendly(error));
    return data || [];
  },

  /** Xem trước danh sách từ của một bộ */
  async words(id) {
    this._need();
    const { data, error } = await Auth.sb.from('public_topics').select('words').eq('id', id).single();
    if (error) throw new Error(friendly(error));
    return data.words || [];
  },

  /** Clone bộ từ về tài khoản của mình → trả về chủ đề mới */
  async clone(row) {
    const words = await this.words(row.id);
    const t = Store.addTopic({ name: row.name, icon: row.icon, desc: row.desc || `Clone từ ${row.owner_name}` });
    Store.updateTopic(t.id, { clonedFrom: row.id });
    words.forEach(w => Store.addWord(t.id, w));
    // Tăng đếm clone (hàm SQL security definer – không cần quyền sửa dòng của người khác); lỗi thì bỏ qua
    try { await Auth.sb.rpc('increment_clones', { topic_id: row.id }); } catch { /* ignore */ }
    return t;
  },
};

function friendly(err) {
  const m = err?.message || String(err);
  if (/relation .*public_topics.* does not exist|schema cache/i.test(m)) return 'Chưa có bảng public_topics – hãy chạy lại supabase/schema.sql trong SQL Editor';
  if (/row-level security/i.test(m)) return 'Không có quyền – hãy chạy lại supabase/schema.sql để cập nhật policy';
  return m;
}
