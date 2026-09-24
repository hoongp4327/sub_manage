import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { addDays, parseISO, subDays } from 'date-fns';
import { Check, ChevronLeft, ChevronRight, NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react';
import { isoDate } from '../../../lib/format';
import { MoreMenu } from '../../../shared/ui';
import { useToast } from '../../../shared/Toast';
import { useHabitActions, useHabitLogs, useHabits } from '../data/hooks';
import { dayLabel, habitStart, habitStats, levelOf } from '../logic/calc';
import { DetailHeatmap } from '../components/Heatmap';
import { LevelPicker, RangeTabs, useRange } from '../components/controls';
import { HabitForm } from '../components/HabitForm';
import { NotesSheet } from '../components/NotesSheet';

/** Ghi bù tối đa 1 năm trước */
const MAX_BACK = 365;

export function HabitDetail() {
  const { id = '' } = useParams();
  const { data, isLoading } = useHabits();
  const logs = useHabitLogs();
  const actions = useHabitActions();
  const toast = useToast();
  const navigate = useNavigate();
  const [range, setRange] = useRange();
  const [editing, setEditing] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const today = useMemo(() => new Date(), []);
  const todayISO = isoDate(today);
  const [selected, setSelected] = useState(todayISO);

  const habit = data?.find((h) => h.id === id && h.status === 'active');
  if (!isLoading && data && !habit) return <Navigate to="/habits" replace />;
  if (!habit || logs.isLoading) {
    return <div className="mx-auto max-w-[720px] px-4 pt-16"><div className="h-64 animate-pulse rounded-2xl bg-chip" /></div>;
  }

  const start = habitStart(habit, logs.earliest.get(habit.id));
  const stats = habitStats(habit, logs.index, today, range, start);
  const binary = habit.kind === 'binary';
  const level = levelOf(habit, logs.index, selected);
  const minDay = isoDate(subDays(today, MAX_BACK));
  const step = (n: number) => setSelected((d) => {
    const next = isoDate(addDays(parseISO(d), n));
    return next > todayISO || next < minDay ? d : next;
  });

  const remove = () => {
    actions.archive(habit.id);
    toast({ message: `Đã xóa ${habit.name}`, actionLabel: 'Hoàn tác', onAction: () => actions.restore(habit.id) });
    navigate('/habits');
  };

  return (
    <div className="group mx-auto max-w-[720px] px-4 pt-[max(20px,env(safe-area-inset-top))] pb-64 sm:px-6 sm:pt-10">
      <header className="flex items-center gap-2">
        <Link to="/habits" aria-label="Quay lại" className="-ml-2 grid size-11 place-items-center rounded-full text-muted hover:bg-chip hover:text-ink">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="flex min-w-0 flex-1 items-center justify-center gap-2 text-[22px] font-bold tracking-tight">
          <span className="size-3 shrink-0 rounded-full" style={{ background: habit.color }} />
          <span className="truncate">{habit.name}</span>
        </h1>
        <MoreMenu
          label="Tùy chọn thói quen"
          items={[
            { label: 'Sửa', icon: <Pencil size={18} />, onSelect: () => setEditing(true) },
            { label: 'Xóa', icon: <Trash2 size={18} />, danger: true, onSelect: remove },
          ]}
        />
      </header>
      {habit.goal && <p className="mt-0.5 text-center text-[15px] text-muted">{binary ? 'Xong =' : '100% ='} {habit.goal}</p>}

      {/* Ghi chú đặt trên cùng: mở thói quen là thấy ngay (vd. giáo trình tập) */}
      {habit.notes ? (
        <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[15px] font-semibold"><NotebookPen size={18} className="text-muted" /> Ghi chú</p>
            <button onClick={() => setNotesOpen(true)} className="-my-2 -mr-2 min-h-11 rounded-lg px-2 text-[15px] font-medium text-accent-ink hover:bg-chip">Sửa</button>
          </div>
          <p className={`mt-2 text-[15px] leading-relaxed whitespace-pre-wrap break-words ${notesExpanded ? '' : 'line-clamp-6'}`}>{habit.notes}</p>
          {habit.notes.split('\n').length > 6 || habit.notes.length > 280 ? (
            <button onClick={() => setNotesExpanded((v) => !v)} className="mt-1 min-h-9 text-[14px] font-medium text-muted hover:text-ink">
              {notesExpanded ? 'Thu gọn' : 'Xem hết'}
            </button>
          ) : null}
        </section>
      ) : (
        <button onClick={() => setNotesOpen(true)} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-[15px] text-muted hover:text-ink">
          <Plus size={18} /> Thêm ghi chú <span className="text-subtle">· giáo trình, danh sách…</span>
        </button>
      )}

      <div className="mt-5">
        <RangeTabs value={range} onChange={setRange} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-[13px] text-muted">Hoạt động</p>
          <p className="mt-1"><span className="money text-[28px] font-bold">{stats.active}</span> <span className="text-[15px] text-muted">ngày</span></p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-[13px] text-muted">Trung bình</p>
          <p className="money mt-1 text-[28px] font-bold">{stats.avg}%</p>
        </div>
      </div>

      <section className="mt-3 rounded-2xl border border-line bg-surface p-4" aria-label="Lịch sử">
        <DetailHeatmap habitId={habit.id} color={habit.color} index={logs.index} binary={binary} today={today} start={start} range={range} selected={selected} onSelect={setSelected} />
        <p className="mt-3 text-[13px] text-subtle">Chạm một ngày để sửa</p>
      </section>

      {habit.reason && (
        <section className="mt-3 rounded-2xl border border-line bg-surface p-4">
          <p className="text-[15px] font-semibold">Lý do</p>
          <p className="mt-1 text-[15px] text-muted">{habit.reason}</p>
        </section>
      )}

      {/* Thanh ghi nhận dính đáy — mặc định hôm nay, chạm ô trên lịch để đổi ngày */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur pb-safe">
        <div className="mx-auto max-w-[720px] px-4 pt-3 sm:px-6">
          <div className="flex items-center justify-between">
            <button onClick={() => step(-1)} disabled={selected <= minDay} aria-label="Ngày trước" className="grid size-11 place-items-center rounded-full text-muted hover:bg-chip disabled:opacity-30">
              <ChevronLeft size={22} />
            </button>
            <div className="text-center">
              <p className="text-[17px] font-semibold">{dayLabel(selected, today)}</p>
              {selected !== todayISO ? (
                <button onClick={() => setSelected(todayISO)} className="text-[13px] font-medium text-accent-ink">Về hôm nay</button>
              ) : (
                <p className="text-[13px] text-muted">{!level ? 'Chưa ghi' : binary ? 'Đã xong' : `Đã ghi ${level * 20}%`}</p>
              )}
            </div>
            <button onClick={() => step(1)} disabled={selected >= todayISO} aria-label="Ngày sau" className="grid size-11 place-items-center rounded-full text-muted hover:bg-chip disabled:opacity-30">
              <ChevronRight size={22} />
            </button>
          </div>
          <div className="mt-2">
            {binary ? (
              <button
                onClick={() => actions.setLevel(habit.id, selected, level ? null : 5)}
                aria-pressed={!!level}
                className={`mb-1 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border-2 text-[16px] font-semibold transition-colors ${level ? 'text-white' : 'bg-surface'}`}
                style={level ? { background: habit.color, borderColor: habit.color } : { borderColor: habit.color, color: habit.color }}
              >
                <Check size={20} strokeWidth={3} /> {level ? 'Đã xong · chạm để bỏ' : 'Đánh dấu đã xong'}
              </button>
            ) : (
              <LevelPicker size="lg" color={habit.color} value={level} onPick={(l) => actions.setLevel(habit.id, selected, l)} />
            )}
          </div>
        </div>
      </div>

      {editing && <HabitForm habit={habit} onClose={() => setEditing(false)} />}
      {notesOpen && <NotesSheet habit={habit} onClose={() => setNotesOpen(false)} />}
    </div>
  );
}
