'use client';

import { useRef, useState } from 'react';
import { RETENTION, type AccountExport } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, DangerCard, Dialog, Icon, Input, useToast } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { formatDate } from '@/features/billing/format';
import { SectionCard } from '../shared/section-card';
import { useAccount } from '../shell/account-context';
import { useOnline } from '../shared/use-online';

export function DataSection() {
  return (
    <div className="flex flex-col gap-6">
      <ExportCard />
      <KeepCard />
      <DeleteCard />
    </div>
  );
}

const sizeLabel = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

function ExportCard() {
  const { toast } = useToast();
  const online = useOnline();
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    setFile(null);
    track('export_requested', {});
    try {
      const r = await api<AccountExport>('/v1/account/export', { method: 'POST' });
      if (r.ok) setFile(new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }));
      else setError(t(r.error.code === 'rate_limited' ? 'account.data.exportRateLimit' : 'account.data.exportError'));
    } catch {
      setError(t('account.data.exportError'));
    }
    setBusy(false);
  }

  function download() {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remoa-dados-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    track('export_downloaded', {});
    toast({ title: t('account.data.exportDownloaded') });
  }

  return (
    <SectionCard title={t('account.data.exportTitle')} body={t('account.data.exportBody')}>
      {busy ? (
        <div role="status" className="slide flex max-w-[520px] flex-col gap-2.5">
          <span className="font-bold text-ink">{t('account.data.exportPreparing')}</span>
          <span aria-hidden="true" className="block h-2.5 overflow-hidden rounded-[5px] bg-divider">
            <span className="fillx block h-2.5 w-full rounded-[5px] bg-primary" style={{ animationDuration: '2.6s', animationTimingFunction: 'linear' }} />
          </span>
          <span className="text-[13px] text-muted">{t('account.data.exportPreparingBody')}</span>
        </div>
      ) : null}
      {error ? (
        <Alert tone="review" role="alert" title={error}>
          <Button variant="secondary" size="sm" disabled={!online} onClick={() => void start()}>{t('account.retry')}</Button>
        </Alert>
      ) : null}
      {file ? (
        <div className="slide flex flex-wrap items-center gap-3.5 rounded-[18px] bg-primary-tint px-4 py-3.5">
          <span className="flex text-primary-deep"><Icon name="file" size={24} /></span>
          <p role="status" className="m-0 flex-1 font-bold">{t('account.data.exportReady', { size: sizeLabel(file.size) })}</p>
          <Button onClick={download}>{t('account.data.exportDownload')}</Button>
          <Button variant="secondary" disabled={!online} onClick={() => void start()}>{t('account.data.exportAgain')}</Button>
        </div>
      ) : error || busy ? null : (
        <div className="flex">
          <Button variant="secondary" icon={<Icon name="download" size={18} />} disabled={!online} onClick={() => void start()}>{t('account.data.exportStart')}</Button>
        </div>
      )}
      {online ? null : <Alert tone="watch" title={t('account.offline')} />}
    </SectionCard>
  );
}

function KeepCard() {
  const rows = [
    ['file', t('account.data.keepAnswers'), t('account.data.keepAnswersBody', { days: RETENTION.answerTextDays })],
    ['mic', t('account.data.keepAudio'), t('account.data.keepAudioBody')],
    ['camera', t('account.data.keepPhoto'), t('account.data.keepPhotoBody')],
  ] as const;
  return (
    <SectionCard title={t('account.data.keepTitle')} body={t('account.data.keepBody')}>
      <ul className="m-0 flex list-none flex-col p-0">
        {rows.map(([icon, title, body]) => (
          <li key={title} className="flex gap-3.5 border-t border-divider py-3.5">
            <span className="flex text-primary-deep"><Icon name={icon} size={22} /></span>
            <span className="flex flex-col leading-snug">
              <span className="font-bold text-ink">{title}</span>
              <span className="text-sm text-muted">{body}</span>
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function DeleteCard() {
  const { account, refresh } = useAccount();
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const days = RETENTION.deletionGraceDays;
  const ok = word.trim().toLocaleUpperCase('pt-BR') === t('account.data.dialogConfirmWord');

  function change(v: boolean) {
    setOpen(v);
    if (!v) requestAnimationFrame(() => opener.current?.focus()); // Radix only restores focus to a <Trigger>
    if (!v) {
      setWord('');
      setError(null);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ hardDeleteAt: string }>('/v1/account', { method: 'DELETE' });
      if (r.ok) {
        track('deletion_requested', {});
        await refresh(); // the shell banner reads account.deletionScheduledFor
        setBusy(false);
        change(false);
        return;
      }
    } catch {
      /* falls through to the message */
    }
    setError(t('account.data.deleteError'));
    setBusy(false);
  }

  if (account.deletionScheduledFor) {
    return (
      <DangerCard title={t('account.data.dangerTitle')} description={t('account.data.scheduled', { date: formatDate(account.deletionScheduledFor) })}>
        {null}
      </DangerCard>
    );
  }
  return (
    <>
      <DangerCard title={t('account.data.dangerTitle')} description={t('account.data.dangerBody', { days })}>
        <Button variant="danger" icon={<Icon name="trash" size={18} />} disabled={!online} onClick={(e) => { opener.current = e.currentTarget; setOpen(true); }}>{t('account.data.dangerCta')}</Button>
      </DangerCard>
      <Dialog size="lg" icon={<Icon name="warning" size={26} />} open={open} onOpenChange={change} title={t('account.data.dialogTitle')} closeLabel={t('account.data.dialogClose')}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (ok && online && !busy) void confirm();
          }}
        >
          <div className="flex flex-col gap-2.5 text-[15px] leading-normal text-text">
            <p className="m-0">{t('account.data.dialogLine1', { days })}</p>
            <p className="m-0">{t('account.data.dialogLine2')}</p>
            <p className="m-0">{t('account.data.dialogLine3')}</p>
          </div>
          <Input label={t('account.data.dialogConfirmLabel')} autoComplete="off" value={word} onChange={(e) => setWord(e.target.value)} />
          {error ? <Alert tone="review" role="alert" title={error} /> : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => change(false)}>{t('account.data.dialogKeep')}</Button>
            <Button type="submit" variant="danger" disabled={!ok || !online} loading={busy}>{t('account.data.dialogConfirm')}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
