import type { ReferralFriend, ReferralSummary } from '@remoa/contracts';
import { t } from '@remoa/strings';
import type { MapFriend } from '@remoa/ui';

/** "Daniel S.", e-mail mascarado, ou os textos de reserva (conta removida, sem nome). */
export const friendName = (f: Pick<ReferralFriend, 'displayName' | 'removed'>) =>
  f.removed ? t('referral.page.removedName') : (f.displayName ?? t('referral.page.fallbackName'));

/** "28 set" */
export const shortDate = (iso: string | Date) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
/** "3 de dezembro de 2026" */
export const longDate = (iso: string | Date) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

const chipKey = { invited: 'referral.friends.chip.invited', signed_up: 'referral.friends.chip.signedUp', qualified: 'referral.friends.chip.qualified' } as const;
const whenKey = { invited: 'referral.friends.whenSent', signed_up: 'referral.friends.whenSignedUp', qualified: 'referral.friends.whenQualified' } as const;
export const statusLabel = (s: ReferralFriend['status']) => t(chipKey[s]);
export const friendWhen = (f: ReferralFriend) => t(whenKey[f.status], { when: shortDate(f.when) });

export const toMapFriends = (friends: ReadonlyArray<ReferralFriend>): MapFriend[] => friends.map((f) => ({ id: f.id, name: friendName(f), status: f.status }));

export const countBy = (friends: ReadonlyArray<ReferralFriend>, s: ReferralFriend['status']) => friends.filter((f) => f.status === s).length;

/** Pagante (Pro por assinatura): o mês vira crédito e não há cadeia de concessões ativa. */
export const isPaid = (s: ReferralSummary, plan: string | undefined) => s.proUntil === null && ((plan !== undefined && plan !== 'free') || s.credit > 0);
