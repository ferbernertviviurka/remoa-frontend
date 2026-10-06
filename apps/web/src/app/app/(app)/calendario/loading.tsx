import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { CalendarSkeleton } from '@remoa/ui';

const t = withStrings({ calendar: more.calendar }); // P-512: namespace fora do núcleo

export default function Loading() {
  return <CalendarSkeleton view="month" label={t('calendar.states.loading')} />;
}
