import { LegalPageViewed } from '@/features/legal/track';
import { LegalDocPage, legalMetadata } from '@/features/legal/legal-doc-page';

export const metadata = legalMetadata('privacy');

export default function Page() {
  return (
    <>
      <LegalPageViewed document="privacy" />
      <LegalDocPage kind="privacy" />
    </>
  );
}
