import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@remoa/strings';
import { Empty, buttonVariants } from '@remoa/ui';

// G11 (D-360): pt-BR 404 instead of Next's English default; Next already answers 404 + noindex for it.
export const metadata: Metadata = { title: t('landing.notFound.title'), robots: { index: false } };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-4">
      <Empty
        heading
        title={t('landing.notFound.title')}
        description={t('landing.notFound.text')}
        action={<Link href="/" className={`inline-flex min-h-11 items-center rounded-btn px-4 font-display text-sm font-bold no-underline ${buttonVariants.primary}`}>{t('landing.notFound.home')}</Link>}
      />
    </main>
  );
}
