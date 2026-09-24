import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Cloud, Download, HardDrive, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Sheet } from '../shared/Sheet';
import { GhostButton, PrimaryButton } from '../shared/ui';
import { useToast } from '../shared/Toast';
import { backupFileName, collectBackup, countsOf, parseBackup, restoreBackup, type Backup, type BackupCounts } from './backup';

const summary = (c: BackupCounts) => `${c.subscriptions} gói subscription · ${c.habits} thói quen · ${c.habitLogs} lượt ghi`;

/** Xuất / nhập toàn bộ dữ liệu — dùng để chuyển từ chế độ trình duyệt lên bản deploy (Supabase). */
export function DataSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState<BackupCounts | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    collectBackup().then((b) => setCurrent(countsOf(b))).catch(() => setCurrent(null));
  }, []);

  const exportFile = async () => {
    setBusy(true);
    try {
      const b = await collectBackup();
      const url = URL.createObjectURL(new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: backupFileName() });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ message: `Đã xuất ${summary(countsOf(b))}` });
    } catch {
      toast({ message: 'Chưa xuất được — thử lại sau' });
    } finally {
      setBusy(false);
    }
  };

  const pickFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    try {
      setPending(parseBackup(await file.text()));
    } catch (e) {
      setPending(null);
      setError((e as Error).message);
    }
  };

  const importFile = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await restoreBackup(pending);
      await qc.invalidateQueries();
      toast({ message: `Đã nhập ${summary(countsOf(pending))}` });
      onClose();
    } catch {
      setError('Nhập chưa xong — kiểm tra kết nối rồi thử lại. Dữ liệu đã nhập được sẽ không bị trùng khi nhập lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Dữ liệu" onClose={onClose} size="sm">
      <p className="flex items-center gap-2 rounded-xl bg-chip px-3.5 py-2.5 text-sm text-muted">
        {supabase ? <Cloud size={17} /> : <HardDrive size={17} />}
        {supabase ? 'Đang lưu trên Supabase — đồng bộ mọi thiết bị' : 'Đang lưu trong trình duyệt này'}
      </p>

      <section className="mt-5">
        <h3 className="text-[17px] font-semibold">Xuất dữ liệu</h3>
        <p className="mt-1 text-[15px] text-muted">Tải về 1 file .json chứa toàn bộ dữ liệu.</p>
        <p className="mt-1 text-sm text-subtle">{current ? summary(current) : ' '}</p>
        <GhostButton onClick={exportFile} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 disabled:opacity-40">
          <Download size={19} /> Xuất file
        </GhostButton>
      </section>

      <section className="mt-6 border-t border-line pt-5">
        <h3 className="text-[17px] font-semibold">Nhập dữ liệu</h3>
        <p className="mt-1 text-[15px] text-muted">Chọn file đã xuất. Mục trùng sẽ được cập nhật, không xóa dữ liệu đang có.</p>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />

        {pending ? (
          <div className="mt-3 rounded-xl border border-line p-3.5">
            <p className="text-[15px] font-medium">{summary(countsOf(pending))}</p>
            {pending.exportedAt && <p className="mt-0.5 text-sm text-muted">Xuất lúc {new Date(pending.exportedAt).toLocaleString('vi-VN')}</p>}
            <div className="mt-3 flex gap-2">
              <GhostButton onClick={() => setPending(null)} disabled={busy} className="flex-1">Hủy</GhostButton>
              <PrimaryButton onClick={importFile} disabled={busy} className="flex-1">{busy ? 'Đang nhập…' : 'Nhập'}</PrimaryButton>
            </div>
          </div>
        ) : (
          <GhostButton onClick={() => fileRef.current?.click()} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2">
            <Upload size={19} /> Chọn file
          </GhostButton>
        )}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </section>
    </Sheet>
  );
}
