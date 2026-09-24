import { addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, parseISO, subMonths } from 'date-fns';
import type { CycleUnit, Subscription } from '../types';

export const SOON_DAYS = 7;

type Cycle = Pick<Subscription, 'price' | 'cycleCount' | 'cycleUnit'>;

/** Giá quy đổi về 1 tháng (chưa làm tròn). */
export function monthlyEquivalent({ price, cycleCount, cycleUnit }: Cycle): number {
  const n = Math.max(1, cycleCount);
  switch (cycleUnit) {
    case 'month': return price / n;
    case 'year': return price / (12 * n);
    case 'week': return (price / n) * 52 / 12;
    case 'day': return (price / n) * 365 / 12;
  }
}

/** Làm tròn đến 1.000đ để hiển thị. */
export const roundK = (v: number) => Math.round(v / 1000) * 1000;

/** Mốc thứ k tính từ ngày bắt đầu — luôn cộng từ gốc để 31/01 + 2 tháng = 31/03. */
export function addCycles(start: Date, count: number, unit: CycleUnit, k: number): Date {
  const n = count * k;
  switch (unit) {
    case 'day': return addDays(start, n);
    case 'week': return addWeeks(start, n);
    case 'month': return addMonths(start, n);
    case 'year': return addYears(start, n);
  }
}

/**
 * Ngày gia hạn kế tiếp: mốc đầu tiên (k ≥ 1) rơi vào hôm nay hoặc sau hôm nay.
 * Ngày bắt đầu nằm trong tương lai → chính ngày đó là lần thanh toán tới.
 */
export function nextRenewal(sub: Pick<Subscription, 'startDate' | 'cycleCount' | 'cycleUnit'>, today: Date): Date {
  const start = parseISO(sub.startDate);
  if (differenceInCalendarDays(start, today) > 0) return start;
  const count = Math.max(1, sub.cycleCount);
  const approxDays = { day: 1, week: 7, month: 28, year: 365 }[sub.cycleUnit] * count;
  // nhảy gần tới đích rồi dò từng bước, tránh vòng lặp dài với chu kỳ ngày
  let k = Math.max(1, Math.floor(differenceInCalendarDays(today, start) / approxDays) - 1);
  while (k > 1 && differenceInCalendarDays(addCycles(start, count, sub.cycleUnit, k - 1), today) >= 0) k--;
  let d = addCycles(start, count, sub.cycleUnit, k);
  while (differenceInCalendarDays(d, today) < 0) d = addCycles(start, count, sub.cycleUnit, ++k);
  return d;
}

export const daysUntil = (date: Date, today: Date) => differenceInCalendarDays(date, today);

export function isSoon(sub: Subscription, today: Date): boolean {
  return sub.status === 'active' && daysUntil(nextRenewal(sub, today), today) <= SOON_DAYS;
}

export interface Summary {
  /** Tổng của riêng mình — không gồm gói thu hộ */
  monthly: number;
  yearly: number;
  /** Gồm cả gói thu hộ (vẫn cần nhớ ngày để thu tiền) */
  soonCount: number;
  /** % thay đổi so với cùng ngày tháng trước; null = không đủ dữ liệu */
  changePct: number | null;
  /** Tổng quy đổi/tháng của các gói thu hộ */
  collectMonthly: number;
}

/** Gói có đang active vào ngày `at` hay không (dựa trên ngày tạo / ngày lưu trữ). */
function activeAt(sub: Subscription, at: Date): boolean {
  if (differenceInCalendarDays(parseISO(sub.createdAt), at) > 0) return false;
  if (sub.status === 'active') return true;
  return !!sub.archivedAt && differenceInCalendarDays(parseISO(sub.archivedAt), at) > 0;
}

export function summarize(all: Subscription[], today: Date): Summary {
  const active = all.filter((s) => s.status === 'active');
  const own = active.filter((s) => !s.isCollect);
  const monthlyRaw = own.reduce((sum, s) => sum + monthlyEquivalent(s), 0);
  const monthly = roundK(monthlyRaw);

  const lastMonth = subMonths(today, 1);
  const prev = all.filter((s) => !s.isCollect && activeAt(s, lastMonth));
  const prevRaw = prev.reduce((sum, s) => sum + monthlyEquivalent(s), 0);
  const changePct = prev.length && prevRaw > 0 ? Math.round(((monthlyRaw - prevRaw) / prevRaw) * 100) : null;

  return {
    monthly,
    yearly: monthly * 12,
    soonCount: active.filter((s) => isSoon(s, today)).length,
    changePct,
    collectMonthly: roundK(active.filter((s) => s.isCollect).reduce((sum, s) => sum + monthlyEquivalent(s), 0)),
  };
}

/** Các gói đã hủy gia hạn và đã qua ngày kết thúc → cần chuyển vào Lưu trữ. */
export function expiredIds(all: Subscription[], today: Date): string[] {
  return all
    .filter((s) => s.status === 'active' && s.endsAt && differenceInCalendarDays(parseISO(s.endsAt), today) <= 0)
    .map((s) => s.id);
}

export function cycleLabel(count: number, unit: CycleUnit): string {
  const word = { day: 'ngày', week: 'tuần', month: 'tháng', year: 'năm' }[unit];
  return `${count} ${word}`;
}

/** Nhãn ngắn sau giá: "/tháng", "/3 tháng", "/năm". */
export function perCycleLabel(count: number, unit: CycleUnit): string {
  return count === 1 ? `/${cycleLabel(1, unit).slice(2)}` : `/${cycleLabel(count, unit)}`;
}
