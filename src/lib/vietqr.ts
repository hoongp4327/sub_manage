import QRCode from 'qrcode';

/**
 * Tạo chuỗi VietQR (chuẩn NAPAS, dựa trên EMVCo) ngay trên máy — không gọi dịch vụ ngoài.
 * Chuỗi này được vẽ thành mã QR; app ngân hàng quét sẽ điền sẵn STK, số tiền, nội dung.
 */

const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — trường 63 của EMVCo. */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(input)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Nội dung CK an toàn cho mọi ngân hàng: không dấu, chỉ chữ số + khoảng trắng, tối đa 25 ký tự. */
export function sanitizeNote(note: string): string {
  return note
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 25)
    .trim();
}

export interface VietQRInput {
  /** Mã BIN ngân hàng (BIDV = 970418) */
  bankBin: string;
  accountNumber: string;
  /** VNĐ, số nguyên. Bỏ trống = QR tĩnh, người trả tự nhập số tiền */
  amount?: number;
  note?: string;
}

export function buildVietQR({ bankBin, accountNumber, amount, note }: VietQRInput): string {
  const beneficiary = tlv('00', bankBin) + tlv('01', accountNumber.replace(/\s/g, ''));
  const merchant = tlv('00', 'A000000727') + tlv('01', beneficiary) + tlv('02', 'QRIBFTTA');
  const cleanNote = note ? sanitizeNote(note) : '';

  let payload =
    tlv('00', '01') +
    tlv('01', amount ? '12' : '11') +
    tlv('38', merchant) +
    tlv('53', '704') +
    (amount ? tlv('54', String(Math.round(amount))) : '') +
    tlv('58', 'VN') +
    (cleanNote ? tlv('62', tlv('08', cleanNote)) : '');

  payload += '6304';
  return payload + crc16(payload);
}

/** Vẽ chuỗi thành ảnh QR (SVG data URL) — chạy đồng bộ, không cần mạng. */
export function qrDataUrl(text: string): string {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n = modules.size;
  const q = 2; // viền trắng
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (modules.get(x, y)) d += `M${x + q} ${y + q}h1v1h-1z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + q * 2} ${n + q * 2}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
