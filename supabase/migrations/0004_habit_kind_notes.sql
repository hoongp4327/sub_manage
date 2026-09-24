-- Thói quen: cách ghi (mức % hoặc Có/Không) + ghi chú dài
alter table public.habits
  add column if not exists kind text not null default 'percent' check (kind in ('percent', 'binary')),
  add column if not exists notes text;
