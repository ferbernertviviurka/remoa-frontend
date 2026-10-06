import { t } from '@remoa/strings';

const KEYS = [
  'landing.nav.wordmark.aria', 'landing.nav.wordmark.ariaApp', 'landing.nav.anchors.howWorks', 'landing.nav.anchors.features',
  'landing.nav.anchors.plans', 'landing.nav.anchors.faq', 'landing.nav.menu.aria', 'landing.nav.navLabel',
  'landing.nav.openApp', 'landing.nav.account', 'landing.nav.signIn', 'landing.nav.createMap',
] as const;
export type HeaderLabelKey = (typeof KEYS)[number];

/** P-410: resolved on the server, so the header island stops shipping the landing dictionary (~10 KB gz) to /blog and the legal pages. */
export const headerLabels = () => Object.fromEntries(KEYS.map((k) => [k, t(k)])) as Record<HeaderLabelKey, string>;
