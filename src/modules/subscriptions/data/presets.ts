import { normalize } from '../../../lib/format';
import type { Category, CycleUnit } from '../types';

export interface Preset {
  id: string;
  name: string;
  emoji: string;
  category: Category;
  /** Giá tham khảo tại VN — người dùng luôn sửa được */
  price: number;
  cycleCount: number;
  cycleUnit: CycleUnit;
  /** Hiện trong lưới "Bạn đang dùng gì?" */
  featured?: boolean;
}

const m = (id: string, name: string, emoji: string, category: Category, price: number, featured = false, cycleCount = 1, cycleUnit: CycleUnit = 'month'): Preset =>
  ({ id, name, emoji, category, price, cycleCount, cycleUnit, featured });

export const PRESETS: Preset[] = [
  m('chatgpt-plus', 'ChatGPT Plus', '🤖', 'work', 480000, true),
  m('chatgpt-pro', 'ChatGPT Pro', '🤖', 'work', 5000000),
  m('claude-pro', 'Claude Pro', '✳️', 'work', 480000, true),
  m('claude-max', 'Claude Max', '✳️', 'work', 2500000),
  m('gemini-pro', 'Google AI Pro', '✨', 'work', 489000),
  m('cursor-pro', 'Cursor Pro', '⌨️', 'work', 520000),
  m('github-copilot', 'GitHub Copilot', '🐙', 'work', 260000),
  m('midjourney', 'Midjourney', '⛵', 'work', 260000),
  m('canva-pro', 'Canva Pro', '🎨', 'work', 280000, true),
  m('notion-plus', 'Notion Plus', '📝', 'work', 250000, true),
  m('figma-pro', 'Figma Professional', '✏️', 'work', 400000, true),
  m('adobe-cc', 'Adobe Creative Cloud', '🅰️', 'work', 1400000),
  m('ms365-personal', 'Microsoft 365 Personal', '🪟', 'work', 1190000, true, 1, 'year'),
  m('ms365-family', 'Microsoft 365 Family', '🪟', 'work', 1690000, false, 1, 'year'),
  m('capcut-pro', 'CapCut Pro', '✂️', 'work', 229000, true),
  m('spotify', 'Spotify Premium', '🎵', 'entertainment', 59000, true),
  m('spotify-duo', 'Spotify Duo', '🎵', 'entertainment', 79000),
  m('spotify-family', 'Spotify Family', '🎵', 'entertainment', 95000),
  m('youtube-premium', 'YouTube Premium', '▶️', 'entertainment', 79000, true),
  m('youtube-family', 'YouTube Premium Family', '▶️', 'entertainment', 149000),
  m('netflix-mobile', 'Netflix Mobile', '🎬', 'entertainment', 74000),
  m('netflix-standard', 'Netflix Standard', '🎬', 'entertainment', 220000),
  m('netflix-premium', 'Netflix Premium', '🎬', 'entertainment', 260000, true),
  m('apple-music', 'Apple Music', '🎧', 'entertainment', 65000),
  m('vieon', 'VieON VIP', '📺', 'entertainment', 99000),
  m('fpt-play', 'FPT Play', '📺', 'entertainment', 88000),
  m('duolingo', 'Duolingo Super', '🦉', 'other', 699000, false, 1, 'year'),
  m('icloud-50', 'iCloud+ 50GB', '☁️', 'other', 19000),
  m('icloud-200', 'iCloud+ 200GB', '☁️', 'other', 59000, true),
  m('icloud-2tb', 'iCloud+ 2TB', '☁️', 'other', 199000),
  m('google-one-100', 'Google One 100GB', '💾', 'other', 45000),
  m('google-one-2tb', 'Google One 2TB', '💾', 'other', 225000, true),
];

export const presetById = (id?: string | null) => (id ? PRESETS.find((p) => p.id === id) : undefined);

export function searchPresets(query: string, limit = 5): Preset[] {
  const q = normalize(query);
  if (!q) return [];
  const hits = PRESETS.filter((p) => normalize(p.name).includes(q));
  // khớp đầu tên lên trước
  return hits.sort((a, b) => Number(!normalize(a.name).startsWith(q)) - Number(!normalize(b.name).startsWith(q))).slice(0, limit);
}

/** Đoán phân loại từ tên khi người dùng gõ tên tự do. */
export function guessCategory(name: string): Category | undefined {
  const q = normalize(name);
  if (!q) return undefined;
  const p = PRESETS.find((x) => q.includes(normalize(x.name).split(' ')[0]));
  return p?.category;
}
