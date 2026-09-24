import { describe, expect, it } from 'vitest';
import type { Habit, HabitLog, Level } from '../types';
import { allColumns, dayLabel, daysBetween, habitStart, habitStats, indexLogs, sortForToday, todayAverage, weekColumns } from './calc';

const TODAY = new Date(2026, 8, 24); // T5, 24/09/2026

function habit(id: string, p: Partial<Habit> = {}): Habit {
  return { id, name: id, color: '#22C55E', icon: 'dumbbell', status: 'active', createdAt: '2026-09-01T03:00:00Z', updatedAt: '2026-09-01T03:00:00Z', ...p };
}
const log = (habitId: string, date: string, level: Level): HabitLog => ({ habitId, date, level, updatedAt: '' });

describe('todayAverage', () => {
  it('trung bình % của mọi thói quen — ví dụ 60, 80, 20, 100, 100 → 72', () => {
    const hs = ['a', 'b', 'c', 'd', 'e'].map((id) => habit(id));
    const idx = indexLogs([log('a', '2026-09-24', 3), log('b', '2026-09-24', 4), log('c', '2026-09-24', 1), log('d', '2026-09-24', 5), log('e', '2026-09-24', 5)]);
    expect(todayAverage(hs, idx, TODAY)).toBe(72);
  });

  it('chưa ghi tính 0, bỏ qua thói quen đã xóa', () => {
    const hs = [habit('a'), habit('b'), habit('x', { status: 'archived' })];
    const idx = indexLogs([log('a', '2026-09-24', 5), log('x', '2026-09-24', 5)]);
    expect(todayAverage(hs, idx, TODAY)).toBe(50);
  });

  it('chỉ 100% khi tất cả đều 100%', () => {
    const hs = [habit('a'), habit('b'), habit('c')];
    const idx = indexLogs([log('a', '2026-09-24', 5), log('b', '2026-09-24', 5), log('c', '2026-09-24', 5)]);
    expect(todayAverage(hs, idx, TODAY)).toBe(100);
    expect(todayAverage(hs, indexLogs([log('a', '2026-09-24', 5), log('b', '2026-09-24', 5), log('c', '2026-09-24', 4)]), TODAY)).toBe(93);
  });

  it('null khi chưa có thói quen', () => {
    expect(todayAverage([], new Map(), TODAY)).toBeNull();
  });
});

describe('habitStats', () => {
  const idx = indexLogs([log('a', '2026-09-24', 5), log('a', '2026-09-23', 3), log('a', '2026-09-10', 5), log('a', '2026-08-01', 5)]);

  it('7d: 2 ngày hoạt động, TB = (100 + 60) / 7', () => {
    expect(habitStats({ id: 'a' }, idx, TODAY, '7d', '2026-08-01')).toEqual({ active: 2, avg: 23 });
  });

  it('30d: tính 3 ngày có ghi trong 30 ngày', () => {
    expect(habitStats({ id: 'a' }, idx, TODAY, '30d', '2026-08-01')).toEqual({ active: 3, avg: Math.round(260 / 30) });
  });

  it('thói quen mới tạo: chỉ chia cho số ngày từ lúc bắt đầu', () => {
    const idx2 = indexLogs([log('b', '2026-09-24', 5), log('b', '2026-09-23', 5)]);
    expect(habitStats({ id: 'b' }, idx2, TODAY, '30d', '2026-09-23')).toEqual({ active: 2, avg: 100 });
  });

  it('all: từ ngày bắt đầu', () => {
    const s = habitStats({ id: 'a' }, idx, TODAY, 'all', '2026-08-01');
    expect(s.active).toBe(4);
    expect(s.avg).toBe(Math.round(360 / 55));
  });
});

describe('Có/Không', () => {
  it('đã ghi = 100% dù log cũ là mức thấp; chưa ghi = 0', () => {
    const hs = [habit('a', { kind: 'binary' }), habit('b', { kind: 'binary' })];
    const idx = indexLogs([log('a', '2026-09-24', 2)]);
    expect(todayAverage(hs, idx, TODAY)).toBe(50);
    expect(habitStats({ id: 'a', kind: 'binary' }, idx, TODAY, '7d', '2026-09-01')).toEqual({ active: 1, avg: 14 });
  });
});

describe('habitStart', () => {
  it('lấy ngày tạo, hoặc log sớm hơn', () => {
    expect(habitStart({ createdAt: '2026-09-10T03:00:00Z' })).toBe('2026-09-10');
    expect(habitStart({ createdAt: '2026-09-10T03:00:00Z' }, '2026-09-08')).toBe('2026-09-08');
    expect(habitStart({ createdAt: '2026-09-10T03:00:00Z' }, '2026-09-12')).toBe('2026-09-10');
  });
});

describe('lưới ngày', () => {
  it('daysBetween tính cả hai đầu', () => {
    expect(daysBetween('2026-09-22', '2026-09-24')).toEqual(['2026-09-22', '2026-09-23', '2026-09-24']);
  });

  it('weekColumns bắt đầu T2, kết thúc CN', () => {
    const cols = weekColumns('2026-09-16', '2026-09-24');
    expect(cols).toHaveLength(2);
    expect(cols[0][0]).toBe('2026-09-14');
    expect(cols[1][6]).toBe('2026-09-27');
  });

  it('allColumns: đúng 26 tuần = 182 ô, kết thúc ở tuần hiện tại', () => {
    const cols = allColumns(TODAY);
    expect(cols).toHaveLength(26);
    expect(cols.flat()).toHaveLength(182);
    expect(cols[25]).toContain('2026-09-24');
    expect(cols[0][0]).toBe('2026-03-30');
  });
});

describe('sortForToday', () => {
  it('đủ 100% xuống dưới, còn lại giữ thứ tự tạo', () => {
    const hs = [habit('a', { createdAt: '2026-09-01T00:00:00Z' }), habit('b', { createdAt: '2026-09-02T00:00:00Z' }), habit('c', { createdAt: '2026-09-03T00:00:00Z' })];
    const idx = indexLogs([log('a', '2026-09-24', 5), log('b', '2026-09-24', 3)]);
    expect(sortForToday(hs, idx, TODAY).map((h) => h.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('dayLabel', () => {
  it('Hôm nay / Hôm qua / T3, 22/9', () => {
    expect(dayLabel('2026-09-24', TODAY)).toBe('Hôm nay');
    expect(dayLabel('2026-09-23', TODAY)).toBe('Hôm qua');
    expect(dayLabel('2026-09-22', TODAY)).toBe('T3, 22/9');
  });
});
