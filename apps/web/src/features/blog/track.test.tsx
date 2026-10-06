import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { blogListItemFixtures } from '@remoa/contracts/mocks';
import { eventSchemas } from '@remoa/contracts';
import { LandingBlog } from '../landing/blog/landing-blog';
import { LegalPageViewed } from '../legal/track';
import { BlogCtaTrack, BlogPostViewed, BlogSearchUsed } from './track';

const track = vi.fn();
vi.mock('@/lib/analytics', () => ({ track: (...a: unknown[]) => track(...a) }));
afterEach(() => { cleanup(); track.mockClear(); vi.unstubAllGlobals(); });

const lastValid = () => {
  const [name, props] = track.mock.calls.at(-1) as [keyof typeof eventSchemas, unknown];
  expect(eventSchemas[name].safeParse(props).success).toBe(true);
  return [name, props];
};

describe('telemetry (F25)', () => {
  it('blog events carry only the allowed props', () => {
    render(<><BlogPostViewed slug="a" template="guia" category="c" /><BlogSearchUsed resultCount={2} queryLength={4} /></>);
    expect(track).toHaveBeenCalledWith('blog_post_viewed', { slug: 'a', template: 'guia', category: 'c' });
    expect(track).toHaveBeenCalledWith('blog_search_used', { resultCount: 2, queryLength: 4 });
  });
  it('cta click fires blog_cta_clicked', () => {
    render(<BlogCtaTrack slug="a" position="end"><a href="/x">Go</a></BlogCtaTrack>);
    fireEvent.click(screen.getByRole('link'));
    expect(lastValid()).toEqual(['blog_cta_clicked', { slug: 'a', position: 'end' }]);
  });
  it('legal page view', () => {
    render(<LegalPageViewed document="privacy" />);
    expect(lastValid()).toEqual(['legal_page_viewed', { document: 'privacy' }]);
  });
  it('landing post click sends its position', async () => {
    const posts = [0, 1, 2].map((i) => ({ ...blogListItemFixtures[0]!, slug: `p-${i}`, title: `Post ${i}` }));
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, data: posts }) })));
    render(await LandingBlog());
    fireEvent.click(screen.getByRole('link', { name: /Post 2/ }));
    expect(lastValid()).toEqual(['landing_blog_clicked', { position: 2 }]);
    track.mockClear();
    fireEvent.click(screen.getAllByRole('link', { name: /Ver mais|blog/i }).find((a) => a.getAttribute('href') === '/blog')!);
    expect(track).not.toHaveBeenCalled();
  });
});
