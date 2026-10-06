// G21/F29 FR-3 (D-983): web side of the instrumentation. A Server Component cannot write response headers (and the middleware
// runs before rendering), so the page's `Server-Timing` is not rebuilt here: every server-side API call leaves one JSON line with
// the request id, its time and the API's own `Server-Timing` (db, queries, ext, app). Group by requestId to see a whole page.

export type ApiTiming = { db?: number; queries?: number; ext?: number; app?: number };

/** Reads the API's `Server-Timing: db;dur=X;desc="N q", ext;dur=Y, app;dur=Z` and `X-Remoa-Queries: N`. Unknown parts are ignored. */
export function parseServerTiming(header: string | null, queries?: string | null): ApiTiming {
  const out: ApiTiming = {};
  for (const part of (header ?? '').split(',')) {
    const [name, ...params] = part.trim().split(';');
    const dur = params.map((p) => /^dur=([\d.]+)$/.exec(p.trim())?.[1]).find(Boolean);
    if (dur && (name === 'db' || name === 'ext' || name === 'app')) out[name] = Number(dur);
  }
  const q = Number(queries);
  if (queries && Number.isFinite(q)) out.queries = q;
  return out;
}

/** Server-only line: always when ≥ PERF_SLOW_API_MS (default 800), every call with PERF_LOG_API=1. Never in the browser. */
export function logTiming(entry: { name: string; ms: number } & Record<string, unknown>) {
  if (typeof window !== 'undefined') return;
  const slowMs = Number(process.env.PERF_SLOW_API_MS) || 800;
  const slow = entry.ms >= slowMs;
  if (!slow && process.env.PERF_LOG_API !== '1') return;
  const line = JSON.stringify({ level: slow ? 'warn' : 'info', time: new Date().toISOString(), msg: slow ? 'slow timing' : 'timing', ...entry, ms: Math.round(entry.ms) }) + '\n';
  (slow ? process.stderr : process.stdout).write(line);
}

/** Times any server-side block (Server Action, render step) into the same log as the API calls. */
export async function withTiming<T>(name: string, fn: () => Promise<T>, extra?: Record<string, unknown>): Promise<T> {
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    logTiming({ name, ms: performance.now() - t0, ...extra });
  }
}
