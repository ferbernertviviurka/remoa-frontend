import { describe, expect, it } from 'vitest';
import { readGenerationNotice } from './start-ai';

describe('readGenerationNotice', () => {
  it('keeps a real shortfall and drops a full delivery or a bad shape', () => {
    expect(readGenerationNotice({ generation: { requested: 5, reused: 1, generated: 1, shortfall: 3, stoppedBy: null } })).toEqual({ requested: 5, shortfall: 3, stoppedBy: null });
    expect(readGenerationNotice({ generation: { requested: 5, shortfall: 2, stoppedBy: 'quota' } })?.stoppedBy).toBe('quota');
    expect(readGenerationNotice({ generation: { requested: 5, shortfall: 0, stoppedBy: null } })).toBeNull();
    expect(readGenerationNotice({ generation: { requested: 5, shortfall: 3, stoppedBy: 'leak', correctKey: 'B' } })).toBeNull();
    expect(readGenerationNotice({ data: { id: 's' } })).toBeNull();
  });
});
