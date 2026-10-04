'use client';

import { useRef, useState } from 'react';
import { t } from '@remoa/strings';
import { Textarea } from '@remoa/ui';
import { ReferralCopyField, ShareChannels, type CopyResult, type ShareChannel } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { useReferral } from '../reward/referral-provider';
import { InviteByEmail } from './invite-by-email';
import { shareUrl, withLink } from './share-url';
import { useMessage } from './use-message';

/** FR-4 a FR-7: cartão do link (copiar), mensagem editável, canais de compartilhamento e convite por e-mail. */
export function LinkCard({ link, invitesLeftToday, onSent }: { link: string; invitesLeftToday: number; onSent: () => void }) {
  const { markShared } = useReferral();
  const { message, edit, restore, max } = useMessage(link);
  const [copiedMore, setCopiedMore] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const subject = t('referral.page.mailSubject');

  const onCopy = (result: CopyResult) => {
    if (result === 'denied') return;
    track('referral_link_copied', {});
    markShared();
  };

  async function share(channel: ShareChannel) {
    track('referral_share_clicked', { channel });
    markShared();
    if (channel === 'whatsapp' || channel === 'telegram') return void window.open(shareUrl(channel, { message, link, subject }), '_blank', 'noopener,noreferrer');
    if (channel === 'email') return void (window.location.href = shareUrl('email', { message, link, subject }));
    const text = withLink(message, link);
    try {
      if (typeof navigator.share === 'function') return await navigator.share({ title: t('referral.page.shareTitle'), text });
      await navigator.clipboard.writeText(text);
      setCopiedMore(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiedMore(false), 2200);
    } catch {
      /* compartilhamento cancelado ou área de transferência negada: nada a fazer */
    }
  }

  return (
    <section id="compartilhar" aria-labelledby="t-comp" className="flex scroll-mt-6 flex-col gap-[22px] rounded-[34px] border border-border bg-surface p-5 md:p-[30px]">
      <div className="flex flex-col gap-1.5">
        <h2 id="t-comp" className="m-0 font-display text-[28px] font-extrabold tracking-[-0.03em]">{t('referral.link.title')}</h2>
        <p className="m-0 text-muted">{t('referral.link.subtitle')}</p>
      </div>
      <ReferralCopyField
        value={link}
        label={t('referral.link.title')}
        copyLabel={t('referral.link.copy')}
        copiedLabel={t('referral.link.copied')}
        deniedLabel={`${t('referral.errors.clipboardDenied')} ${t('referral.errors.clipboardDeniedAlt')}`}
        onCopy={onCopy}
      />
      <div className="flex flex-col gap-2">
        <Textarea label={t('referral.message.label')} placeholder={t('referral.message.placeholder')} value={message} maxLength={max} onChange={(e) => edit(e.target.value)} />
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={restore} className="min-h-11 rounded-[10px] px-1 text-sm font-bold text-primary-deep underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{t('referral.message.restore')}</button>
          <span className={message.length >= max ? 'text-[13px] font-bold text-review-text' : 'text-[13px] text-muted'}>{t('referral.message.charCount', { count: message.length })}</span>
        </div>
      </div>
      <ShareChannels
        aria-label={t('referral.share.label')}
        channels={[
          { id: 'whatsapp', label: t('referral.share.whatsapp') },
          { id: 'telegram', label: t('referral.share.telegram') },
          { id: 'email', label: t('referral.share.email') },
          { id: 'more', label: t('referral.share.more') },
        ]}
        onShare={(c) => void share(c)}
      />
      <span role="status" className="-mt-3 text-[13px] font-semibold text-primary-deep">{copiedMore ? t('referral.link.copied') : ''}</span>
      <InviteByEmail invitesLeftToday={invitesLeftToday} onSent={onSent} />
    </section>
  );
}
