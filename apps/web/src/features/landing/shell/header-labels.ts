import { t } from '@remoa/strings/full';

const KEYS = [
  'landing.nav.wordmark.aria', 'landing.nav.wordmark.ariaApp', 'landing.nav.anchors.howWorks', 'landing.nav.anchors.features', 'landing.nav.anchors.bank',
  'landing.nav.anchors.ia', 'landing.nav.anchors.enamed', 'landing.nav.anchors.calendar',
  'landing.nav.anchors.plans', 'landing.nav.anchors.faq', 'landing.nav.menu.aria', 'landing.nav.navLabel',
  'landing.nav.openApp', 'landing.nav.account', 'landing.nav.signIn', 'landing.nav.createMap', 'landing.nav.mega.label',
  ...(['map', 'cards', 'challenge', 'grading', 'fsrs', 'enamed', 'pdf', 'questions', 'summary', 'bank', 'ready', 'calendar'] as const)
    .flatMap((k) => [`landing.nav.mega.${k}.title`, `landing.nav.mega.${k}.text`] as const),
] as const;
export type HeaderLabelKey = (typeof KEYS)[number];

/** P-410: resolved on the server, so the header island stops shipping the landing dictionary (~10 KB gz) to /blog and the legal pages. */
export const headerLabels = () => Object.fromEntries(KEYS.map((k) => [k, t(k)])) as Record<HeaderLabelKey, string>;
