import { useState } from 'react';
import { Sheet } from '../../../shared/Sheet';
import { PrimaryButton } from '../../../shared/ui';
import { useHabitActions } from '../data/hooks';
import type { Habit } from '../types';

export function NotesSheet({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const actions = useHabitActions();
  const [text, setText] = useState(habit.notes ?? '');
  const save = () => {
    const notes = text.trim() ? text.replace(/\s+$/, '') : null;
    if (notes !== (habit.notes ?? null)) actions.update(habit.id, { notes });
    onClose();
  };
  return (
    <Sheet title={`Ghi chú · ${habit.name}`} onClose={onClose} footer={<PrimaryButton className="w-full" onClick={save}>Lưu</PrimaryButton>}>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && save()}
        placeholder={'Ví dụ giáo trình tập:\nT2 – Ngực: Bench press 4×8, Dips 3×12\nT4 – Lưng: Deadlift 4×6…'}
        rows={14}
        maxLength={5000}
        className="min-h-[45dvh] w-full resize-none rounded-xl border border-line bg-surface p-4 text-[16px] leading-relaxed outline-none placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/15"
      />
    </Sheet>
  );
}
