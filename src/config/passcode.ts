/**
 * Mật mã vào app — chỉ là rào cản nhỏ cho người lạ, KHÔNG phải bảo mật thật
 * (bảo mật dữ liệu thật nằm ở đăng nhập Google + Row Level Security của Supabase).
 *
 * Code chỉ giữ bản băm để mã không nằm nguyên văn trong file JS.
 * Đổi mã: thay 123456 bằng mã mới rồi chạy lệnh dưới, dán kết quả vào PASSCODE_HASH:
 *   node -e "let h=0x811c9dc5;for(const c of 'super-personal-app:123456'){h^=c.charCodeAt(0);h=Math.imul(h,0x01000193)>>>0}console.log(h.toString(16).padStart(8,'0'))"
 */
export const PASSCODE_LENGTH = 6;
export const PASSCODE_HASH = '1d9fe1e7';

/** FNV-1a 32-bit — chạy được cả trên http (không cần crypto.subtle). */
export function passcodeHash(code: string): string {
  let h = 0x811c9dc5;
  for (const c of `super-personal-app:${code}`) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export const isPasscode = (code: string) => passcodeHash(code) === PASSCODE_HASH;
