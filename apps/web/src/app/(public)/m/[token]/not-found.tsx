// F17 T7 (FR-13): 404 page for the shared board route.
import Link from 'next/link';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';

const t = withStrings({ sharedMap: more.sharedMap });

export default function SharedBoardNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="m-0 font-display text-[26px] font-extrabold tracking-[-0.025em]" data-testid="not-found-title">
        {t('sharedMap.notFoundTitle')}
      </h1>
      <Link
        href="/app/mapas"
        className="text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        data-testid="not-found-back"
      >
        {t('sharedMap.notFoundBack')}
      </Link>
    </main>
  );
}
