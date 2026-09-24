# Super Personal App

Web app cá nhân, ưu tiên điện thoại. Module đầu tiên: **Quản lý Subscription**.
Yêu cầu chi tiết: [docs/PRD-01-subscription.md](docs/PRD-01-subscription.md) · Quyết định kỹ thuật: [docs/DECISIONS.md](docs/DECISIONS.md)

## Chạy thử trên máy

```bash
npm install
npm run dev
```

Mở http://localhost:5173. Chưa cấu hình gì thì dữ liệu lưu ngay trong trình duyệt.
Muốn xem dữ liệu mẫu giống ảnh thiết kế: mở http://localhost:5173/?demo (ghi đè dữ liệu local).

Mở trên điện thoại cùng mạng wifi: `npm run dev -- --host` rồi vào địa chỉ `Network:` hiện ra.

```bash
npm test         # unit test phần tính tiền / ngày gia hạn
npm run build    # build bản production vào dist/
```

## Đưa lên mạng + đồng bộ mọi thiết bị

### 1. Supabase (dữ liệu + mật mã)
Không dùng Google: app có **1 tài khoản duy nhất**, mật khẩu chính là mật mã 6 số ở màn khóa.

1. Tạo project miễn phí tại https://supabase.com.
2. **SQL Editor** → dán và chạy lần lượt các file trong `supabase/migrations/` (`0001_subscriptions.sql`, `0002_collect.sql`, `0003_habits.sql`, `0004_habit_kind_notes.sql`).
3. **Authentication → Sign In / Providers**: giữ **Email** bật, **tắt "Allow new users to sign up"** (không ai tạo thêm tài khoản được).
4. **Authentication → Users → Add user → Create new user**: email của bạn, mật khẩu = mật mã 6 số (vd. `300920`), tick **Auto Confirm User**.
5. **Project Settings → API** → copy `Project URL` và khóa `anon` / *publishable* (không dùng `service_role`).

Đổi mật mã: Authentication → Users → chọn tài khoản → đổi mật khẩu. Máy đang mở không bị khóa lại; nút 🔒 ở Trang chủ để khóa thủ công.

### 2. Biến môi trường
Tạo file `.env` (copy từ `.env.example`):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ALLOWED_EMAIL=email-cua-ban@gmail.com
```

`VITE_ALLOWED_EMAIL`: email của tài khoản vừa tạo ở bước 4 — màn mật mã đăng nhập vào tài khoản này. Dữ liệu được khóa theo tài khoản bằng Row Level Security.

### 3. Vercel (hosting)
1. Đẩy code lên GitHub.
2. https://vercel.com → *Add New Project* → chọn repo (Vercel tự nhận Vite).
3. Thêm 3 biến môi trường ở trên trong *Settings → Environment Variables* → Deploy.

Trên điện thoại: mở link → Chia sẻ → **Thêm vào màn hình chính** để mở như app.

### 4. Chuyển dữ liệu đang có lên bản deploy
1. Ở bản đang dùng (vd. `localhost`), Trang chủ → nút **Dữ liệu** (biểu tượng ổ đĩa, góc trên phải) → **Xuất file** → được `super-personal-app-yyyy-mm-dd.json`.
2. Mở bản deploy, đăng nhập → **Dữ liệu** → **Chọn file** → **Nhập**.

Nhập là *gộp*: mục trùng được cập nhật, không xóa gì — nhập lại cùng file nhiều lần cũng không bị nhân đôi. Nên xuất file định kỳ để sao lưu.

## Cấu trúc

```
src/
  app/                 shell: trang chủ, đăng nhập, danh sách module
  modules/
    subscriptions/
      logic/           tính tiền, ngày gia hạn (có unit test)
      data/            lưu trữ (local / Supabase), gợi ý dịch vụ phổ biến
      components/      thẻ, form, thẻ tổng quan
      screens/         Dashboard, Lưu trữ
  shared/              Sheet, Chip, Toast…
  lib/                 định dạng tiền/ngày, Supabase client
supabase/              migration + dữ liệu mẫu
```

**Thêm module mới:** tạo thư mục trong `src/modules/`, export một `AppModule` (xem `src/modules/subscriptions/index.tsx`), rồi thêm vào `MODULES` trong `src/app/modules.ts`.
