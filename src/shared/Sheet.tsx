import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Vùng dính đáy (nút lưu) */
  footer?: ReactNode;
  size?: 'md' | 'sm';
}

/**
 * Điện thoại: bottom sheet trượt từ dưới lên, kéo tay nắm xuống để đóng.
 * Máy tính (≥ 640px): dialog giữa màn hình.
 */
export function Sheet({ title, onClose, children, footer, size = 'md' }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // chỉ chạy lúc mở/đóng — không phụ thuộc onClose để re-render không cướp focus
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prevFocus?.focus?.();
    };
  }, []);

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      startY.current = e.clientY;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (startY.current !== null) setDrag(Math.max(0, e.clientY - startY.current));
    },
    onPointerUp: () => {
      if (drag > 100) onClose();
      startY.current = null;
      setDrag(0);
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-black/35 sm:backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
        className={`relative flex max-h-[92dvh] w-full animate-sheet-up flex-col rounded-t-[28px] bg-surface shadow-2xl outline-none transition-transform sm:animate-dialog-in sm:rounded-2xl ${size === 'sm' ? 'sm:max-w-[380px]' : 'sm:max-w-[460px]'}`}
      >
        <div {...handlers} className="flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-1 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-line" />
        </div>
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-2 sm:px-6 sm:pt-6">
          <h2 className="text-[22px] font-bold leading-tight tracking-tight sm:text-xl">{title}</h2>
          <button onClick={onClose} aria-label="Đóng" className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-chip">
            <X size={22} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-4 sm:px-6">{children}</div>
        {footer && <div className="shrink-0 border-t border-line/60 bg-surface px-5 pt-3 pb-safe sm:rounded-b-2xl sm:px-6 sm:pb-6">{footer}</div>}
      </div>
    </div>
  );
}
