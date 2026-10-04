import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OFFLINE_DOCUMENT, SHELL_CACHE, START_PATH, shouldCacheShell, shouldPrecacheOffline } from './shell-cache';

describe('shouldCacheShell', () => {
  it('keeps the review page and rejects the login redirect', () => {
    expect(shouldCacheShell('/app/revisar', { ok: true, redirected: false, url: 'http://localhost:3000/app/revisar' })).toBe(true);
    expect(shouldCacheShell('/app/revisar', { ok: true, redirected: true, url: 'http://localhost:3000/entrar' })).toBe(false);
    expect(shouldCacheShell('/app/revisar', { ok: true, redirected: false, url: 'http://localhost:3000/entrar' })).toBe(false);
    expect(shouldCacheShell('/app/revisar', { ok: false, redirected: false, url: 'http://localhost:3000/app/revisar' })).toBe(false);
  });

  it('is the check the service worker uses', () => {
    const sw = readFileSync('public/sw.js', 'utf8');
    expect(sw).toContain('res.redirected');
    expect(sw).toContain('res.ok');
    expect(sw).toContain(SHELL_CACHE);
    expect(sw).toContain(OFFLINE_DOCUMENT);
    expect(sw).toContain(START_PATH);
    expect(sw).toContain('cache.put(START_PATH');
    expect(sw).toContain('cache.put(OFFLINE_DOCUMENT');
    expect(sw).toContain('cache.match(OFFLINE_DOCUMENT)');
  });

  it('the offline page queues the last session in the same shape the app flushes', () => {
    const html = readFileSync('public/offline.html', 'utf8');
    expect(html).toContain('remoa-last-session');
    expect(html).toContain('remoa-offline-answers');
    expect(html).toContain("enqueue('answer'");
    expect(html).toContain("enqueue('rate'");
    expect(html).toContain("enqueue('finish'");
    expect(html).toContain('Sem conexão');
    expect(html).toContain("addEventListener('online'");
  });

  it('precaches only a real offline document under the start url', () => {
    expect(shouldPrecacheOffline({ ok: true, redirected: false })).toBe(true);
    expect(shouldPrecacheOffline({ ok: true, redirected: true })).toBe(false);
    expect(shouldPrecacheOffline({ ok: false, redirected: false })).toBe(false);
  });
});
