import { afterEach, describe, expect, it, vi } from 'vitest';
import { rememberBoard, track } from './analytics';

describe('event context', () => {
  afterEach(() => {
    window.__remoaEvents = [];
    sessionStorage.clear();
  });

  it('sends the area of any grande área, not only CM', async () => {
    rememberBoard('11111111-1111-4111-8111-111111111111', 'GO');
    track('progress_viewed', {});
    await vi.waitFor(() => expect(window.__remoaEvents?.[0]?.props).toMatchObject({ area: 'GO' }));
  });

  it('adds boardId and area only while a map is open', async () => {
    rememberBoard('11111111-1111-4111-8111-111111111111', 'CM');
    track('progress_viewed', {});
    // track validates behind a dynamic import outside production (D-372), so events land asynchronously.
    await vi.waitFor(() => expect(window.__remoaEvents?.[0]?.props).toMatchObject({
      boardId: '11111111-1111-4111-8111-111111111111',
      area: 'CM',
      plan: 'free',
      platform: 'web',
      appVersion: '0.0.0',
    }));
    rememberBoard(null);
    track('progress_viewed', {});
    await vi.waitFor(() => expect(window.__remoaEvents).toHaveLength(2));
    expect(window.__remoaEvents?.[1]?.props).not.toHaveProperty('boardId');
    expect(window.__remoaEvents?.[1]?.props).not.toHaveProperty('area');
  });
});
