import type { ComponentType, ReactNode } from 'react';
import { BarChart3, FileText, type LucideIcon } from 'lucide-react';
import { habitsModule } from '../modules/habits';
import { subscriptionsModule } from '../modules/subscriptions';

export interface AppModule {
  id: string;
  name: string;
  icon: LucideIcon;
  path: string;
  routes: { path: string; element: ReactNode }[];
  /** Dòng tóm tắt nhỏ hiện trên ô ở Trang chủ */
  Summary?: ComponentType;
}

/** Thêm module mới: tạo thư mục trong src/modules/ rồi thêm vào đây. */
export const MODULES: AppModule[] = [subscriptionsModule, habitsModule];

/** Ô "Sắp có" trên Trang chủ. */
export const UPCOMING: { name: string; icon: LucideIcon }[] = [
  { name: 'Chi tiêu', icon: BarChart3 },
  { name: 'Ghi chú', icon: FileText },
];
