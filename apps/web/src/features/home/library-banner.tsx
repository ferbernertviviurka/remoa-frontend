import Link from 'next/link';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { buttonVariants, focusRing, Icon } from '@remoa/ui';

const t = withStrings({ home: more.home });

/** F31: points students to validated ready-made maps (biblioteca tab). */
export function LibraryBanner() {
  return (
    <section aria-labelledby="home-library-banner" className="flex flex-col gap-4 rounded-[28px] border border-border bg-primary-tint p-5 md:flex-row md:items-center md:gap-6 md:p-[22px]">
      <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-primary text-on-primary">
        <Icon name="book" size={24} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-[.12em] text-primary-deep">{t('home.libraryBanner.eyebrow')}</span>
        <h2 id="home-library-banner" className="m-0 font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.02em] text-ink">{t('home.libraryBanner.title')}</h2>
        <p className="m-0 text-[15px] text-muted">{t('home.libraryBanner.body')}</p>
      </div>
      <Link
        href="/app/mapas?aba=biblioteca"
        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-btn px-5 text-sm font-bold no-underline ${buttonVariants.primary} ${focusRing}`}
      >
        {t('home.libraryBanner.cta')}
        <Icon name="right" size={16} />
      </Link>
    </section>
  );
}
