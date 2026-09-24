import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { money, shortDate } from '../../../lib/format';
import { Sheet } from '../../../shared/Sheet';
import { FilterChip, GhostButton, MoreMenu } from '../../../shared/ui';
import { useToast } from '../../../shared/Toast';
import { useSubscriptionActions, useSubscriptions } from '../data/hooks';
import { monthlyEquivalent, roundK } from '../logic/calc';
import { ServiceIcon } from '../components/ServiceIcon';
import { SubscriptionForm, type FormMode } from '../components/SubscriptionForm';
import type { ArchiveReason, Subscription } from '../types';

type Filter = 'all' | ArchiveReason;

export function ArchiveScreen() {
  const { data = [], isLoading } = useSubscriptions();
  const actions = useSubscriptionActions();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [form, setFormState] = useState<FormMode | null>(null);
  const openCount = useRef(0);
  const setForm = (m: FormMode | null) => {
    if (m) openCount.current++;
    setFormState(m);
  };
  const [confirm, setConfirm] = useState<Subscription | null>(null);

  const archived = useMemo(
    () => data.filter((s) => s.status === 'archived').sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '')),
    [data],
  );
  const visible = archived.filter((s) => filter === 'all' || s.archiveReason === filter);

  return (
    <div className="mx-auto max-w-[720px] px-4 pt-[max(20px,env(safe-area-inset-top))] pb-24 sm:px-6 sm:pt-10">
      <header className="flex items-center gap-2">
        <Link to="/subscriptions" aria-label="Quay lại" className="-ml-2 grid size-11 place-items-center rounded-full hover:bg-chip">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="flex-1 text-[28px] font-bold tracking-tight">Lưu trữ</h1>
        <span className="text-[15px] text-muted">{archived.length} gói</span>
      </header>
      <p className="mt-1 text-[15px] text-muted">Gói đã xóa hoặc đã ngừng. Không tính vào tổng tiền.</p>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {([['all', 'Tất cả'], ['deleted', 'Đã xóa'], ['cancelled', 'Đã hết hạn']] as const).map(([id, label]) => (
          <FilterChip key={id} selected={filter === id} onClick={() => setFilter(id)}>{label}</FilterChip>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">{[0, 1].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-chip" />)}</div>
      ) : visible.length === 0 ? (
        <p className="mx-auto mt-16 max-w-xs text-center text-[15px] leading-relaxed text-muted">
          {archived.length ? 'Không có gói nào trong mục này.' : 'Chưa có gì trong Lưu trữ. Gói bạn xóa sẽ nằm ở đây để khôi phục khi cần.'}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {visible.map((s) => (
            <li key={s.id} className="group rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <div className="flex items-start gap-3.5">
                <ServiceIcon category={s.category} presetId={s.presetId} size="lg" muted />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-semibold">{s.name}</p>
                  <p className="mt-0.5">
                    <span className="money text-lg font-bold">{money(roundK(monthlyEquivalent(s)))}</span>
                    <span className="text-sm text-muted">/tháng</span>
                  </p>
                  <p className="mt-1 text-sm text-subtle">
                    {s.archiveReason === 'cancelled' ? 'Đã hết hạn' : 'Đã xóa'}
                    {s.archivedAt && ` · ${shortDate(s.archivedAt.slice(0, 10))}`}
                  </p>
                </div>
                <MoreMenu
                  label={`Tùy chọn cho ${s.name}`}
                  items={[{ label: 'Xóa vĩnh viễn', icon: <Trash2 size={17} />, danger: true, onSelect: () => setConfirm(s) }]}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    actions.restore(s.id);
                    toast({ message: `Đã khôi phục ${s.name}`, actionLabel: 'Hoàn tác', onAction: () => actions.archive(s.id) });
                  }}
                  className="min-h-11 rounded-xl border border-accent text-[15px] font-semibold text-accent-ink hover:bg-accent-soft"
                >
                  Khôi phục
                </button>
                <button
                  onClick={() => setForm({ kind: 'resubscribe', sub: s })}
                  className="min-h-11 rounded-xl bg-accent-soft text-[15px] font-semibold text-accent-ink hover:bg-[#FFEBD1]"
                >
                  Đăng ký lại
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {form && <SubscriptionForm key={openCount.current} mode={form} all={data} onClose={() => setForm(null)} />}

      {confirm && (
        <Sheet
          size="sm"
          title={`Xóa vĩnh viễn ${confirm.name}?`}
          onClose={() => setConfirm(null)}
          footer={
            <div className="flex gap-3">
              <GhostButton className="flex-1" onClick={() => setConfirm(null)}>Hủy</GhostButton>
              <button
                className="min-h-12 flex-1 rounded-2xl bg-danger px-5 text-base font-bold text-white hover:bg-[#C81E1E]"
                onClick={() => {
                  actions.destroy(confirm.id);
                  toast({ message: `Đã xóa vĩnh viễn ${confirm.name}` });
                  setConfirm(null);
                }}
              >
                Xóa vĩnh viễn
              </button>
            </div>
          }
        >
          <p className="text-[15px] text-muted">Gói này sẽ bị xóa hẳn và không thể hoàn tác.</p>
        </Sheet>
      )}
    </div>
  );
}
