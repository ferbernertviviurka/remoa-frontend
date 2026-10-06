import { afterEach, describe, expect, it, vi } from 'vitest';
import { landingFlags } from './flags';

describe('landingFlags.launchPhase', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is open when NEXT_PUBLIC_LAUNCH_PHASE is unset (env removed from Vercel)', () => {
    vi.stubEnv('NEXT_PUBLIC_LAUNCH_PHASE', undefined);
    expect(landingFlags().launchPhase).toBe('open');
  });

  it('is waitlist only when explicitly set', () => {
    vi.stubEnv('NEXT_PUBLIC_LAUNCH_PHASE', 'waitlist');
    expect(landingFlags().launchPhase).toBe('waitlist');
    vi.stubEnv('NEXT_PUBLIC_LAUNCH_PHASE', 'open');
    expect(landingFlags().launchPhase).toBe('open');
  });
});
