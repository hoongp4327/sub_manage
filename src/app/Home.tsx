import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, Lock } from 'lucide-react';
import { greeting, longDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { DataSheet } from './DataSheet';
import { MODULES, UPCOMING } from './modules';

export function Home() {
  const now = useMemo(() => new Date(), []);
  const [dataOpen, setDataOpen] = useState(false);
  return (
    <div className="mx-auto max-w-[960px] px-4 pt-[max(48px,env(safe-area-inset-top))] pb-16 sm:px-6 sm:pt-16">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[15px] text-muted">{longDate(now)}</p>
          <h1 className="mt-1 text-[32px] font-bold tracking-tight">
            {greeting(now)} <span aria-hidden>👋</span>
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setDataOpen(true)} aria-label="Xuất / nhập dữ liệu" title="Xuất / nhập dữ liệu" className="grid size-11 place-items-center rounded-full text-subtle hover:bg-chip hover:text-ink">
            <Database size={20} />
          </button>
          {supabase && (
            <button onClick={() => supabase!.auth.signOut()} aria-label="Khóa app" title="Khóa app — phải nhập lại mật mã" className="grid size-11 place-items-center rounded-full text-subtle hover:bg-chip hover:text-ink">
              <Lock size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {MODULES.map(({ id, name, icon: Icon, path, Summary }) => (
          <Link key={id} to={path} className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-accent/50 sm:p-5">
            <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Icon size={28} />
            </span>
            <p className="mt-5 text-[17px] font-bold">{name}</p>
            <p className="mt-1 text-sm text-muted">{Summary ? <Summary /> : null}</p>
          </Link>
        ))}
        {UPCOMING.map(({ name, icon: Icon }) => (
          <div key={name} aria-disabled className="rounded-2xl border border-dashed border-line p-4 sm:p-5">
            <span className="grid size-14 place-items-center rounded-2xl bg-chip text-subtle">
              <Icon size={26} />
            </span>
            <p className="mt-5 text-[17px] font-semibold text-muted">{name}</p>
            <p className="mt-1 text-sm text-subtle">Sắp có</p>
          </div>
        ))}
      </div>
      {dataOpen && <DataSheet onClose={() => setDataOpen(false)} />}
    </div>
  );
}
