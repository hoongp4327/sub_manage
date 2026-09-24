# PRD 01 — Quản lý Subscription

> Tài liệu mục tiêu để giao cho AI coding agent. Đọc hết tài liệu trước khi code.
> Mọi quyết định không có trong đây: chọn phương án **đơn giản hơn**, ghi lại trong `docs/DECISIONS.md`.

---

## 0. Bối cảnh

**Super Personal App** là một **web app** cá nhân, mở được trên mọi thiết bị có trình duyệt (điện thoại, máy tính, tablet). Thiết kế **responsive, ưu tiên màn hình điện thoại** — không phải app native cho điện thoại. App gồm nhiều module chức năng được custom theo nhu cầu riêng của chủ app (1 người dùng).

Module đầu tiên là **Quản lý Subscription** (tên gọi trong UI: **Subly**).

Kiến trúc phải cho phép **cắm thêm module sau này** (chi tiêu, thói quen, ghi chú…) mà không phải sửa module cũ.

### Mục tiêu module 1
1. Nhìn 1 giây là biết: **tháng này trả bao nhiêu, cả năm bao nhiêu, cái gì sắp tới hạn**.
2. Thêm 1 gói mới trong **dưới 10 giây**, tối đa **3 lần chạm** cho gói phổ biến.
3. Không bao giờ mất dữ liệu vì xóa nhầm — mọi gói đã xóa đều nằm trong **Lưu trữ** và khôi phục được.
4. Thêm trên điện thoại, mở máy tính thấy ngay (dữ liệu đồng bộ).

### Không làm (ngoài phạm vi v1)
- Nhiều người dùng / chia sẻ dữ liệu.
- Kết nối ngân hàng, đọc SMS/email tự động.
- Đa tiền tệ (v1 chỉ VNĐ, nhưng model dữ liệu có sẵn field `currency`).
- Chế độ offline hoàn toàn.

---

## 1. Tech stack

| Hạng mục | Lựa chọn | Lý do |
|---|---|---|
| Loại app | **Web app responsive** (SPA), mobile-first | Truy cập mọi lúc, mọi thiết bị, chỉ cần link |
| Framework | React + TypeScript + Vite | Nhanh, phổ biến, agent code tốt |
| Styling | Tailwind CSS + CSS variables cho design tokens | Dễ giữ minimal, nhất quán |
| **Dữ liệu** | **Supabase** (Postgres + Auth) | Xem mục 1.1 |
| Gọi dữ liệu | TanStack Query | Cache, cập nhật lạc quan (UI đổi ngay, lưu sau) |
| Ngày tháng | date-fns (locale `vi`) | Cộng tháng/năm chính xác |
| Icon | lucide-react | Nét mảnh, hợp minimal |
| Hosting | **Vercel** (free) | Push GitHub là tự deploy, có HTTPS |
| Nice-to-have | `manifest.json` để "Thêm vào màn hình chính" | Mở nhanh như app, không tốn công |

### 1.1 Lưu dữ liệu — đề xuất: Supabase

Vì muốn mở trên nhiều thiết bị, dữ liệu **phải nằm trên cloud** (lưu trong trình duyệt thì điện thoại và máy tính không thấy dữ liệu của nhau).

**Supabase** là hướng thuận tiện nhất cho app cá nhân:
- **Miễn phí** ở mức dùng cá nhân (500MB database — dư cho hàng chục nghìn bản ghi).
- **Đăng nhập bằng Google** một lần, trình duyệt nhớ phiên đăng nhập lâu dài → gần như không phải đăng nhập lại.
- Là Postgres thật: dữ liệu xuất ra CSV/SQL bất cứ lúc nào, không bị khóa vào nền tảng.
- **Row Level Security (RLS)**: mỗi bảng có cột `user_id`, chỉ chủ tài khoản đọc/ghi được. Bắt buộc bật.
- Dùng lại cho các module sau (chỉ thêm bảng mới).
- Về sau có thể dùng Edge Functions + cron để gửi email nhắc gia hạn (mục 6).

Yêu cầu cho agent:
- Chỉ **một email được phép** đăng nhập (`ALLOWED_EMAIL` trong biến môi trường); email khác → báo "Không có quyền truy cập".
- Schema viết bằng file migration trong `supabase/migrations/`, kèm file `seed.sql` dữ liệu mẫu.
- Khóa Supabase để trong `.env`, **không commit** lên git; có `.env.example`.
- README hướng dẫn từng bước: tạo project Supabase → bật Google login → chạy migration → deploy Vercel.

*Phương án dự phòng:* Firebase (Firestore + Auth) cũng được, nhưng dữ liệu dạng document khó truy vấn/xuất hơn — chỉ dùng nếu có lý do rõ ràng.

---

## 2. Cấu trúc app (khung đa module)

```
src/
  app/            # shell: router, layout, điều hướng, theme, auth guard
  modules/
    subscriptions/
      components/
      screens/     # Dashboard, Archive
      data/        # truy vấn Supabase, danh sách dịch vụ phổ biến
      logic/       # tính tiền, tính ngày gia hạn (pure functions + unit test)
      index.ts     # đăng ký module với shell (route, icon, tên)
  shared/          # UI primitives: Button, Card, Sheet, Chip, MoneyInput...
  lib/             # supabase client, format tiền, format ngày
supabase/
  migrations/
  seed.sql
```

- Màn hình **Home** = lưới các module (hiện chỉ có 1 ô "Subscription"). Chạm → vào Dashboard.
- Mỗi module tự đăng ký qua `index.ts` — thêm module mới không đụng code module khác.

---

## 3. Mô hình dữ liệu

```ts
type Category = 'work' | 'entertainment' | 'other';   // Làm việc / Giải trí / Khác
type CycleUnit = 'day' | 'week' | 'month' | 'year';
type Status = 'active' | 'archived';
type ArchiveReason = 'deleted' | 'cancelled';          // người dùng xóa / hết hạn sau khi hủy gia hạn

interface Subscription {
  id: string;
  userId: string;
  name: string;              // "ChatGPT Plus"
  presetId?: string;         // liên kết tới dịch vụ phổ biến (icon, màu)
  category: Category;
  price: number;             // số tiền trả mỗi chu kỳ, VNĐ, số nguyên
  currency: 'VND';
  cycleCount: number;        // 1, 3, 6 ...
  cycleUnit: CycleUnit;      // "1 năm" = { cycleCount: 1, cycleUnit: 'year' }
  startDate: string;         // ISO yyyy-mm-dd — ngày thanh toán đầu tiên / gần nhất
  purchasedFrom?: string;    // "Trực tiếp", "Đại lý", "Garena Plus"...
  note?: string;
  cancelAtPeriodEnd: boolean;// đã hủy gia hạn, vẫn dùng đến hết kỳ
  status: Status;
  archivedAt?: string;
  archiveReason?: ArchiveReason;
  createdAt: string;
  updatedAt: string;
}

interface PaymentLog {       // lịch sử để tính "so với tháng trước"
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  paidAt: string;
}
```

- **Không lưu** `nextRenewal` — luôn **tính ra** từ `startDate + n × chu kỳ`.
- **Không bao giờ xóa cứng** khi người dùng bấm Xóa: chỉ đổi `status = 'archived'` (xóa mềm). Xóa vĩnh viễn chỉ có trong màn hình Lưu trữ (mục 5.4).

---

## 4. Quy tắc tính toán (bắt buộc có unit test)

Đặt tất cả trong `modules/subscriptions/logic/` dưới dạng pure function. Chỉ tính các gói `active`.

| Chỉ số | Công thức |
|---|---|
| **Giá quy đổi / tháng** | `month`: `price / n` · `year`: `price / (12n)` · `week`: `price / n × 52 / 12` · `day`: `price / n × 365 / 12` — làm tròn đến 1.000đ khi hiển thị |
| **Tổng tháng này** | Tổng *giá quy đổi / tháng* của các gói active |
| **Tổng cả năm** | `Tổng tháng này × 12` (nhãn phụ: "dự kiến theo chu kỳ hiện tại") |
| **Ngày gia hạn kế tiếp** | Mốc đầu tiên `>= hôm nay` trong chuỗi `startDate + k × chu kỳ`. Dùng `addMonths`/`addYears` (31/01 + 1 tháng = 28/29/02) |
| **Còn N ngày** | `nextRenewal − hôm nay` (theo ngày, giờ Việt Nam) |
| **Sắp hết hạn** | Gói active có `Còn N ngày <= 7` |
| **% so với tháng trước** | So *Tổng tháng này* với tổng quy đổi của các gói active vào cùng ngày tháng trước. Không đủ dữ liệu → ẩn badge |

Ví dụ kiểm thử (khớp ảnh mẫu):
- ChatGPT Plus 480.000đ / 1 tháng → 480.000đ/tháng
- Canva Pro 280.000đ / 1 tháng → 280.000đ/tháng
- Spotify 165.000đ / 3 tháng → 55.000đ/tháng
- ⇒ Tổng tháng **815.000đ**, cả năm **9.780.000đ**
- Thêm: YouTube Premium 948.000đ / 1 năm → 79.000đ/tháng

Hiển thị tiền: `815.000đ` (dấu chấm phân cách nghìn, chữ `đ` liền sau).

---

## 5. Màn hình

### 5.1 Dashboard

Thứ tự từ trên xuống:

1. **Header**: "Subscription" + phụ đề "Quản lý đăng ký của bạn". Góc phải: icon **🗄 Lưu trữ** (có số đếm nhỏ nếu > 0).
2. **Thẻ tổng quan** (3 thẻ):
   - **Tổng tháng này** — số lớn + badge `+12%` (cam nhạt nếu tăng, xanh nếu giảm — tăng tiền là tin xấu) + "so với tháng trước".
   - **Tổng cả năm** — số lớn + "dự kiến theo chu kỳ hiện tại".
   - **Sắp hết hạn** — nền kem ấm, icon cảnh báo, "**1** dịch vụ · Trong 7 ngày tới". Chạm → lọc danh sách các gói sắp hạn.
3. **Dịch vụ đang dùng** + đếm "3 gói". Sắp xếp mặc định theo **ngày gia hạn gần nhất**. Chip lọc: Tất cả · Làm việc · Giải trí · Khác.
4. **Nút Thêm**: điện thoại → nút tròn nổi (FAB) màu cam góc dưới phải. Máy tính → nút "+ Thêm" góc trên phải như ảnh mẫu.

**Responsive:**

| Chiều rộng | Bố cục |
|---|---|
| < 640px (điện thoại) | 1 cột. "Tổng tháng này" full-width, 2 thẻ còn lại chia đôi hàng dưới. Form thêm = bottom sheet |
| ≥ 640px (tablet/máy tính) | 3 thẻ tổng trên 1 hàng, nội dung max-width ~960px căn giữa. Form thêm = dialog giữa màn hình (rộng ~440px) |

### 5.2 Thẻ dịch vụ (list item)

```
[icon]  ChatGPT Plus                     480.000đ /tháng
        (Còn 7 ngày)
        480.000đ / 1 tháng · Gia hạn 1 thg 10, 2026
```

- Icon: logo/emoji theo preset, nền pastel theo phân loại.
- Badge "Còn N ngày": **vàng/cam** khi ≤ 7 ngày, **xám** khi lớn hơn, **đỏ** khi 0 ngày ("Hôm nay"). Gói đã hủy gia hạn: badge "Hết hạn sau N ngày" màu xám + gạch nhẹ.
- Giá bên phải luôn là **giá quy đổi / tháng**; dòng dưới là giá thật theo chu kỳ.
- **Chạm** → mở form Sửa (cùng form với Thêm, có sẵn dữ liệu).
- **Nút xóa**:
  - Điện thoại: **vuốt trái** lộ nút `Xóa` (đỏ nhạt); hoặc nút `⋯` trên thẻ → menu `Sửa · Hủy gia hạn · Xóa`.
  - Máy tính: nút `⋯` hiện khi rê chuột.
  - Trong form Sửa: nút chữ đỏ "Xóa gói này" ở cuối form.
- Bấm Xóa → **không hỏi xác nhận**, gói chuyển ngay vào Lưu trữ + snackbar: *"Đã chuyển ChatGPT Plus vào Lưu trữ · **Hoàn tác**"* (6 giây).

### 5.3 Form Thêm / Sửa gói

Thứ tự trường theo đúng cách người dùng nghĩ: **Tên → Tiền → Chu kỳ**. Các trường còn lại có mặc định, không bắt buộc chạm vào.

```
┌──────────────────────────────────────┐
│  Thêm gói mới                     ✕  │
│                                      │
│  Tên dịch vụ                         │
│  ┌────────────────────────────────┐  │
│  │ Netf|                          │  │  ← tự focus, bàn phím mở sẵn
│  └────────────────────────────────┘  │
│   🎬 Netflix · 260.000đ/tháng        │  ← gợi ý, chạm = điền hết
│   🎬 Netflix Premium · 260.000đ      │
│                                      │
│  Số tiền                             │
│  ┌────────────────────────────┬───┐  │
│  │ 260.000                    │ đ │  │  ← bàn phím số, tự thêm dấu chấm
│  └────────────────────────────┴───┘  │
│                                      │
│  Chu kỳ                              │
│  (●1 tháng) (3 tháng) (6 tháng)      │
│  (1 năm)    (Khác…)                  │
│                                      │
│  Ngày thanh toán                     │
│  (●Hôm nay) (Hôm qua) (📅 Chọn ngày) │
│                                      │
│  Phân loại                           │
│  (💼 Làm việc) (●🎬 Giải trí) (📦 Khác)│
│                                      │
│  ▸ Thêm chi tiết                     │  ← mở ra: Mua ở đâu, Ghi chú
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ≈ 260.000đ/tháng · Gia hạn     │  │  ← dòng xem trước, cập nhật trực tiếp
│  │   24 thg 10, 2026              │  │
│  └────────────────────────────────┘  │
│  [          Thêm vào tủ           ]  │  ← cam, full-width, dính đáy
└──────────────────────────────────────┘
```

Chi tiết từng trường:

| Trường | Cách nhập | Mặc định | Bắt buộc |
|---|---|---|---|
| **Tên dịch vụ** | Text + gợi ý từ danh sách phổ biến và các gói từng có trong Lưu trữ | — | ✅ |
| **Số tiền** | `inputmode="numeric"`, tự format `260.000` khi gõ. Gõ số < 1.000 (vd `260`) → hiện gợi ý chạm được "260.000đ?" | Theo preset | ✅ (> 0) |
| **Chu kỳ** | Chip chọn 1: **1 tháng · 3 tháng · 6 tháng · 1 năm · Khác…**. "Khác…" mở ra `[ số ] [ ngày / tuần / tháng / năm ▾ ]` | 1 tháng | ✅ |
| **Ngày thanh toán** | Chip: **Hôm nay** · Hôm qua · 📅 Chọn ngày | Hôm nay | ✅ (có mặc định) |
| **Phân loại** | Chip chọn 1: 💼 Làm việc · 🎬 Giải trí · 📦 Khác | Theo preset, không có thì "Khác" | ✅ (có mặc định) |
| Mua ở đâu | Text + chip gợi ý các giá trị đã từng nhập | — | Không, ẩn trong "Thêm chi tiết" |
| Ghi chú | Text 1 dòng | — | Không, ẩn trong "Thêm chi tiết" |

Hành vi:
- Chọn 1 gợi ý → điền sẵn tên, tiền, chu kỳ, phân loại, icon → focus nhảy thẳng xuống nút "Thêm vào tủ".
- Phím **Enter / Tiếp** trên bàn phím nhảy sang trường kế tiếp; ở trường cuối thì lưu.
- **Dòng xem trước** luôn cho thấy giá quy đổi/tháng và ngày gia hạn kế tiếp → người dùng kiểm tra lại mà không cần nghĩ.
- Lỗi hiện ngay dưới trường (chữ đỏ nhỏ), không dùng alert. Nút lưu chỉ mờ đi khi thiếu Tên hoặc Tiền.
- Tên trùng một gói đang active → cảnh báo nhẹ "Bạn đã có Netflix — vẫn thêm?". Tên trùng một gói trong Lưu trữ → gợi ý "Khôi phục Netflix từ Lưu trữ?".
- Form Sửa: tiêu đề "Sửa gói", nút "Lưu", thêm nút chữ đỏ "Xóa gói này" ở cuối.

### 5.4 Lưu trữ (Archive) — khôi phục & đăng ký lại

Mở từ icon 🗄 trên header Dashboard. Chứa **mọi gói đã xóa** và **gói đã hết hạn sau khi hủy gia hạn**.

```
←  Lưu trữ                         5 gói
   Gói đã xóa hoặc đã ngừng. Không tính vào tổng tiền.

   (Tất cả) (Đã xóa) (Đã hết hạn)

┌──────────────────────────────────────┐
│ [icon] Netflix           260.000đ/th │
│        Đã xóa · 20 thg 9, 2026       │
│        [ Khôi phục ]  [ Đăng ký lại ] ⋯│
└──────────────────────────────────────┘
```

Hai hành động chính trên mỗi thẻ:

| Nút | Dùng khi | Hành vi |
|---|---|---|
| **Khôi phục** | Lỡ xóa nhầm | Đưa gói về active **y nguyên** như cũ (giữ ngày thanh toán, chu kỳ). Snackbar "Đã khôi phục Netflix". |
| **Đăng ký lại** | Muốn sub lại sau một thời gian | Mở form Thêm **điền sẵn** tên, tiền, chu kỳ, phân loại, nguồn mua; **ngày thanh toán = Hôm nay**. Người dùng sửa giá nếu đổi, rồi bấm lưu → gói về active với ngày mới. |

- Menu `⋯` → **Xóa vĩnh viễn**: đây là chỗ duy nhất có hộp xác nhận ("Xóa vĩnh viễn Netflix? Không thể hoàn tác.").
- Sắp xếp: mới lưu trữ lên đầu. Không tự dọn — Lưu trữ giữ vĩnh viễn cho tới khi người dùng xóa tay.
- Trạng thái rỗng: "Chưa có gì trong Lưu trữ. Gói bạn xóa sẽ nằm ở đây để khôi phục khi cần."

---

## 6. Giảm ma sát cho người dùng (bắt buộc)

Nguyên tắc: **người dùng chỉ phải nhập cái app không thể đoán.**

1. **Gợi ý dịch vụ phổ biến khi gõ tên.** Có sẵn ~30 dịch vụ (ChatGPT Plus, Claude Pro, Canva Pro, Spotify, YouTube Premium, Netflix, Google One, iCloud+, Notion, Figma, Adobe CC, Microsoft 365, Apple Music, CapCut Pro, Duolingo…) kèm icon, phân loại, **giá VN phổ biến và chu kỳ**. Dịch vụ có nhiều gói (Spotify Individual/Duo/Family) → mỗi gói là một gợi ý riêng.
2. **Trạng thái rỗng có chip thêm nhanh.** Lần đầu mở: "Bạn đang dùng gì?" + lưới chip dịch vụ phổ biến; chạm = mở form đã điền sẵn.
3. **Mặc định thông minh**: ngày = hôm nay, chu kỳ = 1 tháng, phân loại suy từ tên.
4. **Chu kỳ bằng chip**, không bắt gõ; "Khác…" cho trường hợp hiếm.
5. **Nhập tiền dễ**: bàn phím số, tự thêm dấu chấm, hiểu "260" là 260.000đ khi người dùng xác nhận.
6. **Trường tùy chọn bị giấu** sau "Thêm chi tiết".
7. **Hoàn tác thay vì xác nhận** khi xóa; mọi thứ đã xóa đều khôi phục được từ Lưu trữ.
8. **Đăng ký lại 1 chạm** từ Lưu trữ (điền sẵn mọi thứ, chỉ đổi ngày).
9. **Tự động gia hạn**: qua ngày gia hạn, gói tự sang chu kỳ kế tiếp và ghi `PaymentLog`. Gói đã hủy gia hạn → hết kỳ tự vào Lưu trữ (lý do "Đã hết hạn").
10. **Hủy gia hạn** ngay trên thẻ (menu `⋯`): vẫn dùng đến hết kỳ, sau đó tự vào Lưu trữ.
11. **Phản hồi tức thì**: lưu xong, form đóng, thẻ mới trượt vào danh sách, số tổng đếm lên (300ms). UI cập nhật ngay, lưu lên Supabase ở nền; lỗi mạng → hiện "Chưa lưu được · Thử lại".
12. **Nhắc gia hạn** (giai đoạn 2): email lúc 9:00 sáng trước **3 ngày** — "Canva Pro gia hạn sau 3 ngày · 280.000đ" (Supabase cron + Edge Function).

---

## 7. Hướng dẫn UI/UX — Minimal, trắng sáng

Tinh thần: **ít chữ, nhiều khoảng trắng, một màu nhấn duy nhất.** Nếu một phần tử không giúp người dùng quyết định gì, bỏ nó đi.

### Design tokens

```css
:root {
  --bg:            #FAFAF9;  /* nền app, trắng ấm */
  --surface:       #FFFFFF;  /* thẻ */
  --border:        #ECECEA;
  --text:          #111111;
  --text-muted:    #6B6B6B;
  --text-subtle:   #9A9A9A;

  --accent:        #FF9500;  /* cam — nút chính, FAB, chip đang chọn */
  --accent-soft:   #FFF4E5;

  --warn-bg:       #FFF8EC;  /* thẻ "Sắp hết hạn" */
  --warn-text:     #E07B00;
  --badge-soon:    #FFE9B8;  /* "Còn 7 ngày" */
  --badge-neutral: #F1F1EF;
  --positive:      #16A34A;  --positive-bg: #E9F8EE;
  --danger:        #DC2626;  --danger-bg:   #FDECEC;

  --cat-work:      #EEF3FF;  /* nền icon theo phân loại */
  --cat-fun:       #FDF0F3;
  --cat-other:     #F4F1FB;

  --radius-card:   16px;
  --radius-input:  12px;
  --radius-chip:   999px;
  --shadow-card:   0 1px 2px rgba(0,0,0,.04);
}
```

### Typography
- UI: **Inter** (hoặc system font), hỗ trợ tiếng Việt đầy đủ.
- **Số tiền lớn**: font monospace đậm (`JetBrains Mono` / `IBM Plex Mono`, weight 700) như ảnh mẫu, `font-variant-numeric: tabular-nums`.
- Thang cỡ chữ: 12 / 14 / 16 / 20 / 32. Input luôn ≥ **16px** (tránh iOS tự zoom khi focus).

### Quy tắc bố cục
- Thiết kế cho **360–430px** trước, sau đó mở rộng (breakpoint 640px, max-width ~960px).
- Lề ngang 16px trên điện thoại, 24px trên máy tính.
- Vùng chạm tối thiểu **44×44px**. Trên điện thoại, hành động chính nằm ở **nửa dưới màn hình**.
- Tôn trọng `safe-area-inset`. Không có thanh cuộn ngang, không có chữ bị cắt.
- Chip đang chọn: nền `--accent-soft`, viền + chữ `--accent`. Chip chưa chọn: nền `--badge-neutral`.
- Hỗ trợ bàn phím & chuột đầy đủ trên máy tính (Tab, Enter, Esc đóng form).
- Chỉ **light mode** ở v1 (token đã tách sẵn để thêm dark mode sau).

### Chuyển động
- Bottom sheet trượt lên 250ms `ease-out`; dialog máy tính fade + scale 0.98→1.
- Tôn trọng `prefers-reduced-motion`.

---

## 8. Tiêu chí nghiệm thu (Definition of Done)

- [ ] Deploy lên Vercel, đăng nhập bằng Google, chỉ email được phép mới vào được.
- [ ] Thêm gói trên điện thoại → mở trên máy tính (tải lại trang) thấy ngay.
- [ ] Dashboard hiển thị đúng 815.000đ / 9.780.000đ / 1 dịch vụ với 3 gói mẫu (ngày giả lập 24/09/2026).
- [ ] Thêm "ChatGPT Plus" bằng gợi ý: gõ "chat" → chạm gợi ý → "Thêm vào tủ" = **3 thao tác**.
- [ ] Chu kỳ 1 tháng / 3 tháng / 6 tháng / 1 năm / tùy chỉnh (ngày, tuần) đều tính đúng giá quy đổi và ngày gia hạn.
- [ ] Xóa → gói vào Lưu trữ, Hoàn tác trong snackbar hoạt động.
- [ ] Lưu trữ: Khôi phục trả gói về y nguyên; Đăng ký lại mở form điền sẵn với ngày = hôm nay; Xóa vĩnh viễn có xác nhận.
- [ ] Gói hủy gia hạn tự vào Lưu trữ khi hết kỳ.
- [ ] RLS bật trên mọi bảng; gọi API bằng tài khoản khác không đọc được dữ liệu.
- [ ] Unit test cho toàn bộ `logic/` (tính tiền, ngày gia hạn, sắp hết hạn, ca biên 31/01, năm nhuận), pass 100%.
- [ ] Không vỡ layout ở 360px, 390px, 430px, 768px, 1280px.
- [ ] Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95.
- [ ] Toàn bộ chữ UI bằng tiếng Việt, có dấu đúng.

---

## 9. Thứ tự triển khai gợi ý

1. Scaffold Vite + React + TS + Tailwind, shell đa module, design tokens.
2. `logic/` + unit test (làm **trước** UI).
3. Supabase: migration (bảng `subscriptions`, `payment_logs`, RLS), Google login, giới hạn email.
4. Dashboard (thẻ tổng + danh sách) với dữ liệu seed.
5. Form Thêm/Sửa (bottom sheet trên điện thoại, dialog trên máy tính) + gợi ý + chip.
6. Xóa mềm + Hoàn tác + màn hình Lưu trữ (Khôi phục, Đăng ký lại, Xóa vĩnh viễn).
7. Lọc theo phân loại, trạng thái rỗng, tự động gia hạn, hủy gia hạn.
8. Deploy Vercel, kiểm thử trên điện thoại thật + máy tính theo checklist mục 8.
9. (Giai đoạn 2) Email nhắc gia hạn.

Sau mỗi bước: chạy app, chụp màn hình ở 390px và 1280px để tự kiểm tra trước khi sang bước sau.
