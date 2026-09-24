import { supabase } from '../../../lib/supabase';
import type { Subscription } from '../types';

export interface SubscriptionRepo {
  list(): Promise<Subscription[]>;
  create(sub: Subscription): Promise<void>;
  update(id: string, patch: Partial<Subscription>): Promise<void>;
  destroy(id: string): Promise<void>;
  /** Nhập từ file sao lưu: trùng id thì ghi đè, còn lại giữ nguyên */
  importMany(list: Subscription[]): Promise<void>;
}

/* ---------- Local (localStorage) — chạy ngay, không cần cấu hình ---------- */

const KEY = 'subly.subscriptions.v1';

function read(): Subscription[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}
const write = (list: Subscription[]) => localStorage.setItem(KEY, JSON.stringify(list));

const localRepo: SubscriptionRepo = {
  async list() { return read(); },
  async create(sub) { write([...read(), sub]); },
  async update(id, patch) { write(read().map((s) => (s.id === id ? { ...s, ...patch } : s))); },
  async destroy(id) { write(read().filter((s) => s.id !== id)); },
  async importMany(list) {
    const ids = new Set(list.map((s) => s.id));
    write([...read().filter((s) => !ids.has(s.id)), ...list]);
  },
};

/* ---------- Supabase ---------- */

type Row = Record<string, unknown>;

const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const mapKeys = (o: Row, f: (k: string) => string): Row => Object.fromEntries(Object.entries(o).map(([k, v]) => [f(k), v]));

function remoteRepo(): SubscriptionRepo {
  const db = supabase!;
  const table = () => db.from('subscriptions');
  const check = ({ error }: { error: unknown }) => { if (error) throw error; };
  return {
    async list() {
      const { data, error } = await table().select('*').order('created_at');
      if (error) throw error;
      return (data as Row[]).map((r) => {
        const { userId: _u, ...rest } = mapKeys(r, toCamel);
        return { ...rest, price: Number(rest.price) } as unknown as Subscription;
      });
    },
    async create(sub) { check(await table().insert(mapKeys({ ...sub }, toSnake))); },
    async update(id, patch) { check(await table().update(mapKeys({ ...patch }, toSnake)).eq('id', id)); },
    async destroy(id) { check(await table().delete().eq('id', id)); },
    async importMany(list) {
      for (let i = 0; i < list.length; i += 500) {
        check(await table().upsert(list.slice(i, i + 500).map((s) => mapKeys({ ...s }, toSnake)), { defaultToNull: false }));
      }
    },
  };
}

export const repo: SubscriptionRepo = supabase ? remoteRepo() : localRepo;
export const isLocalMode = !supabase;

/** Mở app với ?demo để nạp dữ liệu mẫu giống ảnh thiết kế (chỉ chế độ local). */
export function seedDemoIfRequested() {
  if (!isLocalMode || !new URLSearchParams(location.search).has('demo')) return;
  const now = new Date().toISOString();
  const lastYear = '2025-01-01T00:00:00Z';
  const base = { currency: 'VND' as const, cycleCount: 1, cycleUnit: 'month' as const, status: 'active' as const, createdAt: lastYear, updatedAt: now };
  const archived = (id: string, name: string, presetId: string, category: Subscription['category'], price: number, at: string, reason: 'deleted' | 'cancelled'): Subscription =>
    ({ ...base, id, name, presetId, category, price, startDate: '2026-05-01', status: 'archived', archivedAt: at, archiveReason: reason, purchasedFrom: 'Trực tiếp' });
  write([
    { ...base, id: crypto.randomUUID(), name: 'ChatGPT Plus', presetId: 'chatgpt-plus', category: 'work', price: 480000, startDate: '2026-09-01', purchasedFrom: 'Trực tiếp' },
    { ...base, id: crypto.randomUUID(), name: 'Canva Pro', presetId: 'canva-pro', category: 'work', price: 280000, startDate: '2026-09-12' },
    { ...base, id: crypto.randomUUID(), name: 'Spotify Premium', presetId: 'spotify', category: 'entertainment', price: 165000, cycleCount: 3, startDate: '2026-08-10' },
    { ...base, id: crypto.randomUUID(), name: 'ChatGPT Plus', presetId: 'chatgpt-plus', category: 'work', price: 522500, startDate: '2026-08-28', isCollect: true, payer: 'chị Dung' },
    { ...base, id: crypto.randomUUID(), name: 'Claude Pro', presetId: 'claude-pro', category: 'work', price: 605390, startDate: '2026-09-15', isCollect: true, payer: 'chị Dung' },
    archived(crypto.randomUUID(), 'Netflix', 'netflix-premium', 'entertainment', 260000, '2026-09-20T08:00:00Z', 'deleted'),
    archived(crypto.randomUUID(), 'Notion Plus', 'notion-plus', 'work', 250000, '2026-09-03T08:00:00Z', 'cancelled'),
    archived(crypto.randomUUID(), 'YouTube Premium', 'youtube-premium', 'entertainment', 79000, '2026-08-15T08:00:00Z', 'deleted'),
    archived(crypto.randomUUID(), 'Google One 2TB', 'google-one-2tb', 'other', 45000, '2026-07-01T08:00:00Z', 'cancelled'),
  ]);
  history.replaceState(null, '', location.pathname);
}
