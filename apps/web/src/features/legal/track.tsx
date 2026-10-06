'use client';
import { useEffect } from 'react';
import { track } from '@/lib/analytics';

export function LegalPageViewed({ document }: { document: 'terms' | 'privacy' }) {
  useEffect(() => track('legal_page_viewed', { document }), [document]);
  return null;
}
