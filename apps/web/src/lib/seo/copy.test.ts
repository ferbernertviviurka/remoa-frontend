import { describe, expect, it } from 'vitest';
import { strings } from '@remoa/strings';

// G11: the real copy (seo.test.tsx stubs t()) must fit Google's SERP limits.
describe('landing SEO copy', () => {
  it('title ≤ 60 and description ≤ 155 characters, both naming the core query', () => {
    const { title, description } = strings.landing.seo;
    expect(title.length).toBeLessThanOrEqual(60);
    expect(description.length).toBeLessThanOrEqual(155);
    for (const s of [title, description]) expect(s).toMatch(/residência médica/);
  });
});
