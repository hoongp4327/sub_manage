import type { CSSProperties } from 'react';
import { parseISO, subDays } from 'date-fns';
import { isoDate } from '../../../lib/format';
import { allColumns, daysBetween, logKey, weekColumns, weekdayShort, type LogIndex, type Range } from '../logic/calc';
import type { Level } from '../types';

export const EMPTY = '#ECECEA';
const BEFORE = '#F5F5F3';
/** % màu gốc trộn với trắng cho từng mức — mức 1 phải khác rõ ô xám */
const MIX: Record<Level, number> = { 1: 30, 2: 48, 3: 66, 4: 84, 5: 100 };

export const levelColor = (color: string, level?: Level | null) =>
  !level ? EMPTY : level === 5 ? color : `color-mix(in srgb, ${color} ${MIX[level]}%, white)`;

type CellKind = 'before' | 'day' | 'future';

/** Không viền ô hôm nay — chỉ ô đang chọn (màn chi tiết) có viền màu thói quen. */
function cellStyle(kind: CellKind, color: string, level: Level | undefined, _isToday: boolean, selected = false): CSSProperties {
  if (kind === 'future') return { border: '1px dashed #D6D6D3' };
  const s: CSSProperties = { background: kind === 'before' ? BEFORE : levelColor(color, level) };
  if (selected) s.boxShadow = `0 0 0 2px white, 0 0 0 4px ${color}`;
  return s;
}

interface Base {
  habitId: string;
  color: string;
  index: LogIndex;
  today: Date;
  /** Ngày bắt đầu của thói quen (yyyy-mm-dd) */
  start: string;
  /** Kiểu Có/Không: đã ghi = màu đậm nhất */
  binary?: boolean;
}

const levelAt = (index: LogIndex, habitId: string, d: string, binary?: boolean): Level | undefined => {
  const l = index.get(logKey(habitId, d));
  return l && binary ? 5 : l;
};

const kindOf = (d: string, start: string, todayISO: string): CellKind => (d > todayISO ? 'future' : d < start ? 'before' : 'day');

/* ---------------- Thẻ ở màn danh sách (chỉ xem) ---------------- */

export function MiniHeatmap({ habitId, color, index, binary, today, start, range }: Base & { range: Range }) {
  const t = isoDate(today);
  const cell = (d: string, className: string, style?: CSSProperties) => (
    <span key={d} className={className} style={{ ...cellStyle(kindOf(d, start, t), color, levelAt(index, habitId, d, binary), d === t), ...style }} />
  );

  if (range !== 'all') {
    const n = range === '7d' ? 7 : 30;
    const days = daysBetween(isoDate(subDays(today, n - 1)), t);
    return (
      <div aria-hidden className={range === '7d' ? 'grid max-w-[220px] grid-cols-7 gap-1.5' : 'grid max-w-[260px] grid-cols-15 gap-[3px]'}>
        {days.map((d) => cell(d, `aspect-square ${range === '7d' ? 'rounded-md' : 'rounded-[3px]'}`))}
      </div>
    );
  }
  // All: 7 hàng (T2–CN) × 26 tuần, trải hết chiều ngang thẻ
  return (
    <div aria-hidden className="grid max-w-[560px] grid-flow-col grid-cols-26 grid-rows-7 gap-[2px]">
      {allColumns(today).flat().map((d) => cell(d, 'aspect-square rounded-[2px]'))}
    </div>
  );
}

/* ---------------- Màn chi tiết (chạm ô để chọn ngày) ---------------- */

interface DetailProps extends Base {
  range: Range;
  selected: string;
  onSelect: (d: string) => void;
}

const textOn = (level?: Level) => (level && level >= 3 ? 'text-white' : 'text-muted');

export function DetailHeatmap(p: DetailProps) {
  if (p.range === '7d') return <Week {...p} />;
  if (p.range === '30d') return <Month {...p} />;
  return <AllTime {...p} />;
}

function Week({ habitId, color, index, binary, today, start, selected, onSelect }: DetailProps) {
  const t = isoDate(today);
  return (
    <div className="grid grid-cols-7 gap-2">
      {daysBetween(isoDate(subDays(today, 6)), t).map((d) => {
        const level = levelAt(index, habitId, d, binary);
        return (
          <button key={d} type="button" onClick={() => onSelect(d)} aria-label={`${d}, ${level ? level * 20 : 0}%`} aria-pressed={d === selected} className="flex flex-col items-center gap-1.5">
            <span className="text-xs text-muted">{weekdayShort(d)}</span>
            <span
              className={`grid aspect-square w-full place-items-center rounded-xl text-[15px] font-semibold money ${textOn(level)}`}
              style={cellStyle(kindOf(d, start, t), color, level, d === t, d === selected)}
            >
              {parseISO(d).getDate()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const WEEK_HEAD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function Month({ habitId, color, index, binary, today, start, selected, onSelect }: DetailProps) {
  const t = isoDate(today);
  const from = isoDate(subDays(today, 29));
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {WEEK_HEAD.map((w) => <span key={w} className="pb-1 text-center text-xs text-muted">{w}</span>)}
      {weekColumns(from, t).flat().map((d) => {
        const kind = kindOf(d, start, t);
        const level = levelAt(index, habitId, d, binary);
        const outside = d < from;
        const label = parseISO(d).getDate();
        if (kind === 'future' || outside) {
          return (
            <span key={d} className={`grid aspect-square place-items-center rounded-lg text-[13px] text-subtle/60  money`} style={outside ? undefined : cellStyle('future', color, undefined, false)}>
              {label}
            </span>
          );
        }
        return (
          <button
            key={d}
            type="button"
            onClick={() => onSelect(d)}
            aria-label={`${d}, ${level ? level * 20 : 0}%`}
            aria-pressed={d === selected}
            className={`grid aspect-square place-items-center rounded-lg text-[13px] font-medium money ${textOn(level)}`}
            style={cellStyle(kind, color, level, d === t, d === selected)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** 7 hàng × 26 tuần, có nhãn tháng và thứ. Ô nhỏ → chạm lệch thì dùng ‹ › ở thanh ghi nhận. */
function AllTime({ habitId, color, index, binary, today, start, selected, onSelect }: DetailProps) {
  const t = isoDate(today);
  const cols = allColumns(today);
  const monthAt = (i: number) => {
    const m = parseISO(cols[i][0]).getMonth();
    // nhãn tháng ở tuần đầu tiên của tháng; bỏ nhãn cột 0 nếu tháng đó sắp hết (tránh 2 nhãn dính nhau)
    const first = i === 0 ? parseISO(cols[1][0]).getMonth() === m : parseISO(cols[i - 1][0]).getMonth() !== m;
    return first ? `Th${m + 1}` : '';
  };
  return (
    <div className="grid max-w-[560px] gap-[2px]" style={{ gridTemplateColumns: `18px repeat(${cols.length}, minmax(0, 1fr))` }}>
      <span />
      {cols.map((c, i) => (
        <span key={c[0]} className="h-4 overflow-visible text-[10px] leading-none whitespace-nowrap text-muted">{monthAt(i)}</span>
      ))}
      {WEEK_HEAD.map((w, r) => [
        <span key={w} className="self-center text-[9px] leading-none text-muted">{r % 2 === 0 ? w : ''}</span>,
        ...cols.map((col) => {
          const d = col[r];
          const kind = kindOf(d, start, t);
          const level = levelAt(index, habitId, d, binary);
          const style = cellStyle(kind, color, level, d === t);
          if (d === selected) style.boxShadow = `0 0 0 2px ${color}`;
          return kind === 'future' ? (
            <span key={d} className="aspect-square rounded-[2px]" style={style} />
          ) : (
            <button key={d} type="button" onClick={() => onSelect(d)} aria-label={`${d}, ${level ? level * 20 : 0}%`} aria-pressed={d === selected} className="relative aspect-square rounded-[2px] focus-visible:z-10" style={style} />
          );
        }),
      ])}
    </div>
  );
}
