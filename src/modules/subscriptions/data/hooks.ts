import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../shared/Toast';
import { expiredIds } from '../logic/calc';
import type { Subscription } from '../types';
import { repo } from './repo';

const KEY = ['subscriptions'];

/** Đọc danh sách; gói đã hủy gia hạn và hết kỳ sẽ tự chuyển vào Lưu trữ. */
async function load(): Promise<Subscription[]> {
  const list = await repo.list();
  const expired = expiredIds(list, new Date());
  if (!expired.length) return list;
  const now = new Date().toISOString();
  await Promise.all(expired.map((id) => {
    const s = list.find((x) => x.id === id)!;
    return repo.update(id, { status: 'archived', archiveReason: 'cancelled', archivedAt: s.endsAt ? `${s.endsAt}T00:00:00.000Z` : now, updatedAt: now });
  }));
  return repo.list();
}

export function useSubscriptions() {
  return useQuery({ queryKey: KEY, queryFn: load });
}

export type SubscriptionInput = Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'currency' | 'status'>;

type Op =
  | { type: 'create'; sub: Subscription }
  | { type: 'update'; id: string; patch: Partial<Subscription> }
  | { type: 'destroy'; id: string };

function apply(list: Subscription[], op: Op): Subscription[] {
  switch (op.type) {
    case 'create': return [...list, op.sub];
    case 'update': return list.map((s) => (s.id === op.id ? { ...s, ...op.patch } : s));
    case 'destroy': return list.filter((s) => s.id !== op.id);
  }
}

function run(op: Op) {
  switch (op.type) {
    case 'create': return repo.create(op.sub);
    case 'update': return repo.update(op.id, op.patch);
    case 'destroy': return repo.destroy(op.id);
  }
}

/**
 * Mọi thao tác ghi đều cập nhật giao diện ngay (optimistic), lưu ở nền.
 * Lỗi mạng → trả lại trạng thái cũ và cho "Thử lại".
 */
export function useSubscriptionActions() {
  const qc = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: run,
    onMutate: async (op: Op) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<Subscription[]>(KEY);
      qc.setQueryData<Subscription[]>(KEY, (l = []) => apply(l, op));
      return { prev };
    },
    onError: (_e, op, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
      toast({ message: 'Chưa lưu được', actionLabel: 'Thử lại', onAction: () => mutation.mutate(op) });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const now = () => new Date().toISOString();
  const update = (id: string, patch: Partial<Subscription>) =>
    mutation.mutate({ type: 'update', id, patch: { ...patch, updatedAt: now() } });

  return {
    create(input: SubscriptionInput): Subscription {
      const sub: Subscription = { ...input, id: crypto.randomUUID(), currency: 'VND', status: 'active', createdAt: now(), updatedAt: now() };
      mutation.mutate({ type: 'create', sub });
      return sub;
    },
    update,
    archive: (id: string) => update(id, { status: 'archived', archiveReason: 'deleted', archivedAt: now() }),
    restore: (id: string) => update(id, { status: 'active', archiveReason: null, archivedAt: null, endsAt: null }),
    /** Đăng ký lại từ Lưu trữ: dùng lại bản ghi cũ với thông tin mới. */
    resubscribe: (id: string, input: SubscriptionInput) =>
      update(id, { ...input, status: 'active', archiveReason: null, archivedAt: null, endsAt: null }),
    cancelRenewal: (id: string, endsAt: string) => update(id, { endsAt }),
    resumeRenewal: (id: string) => update(id, { endsAt: null }),
    destroy: (id: string) => mutation.mutate({ type: 'destroy', id }),
  };
}
