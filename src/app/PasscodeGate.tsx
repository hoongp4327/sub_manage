import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Delete, Lock } from 'lucide-react';
import { isPasscode, PASSCODE_HASH, PASSCODE_LENGTH } from '../config/passcode';
import { ALLOWED_EMAIL, supabase } from '../lib/supabase';

const KEY = 'app.unlocked';

/** Chế độ local: máy đã mở khóa thì nhớ luôn; đổi mã → mọi máy phải nhập lại. */
function remembered() {
  try {
    return localStorage.getItem(KEY) === PASSCODE_HASH;
  } catch {
    return false;
  }
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

/**
 * Màn nhập mật mã trước khi vào app.
 * - Chế độ local: so với mã trong `config/passcode.ts` (chỉ là rào cản nhỏ).
 * - Chế độ Supabase: mật mã chính là mật khẩu của tài khoản `VITE_ALLOWED_EMAIL`,
 *   kiểm tra trên máy chủ; phiên đăng nhập được Supabase nhớ, mỗi máy nhập 1 lần.
 */
export function PasscodeGate({ children }: { children: ReactNode }) {
  // null = đang kiểm tra phiên Supabase
  const [unlocked, setUnlocked] = useState<boolean | null>(() => (supabase ? null : remembered()));
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUnlocked(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUnlocked(!!s));
    return () => data.subscription.unsubscribe();
  }, []);

  const fail = (message: string) => {
    navigator.vibrate?.([30, 40, 30]);
    setError(message);
    setTimeout(() => setCode(''), 450);
  };

  const verify = async (v: string) => {
    if (!supabase) {
      if (!isPasscode(v)) return fail('Sai mật mã, thử lại');
      try { localStorage.setItem(KEY, PASSCODE_HASH); } catch { /* bỏ qua */ }
      return setUnlocked(true);
    }
    if (!ALLOWED_EMAIL) return fail('Thiếu VITE_ALLOWED_EMAIL trong cấu hình');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: ALLOWED_EMAIL, password: v });
    setBusy(false);
    if (!error) return; // onAuthStateChange sẽ mở khóa
    fail(error.status === 400 ? 'Sai mật mã, thử lại' : error.status === 429 ? 'Thử sai nhiều lần — đợi vài phút' : 'Không kết nối được, thử lại');
  };

  const update = (next: string) => {
    if (busy) return;
    const v = next.replace(/\D/g, '').slice(0, PASSCODE_LENGTH);
    setError(null);
    setCode(v);
    if (v.length === PASSCODE_LENGTH) verify(v);
  };

  // Máy tính: gõ bàn phím số trực tiếp
  useEffect(() => {
    if (unlocked !== false) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target === inputRef.current) return;
      if (/^\d$/.test(e.key)) update(code + e.key);
      else if (e.key === 'Backspace') update(code.slice(0, -1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (unlocked === null) return <div className="min-h-dvh" />;
  if (unlocked) return <>{children}</>;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Lock size={26} />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">Nhập mật mã</h1>
      <p className="mt-1.5 text-[15px] text-muted">Trang cá nhân — cần mật mã để xem.</p>

      {/* Ô nhập thật (ẩn) để dán mã / bàn phím số của điện thoại vẫn dùng được */}
      <input
        ref={inputRef}
        value={code}
        onChange={(e) => update(e.target.value)}
        inputMode="numeric"
        autoComplete="off"
        aria-label="Mật mã"
        className="sr-only"
      />
      <div
        onClick={() => inputRef.current?.focus()}
        className={`mt-8 flex gap-3.5 ${error ? 'animate-[shake_400ms_ease-in-out]' : busy ? 'animate-pulse' : ''}`}
        aria-hidden
      >
        {Array.from({ length: PASSCODE_LENGTH }, (_, i) => (
          <span
            key={i}
            className={`size-3.5 rounded-full transition-colors ${
              error ? 'bg-danger' : i < code.length ? 'bg-ink' : 'border-[1.5px] border-subtle/60'
            }`}
          />
        ))}
      </div>
      <p className={`mt-4 h-5 text-sm ${error ? 'text-danger' : 'text-muted'}`} role="alert">
        {error ?? (busy ? 'Đang kiểm tra…' : '')}
      </p>

      <div className="mt-4 grid w-full max-w-[280px] grid-cols-3 gap-4">
        {KEYS.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={busy}
              onClick={() => update(k === 'del' ? code.slice(0, -1) : code + k)}
              aria-label={k === 'del' ? 'Xóa' : k}
              className={`mx-auto grid size-[72px] place-items-center rounded-full text-[28px] font-medium transition-colors select-none active:scale-95 disabled:opacity-50 ${
                k === 'del' ? 'text-muted hover:bg-chip' : 'border border-line bg-surface hover:bg-chip active:bg-chip'
              }`}
            >
              {k === 'del' ? <Delete size={26} /> : k}
            </button>
          ),
        )}
      </div>
    </main>
  );
}
