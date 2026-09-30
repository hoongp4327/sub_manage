-- Thu hộ: kỳ sử dụng tự sửa cho 1 kỳ — { "due": "yyyy-mm-dd", "from": "yyyy-mm-dd", "to": "yyyy-mm-dd" }
alter table public.subscriptions
  add column if not exists period_override jsonb;
