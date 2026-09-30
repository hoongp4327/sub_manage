import { isoDate } from '../../../lib/format';
import { addCycles } from './calc';
import { sanitizeNote } from '../../../lib/vietqr';
import type { Subscription } from '../types';

/** Nội dung CK tối đa 25 ký tự không dấu (tương thích mọi ngân hàng). */
export const NOTE_MAX = 25;

/** Không dấu, in hoa, ≤ 25 ký tự. */
export const cleanNote = (s: string) => sanitizeNote(s).toUpperCase().slice(0, NOTE_MAX).trim();

/** Nội dung CK: người dùng đã đặt → dùng nguyên văn; chưa thì lấy tên gói. */
export const transferNote = (sub: Pick<Subscription, 'name' | 'transferNote'>) => cleanNote(sub.transferNote?.trim() || sub.name);

export interface BillPeriod {
  /** yyyy-mm-dd */
  from: string;
  to: string;
  /** true = người dùng tự sửa cho kỳ này */
  custom: boolean;
}

/**
 * Kỳ sử dụng trên bill: mặc định từ hạn thanh toán tới hết 1 chu kỳ.
 * Người dùng sửa → chỉ áp dụng cho đúng kỳ có hạn `due` đó; kỳ sau tự tính lại.
 */
export function billPeriod(sub: Pick<Subscription, 'cycleCount' | 'cycleUnit' | 'periodOverride'>, due: Date): BillPeriod {
  const o = sub.periodOverride;
  if (o && o.due === isoDate(due) && o.from && o.to) return { from: o.from, to: o.to, custom: true };
  return { from: isoDate(due), to: isoDate(addCycles(due, sub.cycleCount, sub.cycleUnit, 1)), custom: false };
}
