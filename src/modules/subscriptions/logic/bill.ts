import { sanitizeNote } from '../../../lib/vietqr';
import type { Subscription } from '../types';

/** Nội dung CK tối đa 25 ký tự không dấu (tương thích mọi ngân hàng). */
export const NOTE_MAX = 25;

/** " T10 2026" — luôn gắn cuối để mỗi kỳ tự đổi tháng. */
export const noteSuffix = (due: Date) => ` T${due.getMonth() + 1} ${due.getFullYear()}`;

/** Số ký tự còn lại cho phần chữ người dùng tự đặt. */
export const notePrefixMax = (due: Date) => NOTE_MAX - noteSuffix(due).length;

/** Phần chữ: người dùng đã đặt → dùng; chưa thì lấy tên gói. Không dấu, in hoa, cắt cho vừa. */
export function notePrefix(sub: Pick<Subscription, 'name' | 'transferNote'>, due: Date): string {
  return sanitizeNote(sub.transferNote?.trim() || sub.name).toUpperCase().slice(0, notePrefixMax(due)).trim();
}

/** Nội dung CK đầy đủ — vd "GPT CHI HOA T10 2026". */
export const transferNote = (sub: Pick<Subscription, 'name' | 'transferNote'>, due: Date) => sanitizeNote(notePrefix(sub, due) + noteSuffix(due));
