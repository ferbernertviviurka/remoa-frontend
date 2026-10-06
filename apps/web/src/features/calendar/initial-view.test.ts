import { describe, expect, it } from 'vitest';
import type { CalendarSettings } from '@remoa/contracts';
import { initialSettings } from './initial-view';

const base = { view: null } as CalendarSettings;
const hs = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });

describe('initialSettings (FR-3)', () => {
  it('phone without saved view opens Agenda', () => {
    expect(initialSettings(base, hs({ 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' })).view).toBe('agenda');
    expect(initialSettings(base, hs({ 'sec-ch-ua-mobile': '?1' })).view).toBe('agenda');
  });
  it('desktop without saved view opens Month', () => {
    expect(initialSettings(base, hs({ 'user-agent': 'Mozilla/5.0 (Macintosh)', 'sec-ch-ua-mobile': '?0' })).view).toBe('month');
  });
  it('saved view wins on a phone', () => {
    expect(initialSettings({ view: 'week' } as CalendarSettings, hs({ 'sec-ch-ua-mobile': '?1' })).view).toBe('week');
  });
});
