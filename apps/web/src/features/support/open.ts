export type SupportFrom = 'fab' | 'command' | 'account_menu' | 'mobile_nav' | 'email_link';
const EVENT = 'remoa:open-support';

/** Opens the support modal from anywhere in the (app) group (palette, account menu, bottom nav). The launcher listens. */
export const openSupport = (from: SupportFrom) => window.dispatchEvent(new CustomEvent<SupportFrom>(EVENT, { detail: from }));
export const onOpenSupport = (fn: (from: SupportFrom) => void) => {
  const h = (e: Event) => fn((e as CustomEvent<SupportFrom>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
};
