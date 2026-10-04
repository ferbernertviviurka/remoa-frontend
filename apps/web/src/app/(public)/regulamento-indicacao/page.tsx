// F18 T7 (FR-25): rules of the referral program. Draft until Q-045 (legal review) closes; marked as such on the page.
import type { Metadata } from 'next';
import { t } from '@remoa/strings';
import { Tag } from '@remoa/ui';
import { InviteShell } from '@/features/referral/invite/invite-shell';

export const metadata: Metadata = { title: t('referral.regulation.pageTitle'), robots: { index: false, follow: true } };

const order = ['intro', 'qualification', 'grant', 'proSubscriber', 'noMoney', 'notTransferable', 'noSelfReferral', 'limits', 'expiry', 'privacy', 'rightToChange', 'noWarranty', 'dispute'] as const;

export default function RegulationPage() {
  return (
    <InviteShell>
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-5 px-4 py-10 sm:py-14">
        <Tag tone="watch">{t('referral.regulation.draftBadge')}</Tag>
        <h1 className="m-0 font-display text-[32px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[40px]">{t('referral.regulation.pageTitle')}</h1>
        <p role="note" className="m-0 text-[15px] text-muted">{t('referral.regulation.draftNote')}</p>
        <ol className="m-0 flex list-decimal flex-col gap-3 pl-6 text-base leading-relaxed text-ink">
          {order.map((k) => <li key={k}>{t(`referral.regulation.sections.${k}`)}</li>)}
        </ol>
      </main>
    </InviteShell>
  );
}
