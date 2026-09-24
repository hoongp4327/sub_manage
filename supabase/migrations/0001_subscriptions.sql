-- Module 1: Quản lý Subscription
create table if not exists public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (length(trim(name)) > 0),
  preset_id       text,
  category        text not null check (category in ('work', 'entertainment', 'other')),
  price           bigint not null check (price > 0),
  currency        text not null default 'VND',
  cycle_count     int not null default 1 check (cycle_count > 0),
  cycle_unit      text not null check (cycle_unit in ('day', 'week', 'month', 'year')),
  start_date      date not null,
  purchased_from  text,
  note            text,
  ends_at         date,
  status          text not null default 'active' check (status in ('active', 'archived')),
  archived_at     timestamptz,
  archive_reason  text check (archive_reason in ('deleted', 'cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id, status);

-- Row Level Security: mỗi người chỉ thấy dữ liệu của chính mình
alter table public.subscriptions enable row level security;

drop policy if exists "own rows" on public.subscriptions;
create policy "own rows" on public.subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
