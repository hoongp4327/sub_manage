import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { isoDate } from '../../../lib/format';
import { PrimaryButton } from '../../../shared/ui';
import { useToast } from '../../../shared/Toast';
import { useHabitActions, useHabitLogs, useHabits } from '../data/hooks';
import { habitStart, levelOf, logKey, sortForToday, todayAverage } from '../logic/calc';
import { HabitCard } from '../components/HabitCard';
import { HabitForm } from '../components/HabitForm';
import { HabitIcon, RangeTabs, useRange, vibrate } from '../components/controls';
import { TodayCard } from '../components/TodayCard';
import { HABIT_PRESETS, type Level } from '../types';

export function HabitList() {
  const { data = [], isLoading, error } = useHabits();
  const logs = useHabitLogs();
  const actions = useHabitActions();
  const toast = useToast();
  const [range, setRange] = useRange();
  const [formOpen, setFormOpen] = useState(false);
  const [picker, setPicker] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const day = isoDate(today);
  const habits = useMemo(() => data.filter((h) => h.status === 'active'), [data]);

  // Chỉ sắp xếp lại khi vào màn / đổi danh sách — không nhảy ngay khi vừa tick
  const idsKey = habits.map((h) => h.id).join();
  const logsReady = !!logs.data;
  const order = useMemo(
    () => sortForToday(habits, logs.index, today).map((h) => h.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idsKey, logsReady],
  );
  const byId = new Map(habits.map((h) => [h.id, h]));
  const sorted = [...order.map((id) => byId.get(id)!).filter(Boolean), ...habits.filter((h) => !order.includes(h.id))];

  const average = todayAverage(habits, logs.index, today);
  const togglePicker = useCallback((id: string, open: boolean) => setPicker((cur) => (open ? id : cur === id ? null : cur)), []);

  const set = (habitId: string, name: string, level: Level | null, prev?: Level) => {
    actions.setLevel(habitId, day, level);
    if (level === 5 && !prev) {
      vibrate(15);
      toast({ message: `Đã ghi ${name}`, actionLabel: 'Hoàn tác', onAction: () => actions.setLevel(habitId, day, null) });
    } else if (!level && prev) {
      toast({ message: `Đã bỏ ${name}`, actionLabel: 'Hoàn tác', onAction: () => actions.setLevel(habitId, day, prev) });
    }
  };

  return (
    <div className="mx-auto max-w-[720px] px-4 pt-[max(20px,env(safe-area-inset-top))] pb-32 sm:px-6 sm:pt-10">
      <Link to="/" className="-ml-1.5 mb-2 inline-flex min-h-9 items-center gap-0.5 text-sm text-muted hover:text-ink">
        <ChevronLeft size={18} /> Trang chủ
      </Link>

      <header className="mb-5 flex items-start justify-between gap-3">
        <h1 className="text-[32px] font-bold leading-tight tracking-tight">Thói quen</h1>
        <PrimaryButton onClick={() => setFormOpen(true)} className="hidden items-center gap-1.5 sm:flex">
          <Plus size={20} /> Thêm
        </PrimaryButton>
      </header>

      {error || logs.error ? (
        <p className="mt-10 text-center text-muted">Không tải được dữ liệu. Kiểm tra kết nối rồi tải lại trang.</p>
      ) : isLoading || logs.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-chip" />)}</div>
      ) : habits.length === 0 ? (
        <EmptyState onOpen={() => setFormOpen(true)} onPick={(p) => actions.create({ ...p, goal: null, reason: null, notes: null })} />
      ) : (
        <>
          <TodayCard percent={average ?? 0} count={habits.length} />
          <div className="mt-5">
            <RangeTabs value={range} onChange={setRange} />
          </div>
          <ul className="mt-4 space-y-3">
            {sorted.map((h) => {
              const level = levelOf(h, logs.index, day);
              return (
                <HabitCard
                  key={h.id}
                  habit={h}
                  index={logs.index}
                  today={today}
                  start={habitStart(h, logs.earliest.get(h.id))}
                  range={range}
                  level={level}
                  pickerOpen={picker === h.id}
                  onTogglePicker={(open) => togglePicker(h.id, open)}
                  onQuickDone={() => set(h.id, h.name, 5)}
                  onPick={(l) => set(h.id, h.name, l, logs.index.get(logKey(h.id, day)))}
                />
              );
            })}
          </ul>
          <p className="mt-4 text-center text-[13px] text-subtle">Chạm ○ để hoàn thành · Giữ để chọn mức</p>
        </>
      )}

      {/* FAB — chỉ điện thoại */}
      <button
        onClick={() => setFormOpen(true)}
        aria-label="Thêm thói quen"
        className="fixed right-5 bottom-[max(24px,calc(env(safe-area-inset-bottom)+12px))] z-40 grid size-16 place-items-center rounded-full bg-accent text-white shadow-[0_8px_24px_rgba(255,149,0,.35)] transition-transform active:scale-95 sm:hidden"
      >
        <Plus size={30} strokeWidth={2.25} />
      </button>

      {formOpen && <HabitForm onClose={() => setFormOpen(false)} />}
    </div>
  );
}

function EmptyState({ onPick, onOpen }: { onPick: (p: (typeof HABIT_PRESETS)[number]) => void; onOpen: () => void }) {
  return (
    <section className="mt-6 text-center">
      <div aria-hidden className="mx-auto grid w-fit grid-cols-7 gap-1.5">
        {Array.from({ length: 21 }, (_, i) => (
          <span key={i} className="size-4 rounded" style={{ background: [0, 3, 5, 8, 9, 12, 15, 16, 17, 19, 20].includes(i) ? `color-mix(in srgb, #22C55E ${30 + (i % 4) * 23}%, white)` : '#ECECEA' }} />
        ))}
      </div>
      <h2 className="mt-6 text-2xl font-bold tracking-tight">Bắt đầu một thói quen</h2>
      <p className="mt-1.5 text-[15px] text-muted">Chạm để thêm nhanh — sửa sau cũng được.</p>
      <div className="mt-6 grid grid-cols-1 gap-2.5 min-[400px]:grid-cols-2 sm:grid-cols-3">
        {HABIT_PRESETS.map((p) => (
          <button key={p.name} onClick={() => onPick(p)} className="flex min-h-14 items-center gap-2.5 rounded-2xl border border-line bg-surface px-3 text-left text-[15px] font-medium hover:border-subtle/60">
            <HabitIcon icon={p.icon} color={p.color} size="sm" />
            <span className="truncate">{p.name}</span>
          </button>
        ))}
      </div>
      <button onClick={onOpen} className="mt-2.5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-[15px] text-muted hover:text-ink">
        <Plus size={20} /> Thói quen khác
      </button>
    </section>
  );
}
