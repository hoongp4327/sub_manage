# Quyết định khi triển khai

Những chỗ PRD chưa nói rõ và cách đã chọn (theo nguyên tắc "chọn cái đơn giản hơn").

1. **Hai chế độ lưu dữ liệu.** Không có `.env` → lưu trong trình duyệt (localStorage) để chạy thử ngay. Điền `VITE_SUPABASE_*` → dùng Supabase + đăng nhập Google. Cùng một giao diện `SubscriptionRepo`, không phải sửa code UI.
2. **Bỏ bảng `payment_logs` ở v1.** "% so với tháng trước" được tính từ `created_at` / `archived_at` (gói nào đang active vào cùng ngày tháng trước). Đủ chính xác cho 1 người dùng, ít dữ liệu phải đồng bộ hơn. Thêm lại khi cần thống kê lịch sử thanh toán.
3. **"Tự động gia hạn" không cần ghi gì.** Ngày gia hạn luôn được tính từ `start_date + k × chu kỳ`, nên qua ngày gia hạn là tự nhảy sang kỳ sau.
4. **Hủy gia hạn = lưu `ends_at`** (ngày gia hạn kế tiếp lúc bấm hủy) thay cho cờ `cancelAtPeriodEnd`. Khi app mở lên mà `ends_at ≤ hôm nay` → gói tự vào Lưu trữ với lý do "Đã hết hạn".
5. **Ngày gia hạn đúng hôm nay** hiển thị badge đỏ "Hôm nay" (chưa nhảy sang kỳ sau cho tới hết ngày).
6. **Giá quy đổi theo ngày/tuần** dùng 365/12 và 52/12 ngày/tuần mỗi tháng.
7. **Giá gợi ý của dịch vụ phổ biến** là giá tham khảo ở VN (9/2026), chỉ để điền sẵn — người dùng luôn sửa được. Nằm trong `src/modules/subscriptions/data/presets.ts`.
8. **Icon dịch vụ dùng emoji**, không dùng logo thương hiệu (tránh vấn đề bản quyền, không phải tải ảnh).
9. **Màu cam `#FF9500` trên chữ trắng** giữ đúng ảnh thiết kế dù độ tương phản dưới chuẩn WCAG AA; chữ cam trên nền sáng dùng `#E07B00` để dễ đọc hơn.
10. **Nút ⋯ trên thẻ**: điện thoại hiện ở dòng chi tiết (hàng trên quá chật ở 375px), máy tính hiện khi rê chuột.
11. **Nhắc gia hạn qua email** để sang giai đoạn 2 như PRD.

## Thu hộ (thêm 24/09/2026)

12. **Thu hộ là một cờ trên gói** (`is_collect` + `payer`), không phải bảng riêng — vẫn dùng chung form, Lưu trữ, gia hạn, hủy gia hạn.
13. **Không tính vào** Tổng tháng / Tổng năm / % so với tháng trước. **Vẫn tính vào** "Sắp hết hạn" vì cần nhớ ngày để đi thu tiền.
14. **Chạm vào gói thu hộ mở bill** (không mở form sửa); sửa qua nút "Sửa" trong bill hoặc menu ⋯.
15. **Bill** hiện số tiền thật của một kỳ (không làm tròn), kỳ sử dụng, hạn thanh toán, QR, và nội dung chuyển khoản gợi ý không dấu (vd `CHATGPT PLUS T9 2026`). Nút "Gửi bill" xuất ảnh PNG → mở bảng chia sẻ của điện thoại (Zalo, Messenger…), máy tính thì tải ảnh về.
16. **VietQR tự tạo trên máy** (`src/lib/vietqr.ts`, chuẩn NAPAS/EMVCo, có CRC-16 và test quét ngược). Mỗi bill có QR riêng chứa sẵn STK, số tiền, nội dung CK — không gọi dịch vụ ngoài, không tốn phí. Tài khoản nhận cấu hình trong `src/config/payment.ts`. Nội dung CK tối đa 25 ký tự không dấu (tương thích mọi ngân hàng), luôn giữ tháng/năm.

## Thói quen (thêm 24/09/2026) — xem [PRD-02](PRD-02-habits.md)

17. **Mức lưu dạng 1–5** (`level`), không lưu %. % = `level × 20`. Chưa làm = không có dòng log; xóa mức = xóa dòng.
18. **Mọi thói quen đều theo ngày**, không có lịch nghỉ hay lựa chọn "Nghỉ" — nghỉ = không hoạt động, ô xám.
19. **Không có chuỗi ngày / kỷ lục** — heatmap đã thể hiện độ đều đặn. Màn chi tiết chỉ có 2 chỉ số: Hoạt động và Trung bình, đi theo bộ lọc.
20. **Màu ô = trộn màu thói quen với trắng** (`color-mix`) theo 30 · 48 · 66 · 84 · 100% — trộn với trắng cho màu tươi, bậc 1 vẫn khác rõ ô xám.
21. **Thứ tự danh sách chỉ sắp lại khi vào màn**, không nhảy ngay khi vừa tick — tránh ngón tay bấm nhầm sang thẻ vừa trượt lên.
22. **Màn chi tiết không dùng popover**: chạm ô trên lịch = đổi ngày cho thanh ghi nhận dính đáy (có ‹ › và "Về hôm nay"). Ô nhỏ chạm lệch thì bấm mũi tên, không phải đóng/mở lại.
23. **Ghi bù tối đa 365 ngày**, ghi được cả trước ngày tạo (ngày bắt đầu của thói quen lùi theo log sớm nhất).
24. **30d ở màn chi tiết là lịch 7 cột (T2–CN)** với ô lớn có số ngày — dễ chạm hơn lưới 7 hàng kiểu GitHub. `All` mới dùng lưới 7 hàng cuộn ngang.
25. **Tick 100% không refetch** sau mỗi lần lưu (tránh nhấp nháy khi tick liên tục); dữ liệu làm mới khi quay lại tab.
26. **Xóa thói quen = xóa mềm** (`status = 'archived'`), có Hoàn tác; v1 chưa có màn Lưu trữ cho thói quen.
27. **Hai cách ghi** (`kind`): Mức độ 20–100% hoặc Có/Không. Có/Không vẫn lưu `level = 5` nên dùng chung bảng, công thức và heatmap. Đổi kiểu không sửa log cũ — khi hiển thị kiểu Có/Không, mọi log đều tính 100%.
28. **Ghi chú = 1 văn bản dài cho mỗi thói quen** (cột `notes`), không phải nhật ký theo ngày. Đặt trên cùng màn chi tiết vì dùng để tra cứu khi đang tập (giáo trình, danh sách). Chữ thuần, giữ xuống dòng, tối đa 5000 ký tự.

## Xuất / nhập dữ liệu (thêm 24/09/2026)

29. **Một file JSON cho toàn app** (`src/app/backup.ts`, `version: 1`), nút ở Trang chủ. Thêm module mới → thêm mảng mới vào `Backup`.
30. **Nhập = gộp (upsert theo id)**, không xóa dữ liệu đang có; nhập lại cùng file không nhân đôi. Log trỏ tới thói quen không có trong file bị bỏ qua (tránh lỗi khóa ngoại).
31. **Upsert dùng `defaultToNull: false`** để cột thiếu trong file (vd. `kind` của dữ liệu cũ) lấy giá trị mặc định của Postgres thay vì `null`.

## Mật mã vào app (thêm 24/09/2026)

32. **Màn mật mã 6 số chạy trước cả đăng nhập** (`src/app/PasscodeGate.tsx`). Chỉ là rào cản cho người lạ, không phải bảo mật: kiểm tra ở trình duyệt, ai đọc được code JS vẫn vượt qua được. Bảo vệ dữ liệu thật vẫn là Google login + RLS.
33. **Code chỉ giữ bản băm** (FNV-1a, `src/config/passcode.ts`), không dùng `crypto.subtle` để vẫn chạy khi mở qua `http://` trong mạng LAN. Máy đã mở khóa được nhớ trong localStorage; đổi mã → mọi máy phải nhập lại.
34. **Bỏ đăng nhập Google.** Chế độ Supabase dùng 1 tài khoản email/mật khẩu tạo sẵn trong dashboard (tắt đăng ký mới); màn mật mã gọi `signInWithPassword(VITE_ALLOWED_EMAIL, mã)` → mã được kiểm tra trên máy chủ, RLS giữ nguyên. Không dùng cách mở RLS cho khách vì khóa anon nằm công khai trong JS. Đánh đổi: mật khẩu 6 số yếu hơn mật khẩu dài — Supabase giới hạn số lần thử đăng nhập theo IP, chấp nhận được cho dữ liệu cá nhân loại này.
