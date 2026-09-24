import { describe, expect, it } from 'vitest';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { buildVietQR, crc16, sanitizeNote } from './vietqr';

/** Đọc các trường TLV cấp 1 */
function parse(s: string) {
  const out: Record<string, string> = {};
  for (let i = 0; i < s.length; ) {
    const id = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    out[id] = s.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
}

describe('crc16 CCITT-FALSE', () => {
  it('vector chuẩn', () => expect(crc16('123456789')).toBe('29B1'));
});

describe('buildVietQR', () => {
  const payload = buildVietQR({ bankBin: '970418', accountNumber: '1990766425', amount: 522500, note: 'CHATGPT PLUS T9 2026' });
  const f = parse(payload);

  it('cấu trúc đúng chuẩn', () => {
    expect(f['00']).toBe('01');
    expect(f['01']).toBe('12');
    expect(f['38']).toBe('0010A000000727012400069704180110199076642502' + '08QRIBFTTA');
    expect(f['53']).toBe('704');
    expect(f['54']).toBe('522500');
    expect(f['58']).toBe('VN');
    expect(f['62']).toBe('0820CHATGPT PLUS T9 2026');
  });
  it('CRC khớp', () => {
    expect(f['63']).toBe(crc16(payload.slice(0, -4)));
    expect(payload.endsWith(f['63'])).toBe(true);
  });
  it('QR tĩnh khi không có số tiền', () => {
    const p = parse(buildVietQR({ bankBin: '970418', accountNumber: '1990766425' }));
    expect(p['01']).toBe('11');
    expect(p['54']).toBeUndefined();
    expect(p['62']).toBeUndefined();
  });
  it('vẽ thành QR rồi quét lại ra đúng chuỗi', async () => {
    const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size, scale = 4, quiet = 4, w = (n + quiet * 2) * scale;
    const px = new Uint8ClampedArray(w * w * 4).fill(255);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (!qr.modules.get(x, y)) continue;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const i = (((y + quiet) * scale + dy) * w + (x + quiet) * scale + dx) * 4;
        px[i] = px[i + 1] = px[i + 2] = 0;
      }
    }
    expect(jsQR(px, w, w)?.data).toBe(payload);
  });
});

describe('sanitizeNote', () => {
  it('bỏ dấu, ký tự lạ, cắt 25 ký tự', () => {
    expect(sanitizeNote('Chị Dung — Claude Pro (tháng 10)')).toBe('Chi Dung Claude Pro thang');
    expect(sanitizeNote('Đ')).toBe('D');
  });
});
