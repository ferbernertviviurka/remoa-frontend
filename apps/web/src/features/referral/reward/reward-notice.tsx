'use client';

import { t } from '@remoa/strings';
import { Icon, IconButton } from '@remoa/ui';

/**
 * F18 FR-12: aviso da recompensa (P-180: fica no app, não no pacote). A região `role="status"` existe sempre, para o leitor de tela
 * anunciar o texto quando ele entra; o aviso entra em 450 ms (`slide`) e fica até ser fechado.
 * `banner`: faixa no topo de /app/indicar (como no mock); `toast`: pílula escura no rodapé das outras telas.
 */
export function RewardNotice({ name, onClose, variant }: { name: string | null; onClose: () => void; variant: 'banner' | 'toast' }) {
  const text = name !== null ? t('referral.reward_moment.notification', { name }) : '';
  if (variant === 'banner') {
    return (
      <div role="status" aria-live="polite" className="empty:hidden">
        {name !== null ? (
          <div className="slide flex items-center gap-4 rounded-[24px] border-[1.5px] border-primary bg-primary-tint py-4 pl-5 pr-3">
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary"><Icon name="gift" size={20} /></span>
            <span className="flex-1 text-[15px] font-bold text-primary-deep">{text}</span>
            <IconButton aria-label={t('referral.reward_moment.close')} onClick={onClose}><Icon name="close" size={18} /></IconButton>
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-7">
      {name !== null ? (
        <div className="slide pointer-events-auto flex max-w-[560px] items-center gap-3 rounded-[16px] bg-ink py-3 pl-5 pr-3 text-sm font-semibold text-on-dark shadow-[0_14px_34px_rgba(26,21,51,0.35)]">
          <span aria-hidden="true" className="flex text-on-dark-muted"><Icon name="check" size={18} /></span>
          <span>{text}</span>
          <IconButton variant="secondary" aria-label={t('referral.reward_moment.close')} onClick={onClose}><Icon name="close" size={16} /></IconButton>
        </div>
      ) : null}
    </div>
  );
}
