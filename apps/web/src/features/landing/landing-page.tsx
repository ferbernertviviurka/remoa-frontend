import { t } from '@remoa/strings/full';
import { Section } from '@remoa/ui';
import { JsonLd, faqPageLd, organizationLd, softwareApplicationLd, webSiteLd } from '@/lib/seo/json-ld';
import { landingFlags } from './flags';
// Direct file imports, not the feature barrels (D-535): Next ships every 'use client' module a server file imports, used or not.
import { HeroSection } from './hero/hero-section';
import { CompareSection } from './plans/compare-section';
import { planFacts } from './plans/plan-facts';
import { HowSection, MoreSection, ProblemSection, ReadyMarquee } from './sections/sections';
import { LandingBlog } from './blog/landing-blog';
import { LandingAnalytics } from './shell/landing-analytics';
import { buildFaqItems } from './shell/faq';
import { loadPublicPriceBook } from './shell/pricebook';
import type { H1Variant } from './shell/variants';
import { CalendarIsland, DemoIsland, EnamedIsland, FaqIsland, FeaturesIsland, IaIsland, PlansIsland, WaitlistIsland } from './islands';
import { loadEnamedSlides } from './enamed/load-enamed';
import './shell/shell.css'; // used inside lazy islands (D-535): keep it in the page's CSS so the server HTML is styled before they load
import './demos.css';

/** F16: the whole landing. Below-the-fold interactive sections are lazy islands (D-535). `/` renders the defaults statically (D-534); `/lp` renders the `?v=`/`?h=` variants per request. */
export async function LandingPage({ h1, variant }: { h1: H1Variant; variant: '29' | '49' | null }) {
  const flags = landingFlags();
  const priceBook = await loadPublicPriceBook(variant);
  const faqItems = buildFaqItems(flags.approvedContent);
  const enamed = await loadEnamedSlides();

  return (
    <>
      <JsonLd data={organizationLd()} />
      <JsonLd data={webSiteLd()} />
      <JsonLd data={softwareApplicationLd(priceBook ? (priceBook.monthly.amount / 100).toFixed(2) : undefined)} />
      <JsonLd data={faqPageLd(faqItems)} />
      <LandingAnalytics variant={variant} h1={h1} />
      <HeroSection h1={h1} flags={flags} />
      <ReadyMarquee />
      <ProblemSection />
      <HowSection />
      <FeaturesIsland />
      <IaIsland features={flags.ia} />
      <EnamedIsland slides={enamed} />
      <CalendarIsland />
      <MoreSection flags={flags} />
      <DemoIsland flags={flags} />
      <CompareSection />
      {priceBook ? <PlansIsland priceBook={priceBook} flags={flags} facts={planFacts(priceBook)} /> : <Section id="planos" title={t('landing.plans.title')} lead={t('landing.plans.unavailable')} />}
      <FaqIsland items={faqItems} />
      <LandingBlog />
      <WaitlistIsland phase={flags.launchPhase} variant={variant} />
    </>
  );
}
