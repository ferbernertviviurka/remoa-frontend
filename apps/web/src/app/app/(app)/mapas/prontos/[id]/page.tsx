import type { Metadata } from 'next';
import { t } from '@remoa/strings';
import { SeedDetailView } from '@/features/library/seed-detail-view';

export const metadata: Metadata = { title: t('pages.library') };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <SeedDetailView id={(await params).id} />;
}
