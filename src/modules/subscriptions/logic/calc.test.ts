import { describe, expect, it } from 'vitest';
import { isoDate } from '../../../lib/format';
import type { Subscription } from '../types';
import { cycleLabel, daysUntil, expiredIds, isSoon, monthlyEquivalent, nextRenewal, perCycleLabel, roundK, summarize } from './calc';

const TODAY = new Date(2026, 8, 24); // 24/09/2026

function sub(p: Partial<Subscription>): Subscription {
  return {
    id: Math.random().toString(36),
    name: 'X',
    category: 'other',
    price: 100000,
    currency: 'VND',
    cycleCount: 1,
    cycleUnit: 'month',
    startDate: '2026-09-01',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...p,
  };
}

// 3 gói trong ảnh mẫu
const chatgpt = sub({ name: 'ChatGPT Plus', price: 480000, startDate: '2026-09-01' });
const canva = sub({ name: 'Canva Pro', price: 280000, startDate: '2026-09-12' });
const spotify = sub({ name: 'Spotify Premium', price: 165000, cycleCount: 3, startDate: '2026-08-10' });

describe('monthlyEquivalent', () => {
  it('quy đổi theo tháng', () => {
    expect(monthlyEquivalent(chatgpt)).toBe(480000);
    expect(monthlyEquivalent(spotify)).toBe(55000);
  });
  it('quy đổi theo năm', () => {
    expect(monthlyEquivalent({ price: 948000, cycleCount: 1, cycleUnit: 'year' })).toBe(79000);
    expect(monthlyEquivalent({ price: 1800000, cycleCount: 2, cycleUnit: 'year' })).toBe(75000);
  });
  it('quy đổi theo tuần và ngày', () => {
    expect(roundK(monthlyEquivalent({ price: 12000, cycleCount: 1, cycleUnit: 'week' }))).toBe(52000);
    expect(roundK(monthlyEquivalent({ price: 30000, cycleCount: 30, cycleUnit: 'day' }))).toBe(30000);
  });
});

describe('summarize — khớp ảnh mẫu', () => {
  const s = summarize([chatgpt, canva, spotify], TODAY);
  it('tổng tháng / năm', () => {
    expect(s.monthly).toBe(815000);
    expect(s.yearly).toBe(9780000);
  });
  it('1 gói sắp hết hạn', () => expect(s.soonCount).toBe(1));
  it('bỏ qua gói đã lưu trữ', () => {
    const archived = sub({ price: 999000, status: 'archived', archivedAt: '2026-09-20T00:00:00Z' });
    expect(summarize([chatgpt, canva, spotify, archived], TODAY).monthly).toBe(815000);
  });
});

describe('gói thu hộ', () => {
  const collect = sub({ price: 522500, isCollect: true, payer: 'chị Dung', startDate: '2026-09-28' });
  const s = summarize([chatgpt, canva, spotify, collect], TODAY);
  it('không tính vào tổng tháng / năm của mình', () => {
    expect(s.monthly).toBe(815000);
    expect(s.yearly).toBe(9780000);
  });
  it('có tổng riêng', () => expect(s.collectMonthly).toBe(523000));
  it('vẫn tính vào sắp hết hạn', () => expect(s.soonCount).toBe(2));
  it('không làm lệch % so với tháng trước', () => {
    const old = sub({ price: 900000, isCollect: true });
    expect(summarize([chatgpt, old], TODAY).changePct).toBe(0);
  });
});

describe('nextRenewal', () => {
  const next = (p: Partial<Subscription>) => isoDate(nextRenewal(sub(p), TODAY));

  it('ảnh mẫu', () => {
    expect(isoDate(nextRenewal(chatgpt, TODAY))).toBe('2026-10-01');
    expect(isoDate(nextRenewal(canva, TODAY))).toBe('2026-10-12');
    expect(isoDate(nextRenewal(spotify, TODAY))).toBe('2026-11-10');
    expect(daysUntil(nextRenewal(chatgpt, TODAY), TODAY)).toBe(7);
  });
  it('thanh toán hôm nay → gia hạn kỳ sau', () => expect(next({ startDate: '2026-09-24' })).toBe('2026-10-24'));
  it('đúng ngày gia hạn → hôm nay', () => expect(next({ startDate: '2026-08-24' })).toBe('2026-09-24'));
  it('ngày bắt đầu trong tương lai', () => expect(next({ startDate: '2026-10-05' })).toBe('2026-10-05'));
  it('31/01 + tháng không bị trôi ngày', () => {
    const t = new Date(2026, 1, 15);
    expect(isoDate(nextRenewal(sub({ startDate: '2026-01-31' }), t))).toBe('2026-02-28');
    expect(isoDate(nextRenewal(sub({ startDate: '2026-01-31' }), new Date(2026, 2, 1)))).toBe('2026-03-31');
  });
  it('năm nhuận', () => {
    expect(isoDate(nextRenewal(sub({ startDate: '2024-02-29', cycleUnit: 'year' }), new Date(2026, 5, 1)))).toBe('2027-02-28');
    expect(isoDate(nextRenewal(sub({ startDate: '2024-02-29', cycleUnit: 'year' }), new Date(2027, 5, 1)))).toBe('2028-02-29');
  });
  it('chu kỳ ngày và tuần', () => {
    expect(next({ startDate: '2026-09-20', cycleUnit: 'day', cycleCount: 7 })).toBe('2026-09-27');
    expect(next({ startDate: '2020-01-01', cycleUnit: 'day', cycleCount: 1 })).toBe('2026-09-24');
    expect(next({ startDate: '2026-09-01', cycleUnit: 'week', cycleCount: 2 })).toBe('2026-09-29');
  });
  it('nhiều năm trước', () => expect(next({ startDate: '2019-03-10', cycleCount: 3 })).toBe('2026-12-10'));
});

describe('isSoon / expiredIds', () => {
  it('≤ 7 ngày là sắp hết hạn', () => {
    expect(isSoon(chatgpt, TODAY)).toBe(true);
    expect(isSoon(canva, TODAY)).toBe(false);
  });
  it('gói hủy gia hạn hết kỳ', () => {
    const a = sub({ id: 'a', endsAt: '2026-09-24' });
    const b = sub({ id: 'b', endsAt: '2026-10-01' });
    expect(expiredIds([a, b, chatgpt], TODAY)).toEqual(['a']);
  });
});

describe('% so với tháng trước', () => {
  it('tăng khi thêm gói mới trong tháng', () => {
    const newOne = sub({ price: 200000, createdAt: '2026-09-10T00:00:00Z', startDate: '2026-09-10' });
    const s = summarize([sub({ price: 1000000 }), newOne], TODAY);
    expect(s.changePct).toBe(20);
  });
  it('không có dữ liệu → null', () => {
    expect(summarize([sub({ createdAt: '2026-09-20T00:00:00Z' })], TODAY).changePct).toBeNull();
  });
});

describe('nhãn', () => {
  it('chu kỳ', () => {
    expect(cycleLabel(3, 'month')).toBe('3 tháng');
    expect(perCycleLabel(1, 'month')).toBe('/tháng');
    expect(perCycleLabel(1, 'year')).toBe('/năm');
    expect(perCycleLabel(3, 'month')).toBe('/3 tháng');
  });
});
