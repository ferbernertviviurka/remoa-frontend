import { afterEach, describe, expect, it, vi } from 'vitest';
import { logTiming, parseServerTiming, withTiming } from './perf';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('perf (G21/F29 FR-3)', () => {
  it('parses the API Server-Timing and query count', () => {
    expect(parseServerTiming('db;dur=12.3;desc="4 q", ext;dur=5;desc="stripe", app;dur=1.2, build;dur=3', '4')).toEqual({ db: 12.3, ext: 5, app: 1.2, queries: 4 });
    expect(parseServerTiming(null, null)).toEqual({});
  });

  it('logTiming is silent in the browser (jsdom has window)', () => {
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.stubEnv('PERF_LOG_API', '1');
    logTiming({ name: 'api', ms: 1 });
    expect(out).not.toHaveBeenCalled();
  });

  it('on the server: slow calls always, every call with PERF_LOG_API=1', async () => {
    vi.stubGlobal('window', undefined);
    const out = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const err = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    logTiming({ name: 'api', ms: 5 });
    expect(out).not.toHaveBeenCalled();
    vi.stubEnv('PERF_SLOW_API_MS', '10');
    logTiming({ name: 'api', ms: 20, path: '/v1/home', requestId: 'r1' });
    expect(JSON.parse(String(err.mock.calls[0]![0]))).toMatchObject({ level: 'warn', msg: 'slow timing', name: 'api', ms: 20, path: '/v1/home', requestId: 'r1' });
    vi.stubEnv('PERF_LOG_API', '1');
    expect(await withTiming('action', async () => 7)).toBe(7);
    expect(JSON.parse(String(out.mock.calls[0]![0]))).toMatchObject({ level: 'info', msg: 'timing', name: 'action' });
  });
});
