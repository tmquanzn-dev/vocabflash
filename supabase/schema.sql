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
