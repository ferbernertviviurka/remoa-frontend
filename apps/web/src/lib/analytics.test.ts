import { afterEach, describe, expect, it } from 'vitest';
import { rememberBoard, track } from './analytics';

describe('event context', () => {
  afterEach(() => {
    window.__remoaEvents = [];
    sessionStorage.clear();
  });

  it('adds boardId and area only while a map is open', () => {
    rememberBoard('11111111-1111-4111-8111-111111111111', 'CM');
    track('progress_viewed', {});
    expect(window.__remoaEvents?.[0]?.props).toMatchObject({
      boardId: '11111111-1111-4111-8111-111111111111',
      area: 'CM',
      plan: 'free',
      platform: 'web',
      appVersion: '0.0.0',
    });
    rememberBoard(null);
    track('progress_viewed', {});
    expect(window.__remoaEvents?.[1]?.props).not.toHaveProperty('boardId');
    expect(window.__remoaEvents?.[1]?.props).not.toHaveProperty('area');
  });
});
