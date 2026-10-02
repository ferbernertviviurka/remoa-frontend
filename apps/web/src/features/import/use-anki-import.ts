'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApkgSummary, Entitlements, FieldMapping, ImportProgress, ImportReport, Result } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { usePaywall } from '@/features/billing/paywall';
import { defaultPlan, estimate } from './plan';
import { putApkg } from './upload';

export type Plan = { deckIds: string[]; mappings: FieldMapping[] };
export type AnkiState =
  | { kind: 'idle' }
  | { kind: 'uploading'; pct: number }
  | { kind: 'inspecting' }
  | { kind: 'preview'; key: string; summary: ApkgSummary; plan: Plan; maxCards: number | null }
  | { kind: 'importing'; progress: ImportProgress | null }
  | { kind: 'done'; report: ImportReport }
  | { kind: 'error'; message: string };

export const POLL_MS = 1000;
const post = <T,>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });

/** idle → uploading → inspecting → preview → importing → done | error (F06 FR-3/FR-7). */
export function useAnkiImport() {
  const paywall = usePaywall();
  const [state, setState] = useState<AnkiState>({ kind: 'idle' });
  const alive = useRef(true);
  const run = useRef(0); // bumps on reset so a stale poll stops
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const set = useCallback((s: AnkiState) => alive.current && setState(s), []);

  const start = useCallback(
    async (file: File) => {
      const id = ++run.current;
      set({ kind: 'uploading', pct: 0 });
      try {
        const sign = await post<{ url: string; key: string }>('/v1/imports/anki/sign', { sizeBytes: file.size });
        if (!sign.ok) return set({ kind: 'error', message: sign.error.message || t('import.errors.upload') });
        if (!(await putApkg(sign.data.url, file, (pct) => run.current === id && set({ kind: 'uploading', pct })))) return set({ kind: 'error', message: t('import.errors.upload') });
        set({ kind: 'inspecting' });
        const [insp, ent] = await Promise.all([post<ApkgSummary>('/v1/imports/anki/inspect', { key: sign.data.key }), api<Entitlements>('/v1/billing/entitlements').catch(() => null)]);
        if (run.current !== id) return;
        if (!insp.ok) return set({ kind: 'error', message: insp.error.message || t('errors.internal') });
        set({ kind: 'preview', key: sign.data.key, summary: insp.data, plan: defaultPlan(insp.data), maxCards: ent?.ok ? ent.data.ankiImportMaxCards : null });
      } catch {
        set({ kind: 'error', message: t('errors.internal') });
      }
    },
    [set],
  );

  const setPlan = useCallback((plan: Plan) => setState((s) => (s.kind === 'preview' ? { ...s, plan } : s)), []);

  const confirm = useCallback(async () => {
    if (state.kind !== 'preview') return;
    const { key, summary, plan } = state;
    const id = ++run.current;
    set({ kind: 'importing', progress: null });
    try {
      const started = await post<{ importId: string }>('/v1/imports/anki', { key, plan: { ...plan, estimatedCards: estimate(summary, plan.deckIds) } });
      if (!started.ok) {
        if (paywall.handle(started.error)) return set(state); // back to the preview; the paywall dialog is open
        return set({ kind: 'error', message: started.error.message || t('errors.internal') });
      }
      for (;;) {
        const p = await api<ImportProgress>(`/v1/imports/${started.data.importId}`);
        if (run.current !== id) return;
        if (!p.ok) return set({ kind: 'error', message: p.error.message || t('errors.internal') });
        if (p.data.status === 'failed') return set({ kind: 'error', message: p.data.error && p.data.error !== 'stalled' ? p.data.error : t('import.errors.failed') });
        if (p.data.status === 'done') break;
        set({ kind: 'importing', progress: p.data });
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      const rep: Result<ImportReport> = await api<ImportReport>(`/v1/imports/${started.data.importId}/report`);
      if (run.current !== id) return;
      if (!rep.ok) return set({ kind: 'error', message: rep.error.message || t('errors.internal') });
      const r = rep.data;
      track('anki_imported', { decks: plan.deckIds.length, cards: r.imported, media: summary.mediaCount, durationMs: r.durationMs, skipped: r.skippedDuplicate + r.skippedEmpty + r.missingMedia, area: 'CM', matrixItems: 0, access: 'owner', adjusted: false, target: 'new' });
      set({ kind: 'done', report: r });
    } catch {
      set({ kind: 'error', message: t('errors.internal') });
    }
  }, [state, paywall, set]);

  const reset = useCallback(() => {
    run.current++;
    setState({ kind: 'idle' });
  }, []);

  return { state, start, setPlan, confirm, reset };
}
