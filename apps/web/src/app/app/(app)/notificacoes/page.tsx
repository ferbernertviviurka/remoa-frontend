import type { Metadata } from 'next';
import { t } from '@remoa/strings';
import { NotificationsPage } from '@/features/notifications';

export function generateMetadata(): Metadata {
  return { title: t('notifications.page.title') };
}

// The (app) layout already requires a session (AppShell); API calls carry the user's token.
export default function Page() {
  return <NotificationsPage />;
}
