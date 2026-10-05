import { describe, expect, it } from 'vitest';
import { challengeZoom, CHALLENGE_ZOOM } from './challenge-camera';

const card = { w: 248, h: 176 };
const free = { w: 1000, h: 600 };

describe('challengeZoom (D-689)', () => {
  it('zooms in on a card out of frame or seen from afar', () => {
    expect(challengeZoom({ card, free, zoom: 0.6, inside: true })).toBe(CHALLENGE_ZOOM);
    expect(challengeZoom({ card, free, zoom: 1.25, inside: false })).toBe(CHALLENGE_ZOOM);
  });
  it('keeps the camera when the card is already well framed', () => {
    expect(challengeZoom({ card, free, zoom: 1.2, inside: true })).toBeNull();
  });
  it('as big as the free area allows, never below 100% (it is a zoom in)', () => {
    expect(challengeZoom({ card, free: { w: 358, h: 200 }, zoom: 0.6, inside: false })).toBeCloseTo(200 / 176);
    expect(challengeZoom({ card, free: { w: 700, h: 160 }, zoom: 0.6, inside: true })).toBe(1);
  });
});
