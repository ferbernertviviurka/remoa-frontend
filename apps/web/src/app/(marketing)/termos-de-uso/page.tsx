import { LegalDocPage, legalMetadata } from '@/features/legal/legal-doc-page';

export const metadata = legalMetadata('terms');

export default function Page() {
  return <LegalDocPage kind="terms" />;
}
