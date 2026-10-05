'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const DEBOUNCE_MS = 300;

/**
 * FR-22: search, filters and page live in the URL; the server does the work. Any change but `page` resets to page 1.
 * `pending` is true while the new server render is on its way (the table shows its loading state).
 */
export function useListParams() {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const current = sp.get('q') ?? '';
  const [q, setQ] = useState(current);

  const push = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v && v !== 'all') next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in patch)) next.delete('page');
    const qs = next.toString();
    start(() => router.replace(qs ? `${path}?${qs}` : path, { scroll: false }));
  };

  const pushRef = useRef(push);
  pushRef.current = push;
  useEffect(() => {
    if (q.trim() === current) return;
    const id = setTimeout(() => pushRef.current({ q: q.trim() }), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [q, current]);

  return { q, setQ, get: (k: string) => sp.get(k) ?? '', push, pending, refresh: () => start(() => router.refresh()) };
}
