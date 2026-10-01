'use client';

import Link from 'next/link';
import { t } from '@remoa/strings';
import { Button, Card } from '@remoa/ui';

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-4">
      <Card>
        <div role="alert" className="flex flex-col items-start gap-3">
          <h1 className="font-display text-2xl font-extrabold text-text">{t('boundary.title')}</h1>
          <p className="text-sm text-muted">{t('boundary.body')}</p>
          {error.digest ? <p className="text-xs text-muted">{t('boundary.ref', { id: error.digest })}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={reset}>{t('boundary.retry')}</Button>
            <Link href="/mapas" className="inline-flex min-h-[42px] items-center rounded-btn px-4 font-display text-sm font-bold text-primary-deep">
              {t('boundary.home')}
            </Link>
          </div>
        </div>
      </Card>
    </main>
  );
}
