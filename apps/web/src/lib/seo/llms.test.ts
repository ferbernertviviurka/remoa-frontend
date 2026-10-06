import { describe, expect, it } from 'vitest';
import type { BlogListItem } from '@remoa/contracts';
import { buildLlmsTxt } from './llms';

const post = (over: Partial<BlogListItem>) => ({ id: 'i', slug: 'a', title: 'T', description: 'D', excerpt: '', category: null, publishedAt: new Date(0), updatedAt: new Date(0), ...over }) as unknown as BlogListItem;

describe('buildLlmsTxt', () => {
  it('follows llmstxt.org: H1 first, then the summary blockquote; absolute links; Optional section last', () => {
    const txt = buildLlmsTxt([], { origin: 'https://site.example' });
    const lines = txt.split('\n');
    expect(lines[0]).toBe('# Remoa');
    expect(lines[2]).toMatch(/^> \S/);
    expect(txt).toContain('](https://site.example/termos-de-uso): ');
    expect(txt).toContain('](https://site.example/politica-de-privacidade): ');
    expect(txt).toContain('](https://site.example/sitemap.xml): ');
    expect(txt.lastIndexOf('## ')).toBe(txt.indexOf('## Optional'));
  });
  it('no blog section without posts; posts link to /blog/<slug> with the excerpt, falling back to the description', () => {
    expect(buildLlmsTxt([], { origin: 'https://s.ex' })).not.toContain('## Blog');
    const txt = buildLlmsTxt([post({ slug: 'um', title: 'Um', excerpt: 'Resumo' }), post({ slug: 'dois', title: 'Dois', description: 'Desc' })], { origin: 'https://s.ex' });
    expect(txt).toContain('## Blog\n\n- [Um](https://s.ex/blog/um): Resumo\n- [Dois](https://s.ex/blog/dois): Desc');
  });
  it('a title with brackets or line breaks cannot break the link syntax', () => {
    const txt = buildLlmsTxt([post({ slug: 'x', title: 'A] (evil) [b\nc', excerpt: 'l1\nl2' })], { origin: 'https://s.ex' });
    expect(txt).toContain('- [A) (evil) (b c](https://s.ex/blog/x): l1 l2');
  });
});
