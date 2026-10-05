// F16 FR-15 (D-513): draft until Q-016 (legal review); noindex while preliminary, like /regulamento-indicacao.
import type { Metadata } from 'next';
import { t } from '@remoa/strings';
import { LegalPage } from '@/features/legal/legal-page';

export const metadata: Metadata = { title: t('legal.privacy.pageTitle'), robots: { index: false, follow: true } };

export default function Page() {
  return <LegalPage kind="privacy" />;
}
