import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ChevronLeft, Plus } from 'lucide-react';
import { FilterChip, PrimaryButton } from '../../../shared/ui';
import { useToast } from '../../../shared/Toast';
import { useSubscriptionActions, useSubscriptions } from '../data/hooks';
import { PRESETS } from '../data/presets';
import { isSoon, nextRenewal, summarize } from '../logic/calc';
import { SubscriptionCard } from '../components/SubscriptionCard';
import { SubscriptionForm, type FormMode } from '../components/SubscriptionForm';
import { SummaryCards } from '../components/SummaryCards';
import { ServiceIcon } from '../components/ServiceIcon';
import { CATEGORIES, type Category, type Subscription } from '../types';
import { BillSheet } from '../components/BillSheet';
import { money } from '../../../lib/format';

type Filter = 'all' | Category | 'soon';

export function Dashboard() {
  const { data = [], isLoading, error } = useSubscriptions();
  const actions = useSubscriptionActions();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [form, setFormState] = useState<FormMode | null>(null);
  const openCount = useRef(0);
  const setForm = (m: FormMode | null) => {
    if (m) openCount.current++;
    setFormState(m);
  };
  const [lastAdded, setLastAdded] = useState<Set<string>>(new Set());

  const today = useMemo(() => new Date(), []);
  const active = useMemo(
    () => data.filter((s) => s.status === 'active').sort((a, b) => +nextRenewal(a, today) - +nextRenewal(b, today)),
    [data, today],
  );
  const archivedCount = data.length - active.length;
  const summary = useMemo(() => summarize(data, today), [data, today]);
  const matches = (s: Subscription) => (filter === 'all' ? true : filter === 'soon' ? isSoon(s, today) : s.category === filter);
  const own = active.filter((s) => !s.isCollect);
  const collect = active.filter((s) => s.isCollect);
  const visibleOwn = own.filter(matches);
  const visibleCollect = collect.filter(matches);
  const [bill, setBill] = useState<Subscription | null>(null);

  const renderCard = (s: Subscription) => (
    <SubscriptionCard
      key={s.id}
      sub={s}
      today={today}
      isNew={lastAdded.size > 0 && !lastAdded.has(s.id)}
      onEdit={() => setForm({ kind: 'edit', sub: s })}
      onOpen={s.isCollect ? () => setBill(s) : undefined}
      onDelete={() => remove(s.id, s.name)}
      onCancelRenewal={(endsAt) => {
        actions.cancelRenewal(s.id, endsAt);
        toast({ message: `${s.name} sẽ vào Lưu trữ khi hết kỳ`, actionLabel: 'Hoàn tác', onAction: () => actions.resumeRenewal(s.id) });
      }}
      onResumeRenewal={() => {
        actions.resumeRenewal(s.id);
        toast({ message: `${s.name} sẽ tiếp tục gia hạn` });
      }}
    />
  );

  const openCreate = () => {
    setLastAdded(new Set(active.map((s) => s.id)));
    setForm({ kind: 'create' });
  };

  const remove = (id: string, name: string) => {
    actions.archive(id);
    toast({ message: `Đã chuyển ${name} vào Lưu trữ`, actionLabel: 'Hoàn tác', onAction: () => actions.restore(id) });
  };

  return (
    <div className="mx-auto max-w-[960px] px-4 pt-[max(20px,env(safe-area-inset-top))] pb-32 sm:px-6 sm:pt-10">
      <Link to="/" className="-ml-1.5 mb-2 inline-flex min-h-9 items-center gap-0.5 text-sm text-muted hover:text-ink">
        <ChevronLeft size={18} /> Trang chủ
      </Link>

      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-bold leading-tight tracking-tight">Subscription</h1>
          <p className="mt-0.5 text-[15px] text-muted">Quản lý đăng ký của bạn</p>
        </div>
        <div className="flex items-center gap-2.5 pt-1">
          <Link
            to="/subscriptions/archive"
            aria-label={`Lưu trữ, ${archivedCount} gói`}
            className="relative flex h-12 items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 text-[15px] hover:bg-chip"
          >
            <Archive size={20} />
            <span className="hidden min-[400px]:inline">Lưu trữ</span>
            {archivedCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent-soft px-1.5 text-xs font-semibold text-accent-ink">{archivedCount}</span>
            )}
          </Link>
          <PrimaryButton onClick={openCreate} className="hidden items-center gap-1.5 sm:flex">
            <Plus size={20} /> Thêm
          </PrimaryButton>
        </div>
      </header>

      <SummaryCards
        summary={summary}
        empty={!own.length}
        soonActive={filter === 'soon'}
        onSoonClick={() => setFilter((f) => (f === 'soon' ? 'all' : 'soon'))}
      />

      {error ? (
        <p className="mt-10 text-center text-muted">Không tải được dữ liệu. Kiểm tra kết nối rồi tải lại trang.</p>
      ) : isLoading ? (
        <div className="mt-8 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-chip" />)}</div>
      ) : active.length === 0 ? (
        <EmptyState onPick={(p) => setForm({ kind: 'create', preset: p })} onOther={openCreate} />
      ) : (
        <section className="mt-8" aria-labelledby="list-title">
          <div className="flex items-baseline justify-between">
            <h2 id="list-title" className="text-xl font-bold tracking-tight">Dịch vụ đang dùng</h2>
            <span className="text-[15px] text-muted">{own.length} gói</span>
          </div>
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
            <FilterChip selected={filter === 'all'} onClick={() => setFilter('all')}>Tất cả</FilterChip>
            {CATEGORIES.map((c) => (
              <FilterChip key={c.id} selected={filter === c.id} onClick={() => setFilter(c.id)}>{c.label}</FilterChip>
            ))}
            {filter === 'soon' && <FilterChip selected onClick={() => setFilter('all')}>Sắp hết hạn ✕</FilterChip>}
          </div>

          <ul className="mt-4 space-y-3">{visibleOwn.map(renderCard)}</ul>
          {visibleOwn.length === 0 && <p className="mt-8 text-center text-muted">Không có gói nào trong mục này.</p>}

          {collect.length > 0 && (
            <section className="mt-10" aria-labelledby="collect-title">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="collect-title" className="text-xl font-bold tracking-tight">Thu hộ</h2>
                <span className="text-[15px] text-muted">
                  Cần thu <span className="money font-semibold text-ink">{money(summary.collectMonthly)}</span>/tháng
                </span>
              </div>
              <p className="mt-1 text-sm text-subtle">Không tính vào tổng của bạn · Chạm để mở bill</p>
              <ul className="mt-4 space-y-3">{visibleCollect.map(renderCard)}</ul>
              {visibleCollect.length === 0 && <p className="mt-6 text-center text-muted">Không có gói thu hộ nào trong mục này.</p>}
            </section>
          )}
        </section>
      )}

      {bill && (
        <BillSheet
          sub={bill}
          onClose={() => setBill(null)}
          onEdit={() => {
            setBill(null);
            setForm({ kind: 'edit', sub: bill });
          }}
        />
      )}

      {/* FAB — chỉ điện thoại */}
      <button
        onClick={openCreate}
        aria-label="Thêm gói mới"
        className="fixed right-5 bottom-[max(24px,calc(env(safe-area-inset-bottom)+12px))] z-40 grid size-16 place-items-center rounded-full bg-accent text-white shadow-[0_8px_24px_rgba(255,149,0,.35)] transition-transform active:scale-95 sm:hidden"
      >
        <Plus size={30} strokeWidth={2.25} />
      </button>

      {form && <SubscriptionForm key={openCount.current} mode={form} all={data} onClose={() => setForm(null)} />}
    </div>
  );
}

function EmptyState({ onPick, onOther }: { onPick: (p: (typeof PRESETS)[number]) => void; onOther: () => void }) {
  const featured = PRESETS.filter((p) => p.featured);
  return (
    <section className="mt-10 text-center">
      <svg viewBox="0 0 120 90" className="mx-auto h-24 w-32" aria-hidden>
        <g stroke="#FF9500" strokeWidth="3" strokeLinecap="round">
          <path d="M60 4v10M44 10l5 8M76 10l-5 8" />
        </g>
        <g fill="#fff" stroke="#6B6B6B" strokeWidth="2" strokeLinejoin="round">
          <path d="M30 36l30 12 30-12-30-12z" />
          <path d="M30 36v30l30 14 30-14V36L60 48z" />
          <path d="M30 36l-10 12 30 12 10-12M90 36l10 12-30 12-10-12" />
        </g>
      </svg>
      <h2 className="mt-4 text-2xl font-bold tracking-tight">Bạn đang dùng gì?</h2>
      <p className="mt-1.5 text-[15px] text-muted">Chạm để thêm nhanh — sửa giá sau cũng được.</p>
      <div className="mt-6 grid grid-cols-2 gap-2.5 min-[400px]:grid-cols-3 sm:grid-cols-4">
        {featured.map((p) => (
          <button key={p.id} onClick={() => onPick(p)} className="flex min-h-14 items-center gap-2.5 rounded-2xl border border-line bg-surface px-3 text-left text-[15px] font-medium hover:border-accent/50">
            <ServiceIcon category={p.category} presetId={p.id} size="sm" />
            <span className="truncate">{p.name}</span>
          </button>
        ))}
      </div>
      <button onClick={onOther} className="mt-2.5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-[15px] text-muted hover:text-ink">
        <Plus size={20} /> Thêm dịch vụ khác
      </button>
    </section>
  );
}
