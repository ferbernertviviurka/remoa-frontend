import Link from 'next/link';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Alert, buttonVariants, focusRing } from '@remoa/ui';

const t = withStrings({ home: more.home });

/** F31: points students to validated ready-made maps (biblioteca tab). */
export function LibraryBanner() {
  return (
    <Alert title={t('home.libraryBanner.title')}>
      <p className="m-0">{t('home.libraryBanner.body')}</p>
      <Link
        href="/app/mapas?aba=biblioteca"
        className={`inline-flex min-h-11 items-center rounded-btn px-4 text-sm font-bold no-underline ${buttonVariants.primary} ${focusRing}`}
      >
        {t('home.libraryBanner.cta')}
      </Link>
    </Alert>
  );
}
