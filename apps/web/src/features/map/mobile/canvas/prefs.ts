// F23 D-664: phone map preferences, only on this device (localStorage). Never throws: bad or missing data = defaults.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  defaultMobileMapPrefs, MOBILE_MAP_MAX_VIEWPORTS, MOBILE_MAP_PREFS_KEY, mobileMapPrefsSchema, type MobileMapPrefs, type MobileMapView,
} from '@remoa/contracts';
import { storage } from '../../canvas/initial-graph';

type KV = Pick<Storage, 'getItem' | 'setItem'>;

export function readPrefs(kv: KV | null = storage()): MobileMapPrefs {
  try {
    const raw = kv?.getItem(MOBILE_MAP_PREFS_KEY);
    const parsed = mobileMapPrefsSchema.safeParse(raw ? JSON.parse(raw) : {});
    return parsed.success ? parsed.data : defaultMobileMapPrefs;
  } catch {
    return defaultMobileMapPrefs;
  }
}

export function writePrefs(p: MobileMapPrefs, kv: KV | null = storage()) {
  try {
    kv?.setItem(MOBILE_MAP_PREFS_KEY, JSON.stringify(p));
  } catch {
    /* quota, private mode: the prefs live for this visit only */
  }
}

/** Saves the last view of `boardId` as the most recent one; keeps the newest 50 boards (insertion order). */
export function withViewport(p: MobileMapPrefs, boardId: string, v: MobileMapView): MobileMapPrefs {
  const rest = Object.entries(p.viewports).filter(([id]) => id !== boardId).slice(-(MOBILE_MAP_MAX_VIEWPORTS - 1));
  return { ...p, viewports: Object.fromEntries([...rest, [boardId, v]]) };
}

const WRITE_MS = 300;

/** Prefs state; writes are debounced (pan/zoom end fires often) and flushed on unmount. */
export function useMobileMapPrefs() {
  const [prefs, setPrefs] = useState<MobileMapPrefs>(() => readPrefs());
  const latest = useRef(prefs);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const update = useCallback((fn: (p: MobileMapPrefs) => MobileMapPrefs) => {
    latest.current = fn(latest.current);
    setPrefs(latest.current);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      writePrefs(latest.current);
    }, WRITE_MS);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) writePrefs(latest.current);
    },
    [],
  );
  return [prefs, update] as const;
}
