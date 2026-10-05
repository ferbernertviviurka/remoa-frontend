import type { Entitlements, ReviewHub } from '@remoa/contracts';
import { t, type StringKey } from '@remoa/strings';
import { ReviewHubView } from '@/features/review/review-hub-view';
import { SavedQueueView } from '@/features/review/saved-queue';
import { serverApi } from '@/lib/api/server';

export const metadata = { title: t('review.hub.pageTitle') };

export default async function Page() {
  const [hub, ent] = await Promise.all([serverApi<ReviewHub>('/v1/review/hub'), serverApi<Entitlements>('/v1/billing/entitlements')]);
  if (!hub.ok) return <SavedQueueView message={t(`errors.${hub.error.code}` as StringKey)} />;
  return <ReviewHubView hub={hub.data} plan={ent.ok ? ent.data.plan : 'free'} />;
}
