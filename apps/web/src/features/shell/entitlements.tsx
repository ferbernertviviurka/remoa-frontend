'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { Entitlements } from '@remoa/contracts';
import { api } from '@/lib/api';

type Ctx = { entitlements: Entitlements | null; status: 'ready' | 'error'; refresh: () => Promise<void> };
const EntitlementsContext = createContext<Ctx>({ entitlements: null, status: 'error', refresh: async () => {} });

/** F14: one source for plan + limits in the shell (navbar chip, slider lock cards, Meus mapas). `initial` comes from the server layout. */
export function EntitlementsProvider({ initial, children }: { initial: Entitlements | null; children: ReactNode }) {
  const [entitlements, setEntitlements] = useState(initial);
  const [status, setStatus] = useState<Ctx['status']>(initial ? 'ready' : 'error');
  const refresh = useCallback(async () => {
    const r = await api<Entitlements>('/v1/billing/entitlements').catch(() => null);
    if (r?.ok) { setEntitlements(r.data); setStatus('ready'); } else setStatus('error');
  }, []);
  // The server read is from the layout's first render; usage changes as the user creates maps/cards, so re-read on every route change.
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    void refresh();
  }, [pathname, refresh]);
  return <EntitlementsContext.Provider value={{ entitlements, status, refresh }}>{children}</EntitlementsContext.Provider>;
}

export const useEntitlements = () => useContext(EntitlementsContext);
