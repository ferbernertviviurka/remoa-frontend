import type { Entitlements } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { LimitBanner } from '@remoa/ui';

const t = withStrings({ plans: more.plans });

/** First of boards/cards at >= 80% of its limit (boards first), or null. Only meaningful for Free. */
export function limitHit(e: Entitlements | null): { key: 'boards' | 'cards'; used: number; limit: number } | null {
  if (!e || e.plan !== 'free') return null;
  for (const key of ['boards', 'cards'] as const) {
    const limit = e.limits[key];
    if (limit !== null && e.usage[key] >= limit * 0.8) return { key, used: e.usage[key], limit };
  }
  return null;
}

/** F15 FR-3. The link is an anchor to the order summary (`#resumo`). */
export function LimitNotice({ hit }: { hit: NonNullable<ReturnType<typeof limitHit>> }) {
  return (
    <LimitBanner action={<a href="#resumo">{t('plans.limitNotice.seeSummary')}</a>}>
      {t(`plans.limitNotice.${hit.key}`, { used: hit.used, limit: hit.limit })}
    </LimitBanner>
  );
}
