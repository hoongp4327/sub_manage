/**
 * Tài khoản nhận tiền cho bill thu hộ.
 * Mỗi bill tự tạo mã VietQR đã điền sẵn số tiền + nội dung chuyển khoản.
 *
 * Mã BIN một số ngân hàng: BIDV 970418 · Vietcombank 970436 · VietinBank 970415
 * Techcombank 970407 · MB 970422 · ACB 970416 · VPBank 970432 · TPBank 970423
 */
export const PAYMENT = {
  bankBin: '970418',
  bankName: 'BIDV',
  accountNumber: '1990766425',
  /** Tên chủ tài khoản (không bắt buộc) — chỉ để hiện trên bill, vd 'NGUYEN VAN A' */
  accountName: '',
};
