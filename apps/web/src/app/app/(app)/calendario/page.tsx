import { headers } from 'next/headers';
import type { CalendarLabelList, CalendarSettings } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { EmptyState } from '@/features/shell/empty-state';
import { CalendarView } from '@/features/calendar/calendar-view';
import { initialSettings } from '@/features/calendar/initial-view';
import { serverApi } from '@/lib/api/server';

const t = withStrings({ calendar: more.calendar }); // P-512: namespace fora do núcleo

export const metadata = { title: t('calendar.navLabel') };

export default async function Page() {
  const [settings, labels] = await Promise.all([serverApi<CalendarSettings>('/v1/calendar/settings'), serverApi<CalendarLabelList>('/v1/calendar/labels')]);
  if (!settings.ok || !labels.ok) return <EmptyState title={t('calendar.navLabel')} body={t('calendar.page.loadError')} />;
  return <CalendarView settings={initialSettings(settings.data, await headers())} labels={labels.data.labels} nowIso={new Date().toISOString()} />;
}
