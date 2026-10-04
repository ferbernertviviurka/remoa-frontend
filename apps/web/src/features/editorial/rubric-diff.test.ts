import { describe, expect, it } from 'vitest';
import { rubricPointDiff } from './rubric-diff';

describe('rubricPointDiff', () => {
  it('lists points that left and points that arrived', () => {
    const diff = rubricPointDiff(
      [
        { text: 'Iniciar noradrenalina', essential: true },
        { text: 'Reavaliar lactato', essential: false },
      ],
      [
        { text: 'Iniciar noradrenalina', essential: true },
        { text: 'Reconhecer disfunção orgânica', essential: true },
      ],
    );
    expect(diff.removed).toEqual(['Reavaliar lactato']);
    expect(diff.added).toEqual(['Reconhecer disfunção orgânica']);
  });

  it('treats a point that lost the essential mark as a change', () => {
    const diff = rubricPointDiff(
      [{ text: 'Culturas', essential: true }],
      [{ text: 'Culturas', essential: false }],
    );
    expect(diff.removed).toEqual(['Culturas']);
    expect(diff.added).toEqual(['Culturas']);
  });
});
