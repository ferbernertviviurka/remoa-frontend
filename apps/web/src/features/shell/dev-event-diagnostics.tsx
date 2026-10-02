'use client';

import { useEffect } from 'react';

/**
 * Dev only (G02 item 2): the Next overlay shows a promise rejected with a DOM `Event` as "Runtime Error [object Event]"
 * with an empty stack. This adds the event type and its target to the console so the next occurrence names its source.
 * It does not catch or hide anything. ponytail: remove once the source is found (P-081).
 */
export function DevEventDiagnostics() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const onRejection = (e: PromiseRejectionEvent) => {
      const r: unknown = e.reason;
      if (!(r instanceof Event)) return;
      const target = r.target as (EventTarget & { tagName?: string; src?: string; url?: string }) | null;
      // eslint-disable-next-line no-console -- dev-only diagnostic, never shipped (NODE_ENV guard)
      console.warn('[remoa] promise rejected with an Event', { type: r.type, target: target?.constructor?.name, tag: target?.tagName, src: target?.src ?? target?.url, path: location.pathname });
    };
    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, []);
  return null;
}
