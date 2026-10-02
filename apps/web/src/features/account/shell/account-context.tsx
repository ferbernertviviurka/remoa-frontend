'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { AccountSnapshot } from '@remoa/contracts';
import { api } from '@/lib/api';
import { useMotionSync } from '../preferences/motion';

type AccountCtx = {
  account: AccountSnapshot;
  /** Optimistic local update; callers revert by applying the previous value on error. */
  setAccount: (update: (prev: AccountSnapshot) => AccountSnapshot) => void;
  /** Re-reads GET /v1/account/me (e.g. after an action whose effect is computed on the server). */
  refresh: () => Promise<void>;
};

const Ctx = createContext<AccountCtx | null>(null);

/** One snapshot for hero, subnav and every section, so a change in one section shows everywhere without reloading. */
export function AccountProvider({ initial, children }: { initial: AccountSnapshot; children: ReactNode }) {
  const [account, set] = useState(initial);
  useMotionSync(account.preferences.reduceMotion); // FR-14 on every /conta/* route, not only Preferências
  const setAccount = useCallback((update: (prev: AccountSnapshot) => AccountSnapshot) => set(update), []);
  const refresh = useCallback(async () => {
    const r = await api<AccountSnapshot>('/v1/account/me');
    if (r.ok) set(r.data);
  }, []);
  return <Ctx.Provider value={{ account, setAccount, refresh }}>{children}</Ctx.Provider>;
}

export function useAccount(): AccountCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAccount outside AccountProvider');
  return v;
}
