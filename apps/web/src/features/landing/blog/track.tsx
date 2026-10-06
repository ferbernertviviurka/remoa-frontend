'use client';
import type { ReactNode } from 'react';
import { track } from '@/lib/analytics';

/** landing_blog_clicked (CCR-047): delegated click on a post link; position = index in `hrefs` (the "ver mais" link is not tracked). */
export function LandingBlogTrack({ hrefs, children }: { hrefs: string[]; children: ReactNode }) {
  return (
    <div
      className="contents"
      onClickCapture={(e) => {
        const position = hrefs.indexOf((e.target as HTMLElement).closest('a')?.getAttribute('href') ?? '');
        if (position >= 0 && position <= 4) track('landing_blog_clicked', { position });
      }}
    >
      {children}
    </div>
  );
}
