import { landingMetadata } from '@/lib/seo/landing';
import { LandingPage } from '@/features/landing/landing-page';
import { landingFlags } from '@/features/landing/flags';
import { parseH, parseV } from '@/features/landing/shell/variants';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** D-534: A/B variants (`/?v=`, `/?h=`, rewritten here by next.config.ts) render per request; always noindex, canonical `/`. */
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  return { ...landingMetadata(await searchParams), robots: { index: false, follow: false } };
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return <LandingPage h1={parseH(sp.h)} variant={parseV(sp.v, landingFlags().launchPhase)} />;
}
