import { t } from '@remoa/strings';
import { Section } from '@remoa/ui';
import { landingMetadata } from '@/lib/seo/landing';
import { JsonLd, faqPageLd, organizationLd, softwareApplicationLd } from '@/lib/seo/json-ld';
import { landingFlags } from '@/features/landing/flags';
import { HeroSection } from '@/features/landing/hero';
import { DemoSection } from '@/features/landing/demo';
import { CompareSection, FaqSection, PlansSection } from '@/features/landing/plans';
import { FeaturesSection, HowSection, MoreSection, ProblemSection, ReadyMarquee } from '@/features/landing/sections';
import { LandingAnalytics, WaitlistCta, buildFaqItems, loadPublicPriceBook, parseH, parseV } from '@/features/landing/shell';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// FR-1: the price fetch is cached 1 h by `fetch`; reading `searchParams` (variants) makes the HTML itself dynamic per request.
export const revalidate = 3600;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  return landingMetadata(await searchParams);
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const flags = landingFlags();
  const h1 = parseH(sp.h);
  const variant = parseV(sp.v, flags.launchPhase);
  const priceBook = await loadPublicPriceBook(variant);
  const faqItems = buildFaqItems(flags.approvedContent);

  return (
    <>
      <JsonLd data={organizationLd()} />
      {priceBook ? <JsonLd data={softwareApplicationLd((priceBook.monthly.amount / 100).toFixed(2))} /> : null}
      <JsonLd data={faqPageLd(faqItems)} />
      <LandingAnalytics variant={variant} h1={h1} />
      <HeroSection h1={h1} flags={flags} />
      <ReadyMarquee />
      <ProblemSection />
      <HowSection />
      <FeaturesSection />
      <MoreSection flags={flags} />
      <DemoSection flags={flags} />
      <CompareSection />
      {priceBook ? <PlansSection priceBook={priceBook} flags={flags} /> : <Section id="planos" title={t('landing.plans.title')} lead={t('landing.plans.unavailable')} />}
      <FaqSection items={faqItems} />
      <WaitlistCta phase={flags.launchPhase} variant={variant} />
    </>
  );
}
