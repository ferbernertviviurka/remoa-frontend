'use client';

import Link from 'next/link';
import { t } from '@remoa/strings/landing';
import { Empty, buttonVariants, focusRing } from '@remoa/ui';

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
              {/* D-560: botão simples com os estilos do Button; o Button traz o Torph (~11 KB) para toda rota, pois este boundary vai em todas. */}
              <button type="button" onClick={reset} className={`inline-flex min-h-12 items-center rounded-btn px-5 font-display text-[15px] ${buttonVariants.primary} ${focusRing}`}>{t('boundary.retry')}</button>
              <Link href="/app/mapas" className="inline-flex min-h-[46px] items-center rounded-btn px-4 font-display text-sm font-bold text-primary-deep">
                {t('boundary.home')}
              </Link>
            </>
          }
        />
      </div>
    </main>
  );
}
