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

const APP_VERSION = '0.0.0';
const PLAN_KEY = 'remoa-plan';
const BOARD_KEY = 'remoa-board';

/** The shell writes the current plan so every later event carries it (F11 FR-4). */
export function rememberPlan(plan: 'free' | 'pro') {
  try {
    sessionStorage.setItem(PLAN_KEY, plan);
  } catch {
    /* private mode */
  }
}

/** The open map, so later events carry `boardId` and `area` when they are known (F11 FR-4). */
export function rememberBoard(boardId: string | null, area?: 'CM' | null) {
  try {
    if (!boardId) sessionStorage.removeItem(BOARD_KEY);
    else sessionStorage.setItem(BOARD_KEY, JSON.stringify({ boardId, area: area ?? null }));
  } catch {
    /* private mode */
  }
}

function boardContext(): { boardId?: string; area?: 'CM' } {
  try {
    const raw = sessionStorage.getItem(BOARD_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { boardId?: unknown; area?: unknown };
    const out: { boardId?: string; area?: 'CM' } = {};
    if (typeof parsed.boardId === 'string' && parsed.boardId) out.boardId = parsed.boardId;
    if (parsed.area === 'CM') out.area = 'CM';
    return out;
  } catch {
    return {};
  }
}

function baseProps(): { plan: 'free' | 'pro'; platform: 'web' | 'pwa'; appVersion: string; boardId?: string; area?: 'CM' } {
  let plan: 'free' | 'pro' = 'free';
  try {
    if (sessionStorage.getItem(PLAN_KEY) === 'pro') plan = 'pro';
  } catch {
    /* unavailable */
  }
  let platform: 'web' | 'pwa' = 'web';
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) platform = 'pwa';
  } catch {
    /* jsdom without matchMedia */
  }
  return { plan, platform, appVersion: APP_VERSION, ...boardContext() };
}

/** Typed by contracts/events.ts. Without a token it is a no-op that records into window.__remoaEvents (used by e2e). */
export const track: Track = (event, props) => {
  const parsed = (eventSchemas[event] as ZodTypeAny).safeParse(props);
  if (!parsed.success) {
    if (process.env.NODE_ENV !== 'production') reportError(new Error(`invalid props for event ${event}`));
    return;
  }
  const payload = { ...(parsed.data as Record<string, unknown>), ...baseProps() };
  if (token) void mixpanel().then((mp) => mp.track(event, payload));
  else (window.__remoaEvents ??= []).push({ event, props: payload });
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
