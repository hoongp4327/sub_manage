import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { LogIndex, Range } from '../logic/calc';
import type { Habit, Level } from '../types';
import { CheckButton, HabitIcon, LevelPicker } from './controls';
import { MiniHeatmap } from './Heatmap';

interface Props {
  habit: Habit;
  index: LogIndex;
  today: Date;
  start: string;
  range: Range;
  level?: Level;
  pickerOpen: boolean;
  onTogglePicker: (open: boolean) => void;
  /** Chạm nút tick khi chưa ghi */
  onQuickDone: () => void;
  onPick: (l: Level | null) => void;
}

export function HabitCard({ habit, index, today, start, range, level, pickerOpen, onTogglePicker, onQuickDone, onPick }: Props) {
  const ref = useRef<HTMLElement>(null);
  const binary = habit.kind === 'binary';
  const heatmap = <MiniHeatmap habitId={habit.id} color={habit.color} index={index} binary={binary} today={today} start={start} range={range} />;

  // Chạm ra ngoài thẻ → đóng hàng chọn mức
  useEffect(() => {
    if (!pickerOpen) return;
    const close = (e: Event) => !ref.current?.contains(e.target as Node) && onTogglePicker(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [pickerOpen, onTogglePicker]);

  return (
    <li>
      <article
        ref={ref}
        className={`relative rounded-2xl border bg-surface p-3.5 transition-colors sm:p-4 ${pickerOpen ? 'border-ink/15' : 'border-line hover:border-subtle/50'}`}
      >
        {/* Cả thẻ bấm được để mở chi tiết; nút tick và hàng chọn mức nằm trên lớp này */}
        <Link to={`/habits/${habit.id}`} aria-label={`Mở ${habit.name}`} className="absolute inset-0 rounded-2xl" />
        <div className={level === 5 && !pickerOpen ? 'opacity-70' : ''}>
          <div className="flex items-center gap-3">
            <HabitIcon icon={habit.icon} color={habit.color} />
            <div className="pointer-events-none min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold">{habit.name}</p>
              {range !== 'all' && <div className="mt-2">{heatmap}</div>}
            </div>
            {/* Có/Không: chạm là bật/tắt, không có hàng chọn mức */}
            <CheckButton
              level={level}
              color={habit.color}
              label={habit.name}
              binary={binary}
              onTap={() => (!level ? onQuickDone() : binary ? onPick(null) : onTogglePicker(!pickerOpen))}
              onLongPress={() => !binary && onTogglePicker(true)}
            />
          </div>
          {/* All = 6 tháng, cần cả chiều ngang thẻ */}
          {range === 'all' && <div className="pointer-events-none mt-3">{heatmap}</div>}
        </div>
        {pickerOpen && !binary && (
          <div className="relative z-10 mt-3 animate-fade-in border-t border-line/70 pt-2">
            <LevelPicker
              color={habit.color}
              value={level}
              onPick={(l) => {
                onPick(l);
                onTogglePicker(false);
              }}
            />
          </div>
        )}
      </article>
    </li>
  );
}
