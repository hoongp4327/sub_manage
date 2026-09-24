import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { Range } from '../logic/calc';
import { iconOf, LEVELS, type Level } from '../types';
import { levelColor } from './Heatmap';

export const vibrate = (ms = 10) => navigator.vibrate?.(ms);

/* ---------- Icon thói quen ---------- */

export function HabitIcon({ icon, color, size = 'md' }: { icon: string; color: string; size?: 'sm' | 'md' }) {
  const Icon = iconOf(icon);
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl text-white ${size === 'sm' ? 'size-9' : 'size-11'}`} style={{ background: color }}>
      <Icon size={size === 'sm' ? 18 : 22} strokeWidth={2.25} />
    </span>
  );
}

/* ---------- Bộ lọc All · 30d · 7d ---------- */

const RANGES: { id: Range; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: '30d', label: '30d' },
  { id: '7d', label: '7d' },
];
const RANGE_KEY = 'habits.range';

/** Nhớ bộ lọc trong trình duyệt (dùng chung danh sách và chi tiết). */
export function useRange(): [Range, (r: Range) => void] {
  const [range, setRange] = useState<Range>(() => {
    try {
      const v = localStorage.getItem(RANGE_KEY);
      if (v === 'all' || v === '30d' || v === '7d') return v;
    } catch { /* bỏ qua */ }
    return '30d';
  });
  const set = (r: Range) => {
    setRange(r);
    try { localStorage.setItem(RANGE_KEY, r); } catch { /* bỏ qua */ }
  };
  return [range, set];
}

export function RangeTabs({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div role="tablist" className="flex rounded-full bg-chip p-1">
      {RANGES.map((r) => (
        <button
          key={r.id}
          role="tab"
          aria-selected={value === r.id}
          onClick={() => onChange(r.id)}
          className={`h-9 flex-1 rounded-full text-[15px] transition-colors ${value === r.id ? 'bg-ink font-semibold text-white' : 'text-muted hover:text-ink'}`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Nút tick: chạm = 100% / mở chọn mức, giữ lâu = chọn mức ---------- */

export function CheckButton({ level, color, label, binary, onTap, onLongPress }: { level?: Level; color: string; label: string; binary?: boolean; onTap: () => void; onLongPress: () => void }) {
  const timer = useRef<number | undefined>(undefined);
  const long = useRef(false);
  const clear = () => window.clearTimeout(timer.current);
  useEffect(() => clear, []);

  const r = 17;
  const c = 2 * Math.PI * r;
  const done = level === 5;

  return (
    <button
      type="button"
      aria-label={!level ? `Hoàn thành ${label}` : binary ? `${label}: đã xong. Chạm để bỏ` : `${label}: ${level * 20}%. Chạm để đổi mức`}
      onPointerDown={() => {
        long.current = false;
        clear();
        timer.current = window.setTimeout(() => {
          long.current = true;
          vibrate();
          onLongPress();
        }, 450);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation();
        if (long.current) return void (long.current = false);
        onTap();
      }}
      className="relative z-10 grid size-12 shrink-0 touch-manipulation place-items-center rounded-full transition-transform select-none active:scale-90"
    >
      {done ? (
        <span className="grid size-10 place-items-center rounded-full text-white" style={{ background: color }}>
          <Check size={22} strokeWidth={3} />
        </span>
      ) : (
        <svg viewBox="0 0 40 40" className="size-10 -rotate-90">
          <circle cx="20" cy="20" r={r} fill="none" stroke="#DADAD6" strokeWidth="2" />
          {level && <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(c * level) / 5} ${c}`} />}
          {level && (
            <text x="20" y="20" transform="rotate(90 20 20)" textAnchor="middle" dominantBaseline="central" className="money fill-ink text-[10px] font-semibold">
              {level * 20}
            </text>
          )}
        </svg>
      )}
    </button>
  );
}

/* ---------- Hàng chọn mức 20 · 40 · 60 · 80 · 100 + xóa ---------- */

export function LevelPicker({ color, value, onPick, size = 'md' }: { color: string; value?: Level; onPick: (l: Level | null) => void; size?: 'md' | 'lg' }) {
  const dot = size === 'lg' ? 'size-9' : 'size-7';
  return (
    <div className="flex items-start justify-between gap-1">
      {LEVELS.map((l) => (
        <button
          key={l}
          type="button"
          aria-label={`${l * 20}%`}
          aria-pressed={value === l}
          onClick={(e) => {
            e.stopPropagation();
            vibrate();
            onPick(l);
          }}
          className="flex min-h-12 min-w-11 flex-1 flex-col items-center gap-1 rounded-xl pt-1 hover:bg-chip"
        >
          <span
            className={`${dot} rounded-full transition-transform ${value === l ? 'scale-110' : ''}`}
            style={{
              background: levelColor(color, l),
              boxShadow: value === l ? `0 0 0 2px white, 0 0 0 4px #111` : l === 1 ? `inset 0 0 0 1px ${color}55` : undefined,
            }}
          />
          <span className={`money text-[11px] ${value === l ? 'font-bold text-ink' : 'text-muted'}`}>{l * 20}</span>
        </button>
      ))}
      <button
        type="button"
        aria-label="Xóa mức của ngày này"
        disabled={!value}
        onClick={(e) => {
          e.stopPropagation();
          onPick(null);
        }}
        className="flex min-h-12 min-w-11 flex-col items-center gap-1 rounded-xl pt-1 text-muted hover:bg-chip disabled:opacity-30"
      >
        <span className={`${dot} grid place-items-center rounded-full border border-line`}>
          <X size={16} />
        </span>
        <span className="text-[11px]">Xóa</span>
      </button>
    </div>
  );
}
