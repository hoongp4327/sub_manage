export type Category = 'work' | 'entertainment' | 'other';
export type CycleUnit = 'day' | 'week' | 'month' | 'year';
export type Status = 'active' | 'archived';
/** deleted = người dùng xóa · cancelled = hết hạn sau khi hủy gia hạn */
export type ArchiveReason = 'deleted' | 'cancelled';

export interface Subscription {
  id: string;
  name: string;
  presetId?: string | null;
  category: Category;
  /** Số tiền mỗi chu kỳ, VNĐ, số nguyên */
  price: number;
  currency: 'VND';
  cycleCount: number;
  cycleUnit: CycleUnit;
  /** yyyy-mm-dd — ngày thanh toán đầu tiên / gần nhất */
  startDate: string;
  purchasedFrom?: string | null;
  note?: string | null;
  /** Gói thu hộ: trả giúp người khác, không tính vào tổng của mình */
  isCollect?: boolean;
  /** Người cần thu tiền (với gói thu hộ) */
  payer?: string | null;
  /** Đã hủy gia hạn: vẫn dùng đến ngày này (yyyy-mm-dd), sau đó tự vào Lưu trữ */
  endsAt?: string | null;
  status: Status;
  archivedAt?: string | null;
  archiveReason?: ArchiveReason | null;
  createdAt: string;
  updatedAt: string;
}

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'work', label: 'Làm việc', emoji: '💼' },
  { id: 'entertainment', label: 'Giải trí', emoji: '🎬' },
  { id: 'other', label: 'Khác', emoji: '📦' },
];

export const categoryOf = (id: Category) => CATEGORIES.find((c) => c.id === id)!;
