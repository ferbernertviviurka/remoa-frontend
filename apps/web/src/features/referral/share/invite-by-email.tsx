'use client';

import { useState } from 'react';
import type { InviteResult } from '@remoa/contracts';
import { REFERRAL_LIMITS, referralErrors } from '@remoa/contracts/constants';
import { t } from '@remoa/strings/referral';
import { ChipInput } from '@remoa/ui';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';

/** FR-7 + FR-24: e-mails em chips, envio pela API, erro com "Tentar de novo" e limite diário. O servidor nunca revela quem já tem conta. */
export function InviteByEmail({ invitesLeftToday, onSent }: { invitesLeftToday: number; onSent: () => void }) {
  const [emails, setEmails] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [limit, setLimit] = useState(invitesLeftToday === 0);
  const [done, setDone] = useState<number>();

  async function send(list: string[]) {
    setSending(true);
    setError(undefined);
    setDone(undefined);
    try {
      const r = await api<InviteResult>('/v1/referral/invites', { method: 'POST', body: JSON.stringify({ emails: list }) });
      if (r.ok) {
        track('referral_invites_sent', { count: list.length });
        setEmails([]);
        setDone(list.length);
        onSent();
      } else if (r.error.code === 'rate_limited' && r.error.message === referralErrors.dailyLimit) setLimit(true);
      else setError(t('referral.page.sendError'));
    } catch {
      setError(t('referral.page.sendError'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-divider pt-[22px]">
      <span className="font-bold">{t('referral.emailInvite.label')}</span>
      <ChipInput
        label={t('referral.page.emailLabel')}
        placeholder={t('referral.emailInvite.placeholder')}
        addLabel={t('referral.emailInvite.add')}
        removeLabel={(email) => t('referral.page.removeEmail', { email })}
        sendLabel={(count) => t(count === 1 ? 'referral.emailInvite.send' : 'referral.emailInvite.sendMany', { count })}
        messages={{ invalid: t('referral.emailInvite.errors.invalid'), duplicate: t('referral.emailInvite.errors.duplicate'), max: t('referral.emailInvite.errors.tooMany') }}
        emails={emails}
        onEmailsChange={(v) => { setEmails(v); setDone(undefined); }}
        onSend={(list) => void send(list)}
        max={REFERRAL_LIMITS.invitesPerRequest}
        sending={sending}
        limitReached={limit}
        error={limit ? t('referral.emailInvite.limitReached') : error}
        retryLabel={t('referral.page.retry')}
        onRetry={() => void send(emails)}
      />
      <span role="status" className="text-[13px] font-semibold text-primary-deep">
        {done ? t(done === 1 ? 'referral.page.invitesSent' : 'referral.page.invitesSentMany', { count: done }) : ''}
      </span>
    </div>
  );
}
