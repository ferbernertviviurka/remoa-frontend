import { describe, expect, it } from 'vitest';
import { CALENDAR_LIMITS } from '@remoa/contracts';
import { covers, inputFromForm, rangeFor, reminderLocal, visibleRange, zonedInstant, emptyForm, colorKey, colorHex } from './model';

describe('reminderLocal (FR-13: 18:00 véspera, 07:00 no dia, 1 h antes se < 08:00, nunca antes de 05:00)', () => {
  it('d1 is 18:00 the day before, across a month boundary', () => {
    expect(reminderLocal('d1', '2026-11-01', '08:00')).toEqual({ date: '2026-10-31', time: '18:00' });
  });
  it('d0 is 07:00, also for all-day events and starts from 08:00', () => {
    expect(reminderLocal('d0', '2026-10-06', '08:00').time).toBe('07:00');
    expect(reminderLocal('d0', '2026-10-06', null).time).toBe('07:00');
  });
  it('d0 is 1 h before a start earlier than 08:00, never before 05:00', () => {
    expect(reminderLocal('d0', '2026-10-06', '07:30').time).toBe('06:30');
    expect(reminderLocal('d0', '2026-10-06', '05:30').time).toBe('05:00');
    expect(reminderLocal('d0', '2026-10-06', '00:10').time).toBe('05:00');
  });
});

describe('zonedInstant', () => {
  it('converts São Paulo wall clock (UTC-3)', () => {
    expect(zonedInstant('2026-10-06', '08:00', 'America/Sao_Paulo').toISOString()).toBe('2026-10-06T11:00:00.000Z');
  });
  it('follows daylight saving in other zones', () => {
    expect(zonedInstant('2026-07-01', '12:00', 'America/New_York').toISOString()).toBe('2026-07-01T16:00:00.000Z');
    expect(zonedInstant('2026-01-01', '12:00', 'America/New_York').toISOString()).toBe('2026-01-01T17:00:00.000Z');
  });
});

describe('ranges (FR-22)', () => {
  it('asks for the shown month ± 1 and never beyond the API cap', () => {
    for (const anchor of ['2026-01-15', '2026-02-10', '2026-12-31', '2026-07-01']) {
      const r = rangeFor('month', anchor, '2026-10-05');
      expect((Date.parse(r.to) - Date.parse(r.from)) / 86_400_000).toBeLessThan(CALENDAR_LIMITS.rangeMaxDays);
    }
    expect(rangeFor('month', '2026-10-15', '2026-10-05')).toEqual({ from: '2026-09-01', to: '2026-11-30' });
  });
  it('agenda and gallery hang from today, not from the anchor', () => {
    expect(rangeFor('agenda', '2030-01-01', '2026-10-05')).toEqual({ from: '2026-09-01', to: '2026-11-30' });
  });
  it('the visible grid is always inside what was loaded', () => {
    const need = rangeFor('month', '2026-10-15', '2026-10-05');
    expect(covers(need, visibleRange('month', '2026-10-15', '2026-10-05'))).toBe(true);
    expect(covers(need, visibleRange('week', '2026-10-31', '2026-10-05'))).toBe(true);
    expect(covers(need, rangeFor('month', '2026-12-15', '2026-10-05'))).toBe(false);
  });
});

describe('form → input', () => {
  it('no start time means all day; no end means no end', () => {
    const v = { ...emptyForm('2026-10-06', 'l1'), title: ' Prova ', start: '', end: '10:00' };
    expect(inputFromForm(v, null)).toMatchObject({ title: 'Prova', allDay: true, startTime: null, endTime: null });
    expect(inputFromForm({ ...v, start: '08:00', end: '' }, 'a1')).toMatchObject({ allDay: false, startTime: '08:00', endTime: null, coverAssetId: 'a1' });
  });
});

describe('palette (D-741)', () => {
  it('maps the ui hex back to the contract key', () => {
    expect(colorKey(colorHex('purple'))).toBe('purple');
    expect(colorKey('#000000')).toBe('gray');
  });
});
