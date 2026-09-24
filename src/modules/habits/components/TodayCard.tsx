import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

/** Số đếm lên/xuống 300ms khi % thay đổi. */
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
  return Math.round(value);
}

export function TodayCard({ percent, count }: { percent: number; count: number }) {
  const shown = useCountUp(percent);
  const all = percent === 100;
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <section aria-label="Hôm nay" className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div>
        <p className="text-[15px] text-muted">Hôm nay</p>
        <p className="money mt-1 text-[40px] font-bold leading-none">{shown}%</p>
        <p className="mt-2 text-[13px] text-muted">{all ? 'Hoàn thành tất cả' : `Trung bình ${count} thói quen`}</p>
      </div>
      {all ? (
        <span className="grid size-[76px] shrink-0 place-items-center rounded-full bg-accent text-white">
          <Check size={36} strokeWidth={3} />
        </span>
      ) : (
        <svg viewBox="0 0 76 76" className="size-[76px] shrink-0 -rotate-90" aria-hidden>
          <circle cx="38" cy="38" r={r} fill="none" stroke="var(--color-accent-soft)" strokeWidth="8" />
          <circle
            cx="38" cy="38" r={r} fill="none" stroke="var(--color-accent)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${(c * shown) / 100} ${c}`}
            opacity={shown ? 1 : 0}
          />
        </svg>
      )}
    </section>
  );
}
