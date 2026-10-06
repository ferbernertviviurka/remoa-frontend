import { readFileSync } from 'node:fs';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { blogListItemFixtures } from '@remoa/contracts/mocks';
import { strings } from '@remoa/strings';
import { LandingBlog } from './landing-blog';
import { LandingHeader } from '../shell/landing-header';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const published = blogListItemFixtures[0]!;
const stub = (data: unknown, ok = true) => vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => ({ ok, data }) })));
const posts = (n: number) => Array.from({ length: n }, (_, i) => ({ ...published, id: `${published.id.slice(0, -1)}${i}`, slug: `post-${i}`, title: `Post ${i}` }));
const show = async () => render(await LandingBlog());

describe('LandingBlog (FR-39/40)', () => {
  test('disappears with no posts or when the API fails', async () => {
    stub([]);
    expect((await show()).container.innerHTML).toBe('');
    cleanup();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    expect((await show()).container.innerHTML).toBe('');
    cleanup();
    stub({}, false);
    expect((await show()).container.innerHTML).toBe('');
  });
  test.each([1, 3, 5])('shows %i posts linking to /blog/<slug>', async (n) => {
    stub(posts(n));
    await show();
    expect(screen.getByRole('heading', { level: 2, name: strings.blog.landing.sectionTitle })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(n);
    expect(screen.getByRole('link', { name: /Post 0/ }).getAttribute('href')).toBe('/blog/post-0');
    expect(screen.getAllByRole('link', { name: new RegExp(strings.blog.landing.viewMore) }).map((a) => a.getAttribute('href'))).toEqual(['/blog', '/blog']);
  });
  test.each([6, 9])('P-412: with %i published posts it asks for 5 and shows at most 5', async (n) => {
    const f = vi.fn<(url: string) => Promise<unknown>>(async () => ({ ok: true, json: async () => ({ ok: true, data: posts(n) }) }));
    vi.stubGlobal('fetch', f);
    await show();
    expect(f.mock.calls[0]![0]).toContain('/posts/latest?n=5');
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5);
    expect(screen.queryByRole('link', { name: /Post 5/ })).toBeNull();
  });
});

describe('menu and footer', () => {
  test('header has a Blog link to /blog (not an anchor)', () => {
    render(<LandingHeader blogLabel="Blog" phase="open" />);
    expect(screen.getAllByRole('link', { name: 'Blog' })[0]?.getAttribute('href')).toBe('/blog');
  });
  test('layout footer: legal routes, blog, contact from the legal config, no hardcoded e-mail', () => {
    const src = readFileSync('src/app/(marketing)/layout.tsx', 'utf8');
    for (const h of ['/termos-de-uso', '/politica-de-privacidade', '/blog', 'LEGAL_CONFIG.vars.dpoEmail']) expect(src).toContain(h);
    expect(src).not.toMatch(/[\w.]+@[\w.]+\.\w+/);
  });
});
