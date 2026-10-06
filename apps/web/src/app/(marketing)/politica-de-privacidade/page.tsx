import { LegalDocPage, legalMetadata } from '@/features/legal/legal-doc-page';

export const metadata = legalMetadata('privacy');

export default function Page() {
  return <LegalDocPage kind="privacy" />;
}
