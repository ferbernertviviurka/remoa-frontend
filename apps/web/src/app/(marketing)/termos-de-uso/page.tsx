import { LegalPageViewed } from '@/features/legal/track';
import { LegalDocPage, legalMetadata } from '@/features/legal/legal-doc-page';

export const metadata = legalMetadata('terms');

export default function Page() {
  return (
    <>
      <LegalPageViewed document="terms" />
      <LegalDocPage kind="terms" />
    </>
  );
}
