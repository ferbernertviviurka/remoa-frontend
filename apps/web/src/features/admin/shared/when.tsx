import { formatWhen } from './format';

/** Relative time ("há 3 horas"). Server and browser clocks differ, so the text is allowed to change on hydration. */
export function When({ iso }: { iso: Date | string }) {
  return <time dateTime={new Date(iso).toISOString()} suppressHydrationWarning>{formatWhen(iso)}</time>;
}
