-- Thu hộ: nội dung chuyển khoản tự đặt (phần chữ; tháng/năm app tự gắn thêm)
alter table public.subscriptions
  add column if not exists transfer_note text;
