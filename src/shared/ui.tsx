import { useEffect, useRef, useState, type ComponentProps, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';

export function Chip({ selected, className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-[15px] whitespace-nowrap transition-colors ${
        selected
          ? 'border-accent bg-accent-soft font-semibold text-accent-ink'
          : 'border-line bg-surface text-ink/80 hover:border-subtle/60'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Chip lọc dạng viên thuốc (danh sách). */
export function FilterChip({ selected, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`min-h-10 shrink-0 rounded-full border px-4 text-sm transition-colors ${
        selected ? 'border-accent bg-accent-soft font-semibold text-accent-ink' : 'border-line bg-surface text-muted hover:text-ink'
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ className = '', ...rest }: ComponentProps<'button'>) {
  return (
    <button
      className={`min-h-12 rounded-2xl bg-accent px-5 text-base font-bold text-white transition-colors hover:bg-accent-hover disabled:opacity-40 ${className}`}
      {...rest}
    />
  );
}

export function GhostButton({ className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`min-h-12 rounded-2xl border border-line bg-surface px-5 text-base font-medium hover:bg-chip ${className}`} {...rest} />;
}

export function Field({ label, hint, children, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="mt-5 first:mt-0">
      <label htmlFor={htmlFor} className="mb-2 block text-[15px] text-muted">
        {label}
        {hint && <span className="ml-1.5 text-sm text-subtle">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

export const inputClass =
  'h-13 w-full rounded-xl border border-line bg-surface px-4 text-base outline-none transition-colors placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/15';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

/** Nút "⋯" + menu nhỏ. */
export function MoreMenu({ items, className = '', label = 'Thêm tùy chọn' }: { items: MenuItem[]; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className="reveal-on-hover grid size-10 place-items-center rounded-xl text-muted hover:bg-chip hover:text-ink"
      >
        <MoreHorizontal size={20} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-30 min-w-48 animate-dialog-in overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
              className={`flex min-h-11 w-full items-center gap-2.5 px-4 text-left text-[15px] hover:bg-chip ${it.danger ? 'text-danger' : ''}`}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
