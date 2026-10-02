import type { Metadata } from 'next';
import type { Entitlements } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { PricingView } from '@/features/billing/pricing-view';
import { serverApi } from '@/lib/api/server';
import { getUser } from '@/server/auth/session';

export const metadata: Metadata = { title: t('pages.pricing') };

export default async function Page() {
  const user = await getUser();
  const ent = user ? await serverApi<Entitlements>('/v1/billing/entitlements').catch(() => null) : null;
  return <PricingView loggedIn={user !== null} isPro={ent?.ok === true && ent.data.plan === 'pro'} />;
}
