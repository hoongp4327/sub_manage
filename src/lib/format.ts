import { format, parseISO, subDays } from 'date-fns';

const nf = new Intl.NumberFormat('vi-VN');

/** 815000 → "815.000đ" */
export const money = (v: number) => `${nf.format(Math.round(v))}đ`;

/** 815000 → "815.000" (dùng trong ô nhập) */
export const groupDigits = (v: number) => (v ? nf.format(v) : '');

/** "260.000" / "260000" → 260000 */
export const parseDigits = (s: string) => Number(s.replace(/\D/g, '').slice(0, 12)) || 0;

/** Date → "1 thg 10, 2026" */
export function shortDate(d: Date | string): string {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return `${date.getDate()} thg ${date.getMonth() + 1}, ${date.getFullYear()}`;
}

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** Date → "Thứ Năm, 24 tháng 9" */
export const longDate = (d: Date) => `${WEEKDAYS[d.getDay()]}, ${d.getDate()} tháng ${d.getMonth() + 1}`;

export function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 13) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export const isoDate = (d: Date) => format(d, 'yyyy-MM-dd');
export const todayISO = () => isoDate(new Date());
export const yesterdayISO = () => isoDate(subDays(new Date(), 1));

/** So sánh không dấu, không phân biệt hoa thường. */
export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();
