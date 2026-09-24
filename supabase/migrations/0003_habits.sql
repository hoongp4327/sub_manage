-- Module 2: Thói quen
create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  color       text not null,
  icon        text not null,
  goal        text,
  reason      text,
  status      text not null default 'active' check (status in ('active', 'archived')),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists habits_user_idx on public.habits (user_id, status);

-- Mỗi thói quen × mỗi ngày tối đa 1 dòng. Chưa làm = không có dòng.
create table if not exists public.habit_logs (
  habit_id   uuid not null references public.habits (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null,
  level      smallint not null check (level between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (habit_id, date)
);

create index if not exists habit_logs_user_idx on public.habit_logs (user_id, date);

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

drop policy if exists "own rows" on public.habits;
create policy "own rows" on public.habits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own rows" on public.habit_logs;
create policy "own rows" on public.habit_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
