-- Dữ liệu mẫu giống ảnh thiết kế.
-- Chạy trong Supabase SQL Editor SAU KHI đã đăng nhập app ít nhất 1 lần.
-- Thay email bên dưới bằng email của bạn.
with me as (select id from auth.users where email = 'you@example.com')
insert into public.subscriptions (user_id, name, preset_id, category, price, cycle_count, cycle_unit, start_date, created_at)
select me.id, v.name, v.preset_id, v.category, v.price, v.cycle_count, v.cycle_unit, v.start_date::date, now() - interval '60 days'
from me, (values
  ('ChatGPT Plus',    'chatgpt-plus', 'work',          480000, 1, 'month', '2026-09-01'),
  ('Canva Pro',       'canva-pro',    'work',          280000, 1, 'month', '2026-09-12'),
  ('Spotify Premium', 'spotify',      'entertainment', 165000, 3, 'month', '2026-08-10')
) as v(name, preset_id, category, price, cycle_count, cycle_unit, start_date);
