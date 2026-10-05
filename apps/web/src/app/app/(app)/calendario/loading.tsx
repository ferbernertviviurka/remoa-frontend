import { t } from '@remoa/strings';
import { CalendarSkeleton } from '@remoa/ui';

export default function Loading() {
  return <CalendarSkeleton view="month" label={t('calendar.states.loading')} />;
}
