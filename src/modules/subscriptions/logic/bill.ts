import { sanitizeNote } from '../../../lib/vietqr';
import type { Subscription } from '../types';

/** Nội dung CK tối đa 25 ký tự không dấu (tương thích mọi ngân hàng). */
export const NOTE_MAX = 25;

/** Không dấu, in hoa, ≤ 25 ký tự. */
export const cleanNote = (s: string) => sanitizeNote(s).toUpperCase().slice(0, NOTE_MAX).trim();

/** Nội dung CK: người dùng đã đặt → dùng nguyên văn; chưa thì lấy tên gói. */
export const transferNote = (sub: Pick<Subscription, 'name' | 'transferNote'>) => cleanNote(sub.transferNote?.trim() || sub.name);
