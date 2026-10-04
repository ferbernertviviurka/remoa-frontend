import type { Track } from '@remoa/contracts';

type Sent = { event: string; props: Record<string, unknown> };
declare global {
  interface Window {
    __remoaEvents?: Sent[];
  }
}

const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

let loaded: Promise<typeof import('mixpanel-browser').default> | undefined;
const mixpanel = () =>
  (loaded ??= import('mixpanel-browser').then(({ default: mp }) => {
    mp.init(token!);
    return mp;
  }));

function send(event: string, props: Record<string, unknown>) {
  const payload = { ...props, platform: 'web' };
  if (token) void mixpanel().then((mp) => mp.track(event, payload));
  else (window.__remoaEvents ??= []).push({ event, props: payload });
}

/**
 * Typed by contracts/events.ts (compile time). Runtime zod validation runs only outside production, behind a dynamic import, so the
 * validator (~13 KB gzip) is not in the landing bundle (P-175, D-372). Without a token it records into window.__remoaEvents (used by e2e).
 */
export const track: Track = (event, props) => {
  if (process.env.NODE_ENV === 'production') return send(event, props as Record<string, unknown>);
  void import('@remoa/contracts').then(({ eventSchemas }) => {
    const parsed = (eventSchemas[event] as { safeParse: (v: unknown) => { success: boolean; data?: unknown } }).safeParse(props);
    if (!parsed.success) return reportError(new Error(`invalid props for event ${event}`));
    send(event, parsed.data as Record<string, unknown>);
  });
};

export function identify(userId: string) {
  if (token) void mixpanel().then((mp) => mp.identify(userId));
}

/** FR-19: defer tracking to browser idle so Mixpanel (lazy import) never competes with LCP. The landing must use this for `landing_viewed` and `scroll_depth`. */
export const trackWhenIdle: Track = (event, props) => {
  const run = () => track(event, props);
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2000);
};
