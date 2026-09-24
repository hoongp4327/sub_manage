import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { money } from '../../../lib/format';
import type { Summary } from '../logic/calc';

/** Số đếm lên/xuống 300ms khi tổng thay đổi. */
function useCountUp(target: number) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = target;
      return setValue(target);
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 300);
      const v = start + (target - start) * (1 - (1 - p) ** 3);
      setValue(v);
      from.current = v;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // tab ẩn thì rAF bị dừng — luôn chốt giá trị cuối
    const done = setTimeout(() => {
      cancelAnimationFrame(raf);
      from.current = target;
      setValue(target);
    }, 350);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [target]);
  return Math.round(value / 1000) * 1000;
}

const card = 'rounded-2xl border border-line bg-surface p-4 sm:p-5';

export function SummaryCards({ summary, empty, onSoonClick, soonActive }: { summary: Summary; empty?: boolean; onSoonClick: () => void; soonActive: boolean }) {
  const monthly = useCountUp(summary.monthly);
  const yearly = useCountUp(summary.yearly);
  const pct = summary.changePct;
  const numberTone = empty ? 'text-subtle' : '';

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4" aria-label="Tổng quan">
      <div className={`${card} col-span-2 sm:col-span-1`}>
        <p className="text-[15px] text-muted">Tổng tháng này</p>
        <p className={`money mt-1 text-[36px] font-bold leading-tight sm:text-[30px] ${numberTone}`}>{money(monthly)}</p>
        {pct !== null && pct !== 0 && (
          <p className="mt-2 flex items-center gap-2 text-[13px] text-muted">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${pct > 0 ? 'bg-accent-soft text-accent-ink' : 'bg-positive-bg text-positive'}`}>
              {pct > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {pct > 0 ? '+' : ''}
              {pct}%
            </span>
            so với tháng trước
          </p>
        )}
      </div>

      <div className={card}>
        <p className="text-[15px] text-muted">Tổng cả năm</p>
        <p className={`money mt-1 text-[21px] font-bold leading-tight min-[400px]:text-2xl sm:text-[30px] ${numberTone}`}>{money(yearly)}</p>
        <p className="mt-2 text-[13px] text-muted">dự kiến theo chu kỳ</p>
      </div>

      <button
        type="button"
        onClick={onSoonClick}
        disabled={summary.soonCount === 0}
        aria-pressed={soonActive}
        className={`${card} text-left transition-colors ${
          summary.soonCount ? 'border-[#F8E3BF] bg-warn-bg hover:border-warn/40' : ''
        } ${soonActive ? 'ring-2 ring-warn/40' : ''}`}
      >
        <p className={`flex items-center gap-1.5 text-[15px] font-medium ${summary.soonCount ? 'text-warn' : 'text-muted'}`}>
          <AlertTriangle size={17} /> Sắp hết hạn
        </p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className={`money text-[28px] font-bold leading-tight sm:text-[30px] ${summary.soonCount ? '' : 'text-subtle'}`}>{summary.soonCount}</span>
          <span className="text-[15px] text-muted">dịch vụ</span>
        </p>
        <p className={`mt-1 text-[13px] ${summary.soonCount ? 'text-warn' : 'text-muted'}`}>Trong 7 ngày tới</p>
      </button>
    </section>
  );
}
