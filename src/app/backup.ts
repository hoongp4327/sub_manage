import { repo as habitRepo } from '../modules/habits/data/repo';
import type { Habit, HabitLog } from '../modules/habits/types';
import { repo as subscriptionRepo } from '../modules/subscriptions/data/repo';
import type { Subscription } from '../modules/subscriptions/types';

/** File sao lưu toàn app — thêm module mới thì thêm mảng mới vào đây. */
export interface Backup {
  app: 'super-personal-app';
  version: 1;
  exportedAt: string;
  subscriptions: Subscription[];
  habits: Habit[];
  habitLogs: HabitLog[];
}

export interface BackupCounts {
  subscriptions: number;
  habits: number;
  habitLogs: number;
}

export const countsOf = (b: Pick<Backup, keyof BackupCounts>): BackupCounts => ({
  subscriptions: b.subscriptions.length,
  habits: b.habits.length,
  habitLogs: b.habitLogs.length,
});

export async function collectBackup(): Promise<Backup> {
  const [subscriptions, habits, habitLogs] = await Promise.all([subscriptionRepo.list(), habitRepo.listHabits(), habitRepo.listLogs()]);
  return { app: 'super-personal-app', version: 1, exportedAt: new Date().toISOString(), subscriptions, habits, habitLogs };
}

/** "super-personal-app-2026-09-24.json" */
export const backupFileName = (d = new Date()) =>
  `super-personal-app-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isArrOf = (v: unknown, keys: string[]) => Array.isArray(v) && v.every((x) => isObj(x) && keys.every((k) => k in x));

/** Đọc và kiểm tra file. Lỗi → ném Error với câu báo cho người dùng. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File không đọc được — hãy chọn đúng file .json đã xuất từ app.');
  }
  if (!isObj(data) || data.app !== 'super-personal-app') throw new Error('Đây không phải file sao lưu của Super Personal App.');
  if (data.version !== 1) throw new Error('File sao lưu này đến từ phiên bản app khác, chưa hỗ trợ.');
  const subscriptions = data.subscriptions ?? [];
  const habits = data.habits ?? [];
  const habitLogs = data.habitLogs ?? [];
  if (!isArrOf(subscriptions, ['id', 'name', 'price']) || !isArrOf(habits, ['id', 'name']) || !isArrOf(habitLogs, ['habitId', 'date', 'level'])) {
    throw new Error('File sao lưu bị hỏng hoặc thiếu dữ liệu.');
  }
  // Log trỏ tới thói quen không có trong file → bỏ (tránh lỗi khóa ngoại trên Supabase)
  const habitIds = new Set((habits as Habit[]).map((h) => h.id));
  return {
    app: 'super-personal-app',
    version: 1,
    exportedAt: String(data.exportedAt ?? ''),
    subscriptions: subscriptions as Subscription[],
    // Dữ liệu cũ chưa có `kind` → mặc định Mức độ
    habits: (habits as Habit[]).map((h) => ({ ...h, kind: h.kind ?? 'percent' })),
    habitLogs: (habitLogs as HabitLog[]).filter((l) => habitIds.has(l.habitId)),
  };
}

/** Gộp vào dữ liệu hiện có: trùng thì ghi đè, còn lại giữ nguyên. Không xóa gì. */
export async function restoreBackup(b: Backup): Promise<void> {
  await subscriptionRepo.importMany(b.subscriptions);
  await habitRepo.importMany(b.habits, b.habitLogs);
}
