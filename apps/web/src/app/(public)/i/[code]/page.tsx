// F18 T7 (FR-14): public invite page. Always noindex; the code never goes into <title>/metadata.
import type { Metadata } from 'next';
import { t } from '@remoa/strings/full';
import { getUser } from '@/server/auth/session';
import { lookupInvite } from '@/features/referral/invite/attribution';
import { InviteShell } from '@/features/referral/invite/invite-shell';
import { InviteView } from '@/features/referral/invite/invite-view';

export const metadata: Metadata = { title: t('referral.invite.metaTitle'), robots: { index: false, follow: false } };

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [invite, user] = await Promise.all([lookupInvite(code), getUser()]);
  return (
    <InviteShell>
      <InviteView valid={invite.valid} code={invite.valid ? invite.code : ''} inviterName={invite.valid ? invite.inviterFirstName : null} loggedIn={!!user} />
    </InviteShell>
  );
}
