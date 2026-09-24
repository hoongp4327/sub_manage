# PRD 02 — Thói quen

> Module thứ 2 của Super Personal App. Dùng chung tech stack, khung module, design tokens với [PRD-01](PRD-01-subscription.md).
> Mọi quyết định không có trong đây: chọn phương án **đơn giản hơn**, ghi lại trong `docs/DECISIONS.md`.

---

## 0. Mục tiêu

1. Ghi nhận một thói quen trong **1 chạm**, không phải mở màn hình khác.
2. Nhìn heatmap là biết mình **đều đặn tới đâu** — ô càng dày màu càng đều.
3. Nhìn 1 giây là biết **hôm nay đã làm được bao nhiêu %**.

### Không làm (đã cân nhắc và loại)
- Thói quen lồng thói quen, checklist bên trong thói quen.
- Pad "giữ để nước dâng".
- Chuỗi ngày liên tiếp / kỷ lục — heatmap đã thể hiện độ đều đặn.
- Lịch ngày nghỉ, lựa chọn "Nghỉ" — nghỉ = không hoạt động.
- Kiểu đếm (+1 ly…). Chỉ có 2 cách ghi: 5 mức hoặc Có/Không.

---

## 1. Mô hình dữ liệu

```ts
type Level = 1 | 2 | 3 | 4 | 5;       // 20% · 40% · 60% · 80% · 100%

interface Habit {
  id: string;
  name: string;              // "Tập gym"
  color: HabitColor;         // 1 trong 8 màu có sẵn
  icon: HabitIcon;           // 1 trong bộ icon có sẵn
  kind: 'percent' | 'binary'; // Mức độ 20–100% · Có/Không (mặc định percent)
  goal?: string | null;      // "100% = đủ 8 bài · 45 phút"
  reason?: string | null;    // "Khỏe lưng, bớt ngồi nhiều"
  notes?: string | null;     // ghi chú dài: giáo trình tập, danh sách sách…
  status: 'active' | 'archived';
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface HabitLog {         // mỗi thói quen × mỗi ngày tối đa 1 dòng
  habitId: string;
  date: string;              // yyyy-mm-dd (giờ máy người dùng)
  level: Level;
  updatedAt: string;
}
```

- **Chưa làm = không có dòng log.** Xóa mức của một ngày = xóa dòng log.
- Bảng Supabase: `habits`, `habit_logs` (khóa chính `habit_id + date`), có RLS như bảng `subscriptions`.
- Xóa thói quen = xóa mềm (`status = 'archived'`), có Hoàn tác.

---

## 2. Quy tắc tính toán (pure function + unit test, trong `logic/`)

| Tên | Quy tắc |
|---|---|
| % của 1 ngày | `level × 20`; chưa ghi = 0. Kiểu Có/Không: đã ghi = 100% (log cũ mức thấp khi đổi kiểu cũng tính 100%) |
| **Hôm nay** | Trung bình % hôm nay của **mọi** thói quen đang dùng, chưa ghi tính 0, làm tròn. Ví dụ 60, 80, 20, 100, 100 → **72%** |
| Ngày bắt đầu của thói quen | Ngày sớm hơn giữa `createdAt` và log cũ nhất |
| Khoảng lọc | `7d` = 7 ngày gần nhất tính cả hôm nay · `30d` = 30 ngày · `All` = từ ngày bắt đầu |
| **Hoạt động** | Số ngày có log trong khoảng lọc |
| **TB** | Trung bình % các ngày trong khoảng lọc, chỉ tính từ ngày bắt đầu tới hôm nay, ngày chưa ghi = 0 |

---

## 3. Màu ô heatmap

6 trạng thái: xám (chưa làm) + 5 mức trộn từ xám sang màu thói quen. Bậc 1 phải phân biệt rõ với xám (≥ 30% màu gốc).

| Trạng thái ô | Hiển thị |
|---|---|
| Chưa làm | xám `#ECECEA` |
| Mức 1–5 | trộn màu thói quen 30 · 48 · 66 · 84 · 100% |
| Trước ngày bắt đầu | xám rất nhạt |
| Tương lai (phần còn lại của tuần) | viền nét đứt |
| Hôm nay | không viền (ô cuối của lưới) |
| Đang chọn (màn chi tiết) | viền dày màu thói quen |

8 màu: xanh lá `#22C55E`, xanh ngọc `#14B8A6`, xanh lơ `#06B6D4`, xanh dương `#3B82F6`, chàm `#6366F1`, tím `#A855F7`, hồng `#EC4899`, đỏ `#EF4444`. Không dùng cam — cam dành cho giao diện.

---

## 4. Màn hình

### 4.1 Danh sách `/habits`
- Tiêu đề "Thói quen", nút `+` (điện thoại: FAB như Subly).
- Ô **Hôm nay**: số % lớn (mono, đếm lên/xuống 300ms) + chú thích "Trung bình N thói quen" + vòng tròn cam. Đủ 100% → vòng thành dấu tích, chú thích "Hoàn thành tất cả".
- Bộ lọc `All · 30d · 7d` (mặc định 30d, nhớ lựa chọn trong trình duyệt).
- Thẻ thói quen: icon màu · tên · heatmap · nút tick tròn bên phải.
  - `7d`: 1 hàng 7 ô · `30d`: 2 hàng × 15 ô, đọc trái → phải, ô cuối là hôm nay · `All`: lưới 7 hàng (T2–CN) × 26 tuần ≈ 6 tháng (182 ô), trải hết chiều ngang thẻ, nằm dưới dòng tên, không cuộn.
- Thói quen chưa đủ 100% hôm nay nằm trên, đã đủ nằm dưới và mờ nhẹ. **Thứ tự chỉ sắp lại khi vào màn**, không nhảy ngay khi vừa tick (tránh bấm nhầm thẻ khác).
- Chạm thẻ → màn chi tiết.

### 4.2 Nút tick
| Thao tác | Kết quả |
|---|---|
| Chạm khi chưa ghi | Ghi 100%, rung nhẹ, toast "Đã ghi … · Hoàn tác" |
| Chạm khi đã ghi | Mở hàng chọn mức ngay trong thẻ |
| Giữ lâu (450ms) | Mở hàng chọn mức |

Hàng chọn mức: 5 chấm màu (20 · 40 · 60 · 80 · 100) + nút xóa. Nằm trong thẻ, dưới heatmap — không nổi đè lên thẻ khác. Chọn xong tự đóng.

Nút tick hiển thị: chưa ghi = vòng xám · mức 1–4 = cung tròn màu theo % · mức 5 = hình tròn đặc có dấu tích.

Kiểu **Có/Không**: chạm = xong (100%), chạm lại = bỏ (toast Hoàn tác). Không có hàng chọn mức; heatmap chỉ 2 màu.

### 4.3 Chi tiết `/habits/:id`
- Nút quay lại · chấm màu + tên · menu ⋯ (Sửa, Xóa).
- Dòng mục tiêu (nếu có) dưới tên.
- **Ghi chú** ngay dưới tiêu đề: hiện 6 dòng đầu + "Xem hết"; nút "Sửa" mở sheet có ô soạn lớn. Chưa có thì hiện nút nét đứt "+ Thêm ghi chú".
- Bộ lọc `All · 30d · 7d` + 2 ô chỉ số **Hoạt động** và **TB**, cùng đổi theo bộ lọc.
- Heatmap:
  - `7d`: 7 ô lớn có nhãn thứ + ngày.
  - `30d`: lịch 7 cột (T2–CN) × các tuần, ô lớn dễ chạm.
  - `All`: lưới 7 hàng × 26 tuần (≈ 6 tháng), có nhãn tháng và thứ, trải hết chiều ngang.
- **Chạm một ô** = chọn ngày đó để sửa (không chạm được ngày tương lai).
- Thẻ **Lý do** (nếu có).
- **Thanh ghi nhận dính đáy**: tiêu đề ngày đang chọn ("Hôm nay" hoặc "T3, 22/9" + "Về hôm nay"), nút ‹ › lùi/tiến 1 ngày, 5 nút mức lớn + nút xóa (kiểu Có/Không: 1 nút lớn "Đánh dấu đã xong" / "Đã xong · chạm để bỏ"). Chạm là lưu luôn.

### 4.4 Form Thêm / Sửa (bottom sheet)
- Khi tạo mới: hàng gợi ý nhanh (Tập gym, Uống 2L nước, Đọc sách, Thiền, Học tiếng Anh, Ngủ trước 23h) — chạm là điền tên, icon, màu.
- Tên (bắt buộc) · **Cách ghi** (Mức độ / Có-Không) · Màu · Icon · "100% là gì?" / "Thế nào là xong?" (tùy chọn) · "Vì sao?" (tùy chọn).
- Tạo xong trong ≤ 3 chạm với gợi ý có sẵn.

### 4.5 Trang chủ
Ô module hiện "Hôm nay 72%" hoặc "Chưa có thói quen".

---

## 5. Tiêu chí nghiệm thu
- [ ] Tick 100% từ danh sách trong 1 chạm; ô hôm nay và ô "Hôm nay" cập nhật ngay.
- [ ] Chọn mức 20–100% trong 2 thao tác, cả ở danh sách lẫn chi tiết.
- [ ] Ghi bù ngày cũ từ màn chi tiết; không ghi được ngày tương lai.
- [ ] Ô "Hôm nay" đúng công thức trung bình (có test).
- [ ] Hoạt động / TB đổi theo bộ lọc (có test).
- [ ] Chạy được cả chế độ local lẫn Supabase; mất mạng thì trả trạng thái cũ và cho "Thử lại".
- [ ] Hiển thị tốt ở 375px và máy tính.
