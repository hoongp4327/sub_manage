import { useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { format } from 'date-fns';
import { Check, Copy, Pencil, RotateCcw, Share2 } from 'lucide-react';
import { PAYMENT } from '../../../config/payment';
import { buildVietQR, qrDataUrl, sanitizeNote } from '../../../lib/vietqr';
import { money, normalize, shortDate } from '../../../lib/format';
import { Sheet } from '../../../shared/Sheet';
import { GhostButton, PrimaryButton } from '../../../shared/ui';
import { useToast } from '../../../shared/Toast';
import { useSubscriptionActions } from '../data/hooks';
import { cleanNote, NOTE_MAX, transferNote } from '../logic/bill';
import { addCycles, cycleLabel, nextRenewal } from '../logic/calc';
import type { Subscription } from '../types';
import { ServiceIcon } from './ServiceIcon';

export function BillSheet({ sub, onClose, onEdit }: { sub: Subscription; onClose: () => void; onEdit: () => void }) {
  const toast = useToast();
  const billRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const actions = useSubscriptionActions();
  // Đang sửa nội dung CK: null = không sửa
  const [draft, setDraft] = useState<string | null>(null);

  const today = new Date();
  const due = nextRenewal(sub, today);
  const periodEnd = addCycles(due, sub.cycleCount, sub.cycleUnit, 1);
  const note = transferNote(draft === null ? sub : { name: sub.name, transferNote: draft });
  const defaultNote = transferNote({ name: sub.name });

  const saveNote = () => {
    if (draft === null) return;
    const clean = cleanNote(draft);
    // Trùng nội dung mặc định → lưu trống để sau này đổi tên gói vẫn tự theo
    const value = !clean || clean === defaultNote ? null : clean;
    if (value !== (sub.transferNote ?? null)) {
      actions.update(sub.id, { transferNote: value });
      toast({ message: 'Đã lưu nội dung chuyển khoản' });
    }
    setDraft(null);
  };
  const qr = useMemo(
    () => qrDataUrl(buildVietQR({ bankBin: PAYMENT.bankBin, accountNumber: PAYMENT.accountNumber, amount: sub.price, note })),
    [sub.price, note],
  );

  async function share() {
    if (!billRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await Promise.race([
        toPng(billRef.current, {
          pixelRatio: 3,
          backgroundColor: '#FFFFFF',
          cacheBust: true,
          filter: (n) => !(n instanceof Element && n.hasAttribute('data-no-capture')),
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
      ]);
      const fileName = `bill-${normalize(sub.name).replace(/[^a-z0-9]+/g, '-')}.png`;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Bill ${sub.name}` });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = fileName;
        a.click();
        toast({ message: 'Đã tải ảnh bill' });
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') toast({ message: 'Chưa tạo được ảnh bill' });
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ message: `Đã chép ${label.toLowerCase()}` });
    } catch {
      toast({ message: 'Không chép được' });
    }
  }

  return (
    <Sheet
      title="Bill thu hộ"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <GhostButton onClick={onEdit} className="flex items-center gap-2">
            <Pencil size={18} /> Sửa
          </GhostButton>
          <PrimaryButton onClick={share} disabled={busy} className="flex flex-1 items-center justify-center gap-2">
            <Share2 size={19} /> {busy ? 'Đang tạo ảnh…' : 'Gửi bill'}
          </PrimaryButton>
        </div>
      }
    >
      {/* Phần này được chụp thành ảnh khi bấm "Gửi bill" */}
      <div ref={billRef} className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center gap-3">
          <ServiceIcon category={sub.category} presetId={sub.presetId} />
          <div className="min-w-0">
            <p className="truncate text-[17px] font-bold">{sub.name}</p>
            <p className="text-sm text-muted">{sub.payer ? `Thu của ${sub.payer}` : 'Thu hộ'}</p>
          </div>
        </div>

        <div className="mt-5 border-t border-dashed border-line pt-4">
          <p className="text-sm text-muted">Số tiền</p>
          <p className="money mt-0.5 text-[34px] font-bold leading-tight">{money(sub.price)}</p>
          <dl className="mt-3 space-y-1.5 text-[14px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Chu kỳ</dt>
              <dd>{cycleLabel(sub.cycleCount, sub.cycleUnit)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="shrink-0 text-muted">Kỳ sử dụng</dt>
              <dd className="text-right">{format(due, 'dd/MM')} – {format(periodEnd, 'dd/MM/yyyy')}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Hạn thanh toán</dt>
              <dd className="font-semibold">{shortDate(due)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-5 border-t border-dashed border-line pt-5 text-center">
          <p className="text-[13px] text-muted">Quét bằng app ngân hàng để chuyển</p>
          <img src={qr} alt="Mã VietQR chuyển khoản" className="mx-auto mt-2 size-56 rounded-xl border border-line p-1.5" />
          {PAYMENT.accountName && <p className="mt-3 text-[15px] font-semibold">{PAYMENT.accountName}</p>}
          <p className={`${PAYMENT.accountName ? '' : 'mt-3'} text-[15px]`}>
            <span className="font-semibold">{PAYMENT.bankName}</span> · <span className="money">{PAYMENT.accountNumber}</span>
          </p>
          {draft === null ? (
            <button
              type="button"
              onClick={() => setDraft(note)}
              className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-chip px-3 py-2 text-[13px] text-muted hover:text-ink"
            >
              <span>Nội dung CK: <span className="font-semibold text-ink">{note}</span></span>
              {/* Ẩn icon khi chụp ảnh bill */}
              <Pencil size={13} className="shrink-0" data-no-capture />
            </button>
          ) : (
            <div className="mt-3 text-left" data-no-capture>
              <label htmlFor="transfer-note" className="text-[13px] text-muted">Nội dung CK</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-accent bg-surface px-3 ring-2 ring-accent/15">
                <input
                  id="transfer-note"
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(sanitizeNote(e.target.value + (e.target.value.endsWith(' ') ? ' ' : '')).toUpperCase().slice(0, NOTE_MAX))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveNote();
                    if (e.key === 'Escape') { e.stopPropagation(); setDraft(null); }
                  }}
                  maxLength={NOTE_MAX}
                  placeholder={defaultNote}
                  className="h-11 min-w-0 flex-1 bg-transparent text-[15px] font-semibold uppercase outline-none placeholder:font-normal placeholder:text-subtle"
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[12px] text-subtle">
                <span>Không dấu · tối đa <span className="money">{draft.length}/{NOTE_MAX}</span></span>
                <button type="button" onClick={() => setDraft(defaultNote)} className="inline-flex min-h-8 shrink-0 items-center gap-1 whitespace-nowrap hover:text-ink">
                  <RotateCcw size={12} /> Mặc định
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <GhostButton type="button" onClick={() => setDraft(null)} className="min-h-11 flex-1 text-[15px]">Hủy</GhostButton>
                <PrimaryButton type="button" onClick={saveNote} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 text-[15px]">
                  <Check size={18} /> Lưu
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {([['STK', PAYMENT.accountNumber], ['Số tiền', String(sub.price)], ['Nội dung', note]] as const).map(([label, value]) => (
          <button key={label} onClick={() => copy(value, label)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-line px-1 text-[13px] text-muted hover:text-ink">
            <Copy size={14} /> {label}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
