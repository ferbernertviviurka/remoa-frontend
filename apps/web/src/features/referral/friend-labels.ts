import type { ReferralFriend } from '@remoa/contracts';
import { t } from '@remoa/strings/referral';
import { shortDate } from './format';

const chipKey = { invited: 'referral.friends.chip.invited', signed_up: 'referral.friends.chip.signedUp', qualified: 'referral.friends.chip.qualified' } as const;
const whenKey = { invited: 'referral.friends.whenSent', signed_up: 'referral.friends.whenSignedUp', qualified: 'referral.friends.whenQualified' } as const;
export const statusLabel = (s: ReferralFriend['status']) => t(chipKey[s]);
export const friendWhen = (f: ReferralFriend) => t(whenKey[f.status], { when: shortDate(f.when) });
