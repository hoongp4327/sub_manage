import { useState } from 'react';
import { Check } from 'lucide-react';
import { Sheet } from '../../../shared/Sheet';
import { Field, PrimaryButton, inputClass } from '../../../shared/ui';
import { useHabitActions } from '../data/hooks';
import { HABIT_COLORS, HABIT_ICONS, HABIT_PRESETS, type Habit, type HabitKind } from '../types';
import { HabitIcon } from './controls';

const KINDS: { id: HabitKind; label: string; hint: string; dots: number[] }[] = [
  { id: 'percent', label: 'Mức độ', hint: 'Chọn 20 – 100%', dots: [30, 66, 100] },
  { id: 'binary', label: 'Có / Không', hint: 'Chạm là xong', dots: [0, 100] },
];

export function HabitForm({ habit, onClose }: { habit?: Habit; onClose: () => void }) {
  const actions = useHabitActions();
  const [name, setName] = useState(habit?.name ?? '');
  const [icon, setIcon] = useState(habit?.icon ?? 'heart');
  const [color, setColor] = useState(habit?.color ?? HABIT_COLORS[0]);
  const [kind, setKind] = useState<HabitKind>(habit?.kind ?? 'percent');
  const [goal, setGoal] = useState(habit?.goal ?? '');
  const [reason, setReason] = useState(habit?.reason ?? '');

  const valid = name.trim().length > 0;
  const submit = () => {
    if (!valid) return;
    const input = { name: name.trim(), icon, color, kind, goal: goal.trim() || null, reason: reason.trim() || null, notes: habit?.notes ?? null };
    if (habit) actions.update(habit.id, input);
    else actions.create(input);
    onClose();
  };

  return (
    <Sheet
      title={habit ? 'Sửa thói quen' : 'Thói quen mới'}
      onClose={onClose}
      footer={
        <PrimaryButton className="w-full" disabled={!valid} onClick={submit}>
          {habit ? 'Lưu' : 'Tạo thói quen'}
        </PrimaryButton>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {!habit && (
          <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6">
            {HABIT_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => { setName(p.name); setIcon(p.icon); setColor(p.color); setKind(p.kind ?? 'percent'); }}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border py-1 pr-3.5 pl-1.5 text-sm transition-colors ${
                  name === p.name ? 'border-ink/30 bg-chip font-semibold' : 'border-line bg-surface hover:border-subtle/60'
                }`}
              >
                <HabitIcon icon={p.icon} color={p.color} size="sm" />
                {p.name}
              </button>
            ))}
          </div>
        )}

        <Field label="Tên" htmlFor="habit-name">
          <div className="flex items-center gap-3">
            <HabitIcon icon={icon} color={color} />
            <input id="habit-name" autoFocus={!habit} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Tập gym" maxLength={40} className={inputClass} />
          </div>
        </Field>

        <Field label="Cách ghi">
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                aria-pressed={kind === k.id}
                onClick={() => setKind(k.id)}
                className={`rounded-xl border p-3 text-left transition-colors ${kind === k.id ? 'border-ink/40 bg-chip' : 'border-line bg-surface hover:border-subtle/60'}`}
              >
                <span className="flex items-center gap-1.5">
                  {k.dots.map((m, i) => (
                    <span key={i} className="size-3.5 rounded-full" style={{ background: m ? `color-mix(in srgb, ${color} ${m}%, white)` : '#ECECEA' }} />
                  ))}
                </span>
                <span className="mt-2 block text-[15px] font-semibold">{k.label}</span>
                <span className="block text-[13px] text-muted">{k.hint}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Màu">
          <div className="flex flex-wrap gap-2">
            {HABIT_COLORS.map((c) => (
              <button key={c} type="button" aria-label={`Màu ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} className="grid size-11 place-items-center rounded-full">
                <span className="grid size-9 place-items-center rounded-full text-white" style={{ background: c, boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined }}>
                  {color === c && <Check size={18} strokeWidth={3} />}
                </span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Icon">
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9">
            {Object.entries(HABIT_ICONS).map(([id, Icon]) => (
              <button
                key={id}
                type="button"
                aria-label={id}
                aria-pressed={icon === id}
                onClick={() => setIcon(id)}
                className={`grid aspect-square min-h-11 place-items-center rounded-xl transition-colors ${icon === id ? 'text-white' : 'bg-chip text-muted hover:text-ink'}`}
                style={icon === id ? { background: color } : undefined}
              >
                <Icon size={20} />
              </button>
            ))}
          </div>
        </Field>

        <Field label={kind === 'binary' ? 'Thế nào là xong?' : '100% là gì?'} hint="không bắt buộc" htmlFor="habit-goal">
          <input id="habit-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={kind === 'binary' ? 'Ví dụ: tắt đèn trước 23h' : 'Ví dụ: đủ 8 bài · 45 phút'} maxLength={80} className={inputClass} />
        </Field>

        <Field label="Vì sao?" hint="không bắt buộc" htmlFor="habit-reason">
          <input id="habit-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: khỏe lưng, bớt ngồi nhiều" maxLength={120} className={inputClass} />
        </Field>
      </form>
    </Sheet>
  );
}
