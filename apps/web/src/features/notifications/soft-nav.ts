import type { MouseEvent as ReactMouseEvent } from 'react';

/** Same-origin app links inside a notification surface navigate client-side (no full reload). Returns the href when it handled the click. */
export function appLinkOf(e: Pick<MouseEvent | ReactMouseEvent, 'target' | 'defaultPrevented' | 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>, root: Element | Document = document): string | null {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const a = (e.target as Element | null)?.closest?.('a[href^="/"]');
  return a && root.contains(a) ? a.getAttribute('href') : null;
}
