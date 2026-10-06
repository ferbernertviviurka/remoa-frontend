'use client';

// F27 T7 (D-910, D-945): autosave of the editor. Sends only the fields that changed since the last *acknowledged* save, after `delay` ms
// without edits or on `flush()` (blur, buttons, leaving). One request at a time: edits made while a PATCH is in flight are picked up by the
// next round, and a response only marks as saved the exact values it carried, so a slow response never discards newer typing.
import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveState = 'saved' | 'dirty' | 'saving' | 'error';
export type SaveError = { code: string; message: string };
type Values = Record<string, unknown>;
type Outcome = { ok: true } | { ok: false; error: SaveError };

export const RATE_LIMIT_BACKOFF_MS = 20_000;

const snap = (v: Values) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, JSON.stringify(x)]));

/** Fields whose value differs from the acknowledged one; `undefined` = not savable now (invalid), left out. */
export function diff(values: Values, saved: Record<string, string>): Values | null {
  const out: Values = {};
  for (const [k, v] of Object.entries(values)) if (v !== undefined && JSON.stringify(v) !== saved[k]) out[k] = v;
  return Object.keys(out).length ? out : null;
}

export function useAutosave({ values, initial, send, onError, delay = 5000, blocked = false }: {
  /** Current savable fields (memoized by the caller). */
  values: Values;
  /** What the server has now (the loaded post). */
  initial: Values;
  send: (patch: Values) => Promise<Outcome>;
  onError?: (error: SaveError, patch: Values) => void;
  delay?: number;
  /** Something changed but can't be sent yet (title < 10, incomplete block): counts as unsaved. */
  blocked?: boolean;
}) {
  const saved = useRef(snap(initial));
  const latest = useRef(values);
  latest.current = values;
  const io = useRef({ send, onError });
  io.current = { send, onError };
  const inFlight = useRef<Promise<boolean> | null>(null);
  const [state, setState] = useState<SaveState>('saved');
  const retried = useRef(false);
  const flushRef = useRef<() => Promise<boolean>>(() => Promise.resolve(true));

  const run = useCallback(async (): Promise<boolean> => {
    for (;;) {
      const patch = diff(latest.current, saved.current);
      if (!patch) break;
      setState('saving');
      const r = await io.current.send(patch).catch((): Outcome => ({ ok: false, error: { code: 'internal', message: 'network' } }));
      if (!r.ok) {
        setState('error');
        io.current.onError?.(r.error, patch);
        // Admin throttle (30 actions/min): back off and retry once; after that, the next edit or blur tries again.
        if (r.error.code === 'rate_limited' && !retried.current) {
          retried.current = true;
          setTimeout(() => void flushRef.current(), RATE_LIMIT_BACKOFF_MS);
        }
        return false;
      }
      retried.current = false;
      Object.assign(saved.current, snap(patch));
    }
    setState('saved');
    return true;
  }, []);

  /** Saves now (waits for a running save first). Resolves true when everything savable is on the server. */
  const flush = useCallback((): Promise<boolean> => {
    if (inFlight.current) return inFlight.current.then(() => flush());
    const p = run().finally(() => { inFlight.current = null; });
    inFlight.current = p;
    return p;
  }, [run]);
  flushRef.current = flush;

  /** After a restore or a reload from the server: what the server has now. */
  const reset = useCallback((v: Values) => { saved.current = snap(v); setState('saved'); }, []);

  const dirty = diff(values, saved.current) !== null;
  useEffect(() => {
    if (!dirty) return;
    setState((s) => (s === 'saving' ? s : 'dirty'));
    const id = setTimeout(() => void flush(), delay);
    return () => clearTimeout(id);
  }, [values, dirty, delay, flush]);

  const unsaved = dirty || blocked || state === 'saving';
  const unsavedRef = useRef(unsaved);
  unsavedRef.current = unsaved;
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (unsavedRef.current) e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
      // Leaving by client navigation (admin menu) does not fire beforeunload: send what is pending, fire and forget.
      if (diff(latest.current, saved.current)) void flush();
    };
  }, [flush]);

  return { state, flush, reset, unsaved };
}
