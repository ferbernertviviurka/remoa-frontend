'use client';

import { useEffect, useState } from 'react';
import { track } from '@/lib/analytics';
import { flushOffline } from '@/features/challenge/client';
import { t } from '@remoa/strings';
import { Button } from '@remoa/ui';

type Prompt = Event & { prompt: () => Promise<void> };

/** Registers the review shell worker and offers install after two finished sessions. */
export function Pwa() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js');
    void flushOffline(() => track('offline_answer_synced', {}));
    const onOnline = () => { void flushOffline(() => track('offline_answer_synced', {})); };
    const onInstalled = () => track('pwa_installed', {});
    window.addEventListener('online', onOnline);
    window.addEventListener('appinstalled', onInstalled);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      const sessions = Number(localStorage.getItem('remoa-sessions') ?? '0');
      if (sessions >= 2) {
        setPrompt(event as Prompt);
        setOpen(true);
      }
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  if (!open || !prompt) return null;
  return (
    <div className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 md:inset-x-auto md:right-6 md:max-w-sm">
      <p className="m-0 font-semibold">{t('quiz.install')}</p>
      <p className="m-0 text-sm text-muted">{t('quiz.installBody')}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => { void prompt.prompt(); setOpen(false); }}>{t('quiz.installAction')}</Button>
        <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>{t('quiz.installDismiss')}</Button>
      </div>
    </div>
  );
}

export function countSession() {
  const n = Number(localStorage.getItem('remoa-sessions') ?? '0') + 1;
  localStorage.setItem('remoa-sessions', String(n));
}
