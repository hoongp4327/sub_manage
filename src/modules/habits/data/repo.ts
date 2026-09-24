import { subDays } from 'date-fns';
import { isoDate } from '../../../lib/format';
import { supabase } from '../../../lib/supabase';
import type { Habit, HabitLog, Level } from '../types';

export interface HabitRepo {
  listHabits(): Promise<Habit[]>;
  createHabit(h: Habit): Promise<void>;
  updateHabit(id: string, patch: Partial<Habit>): Promise<void>;
  listLogs(): Promise<HabitLog[]>;
  /** level = null → xóa log của ngày đó */
  setLog(habitId: string, date: string, level: Level | null): Promise<void>;
  /** Nhập từ file sao lưu: trùng id / (thói quen, ngày) thì ghi đè */
  importMany(habits: Habit[], logs: HabitLog[]): Promise<void>;
}

/* ---------- Local (localStorage) ---------- */

const HABITS_KEY = 'habits.v1';
const LOGS_KEY = 'habits.logs.v1';

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}
const write = (key: string, v: unknown) => localStorage.setItem(key, JSON.stringify(v));

const localRepo: HabitRepo = {
  async listHabits() { return read<Habit>(HABITS_KEY); },
  async createHabit(h) { write(HABITS_KEY, [...read<Habit>(HABITS_KEY), h]); },
  async updateHabit(id, patch) { write(HABITS_KEY, read<Habit>(HABITS_KEY).map((h) => (h.id === id ? { ...h, ...patch } : h))); },
  async listLogs() { return read<HabitLog>(LOGS_KEY); },
  async setLog(habitId, date, level) {
    const rest = read<HabitLog>(LOGS_KEY).filter((l) => !(l.habitId === habitId && l.date === date));
    write(LOGS_KEY, level ? [...rest, { habitId, date, level, updatedAt: new Date().toISOString() }] : rest);
  },
  async importMany(habits, logs) {
    const ids = new Set(habits.map((h) => h.id));
    write(HABITS_KEY, [...read<Habit>(HABITS_KEY).filter((h) => !ids.has(h.id)), ...habits]);
    const keys = new Set(logs.map((l) => `${l.habitId}|${l.date}`));
    write(LOGS_KEY, [...read<HabitLog>(LOGS_KEY).filter((l) => !keys.has(`${l.habitId}|${l.date}`)), ...logs]);
  },
};

/* ---------- Supabase ---------- */

type Row = Record<string, unknown>;

const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const mapKeys = (o: Row, f: (k: string) => string): Row => Object.fromEntries(Object.entries(o).map(([k, v]) => [f(k), v]));

function remoteRepo(): HabitRepo {
  const db = supabase!;
  const check = ({ error }: { error: unknown }) => { if (error) throw error; };
  const PAGE = 1000;
  return {
    async listHabits() {
      const { data, error } = await db.from('habits').select('*').order('created_at');
      if (error) throw error;
      return (data as Row[]).map((r) => {
        const { userId: _u, ...rest } = mapKeys(r, toCamel);
        return rest as unknown as Habit;
      });
    },
    async createHabit(h) { check(await db.from('habits').insert(mapKeys({ ...h }, toSnake))); },
    async updateHabit(id, patch) { check(await db.from('habits').update(mapKeys({ ...patch }, toSnake)).eq('id', id)); },
    // Supabase trả tối đa 1000 dòng mỗi lần — đọc theo trang
    async listLogs() {
      const out: HabitLog[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await db.from('habit_logs').select('habit_id, date, level, updated_at').order('date').range(from, from + PAGE - 1);
        if (error) throw error;
        out.push(...(data as Row[]).map((r) => mapKeys(r, toCamel) as unknown as HabitLog));
        if (data.length < PAGE) return out;
      }
    },
    async setLog(habitId, date, level) {
      if (level) {
        check(await db.from('habit_logs').upsert({ habit_id: habitId, date, level, updated_at: new Date().toISOString() }, { onConflict: 'habit_id,date', defaultToNull: false }));
      } else {
        check(await db.from('habit_logs').delete().eq('habit_id', habitId).eq('date', date));
      }
    },
    // Thói quen trước (log tham chiếu tới thói quen), mỗi lần tối đa 500 dòng
    async importMany(habits, logs) {
      for (let i = 0; i < habits.length; i += 500) {
        check(await db.from('habits').upsert(habits.slice(i, i + 500).map((h) => mapKeys({ ...h }, toSnake)), { defaultToNull: false }));
      }
      for (let i = 0; i < logs.length; i += 500) {
        check(await db.from('habit_logs').upsert(logs.slice(i, i + 500).map((l) => mapKeys({ ...l }, toSnake)), { onConflict: 'habit_id,date', defaultToNull: false }));
      }
    },
  };
}

export const repo: HabitRepo = supabase ? remoteRepo() : localRepo;

/** Mở app với ?demo để nạp dữ liệu mẫu (chỉ chế độ local). Gọi trước seed của Subscription vì seed đó xóa ?demo khỏi URL. */
export function seedHabitsDemoIfRequested() {
  if (supabase || !new URLSearchParams(location.search).has('demo')) return;
  const today = new Date();
  const created = subDays(today, 150).toISOString();
  const habits: Habit[] = [
    { name: 'Uống 2L nước', icon: 'droplet', color: '#06B6D4', kind: 'percent', goal: '8 ly · 250ml', reason: null, notes: null },
    {
      name: 'Tập gym', icon: 'dumbbell', color: '#22C55E', kind: 'percent', goal: 'Đủ 8 bài · 45 phút', reason: 'Khỏe lưng, bớt ngồi nhiều',
      notes: `T2 – Ngực, tay sau
• Bench press 4×8
• Incline dumbbell 3×10
• Dips 3×12

T4 – Lưng, tay trước
• Deadlift 4×6
• Lat pulldown 3×10
• Barbell curl 3×12

T6 – Chân, vai
• Squat 4×8
• Leg press 3×12
• Shoulder press 3×10

Cardio 15 phút cuối buổi · Giãn cơ 5 phút`,
    },
    { name: 'Học tiếng Anh', icon: 'languages', color: '#EC4899', kind: 'percent', goal: '30 phút Elsa + 10 từ mới', reason: null, notes: null },
    { name: 'Đọc sách', icon: 'book', color: '#3B82F6', kind: 'percent', goal: '20 trang', reason: 'Mỗi năm 20 cuốn', notes: `Đang đọc: Atomic Habits
Tiếp theo: Deep Work, Sapiens` },
    { name: 'Thiền 10 phút', icon: 'lotus', color: '#A855F7', kind: 'binary', goal: null, reason: null, notes: null },
  ].map((h, i) => ({ ...h, kind: h.kind as Habit['kind'], id: crypto.randomUUID(), status: 'active' as const, createdAt: new Date(+new Date(created) + i * 1000).toISOString(), updatedAt: created }));

  // Mỗi thói quen một "độ chăm" khác nhau; hôm nay khớp ví dụ 60 · 80 · 20 · 100 · 100 → 72%
  const diligence = [0.7, 0.8, 0.55, 0.75, 0.6];
  const todayLevels: (Level | null)[] = [3, 4, 1, 5, 5];
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const logs: HabitLog[] = [];
  habits.forEach((h, i) => {
    for (let d = 1; d <= 150; d++) {
      if (rand() > diligence[i]) continue;
      const r = rand();
      const level = (r < 0.45 ? 5 : r < 0.65 ? 4 : r < 0.8 ? 3 : r < 0.92 ? 2 : 1) as Level;
      logs.push({ habitId: h.id, date: isoDate(subDays(today, d)), level, updatedAt: created });
    }
    const t = todayLevels[i];
    if (t) logs.push({ habitId: h.id, date: isoDate(today), level: t, updatedAt: created });
  });
  write(HABITS_KEY, habits);
  write(LOGS_KEY, logs);
}
