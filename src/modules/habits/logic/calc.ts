import { addDays, differenceInCalendarDays, endOfWeek, parseISO, startOfWeek, subDays, subWeeks } from 'date-fns';
import { isoDate } from '../../../lib/format';
import type { Habit, HabitLog, Level } from '../types';

export type Range = '7d' | '30d' | 'all';

/** habitId|yyyy-mm-dd → mức */
export type LogIndex = Map<string, Level>;

export const logKey = (habitId: string, date: string) => `${habitId}|${date}`;

export function indexLogs(logs: HabitLog[]): LogIndex {
  return new Map(logs.map((l) => [logKey(l.habitId, l.date), l.level]));
}

/** Mức → %; chưa ghi = 0. */
export const pct = (level?: Level | null) => (level ? level * 20 : 0);

type HabitRef = Pick<Habit, 'id' | 'kind'>;

/** Mức của 1 thói quen trong 1 ngày. Kiểu Có/Không: đã ghi là 100% (kể cả log cũ từ lúc còn là kiểu %). */
export function levelOf(habit: HabitRef, index: LogIndex, date: string): Level | undefined {
  const l = index.get(logKey(habit.id, date));
  return l && habit.kind === 'binary' ? 5 : l;
}

/** Log cũ nhất của từng thói quen. */
export function earliestLogs(logs: HabitLog[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const l of logs) {
    const cur = out.get(l.habitId);
    if (!cur || l.date < cur) out.set(l.habitId, l.date);
  }
  return out;
}

/** Ngày bắt đầu = ngày tạo, hoặc sớm hơn nếu có ghi bù trước ngày tạo. */
export function habitStart(habit: Pick<Habit, 'createdAt'>, earliest?: string): string {
  const created = isoDate(parseISO(habit.createdAt));
  return earliest && earliest < created ? earliest : created;
}

/**
 * % hôm nay = trung bình của mọi thói quen đang dùng, chưa ghi tính 0.
 * null khi chưa có thói quen nào.
 */
export function todayAverage(habits: Habit[], index: LogIndex, today: Date): number | null {
  const active = habits.filter((h) => h.status === 'active');
  if (!active.length) return null;
  const day = isoDate(today);
  const sum = active.reduce((s, h) => s + pct(levelOf(h, index, day)), 0);
  return Math.round(sum / active.length);
}

export function rangeStart(range: Range, today: Date, start: string): string {
  if (range === '7d') return isoDate(subDays(today, 6));
  if (range === '30d') return isoDate(subDays(today, 29));
  return start;
}

/** Các ngày từ `from` tới `to` (yyyy-mm-dd, tính cả hai đầu). */
export function daysBetween(from: string, to: string): string[] {
  const a = parseISO(from);
  const n = differenceInCalendarDays(parseISO(to), a);
  return Array.from({ length: Math.max(0, n + 1) }, (_, i) => isoDate(addDays(a, i)));
}

export interface HabitStats {
  /** Số ngày có ghi trong khoảng lọc */
  active: number;
  /** Trung bình % từ ngày bắt đầu tới hôm nay trong khoảng lọc */
  avg: number;
}

export function habitStats(habit: HabitRef, index: LogIndex, today: Date, range: Range, start: string): HabitStats {
  const from = rangeStart(range, today, start);
  const days = daysBetween(from > start ? from : start, isoDate(today));
  if (!days.length) return { active: 0, avg: 0 };
  let active = 0;
  let sum = 0;
  for (const d of days) {
    const l = levelOf(habit, index, d);
    if (l) active++;
    sum += pct(l);
  }
  return { active, avg: Math.round(sum / days.length) };
}

/** Lưới tuần (T2 → CN): mỗi phần tử là 1 cột 7 ngày, phủ từ tuần của `from` tới tuần của `to`. */
export function weekColumns(from: string, to: string): string[][] {
  const first = startOfWeek(parseISO(from), { weekStartsOn: 1 });
  const last = endOfWeek(parseISO(to), { weekStartsOn: 1 });
  const all = daysBetween(isoDate(first), isoDate(last));
  const cols: string[][] = [];
  for (let i = 0; i < all.length; i += 7) cols.push(all.slice(i, i + 7));
  return cols;
}

/** Chế độ All hiển thị 26 tuần ≈ 6 tháng (182 ô) */
export const ALL_WEEKS = 26;

/** 26 cột tuần kết thúc ở tuần hiện tại. */
export function allColumns(today: Date): string[][] {
  const from = subWeeks(startOfWeek(today, { weekStartsOn: 1 }), ALL_WEEKS - 1);
  return weekColumns(isoDate(from), isoDate(today));
}

/** Chưa đủ 100% hôm nay lên trên, đã đủ xuống dưới; cùng nhóm giữ thứ tự tạo. */
export function sortForToday(habits: Habit[], index: LogIndex, today: Date): Habit[] {
  const day = isoDate(today);
  const done = (h: Habit) => (levelOf(h, index, day) === 5 ? 1 : 0);
  return [...habits].sort((a, b) => done(a) - done(b) || a.createdAt.localeCompare(b.createdAt));
}

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export const weekdayShort = (d: string) => WEEKDAY_SHORT[parseISO(d).getDay()];

/** "Hôm nay" · "Hôm qua" · "T3, 22/9" */
export function dayLabel(d: string, today: Date): string {
  const diff = differenceInCalendarDays(today, parseISO(d));
  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return 'Hôm qua';
  const date = parseISO(d);
  return `${weekdayShort(d)}, ${date.getDate()}/${date.getMonth() + 1}`;
}
