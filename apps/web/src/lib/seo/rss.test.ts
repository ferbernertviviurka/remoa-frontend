// F27 T11 (qa): feed text is XML-escaped and stripped of control characters.
import { describe, expect, it } from 'vitest';
import type { BlogListItem } from '@remoa/contracts';
import { buildRss } from './rss';

describe('buildRss', () => {
  it('escapes markup and drops control characters from titles, descriptions and categories', () => {
    const evil = '</title><script>alert(1)</script>&\u0001"\'';
    const item = { id: 'i', slug: 'a', title: evil, description: evil, excerpt: '', category: { id: 'c', slug: 'c', name: evil }, publishedAt: new Date(0), updatedAt: new Date(0) } as unknown as BlogListItem;
    const xml = buildRss([item], { origin: 'https://site.example', title: evil, description: evil });
    expect(xml).not.toMatch(/<script|<\/title><script|\u0001/);
    expect(xml).toContain('&#60;/title&#62;&#60;script&#62;');
    expect(xml.match(/<title>/g)).toHaveLength(2);
  });
});
