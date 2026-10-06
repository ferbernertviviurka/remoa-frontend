import { landingMetadata } from '@/lib/seo/landing';
import { LandingPage } from '@/features/landing/landing-page';

// D-534: `/` is static (ISR, the price fetch revalidates every hour). `?v=`/`?h=` are rewritten to `/lp` (next.config.ts).
export const revalidate = 3600;
export const metadata = landingMetadata();

export default function Page() {
  return <LandingPage h1="a" variant={null} />;
}
