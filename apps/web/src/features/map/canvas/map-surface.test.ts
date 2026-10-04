import { describe, expect, it } from 'vitest';
import { mobileListInsteadOfCanvas } from './map-surface';

describe('mobile map surface', () => {
  it('lists cards on a phone and keeps the challenge canvas when a session is open', () => {
    expect(mobileListInsteadOfCanvas(false, false)).toBe(true);
    expect(mobileListInsteadOfCanvas(false, true)).toBe(false);
    expect(mobileListInsteadOfCanvas(true, false)).toBe(false);
    expect(mobileListInsteadOfCanvas(true, true)).toBe(false);
  });
});
