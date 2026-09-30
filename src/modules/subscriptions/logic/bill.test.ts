import { describe, expect, it } from 'vitest';
import { billPeriod, transferNote } from './bill';

describe('transferNote', () => {
  it('mặc định lấy tên gói, bỏ dấu, in hoa, không thêm tháng/năm', () => {
    expect(transferNote({ name: 'ChatGPT Plus(chị Hòa)' })).toBe('CHATGPT PLUS CHI HOA');
  });

  it('dùng nguyên văn nội dung người dùng tự đặt', () => {
    expect(transferNote({ name: 'ChatGPT Plus', transferNote: 'gpt chị hòa tháng 10' })).toBe('GPT CHI HOA THANG 10');
  });

  it('không bao giờ quá 25 ký tự', () => {
    expect(transferNote({ name: 'x', transferNote: 'MOT NOI DUNG RAT RAT DAI QUA MUC CHO PHEP' }).length).toBeLessThanOrEqual(25);
  });

  it('để trống thì quay về tên gói', () => {
    expect(transferNote({ name: 'Claude Pro', transferNote: '   ' })).toBe('CLAUDE PRO');
  });
});

describe('billPeriod', () => {
  const DUE = new Date(2026, 9, 12); // 12/10/2026
  const base = { cycleCount: 1, cycleUnit: 'month' as const };

  it('mặc định: từ hạn thanh toán tới hết 1 chu kỳ', () => {
    expect(billPeriod(base, DUE)).toEqual({ from: '2026-10-12', to: '2026-11-12', custom: false });
  });

  it('dùng kỳ đã sửa nếu đúng kỳ đang thu', () => {
    const sub = { ...base, periodOverride: { due: '2026-10-12', from: '2026-09-12', to: '2026-10-11' } };
    expect(billPeriod(sub, DUE)).toEqual({ from: '2026-09-12', to: '2026-10-11', custom: true });
  });

  it('sang kỳ sau thì bỏ qua kỳ đã sửa, tự tính lại', () => {
    const sub = { ...base, periodOverride: { due: '2026-09-12', from: '2026-08-12', to: '2026-09-11' } };
    expect(billPeriod(sub, DUE).custom).toBe(false);
  });
});
