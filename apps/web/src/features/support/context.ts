import { plans, type SupportContext } from '@remoa/contracts';
import { t } from '@remoa/strings';

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0';

/** Browser name + major version, no more. */
export function browserOf(ua: string): string {
  const m = /(Edg|OPR|Firefox|Chrome|Version)\/(\d+)/.exec(ua);
  const name = m ? ({ Edg: 'Edge', OPR: 'Opera', Version: 'Safari' } as Record<string, string>)[m[1]!] ?? m[1]! : 'Desconhecido';
  return m ? `${name} ${m[2]}` : name;
}
export function osOf(ua: string): string {
  return /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Desconhecido';
}

/**
 * FR-4: the ONLY data sent as technical context. Whitelist by construction (six fields, `.strict()` on the server).
 * `screen` is the pathname without query or hash.
 */
export function collectContext(pathname: string, plan: string): SupportContext {
  const ua = navigator.userAgent;
  return {
    screen: /^\/[A-Za-z0-9/_\-[\]]*$/.test(pathname) && pathname.length <= 200 ? pathname : '/',
    plan: (plans as readonly string[]).includes(plan) ? (plan as SupportContext['plan']) : 'free',
    browser: browserOf(ua),
    os: osOf(ua),
    appVersion: APP_VERSION,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  };
}

/** The list shown to the user, derived from the very object that is sent (they cannot diverge). */
export const contextItems = (c: SupportContext) => [
  { k: t('support.technical.details.currentScreen'), v: c.screen },
  { k: t('support.technical.details.plan'), v: t(`billing.plan.${c.plan}`) },
  { k: t('support.technical.details.browserAndSystem'), v: c.browser },
  { k: t('support.technical.details.os'), v: c.os },
  { k: t('support.technical.details.appVersion'), v: c.appVersion },
  { k: t('support.technical.details.timezone'), v: c.timezone },
];
