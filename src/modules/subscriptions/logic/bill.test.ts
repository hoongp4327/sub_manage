import { describe, expect, it } from 'vitest';
import { transferNote } from './bill';

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
