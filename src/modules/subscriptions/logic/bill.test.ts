import { describe, expect, it } from 'vitest';
import { notePrefix, transferNote } from './bill';

const DUE = new Date(2026, 9, 12); // 12/10/2026

describe('transferNote', () => {
  it('mặc định lấy tên gói, bỏ dấu, in hoa, gắn tháng/năm', () => {
    // tên dài bị cắt cho đủ 25 ký tự — lý do cần cho sửa
    expect(transferNote({ name: 'ChatGPT Plus(chị Hòa)' }, DUE)).toBe('CHATGPT PLUS CHI T10 2026');
  });

  it('dùng nội dung người dùng tự đặt, vẫn tự gắn tháng/năm', () => {
    expect(transferNote({ name: 'ChatGPT Plus', transferNote: 'gpt chị hòa' }, DUE)).toBe('GPT CHI HOA T10 2026');
  });

  it('không bao giờ quá 25 ký tự và luôn giữ tháng/năm', () => {
    const n = transferNote({ name: 'x', transferNote: 'MOT NOI DUNG RAT RAT DAI QUA MUC CHO PHEP' }, DUE);
    expect(n.length).toBeLessThanOrEqual(25);
    expect(n.endsWith('T10 2026')).toBe(true);
  });

  it('để trống thì quay về tên gói', () => {
    expect(notePrefix({ name: 'Claude Pro', transferNote: '   ' }, DUE)).toBe('CLAUDE PRO');
  });
});
