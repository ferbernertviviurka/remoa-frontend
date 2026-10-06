'use client';
import { useEffect, type ReactNode } from 'react';
import { track } from '@/lib/analytics';

/**
 * CCR-045: blog_post_viewed / blog_cta_clicked / blog_search_used are not in contracts/events yet. Fire only when the schema exists
 * (dynamic import keeps zod off the first paint); props never carry post text or the search term (F25 telemetry).
 */
export function trackBlog(event: 'blog_post_viewed' | 'blog_cta_clicked' | 'blog_search_used', props: Record<string, unknown>) {
  void import('@remoa/contracts').then(({ eventSchemas }) => {
    if (event in eventSchemas) (track as (e: string, p: Record<string, unknown>) => void)(event, props);
  });
}

export function BlogPostViewed({ slug, template, category }: { slug: string; template: string; category?: string }) {
  useEffect(() => trackBlog('blog_post_viewed', { slug, template, ...(category ? { category } : {}) }), [slug, template, category]);
  return null;
}

export function BlogSearchUsed({ resultsCount, queryLength }: { resultsCount: number; queryLength: number }) {
  useEffect(() => trackBlog('blog_search_used', { resultsCount, queryLength }), [resultsCount, queryLength]);
  return null;
}

/** Wraps the CTA: a click on any link inside it fires blog_cta_clicked (delegated, so the UI component stays untouched). */
export function BlogCtaTrack({ slug, position, children }: { slug: string; position: string; children: ReactNode }) {
  return <div onClickCapture={(e) => { if ((e.target as HTMLElement).closest('a')) trackBlog('blog_cta_clicked', { slug, position }); }}>{children}</div>;
}
