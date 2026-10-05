import { describe, expect, it } from 'vitest';
import { phoneMap } from './map-surface';

describe('mobile map surface', () => {
  it('uses the phone map below 768 px and keeps the challenge canvas when a session is open', () => {
    expect(phoneMap(false, false)).toBe(true);
    expect(phoneMap(false, true)).toBe(false);
    expect(phoneMap(true, false)).toBe(false);
    expect(phoneMap(true, true)).toBe(false);
  });
});
