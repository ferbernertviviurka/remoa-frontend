'use client';

import { useSyncExternalStore } from 'react';

// The hero picker, the plans CTAs and the final CTA are separate islands: the chosen course travels through sessionStorage + an event.
const KEY = 'remoa:landing:curso';
const EVENT = 'remoa:landing-curso';

const read = (): string | null => {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
};

export function setSelectedCourse(code: string | null) {
  try { if (code) sessionStorage.setItem(KEY, code); else sessionStorage.removeItem(KEY); } catch { /* private mode: the event below still updates this page */ }
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};

/** null on the server and before a choice (hydration-safe). */
export const useSelectedCourse = () => useSyncExternalStore(subscribe, read, () => null);
