'use client';

import Link from 'next/link';
import { t } from '@remoa/strings';
import { Button, Empty } from '@remoa/ui';

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-4">
      <div role="alert">
        <Empty
          heading
          title={t('boundary.title')}
          description={error.digest ? `${t('boundary.body')} ${t('boundary.ref', { id: error.digest })}` : t('boundary.body')}
          action={
            <>
              <Button onClick={reset}>{t('boundary.retry')}</Button>
              <Link href="/mapas" className="inline-flex min-h-[46px] items-center rounded-btn px-4 font-display text-sm font-bold text-primary-deep">
                {t('boundary.home')}
              </Link>
            </>
          }
        />
      </div>
    </main>
  );
}
