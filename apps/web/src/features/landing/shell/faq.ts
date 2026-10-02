import { strings } from '@remoa/strings';

/** D-236: approved-only items and the `aApproved` text appear only with the approved-content flag. */
export const buildFaqItems = (approved: boolean) =>
  strings.landing.faq.items
    .filter((i) => approved || !('approvedOnly' in i && i.approvedOnly))
    .map((i) => ({ q: i.q, a: approved && 'aApproved' in i && i.aApproved ? i.aApproved : i.a }));

