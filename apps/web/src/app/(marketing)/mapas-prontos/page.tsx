import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { loadPublicSeeds } from '@/features/library/public-api';
import { PublicSeedList } from '@/features/library/public-seeds';
import { siteUrl } from '@/lib/seo/site';

const t = withStrings({ mapLibrary: more.mapLibrary });
export const revalidate = 3600; // literal: Next reads segment config statically

export const metadata = {
  title: { absolute: t('mapLibrary.publicSeoTitle') },
  description: t('mapLibrary.publicSeoDescription'),
  alternates: { canonical: `${siteUrl}/mapas-prontos` },
};

export default async function Page() {
  return <PublicSeedList seeds={await loadPublicSeeds()} />;
}
