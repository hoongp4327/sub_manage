import { useRef, useState } from 'react';
import { Ban, Pencil, Receipt, RotateCcw, Trash2 } from 'lucide-react';
import { isoDate, money, shortDate } from '../../../lib/format';
import { MoreMenu } from '../../../shared/ui';
import { cycleLabel, daysUntil, monthlyEquivalent, nextRenewal, roundK, SOON_DAYS } from '../logic/calc';
import type { Subscription } from '../types';
import { ServiceIcon } from './ServiceIcon';

interface Props {
  sub: Subscription;
  today: Date;
  isNew?: boolean;
  onEdit: () => void;
  /** Chạm vào thẻ — mặc định là Sửa; gói thu hộ thì mở bill */
  onOpen?: () => void;
  onDelete: () => void;
  onCancelRenewal: (endsAt: string) => void;
  onResumeRenewal: () => void;
}

const REVEAL = 88;

function DaysBadge({ days, ending }: { days: number; ending: boolean }) {
  const text = ending
    ? days === 0 ? 'Hết hạn hôm nay' : `Hết hạn sau ${days} ngày`
    : days === 0 ? 'Hôm nay' : `Còn ${days} ngày`;
  const tone = ending
    ? 'bg-chip text-muted line-through decoration-subtle/60'
    : days === 0 ? 'bg-danger-bg text-danger font-semibold'
    : days <= SOON_DAYS ? 'bg-soon text-soon-ink font-medium'
    : 'bg-chip text-muted';
  return <span className={`inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[13px] whitespace-nowrap ${tone}`}>{text}</span>;
}

export function SubscriptionCard({ sub, today, isNew, onEdit, onOpen = onEdit, onDelete, onCancelRenewal, onResumeRenewal }: Props) {
  const next = nextRenewal(sub, today);
  const days = daysUntil(next, today);
  const ending = !!sub.endsAt;
  const soon = !ending && days <= SOON_DAYS;
  const perMonth = money(roundK(monthlyEquivalent(sub)));
  const who = sub.isCollect ? `Thu của ${sub.payer || '…'} · ` : '';
  const detail = ending
    ? `${who}${money(sub.price)} / ${cycleLabel(sub.cycleCount, sub.cycleUnit)} · Đã hủy gia hạn`
    : `${who}${money(sub.price)} / ${cycleLabel(sub.cycleCount, sub.cycleUnit)} · ${sub.isCollect ? 'Hạn thu' : 'Gia hạn'} ${shortDate(next)}`;

  // Vuốt trái để lộ nút Xóa (điện thoại)
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const moved = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    start.current = { x: e.clientX, y: e.clientY, base: offset };
    moved.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (!moved.current) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) return void (start.current = null);
      if (Math.abs(dx) < 8) return;
      moved.current = true;
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    setOffset(Math.min(0, Math.max(-REVEAL - 30, start.current.base + dx)));
  };
  const onPointerUp = () => {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    setOffset((o) => (o < -REVEAL / 2 ? -REVEAL : 0));
  };

  const menu = [
    ...(sub.isCollect ? [{ label: 'Xem bill', icon: <Receipt size={17} />, onSelect: onOpen }] : []),
    { label: 'Sửa', icon: <Pencil size={17} />, onSelect: onEdit },
    ending
      ? { label: 'Tiếp tục gia hạn', icon: <RotateCcw size={17} />, onSelect: onResumeRenewal }
      : { label: 'Hủy gia hạn', icon: <Ban size={17} />, onSelect: () => onCancelRenewal(isoDate(next)) },
    { label: 'Xóa', icon: <Trash2 size={17} />, danger: true, onSelect: onDelete },
  ];

  return (
    <li className={`relative rounded-2xl has-[[aria-expanded=true]]:z-20 ${offset || dragging ? 'overflow-hidden' : ''} ${isNew ? 'animate-card-in' : ''}`}>
      {/* nút Xóa lộ ra khi vuốt */}
      {(offset !== 0 || dragging) && (
        <button
          tabIndex={-1}
          onClick={onDelete}
          className="absolute inset-y-0 right-0 flex w-[88px] flex-col items-center justify-center gap-1 bg-danger-bg text-sm font-semibold text-danger"
        >
          <Trash2 size={20} />
          Xóa
        </button>
      )}

      <div
        role="button"
        tabIndex={0}
        aria-label={`${sub.name}, ${perMonth} mỗi tháng, ${detail}`}
        onClick={() => {
          if (moved.current) return;
          if (offset !== 0) return setOffset(0);
          onOpen();
        }}
        onKeyDown={(e) => e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ transform: offset ? `translateX(${offset}px)` : undefined, transition: dragging ? 'none' : 'transform 200ms ease-out', touchAction: 'pan-y' }}
        className={`group relative cursor-pointer select-none rounded-2xl border bg-surface px-4 py-3.5 transition-colors hover:border-subtle/40 sm:px-5 ${
          soon ? 'border-[#BFD4F2] shadow-[0_0_0_3px_rgba(191,212,242,.25)]' : 'border-line'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <ServiceIcon category={sub.category} presetId={sub.presetId} />

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{sub.name}</p>
            {/* điện thoại: giá quy đổi ngay dưới tên */}
            <p className="mt-0.5 whitespace-nowrap sm:hidden">
              <span className="money text-[17px] font-bold">{perMonth}</span>
              <span className="text-sm text-muted"> /tháng</span>
            </p>
            {/* máy tính: dòng chi tiết dưới tên */}
            <p className="mt-0.5 hidden truncate text-sm text-muted sm:block">{detail}</p>
          </div>

          <p className="hidden text-right sm:block">
            <span className="money block text-[17px] font-bold">{perMonth}</span>
            <span className="text-sm text-muted">/tháng</span>
          </p>
          <DaysBadge days={days} ending={ending} />
          <MoreMenu items={menu} className="-mr-2 hidden sm:block" label={`Tùy chọn cho ${sub.name}`} />
        </div>

        {/* điện thoại: dòng chi tiết + nút ⋯ */}
        <div className="mt-3 flex items-center gap-2 border-t border-line pt-1.5 sm:hidden">
          <p className="min-w-0 flex-1 truncate text-[13px] text-muted">{detail}</p>
          <MoreMenu items={menu} className="-mr-2 -mb-1" label={`Tùy chọn cho ${sub.name}`} />
        </div>
      </div>
    </li>
  );
}
