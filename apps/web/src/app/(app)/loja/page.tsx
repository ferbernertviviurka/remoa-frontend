import type { Metadata } from 'next';
import { t } from '@remoa/strings';
import { SeedsView } from '@/features/editorial/seeds-view';

export const metadata: Metadata = { title: t('pages.library') };

export default function Page() {
  return <SeedsView />;
}
