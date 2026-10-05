import type { CalendarLabelList, CalendarSettings } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { EmptyState } from '@/features/shell/empty-state';
import { CalendarView } from '@/features/calendar/calendar-view';
import { serverApi } from '@/lib/api/server';

export const metadata = { title: t('calendar.navLabel') };

export default async function Page() {
  const [settings, labels] = await Promise.all([serverApi<CalendarSettings>('/v1/calendar/settings'), serverApi<CalendarLabelList>('/v1/calendar/labels')]);
  if (!settings.ok || !labels.ok) return <EmptyState title={t('calendar.navLabel')} body={t('calendar.page.loadError')} />;
  return <CalendarView settings={settings.data} labels={labels.data.labels} nowIso={new Date().toISOString()} />;
}
