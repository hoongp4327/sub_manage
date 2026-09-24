-- Thu hộ: gói trả giúp người khác, không tính vào tổng của mình
alter table public.subscriptions
  add column if not exists is_collect boolean not null default false,
  add column if not exists payer text;
