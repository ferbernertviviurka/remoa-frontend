// Sem analytics externo (decisão do Fernando): eventos só ficam em window.__remoaEvents (lidos pelos e2e).
import type { BaseEventProps, Track } from '@remoa/contracts';

type Sent = { event: string; props: Record<string, unknown> };
declare global {
  interface Window {
    __remoaEvents?: Sent[];
  }
}

// D-505: next.config.ts copies package.json's version into NEXT_PUBLIC_APP_VERSION at build.
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';
const PLAN_KEY = 'remoa-plan';
const BOARD_KEY = 'remoa-board';

/** The shell writes the current plan so every later event carries it (F11 FR-4). */
export function rememberPlan(plan: BaseEventProps['plan']) {
  try {
    sessionStorage.setItem(PLAN_KEY, plan);
  } catch {
    /* private mode */
  }
}

/** The open map, so later events carry `boardId` and `area` when they are known (F11 FR-4). */
export function rememberBoard(boardId: string | null, area?: BaseEventProps['area'] | null) {
  try {
    if (!boardId) sessionStorage.removeItem(BOARD_KEY);
    else sessionStorage.setItem(BOARD_KEY, JSON.stringify({ boardId, area: area ?? null }));
  } catch {
    /* private mode */
  }
}

function boardContext(): Pick<BaseEventProps, 'boardId' | 'area'> {
  try {
    const raw = sessionStorage.getItem(BOARD_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { boardId?: unknown; area?: unknown };
    const out: Pick<BaseEventProps, 'boardId' | 'area'> = {};
    if (typeof parsed.boardId === 'string' && parsed.boardId) out.boardId = parsed.boardId;
    if (typeof parsed.area === 'string' && parsed.area) out.area = parsed.area as BaseEventProps['area']; // written only by rememberBoard
    return out;
  } catch {
    return {};
  }
}

function baseProps(): BaseEventProps {
  let plan: BaseEventProps['plan'] = 'free';
  try {
    const stored = sessionStorage.getItem(PLAN_KEY);
    if (stored === 'pro' || stored === 'founder') plan = stored;
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

function send(event: string, props: Record<string, unknown>) {
  (window.__remoaEvents ??= []).push({ event, props: { ...props, ...baseProps() } });
}

/**
 * Typed by contracts/events.ts (compile time). Runtime zod validation runs only outside production, behind a dynamic import, so the
 * validator (~13 KB gzip) is not in the landing bundle (P-175, D-372). Records into window.__remoaEvents (used by e2e).
 */
export const track: Track = (event, props) => {
  // P-514 (D-1081): if/else, not an early return: webpack drops the dead `else` before building the module graph, so the production build
  // has no `import('@remoa/contracts')` (that async import of the whole barrel kept every contracts module, zod and the medical-schools
  // list in pages that only read a constant).
  if (process.env.NODE_ENV === 'production') send(event, props as Record<string, unknown>);
  else
    void import('@remoa/contracts').then(({ eventSchemas }) => {
      const parsed = (eventSchemas[event] as { safeParse: (v: unknown) => { success: boolean; data?: unknown } }).safeParse(props);
      if (!parsed.success) return reportError(new Error(`invalid props for event ${event}`));
      send(event, parsed.data as Record<string, unknown>);
    });
};

/** FR-19: defer tracking to browser idle so it never competes with LCP. The landing must use this for `landing_viewed` and `scroll_depth`. */
export const trackWhenIdle: Track = (event, props) => {
  const run = () => track(event, props);
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2000);
};
