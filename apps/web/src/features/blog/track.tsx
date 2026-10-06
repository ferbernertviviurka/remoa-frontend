'use client';
import { useEffect, type ReactNode } from 'react';
import { track } from '@/lib/analytics';

export function BlogPostViewed({ slug, template, category }: { slug: string; template: string; category?: string }) {
  useEffect(() => track('blog_post_viewed', { slug, template, ...(category ? { category } : {}) }), [slug, template, category]);
  return null;
}

export function BlogSearchUsed({ resultCount, queryLength }: { resultCount: number; queryLength: number }) {
  useEffect(() => track('blog_search_used', { resultCount, queryLength }), [resultCount, queryLength]);
  return null;
}

/** Wraps the CTA: a click on any link inside it fires blog_cta_clicked (delegated, so the UI component stays untouched). */
export function BlogCtaTrack({ slug, position, children }: { slug: string; position: string; children: ReactNode }) {
  return <div onClickCapture={(e) => { if ((e.target as HTMLElement).closest('a')) track('blog_cta_clicked', { slug, position }); }}>{children}</div>;
}
