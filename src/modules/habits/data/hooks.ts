import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../shared/Toast';
import { earliestLogs, indexLogs } from '../logic/calc';
import type { Habit, HabitLog, Level } from '../types';
import { repo } from './repo';

const HABITS = ['habits'];
const LOGS = ['habit_logs'];

export function useHabits() {
  return useQuery({ queryKey: HABITS, queryFn: () => repo.listHabits() });
}

export function useHabitLogs() {
  const q = useQuery({ queryKey: LOGS, queryFn: () => repo.listLogs() });
  const logs = q.data;
  const index = useMemo(() => indexLogs(logs ?? []), [logs]);
  const earliest = useMemo(() => earliestLogs(logs ?? []), [logs]);
  return { ...q, index, earliest };
}

export type HabitInput = Pick<Habit, 'name' | 'color' | 'icon' | 'kind' | 'goal' | 'reason' | 'notes'>;

type HabitOp = { type: 'create'; habit: Habit } | { type: 'update'; id: string; patch: Partial<Habit> };
type LogOp = { habitId: string; date: string; level: Level | null };

/**
 * Mọi thao tác ghi đều cập nhật giao diện ngay (optimistic), lưu ở nền.
 * Lỗi mạng → trả lại trạng thái cũ và cho "Thử lại".
 */
export function useHabitActions() {
  const qc = useQueryClient();
  const toast = useToast();

  const habitMutation = useMutation({
    mutationFn: (op: HabitOp) => (op.type === 'create' ? repo.createHabit(op.habit) : repo.updateHabit(op.id, op.patch)),
    onMutate: async (op) => {
      await qc.cancelQueries({ queryKey: HABITS });
      const prev = qc.getQueryData<Habit[]>(HABITS);
      qc.setQueryData<Habit[]>(HABITS, (l = []) =>
        op.type === 'create' ? [...l, op.habit] : l.map((h) => (h.id === op.id ? { ...h, ...op.patch } : h)),
      );
      return { prev };
    },
    onError: (_e, op, ctx) => {
      if (ctx?.prev) qc.setQueryData(HABITS, ctx.prev);
      toast({ message: 'Chưa lưu được', actionLabel: 'Thử lại', onAction: () => habitMutation.mutate(op) });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: HABITS }),
  });

  const logMutation = useMutation({
    mutationFn: (op: LogOp) => repo.setLog(op.habitId, op.date, op.level),
    onMutate: async (op) => {
      await qc.cancelQueries({ queryKey: LOGS });
      const prev = qc.getQueryData<HabitLog[]>(LOGS);
      qc.setQueryData<HabitLog[]>(LOGS, (l = []) => {
        const rest = l.filter((x) => !(x.habitId === op.habitId && x.date === op.date));
        return op.level ? [...rest, { habitId: op.habitId, date: op.date, level: op.level, updatedAt: new Date().toISOString() }] : rest;
      });
      return { prev };
    },
    onError: (_e, op, ctx) => {
      if (ctx?.prev) qc.setQueryData(LOGS, ctx.prev);
      toast({ message: 'Chưa lưu được', actionLabel: 'Thử lại', onAction: () => logMutation.mutate(op) });
    },
    // Không refetch sau mỗi lần tick — tick liên tục sẽ làm dữ liệu nhấp nháy
  });

  const now = () => new Date().toISOString();
  const update = (id: string, patch: Partial<Habit>) => habitMutation.mutate({ type: 'update', id, patch: { ...patch, updatedAt: now() } });

  return {
    create(input: HabitInput): Habit {
      const habit: Habit = { ...input, id: crypto.randomUUID(), status: 'active', createdAt: now(), updatedAt: now() };
      habitMutation.mutate({ type: 'create', habit });
      return habit;
    },
    update,
    archive: (id: string) => update(id, { status: 'archived', archivedAt: now() }),
    restore: (id: string) => update(id, { status: 'active', archivedAt: null }),
    setLevel: (habitId: string, date: string, level: Level | null) => logMutation.mutate({ habitId, date, level }),
  };
}
