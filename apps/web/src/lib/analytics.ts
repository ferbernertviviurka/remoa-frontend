import type { ZodTypeAny } from 'zod';
import { eventSchemas, type Track } from '@remoa/contracts';

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

/** Typed by contracts/events.ts. Without a token it is a no-op that records into window.__remoaEvents (used by e2e). */
export const track: Track = (event, props) => {
  const parsed = (eventSchemas[event] as ZodTypeAny).safeParse(props);
  if (!parsed.success) {
    if (process.env.NODE_ENV !== 'production') reportError(new Error(`invalid props for event ${event}`));
    return;
  }
  const payload = { ...(parsed.data as Record<string, unknown>), platform: 'web' };
  if (token) void mixpanel().then((mp) => mp.track(event, payload));
  else (window.__remoaEvents ??= []).push({ event, props: payload });
};

export function identify(userId: string) {
  if (token) void mixpanel().then((mp) => mp.identify(userId));
}
