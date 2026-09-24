import { useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronRight, Info, Trash2 } from 'lucide-react';
import { groupDigits, isoDate, money, normalize, parseDigits, shortDate, todayISO, yesterdayISO } from '../../../lib/format';
import { Sheet } from '../../../shared/Sheet';
import { Chip, Field, GhostButton, PrimaryButton, inputClass } from '../../../shared/ui';
import { useToast } from '../../../shared/Toast';
import { useSubscriptionActions, type SubscriptionInput } from '../data/hooks';
import { guessCategory, presetById, searchPresets, type Preset } from '../data/presets';
import { monthlyEquivalent, nextRenewal, perCycleLabel, roundK } from '../logic/calc';
import { CATEGORIES, type Category, type CycleUnit, type Subscription } from '../types';
import { ServiceIcon } from './ServiceIcon';

export type FormMode =
  | { kind: 'create'; preset?: Preset }
  | { kind: 'edit'; sub: Subscription }
  | { kind: 'resubscribe'; sub: Subscription };

const CYCLE_PRESETS: { count: number; unit: CycleUnit; label: string }[] = [
  { count: 1, unit: 'month', label: '1 tháng' },
  { count: 3, unit: 'month', label: '3 tháng' },
  { count: 6, unit: 'month', label: '6 tháng' },
  { count: 1, unit: 'year', label: '1 năm' },
];
const UNITS: { id: CycleUnit; label: string }[] = [
  { id: 'day', label: 'ngày' },
  { id: 'week', label: 'tuần' },
  { id: 'month', label: 'tháng' },
  { id: 'year', label: 'năm' },
];

interface Props {
  mode: FormMode;
  all: Subscription[];
  onClose: () => void;
}

export function SubscriptionForm({ mode, all, onClose }: Props) {
  const actions = useSubscriptionActions();
  const toast = useToast();
  const source = mode.kind === 'create' ? undefined : mode.sub;
  const initialPreset = mode.kind === 'create' ? mode.preset : undefined;

  const [name, setName] = useState(source?.name ?? initialPreset?.name ?? '');
  const [presetId, setPresetId] = useState<string | null>(source?.presetId ?? initialPreset?.id ?? null);
  const [price, setPrice] = useState(source?.price ?? initialPreset?.price ?? 0);
  const [cycleCount, setCycleCount] = useState(source?.cycleCount ?? initialPreset?.cycleCount ?? 1);
  const [cycleUnit, setCycleUnit] = useState<CycleUnit>(source?.cycleUnit ?? initialPreset?.cycleUnit ?? 'month');
  const [customCycle, setCustomCycle] = useState(() => !CYCLE_PRESETS.some((c) => c.count === cycleCount && c.unit === cycleUnit));
  const [startDate, setStartDate] = useState(mode.kind === 'edit' ? mode.sub.startDate : todayISO());
  const [category, setCategory] = useState<Category>(source?.category ?? initialPreset?.category ?? 'other');
  const [categoryTouched, setCategoryTouched] = useState(!!source || !!initialPreset);
  const [purchasedFrom, setPurchasedFrom] = useState(source?.purchasedFrom ?? '');
  const [note, setNote] = useState(source?.note ?? '');
  const [isCollect, setIsCollect] = useState(!!source?.isCollect);
  const [payer, setPayer] = useState(source?.payer ?? '');
  const [showDetails, setShowDetails] = useState(!!(source?.purchasedFrom || source?.note));
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => (presetId ? [] : searchPresets(name)), [name, presetId]);
  const purchaseOptions = useMemo(
    () => [...new Set(['Trực tiếp', 'Đại lý', ...all.map((s) => s.purchasedFrom).filter((v): v is string => !!v)])],
    [all],
  );
  const payerOptions = useMemo(() => [...new Set(all.map((s) => s.payer).filter((v): v is string => !!v))], [all]);

  const trimmed = name.trim();
  const sameName = (s: Subscription) => s.id !== source?.id && normalize(s.name) === normalize(trimmed);
  const activeDup = trimmed ? all.find((s) => s.status === 'active' && sameName(s)) : undefined;
  const archivedDup = mode.kind === 'create' && trimmed ? all.find((s) => s.status === 'archived' && sameName(s)) : undefined;

  const valid = trimmed.length > 0 && price > 0 && cycleCount > 0;
  const preview = price > 0 && cycleCount > 0
    ? `≈ ${money(roundK(monthlyEquivalent({ price, cycleCount, cycleUnit })))}/tháng · Gia hạn ${shortDate(nextRenewal({ startDate, cycleCount, cycleUnit }, new Date()))}`
    : null;

  function pickPreset(p: Preset) {
    setName(p.name);
    setPresetId(p.id);
    setPrice(p.price);
    setCycleCount(p.cycleCount);
    setCycleUnit(p.cycleUnit);
    setCustomCycle(!CYCLE_PRESETS.some((c) => c.count === p.cycleCount && c.unit === p.cycleUnit));
    setCategory(p.category);
    setCategoryTouched(true);
    setSuggestOpen(false);
    // chạy sau khi chuỗi sự kiện click kết thúc, để bàn phím đóng và nút lưu được focus
    setTimeout(() => submitRef.current?.focus(), 50);
  }

  function onNameChange(v: string) {
    setName(v);
    if (presetId && presetById(presetId)?.name !== v) setPresetId(null);
    if (!categoryTouched) setCategory(guessCategory(v) ?? 'other');
    setSuggestOpen(true);
  }

  function submit() {
    setSubmitted(true);
    if (!valid) return;
    const input: SubscriptionInput = {
      name: trimmed,
      presetId,
      category,
      price,
      cycleCount,
      cycleUnit,
      startDate,
      purchasedFrom: purchasedFrom.trim() || null,
      note: note.trim() || null,
      isCollect,
      payer: isCollect ? payer.trim() || null : null,
      endsAt: mode.kind === 'edit' ? mode.sub.endsAt : null,
    };
    if (mode.kind === 'create') {
      actions.create(input);
      toast({ message: `Đã thêm ${trimmed}` });
    } else if (mode.kind === 'edit') {
      actions.update(mode.sub.id, input);
      toast({ message: 'Đã lưu thay đổi' });
    } else {
      actions.resubscribe(mode.sub.id, input);
      toast({ message: `Đã đăng ký lại ${trimmed}` });
    }
    onClose();
  }

  function remove() {
    if (mode.kind !== 'edit') return;
    const { id, name } = mode.sub;
    actions.archive(id);
    toast({ message: `Đã chuyển ${name} vào Lưu trữ`, actionLabel: 'Hoàn tác', onAction: () => actions.restore(id) });
    onClose();
  }

  const title = mode.kind === 'create' ? 'Thêm gói mới' : mode.kind === 'edit' ? 'Sửa gói' : `Đăng ký lại ${mode.sub.name}`;
  const submitLabel = mode.kind === 'create' ? 'Thêm vào tủ' : mode.kind === 'edit' ? 'Lưu' : 'Đăng ký lại';
  const dateChip = startDate === todayISO() ? 'today' : startDate === yesterdayISO() ? 'yesterday' : 'custom';

  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <>
          {preview && (
            <p className="mb-3 rounded-xl bg-chip/70 px-4 py-2.5 text-center text-[14px] text-muted">
              <span className="money font-semibold text-ink">{preview.split(' · ')[0]}</span> · {preview.split(' · ')[1]}
            </p>
          )}
          <div className="flex gap-3">
            <GhostButton type="button" onClick={onClose} className="hidden sm:block">Hủy</GhostButton>
            <PrimaryButton ref={submitRef} type="submit" form="sub-form" disabled={submitted && !valid} className="flex-1 sm:flex-none sm:ml-auto">
              {submitLabel}
            </PrimaryButton>
          </div>
        </>
      }
    >
      <form
        id="sub-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
      >
        {mode.kind === 'resubscribe' && (
          <p className="mb-5 flex items-start gap-2.5 rounded-xl bg-accent-soft px-4 py-3 text-[14px] text-accent-ink">
            <Info size={18} className="mt-px shrink-0" />
            Đã điền sẵn từ gói cũ — chỉ cần kiểm tra lại giá.
          </p>
        )}

        {/* Tên dịch vụ */}
        <Field label="Tên dịch vụ" htmlFor="f-name">
          <div className="relative">
            <div className="relative">
              {presetId && (
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
                  <ServiceIcon category={category} presetId={presetId} size="sm" />
                </span>
              )}
              <input
                id="f-name"
                autoFocus={mode.kind === 'create' && !initialPreset}
                autoComplete="off"
                enterKeyHint="next"
                placeholder="Gõ tên, vd: Netflix"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                onFocus={() => setSuggestOpen(true)}
                onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (suggestOpen && suggestions[0] && normalize(suggestions[0].name).startsWith(normalize(name))) pickPreset(suggestions[0]);
                    else amountRef.current?.focus();
                  }
                }}
                className={`${inputClass} ${presetId ? 'pl-14' : ''} ${submitted && !trimmed ? 'border-danger' : ''}`}
              />
            </div>
            {suggestOpen && suggestions.length > 0 && (
              <ul role="listbox" className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
                {suggestions.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      aria-label={`${p.name}, ${money(p.price)}${perCycleLabel(p.cycleCount, p.cycleUnit)}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickPreset(p)}
                      className="flex min-h-12 w-full items-center gap-3 px-3 text-left hover:bg-chip"
                    >
                      <ServiceIcon category={p.category} presetId={p.id} size="sm" />
                      <span className="font-medium">{p.name}</span>
                      <span className="text-sm text-subtle">· {money(p.price)}{perCycleLabel(p.cycleCount, p.cycleUnit)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {submitted && !trimmed && <p className="mt-1.5 text-sm text-danger">Nhập tên dịch vụ</p>}
          {activeDup && <p className="mt-1.5 text-sm text-warn">Bạn đã có {activeDup.name} — vẫn thêm được.</p>}
          {archivedDup && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-accent-soft px-3.5 py-2.5 text-sm text-accent-ink">
              <span>{archivedDup.name} đang nằm trong Lưu trữ.</span>
              <button
                type="button"
                className="min-h-9 shrink-0 font-semibold underline-offset-2 hover:underline"
                onClick={() => {
                  actions.restore(archivedDup.id);
                  toast({ message: `Đã khôi phục ${archivedDup.name}` });
                  onClose();
                }}
              >
                Khôi phục
              </button>
            </div>
          )}
        </Field>

        {/* Số tiền */}
        <Field label="Số tiền" htmlFor="f-price">
          <div className="relative">
            <input
              id="f-price"
              ref={amountRef}
              inputMode="numeric"
              enterKeyHint="done"
              autoComplete="off"
              placeholder="0"
              value={groupDigits(price)}
              onChange={(e) => setPrice(parseDigits(e.target.value))}
              className={`${inputClass} money pr-12 text-[17px] font-semibold ${submitted && price <= 0 ? 'border-danger' : ''}`}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">đ</span>
          </div>
          {price > 0 && price < 1000 && (
            <button type="button" onClick={() => setPrice(price * 1000)} className="mt-2 min-h-9 rounded-full bg-accent-soft px-3.5 text-sm font-medium text-accent-ink">
              {money(price * 1000)}?
            </button>
          )}
          {submitted && price <= 0 && <p className="mt-1.5 text-sm text-danger">Nhập số tiền</p>}
        </Field>

        {/* Chu kỳ */}
        <Field label="Chu kỳ">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {CYCLE_PRESETS.map((c) => (
              <Chip
                key={c.label}
                selected={!customCycle && cycleCount === c.count && cycleUnit === c.unit}
                onClick={() => {
                  setCustomCycle(false);
                  setCycleCount(c.count);
                  setCycleUnit(c.unit);
                }}
              >
                {c.label}
              </Chip>
            ))}
            <Chip selected={customCycle} onClick={() => setCustomCycle(true)}>Khác…</Chip>
          </div>
          {customCycle && (
            <div className="mt-2 flex gap-2">
              <input
                aria-label="Số chu kỳ"
                inputMode="numeric"
                value={cycleCount || ''}
                onChange={(e) => setCycleCount(Math.min(999, parseDigits(e.target.value)))}
                className={`${inputClass} w-24 text-center`}
              />
              <select aria-label="Đơn vị chu kỳ" value={cycleUnit} onChange={(e) => setCycleUnit(e.target.value as CycleUnit)} className={`${inputClass} w-36`}>
                {UNITS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select>
            </div>
          )}
        </Field>

        {/* Ngày thanh toán */}
        <Field label="Ngày thanh toán">
          <div className="flex flex-wrap gap-2">
            <Chip selected={dateChip === 'today'} onClick={() => setStartDate(todayISO())}>Hôm nay</Chip>
            <Chip selected={dateChip === 'yesterday'} onClick={() => setStartDate(yesterdayISO())}>Hôm qua</Chip>
            <span className="relative">
              <Chip
                selected={dateChip === 'custom'}
                onClick={() => {
                  try {
                    dateRef.current?.showPicker();
                  } catch {
                    dateRef.current?.focus();
                  }
                }}
              >
                <CalendarDays size={18} />
                {dateChip === 'custom' ? shortDate(startDate) : 'Chọn ngày'}
              </Chip>
              <input
                ref={dateRef}
                type="date"
                tabIndex={-1}
                aria-hidden
                value={startDate}
                max={isoDate(new Date(Date.now() + 366 * 864e5))}
                onChange={(e) => e.target.value && setStartDate(e.target.value)}
                className="pointer-events-none absolute inset-0 -z-10 opacity-0"
              />
            </span>
          </div>
        </Field>

        {/* Phân loại */}
        <Field label="Phân loại">
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                selected={category === c.id}
                onClick={() => {
                  setCategory(c.id);
                  setCategoryTouched(true);
                }}
                className={category === c.id ? '' : `${{ work: 'bg-cat-work!', entertainment: 'bg-cat-fun!', other: 'bg-cat-other!' }[c.id]} border-transparent!`}
              >
                <span aria-hidden>{c.emoji}</span> {c.label}
              </Chip>
            ))}
          </div>
        </Field>

        {/* Thu hộ */}
        <div className="mt-5 rounded-2xl border border-line p-4">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-[15px] font-semibold">Thu hộ</span>
              <span className="block text-sm text-muted">Trả giúp người khác — không tính vào tổng của bạn</span>
            </span>
            <input type="checkbox" role="switch" checked={isCollect} onChange={(e) => setIsCollect(e.target.checked)} className="peer sr-only" />
            <span
              aria-hidden
              className="relative h-7 w-12 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5"
            />
          </label>
          {isCollect && (
            <div className="mt-4 animate-fade-in">
              <label htmlFor="f-payer" className="mb-2 block text-[15px] text-muted">Thu của ai?</label>
              <input id="f-payer" value={payer} onChange={(e) => setPayer(e.target.value)} placeholder="vd: chị Dung" autoComplete="off" className={inputClass} />
              {payerOptions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {payerOptions.slice(0, 6).map((o) => (
                    <button key={o} type="button" onClick={() => setPayer(o)} className={`min-h-8 rounded-full px-3 text-sm ${payer === o ? 'bg-accent-soft font-semibold text-accent-ink' : 'bg-chip text-muted hover:text-ink'}`}>{o}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chi tiết tùy chọn */}
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          aria-expanded={showDetails}
          className="mt-4 flex min-h-11 items-center gap-1 text-[15px] text-muted hover:text-ink"
        >
          <ChevronRight size={18} className={`transition-transform ${showDetails ? 'rotate-90' : ''}`} />
          Thêm chi tiết
        </button>
        {showDetails && (
          <div className="animate-fade-in">
            <Field label="Mua ở đâu" hint="(tùy chọn)" htmlFor="f-from">
              <input id="f-from" list="purchase-options" value={purchasedFrom} onChange={(e) => setPurchasedFrom(e.target.value)} placeholder="vd: Trực tiếp, đại lý, Garena Plus…" className={inputClass} />
              <datalist id="purchase-options">{purchaseOptions.map((o) => <option key={o} value={o} />)}</datalist>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {purchaseOptions.slice(0, 4).map((o) => (
                  <button key={o} type="button" onClick={() => setPurchasedFrom(o)} className="min-h-8 rounded-full bg-chip px-3 text-sm text-muted hover:text-ink">{o}</button>
                ))}
              </div>
            </Field>
            <Field label="Ghi chú" hint="(tùy chọn)" htmlFor="f-note">
              <input id="f-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="vd: dùng chung với gia đình" className={inputClass} />
            </Field>
          </div>
        )}

        {mode.kind === 'edit' && (
          <button type="button" onClick={remove} className="mt-6 flex min-h-11 items-center gap-2 text-[15px] font-medium text-danger">
            <Trash2 size={18} /> Xóa gói này
          </button>
        )}
      </form>
    </Sheet>
  );
}
