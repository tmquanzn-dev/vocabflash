-- VocabFlash – chạy file này trong Supabase Dashboard → SQL Editor
-- Mỗi người dùng có 1 dòng chứa toàn bộ dữ liệu học (chủ đề, từ vựng, tiến độ, cài đặt) dạng JSON.

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Bật Row Level Security: người dùng chỉ đọc/ghi được dòng của chính mình
alter table public.user_data enable row level security;

drop policy if exists "user_data select own" on public.user_data;
drop policy if exists "user_data insert own" on public.user_data;
drop policy if exists "user_data update own" on public.user_data;
drop policy if exists "user_data delete own" on public.user_data;

create policy "user_data select own" on public.user_data for select using (auth.uid() = user_id);
create policy "user_data insert own" on public.user_data for insert with check (auth.uid() = user_id);
create policy "user_data update own" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_data delete own" on public.user_data for delete using (auth.uid() = user_id);

-- Bật Realtime cho bảng để cùng một tài khoản mở trên nhiều thiết bị được đồng bộ tức thì
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_data') then
    alter publication supabase_realtime add table public.user_data;
  end if;
end $$;

-- ===== Bảng xếp hạng: mỗi người dùng 1 dòng, ai đăng nhập cũng đọc được, chỉ sửa được dòng của mình =====
create table if not exists public.leaderboard (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null default 'Người dùng',
  avatar        text default '',
  day_key       text,
  day_reviews   integer not null default 0,
  week_key      text,
  week_reviews  integer not null default 0,
  total_reviews integer not null default 0,
  streak        integer not null default 0,
  mastered      integer not null default 0,
  updated_at    timestamptz not null default now()
);
create index if not exists leaderboard_day_idx   on public.leaderboard (day_key, day_reviews desc);
create index if not exists leaderboard_week_idx  on public.leaderboard (week_key, week_reviews desc);
create index if not exists leaderboard_total_idx on public.leaderboard (total_reviews desc);

alter table public.leaderboard enable row level security;
drop policy if exists "leaderboard read all" on public.leaderboard;
drop policy if exists "leaderboard insert own" on public.leaderboard;
drop policy if exists "leaderboard update own" on public.leaderboard;
drop policy if exists "leaderboard delete own" on public.leaderboard;
create policy "leaderboard read all"   on public.leaderboard for select to authenticated using (true);
create policy "leaderboard insert own" on public.leaderboard for insert to authenticated with check (auth.uid() = user_id);
create policy "leaderboard update own" on public.leaderboard for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "leaderboard delete own" on public.leaderboard for delete to authenticated using (auth.uid() = user_id);

-- ===== Chợ chủ đề: bộ từ công khai do người dùng chia sẻ. Ai đăng nhập cũng đọc được, chỉ chủ sở hữu sửa / xoá =====
create table if not exists public.public_topics (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  owner_name    text not null default 'Người dùng',
  owner_avatar  text default '',
  source_id     text not null,                 -- id chủ đề trong dữ liệu của chủ sở hữu (để cập nhật đúng bộ)
  name          text not null,
  icon          text default '📚',
  "desc"        text default '',
  words         jsonb not null default '[]'::jsonb,  -- [{word, phonetic, pos, meaning, example, exampleVi, note, audio}]
  word_count    integer not null default 0,
  clones        integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (owner_id, source_id)
);
create index if not exists public_topics_clones_idx  on public.public_topics (clones desc, updated_at desc);
create index if not exists public_topics_updated_idx on public.public_topics (updated_at desc);

alter table public.public_topics enable row level security;
drop policy if exists "public_topics read all"   on public.public_topics;
drop policy if exists "public_topics insert own" on public.public_topics;
drop policy if exists "public_topics update own" on public.public_topics;
drop policy if exists "public_topics delete own" on public.public_topics;
create policy "public_topics read all"   on public.public_topics for select to authenticated using (true);
create policy "public_topics insert own" on public.public_topics for insert to authenticated with check (auth.uid() = owner_id);
create policy "public_topics update own" on public.public_topics for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "public_topics delete own" on public.public_topics for delete to authenticated using (auth.uid() = owner_id);

-- Tăng số lượt clone của một bộ (người clone không có quyền sửa dòng của người khác → dùng hàm security definer)
create or replace function public.increment_clones(topic_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.public_topics set clones = clones + 1 where id = topic_id;
$$;
revoke all on function public.increment_clones(uuid) from public;
grant execute on function public.increment_clones(uuid) to authenticated;

-- ===== Hộp thư từ (inbox): extension Chrome gửi từ vào đây, web nhận về và thêm vào chủ đề =====
create table if not exists public.inbox_words (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  word         text not null,
  context      text default '',   -- câu chứa từ trên trang web
  source_url   text default '',
  source_title text default '',
  created_at   timestamptz not null default now()
);
create index if not exists inbox_words_user_idx on public.inbox_words (user_id, created_at);
alter table public.inbox_words enable row level security;
drop policy if exists "inbox select own" on public.inbox_words;
drop policy if exists "inbox insert own" on public.inbox_words;
drop policy if exists "inbox delete own" on public.inbox_words;
create policy "inbox select own" on public.inbox_words for select to authenticated using (auth.uid() = user_id);
create policy "inbox insert own" on public.inbox_words for insert to authenticated with check (auth.uid() = user_id);
create policy "inbox delete own" on public.inbox_words for delete to authenticated using (auth.uid() = user_id);
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inbox_words') then
    alter publication supabase_realtime add table public.inbox_words;
  end if;
end $$;

-- Extension dịch nghĩa sẵn (qua Edge Function gemini) và gửi kèm
alter table public.inbox_words add column if not exists meaning    text default '';
alter table public.inbox_words add column if not exists phonetic   text default '';
alter table public.inbox_words add column if not exists pos        text default '';
alter table public.inbox_words add column if not exists example_vi text default '';
alter table public.inbox_words add column if not exists note       text default '';
