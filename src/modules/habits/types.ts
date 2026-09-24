import {
  Apple, Bed, Bike, BookOpen, Brain, Code, Droplet, Dumbbell, Flower2, Footprints, Heart, Languages, Moon, Music, PenLine, Pill, Salad, Sun,
  type LucideIcon,
} from 'lucide-react';

/** 1–5 = 20% · 40% · 60% · 80% · 100% */
export type Level = 1 | 2 | 3 | 4 | 5;
export const LEVELS: Level[] = [1, 2, 3, 4, 5];

/** percent = chọn mức 20–100% · binary = Có/Không */
export type HabitKind = 'percent' | 'binary';

export interface Habit {
  id: string;
  name: string;
  color: string;
  icon: string;
  /** Không có (dữ liệu cũ) = 'percent' */
  kind?: HabitKind;
  /** "100% = đủ 8 bài · 45 phút" */
  goal?: string | null;
  /** "Khỏe lưng, bớt ngồi nhiều" */
  reason?: string | null;
  /** Ghi chú dài: giáo trình tập, danh sách sách… */
  notes?: string | null;
  status: 'active' | 'archived';
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Chưa làm = không có log. */
export interface HabitLog {
  habitId: string;
  /** yyyy-mm-dd */
  date: string;
  level: Level;
  updatedAt: string;
}

/** Không có cam — cam dành cho giao diện. */
export const HABIT_COLORS = ['#22C55E', '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#A855F7', '#EC4899', '#EF4444'];

export const HABIT_ICONS: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  droplet: Droplet,
  book: BookOpen,
  languages: Languages,
  lotus: Flower2,
  moon: Moon,
  bed: Bed,
  footprints: Footprints,
  bike: Bike,
  salad: Salad,
  apple: Apple,
  pill: Pill,
  pen: PenLine,
  code: Code,
  music: Music,
  brain: Brain,
  sun: Sun,
  heart: Heart,
};

export const iconOf = (id: string) => HABIT_ICONS[id] ?? Heart;

export const HABIT_PRESETS: Pick<Habit, 'name' | 'icon' | 'color' | 'kind'>[] = [
  { name: 'Tập gym', icon: 'dumbbell', color: '#22C55E', kind: 'percent' },
  { name: 'Uống 2L nước', icon: 'droplet', color: '#06B6D4', kind: 'percent' },
  { name: 'Đọc sách', icon: 'book', color: '#3B82F6', kind: 'percent' },
  { name: 'Thiền 10 phút', icon: 'lotus', color: '#A855F7', kind: 'binary' },
  { name: 'Học tiếng Anh', icon: 'languages', color: '#EC4899', kind: 'percent' },
  { name: 'Ngủ trước 23h', icon: 'moon', color: '#6366F1', kind: 'binary' },
  { name: 'Uống vitamin', icon: 'pill', color: '#EF4444', kind: 'binary' },
];
