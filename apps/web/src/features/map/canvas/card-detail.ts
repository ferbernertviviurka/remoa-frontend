'use client';

// T5: CardDetail (payload + rubric) for the panel tabs and the flow node steps. One request per card, shared.
import { useEffect, useSyncExternalStore } from 'react';
import type { CardDetail } from '@remoa/contracts';
import { api } from '@/lib/api';

const details = new Map<string, CardDetail>();
const inflight = new Set<string>();
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));

/** A save in the card editor replaces the cached detail (node and panel update at once). */
export function primeCardDetail(d: CardDetail) {
  details.set(d.id, d);
  for (const l of listeners) l();
}

/** Test helper. */
export const clearCardDetails = () => {
  details.clear();
  inflight.clear();
};

function load(id: string, prepare: (id: string) => Promise<boolean>) {
  if (details.has(id) || inflight.has(id)) return;
  inflight.add(id);
  prepare(id)
    .then((ready) => (ready ? api<CardDetail>(`/v1/cards/${id}`) : null))
    .then((r) => r?.ok && primeCardDetail(r.data))
    .catch(() => undefined) // offline: the panel shows what the map already has; retried on the next mount
    .finally(() => inflight.delete(id));
}

/**
 * `null` until loaded (or when `id` is null); re-renders only when this card's detail changes.
 * `prepare` waits for a card created on the map to reach the API.
 * ponytail: flow nodes fetch their steps with one GET per mounted flow card; ask for step texts in `CardPreview` (CCR) if maps get flow-heavy.
 */
export function useCardDetail(id: string | null, prepare: (id: string) => Promise<boolean>): CardDetail | null {
  const d = useSyncExternalStore(subscribe, () => (id ? (details.get(id) ?? null) : null), () => null);
  useEffect(() => {
    if (id) load(id, prepare);
  }, [id, prepare]);
  return d;
}
