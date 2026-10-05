import type { Metadata } from 'next';
import { t } from '@remoa/strings';
import { StoreView } from '@/features/store/store-view';

export const metadata: Metadata = { title: t('store.pageTitle') };

export default function Page() {
  return <StoreView />;
}
