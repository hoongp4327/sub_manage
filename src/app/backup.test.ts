import { describe, expect, it } from 'vitest';
import { backupFileName, countsOf, parseBackup } from './backup';

const valid = {
  app: 'super-personal-app',
  version: 1,
  exportedAt: '2026-09-24T08:00:00Z',
  subscriptions: [{ id: 's1', name: 'ChatGPT Plus', price: 480000 }],
  habits: [{ id: 'h1', name: 'Tập gym' }, { id: 'h2', name: 'Thiền', kind: 'binary' }],
  habitLogs: [
    { habitId: 'h1', date: '2026-09-24', level: 5 },
    { habitId: 'gone', date: '2026-09-24', level: 3 },
  ],
};

describe('parseBackup', () => {
  it('đọc file hợp lệ, bỏ log mồ côi, điền kind mặc định', () => {
    const b = parseBackup(JSON.stringify(valid));
    expect(countsOf(b)).toEqual({ subscriptions: 1, habits: 2, habitLogs: 1 });
    expect(b.habits.map((h) => h.kind)).toEqual(['percent', 'binary']);
  });

  it('thiếu mảng thì coi như rỗng', () => {
    const b = parseBackup(JSON.stringify({ app: 'super-personal-app', version: 1 }));
    expect(countsOf(b)).toEqual({ subscriptions: 0, habits: 0, habitLogs: 0 });
  });

  it('báo lỗi dễ hiểu với file sai', () => {
    expect(() => parseBackup('không phải json')).toThrow('File không đọc được');
    expect(() => parseBackup('{"foo":1}')).toThrow('không phải file sao lưu');
    expect(() => parseBackup(JSON.stringify({ ...valid, version: 2 }))).toThrow('phiên bản');
    expect(() => parseBackup(JSON.stringify({ ...valid, habits: [{ name: 'x' }] }))).toThrow('hỏng');
  });
});

describe('backupFileName', () => {
  it('có ngày để phân biệt các lần xuất', () => {
    expect(backupFileName(new Date(2026, 8, 4))).toBe('super-personal-app-2026-09-04.json');
  });
});
