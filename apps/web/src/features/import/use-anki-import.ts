'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApkgSummary, Entitlements, ExistingBoard, FieldMapping, ImportBoardInput, ImportProgress, ImportReport, Result } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { usePaywall } from '@/features/billing/paywall';
import { defaultPlan, estimate } from './plan';
import { uploadApkg } from './upload';

const t = withStrings({ import: more.import });

export type Plan = { deckIds: string[]; mappings: FieldMapping[] };
export type AnkiState =
  | { kind: 'idle' }
  | { kind: 'uploading'; pct: number }
  | { kind: 'inspecting' }
  | { kind: 'preview'; key: string; summary: ApkgSummary; plan: Plan; maxCards: number | null; submitError?: string }
  | { kind: 'importing'; progress: ImportProgress | null }
  | { kind: 'done'; report: ImportReport }
  | { kind: 'error'; message: string };

export const POLL_MS = 1000;
const post = <T,>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });

/** idle → uploading → inspecting → preview → importing → done | error (F06 FR-3/FR-7; F17: `confirm` sends the "Sobre o mapa" board, D-500). */
export function useAnkiImport() {
  const paywall = usePaywall();
  const [state, setState] = useState<AnkiState>({ kind: 'idle' });
  const alive = useRef(true);
  const run = useRef(0); // bumps on reset so a stale poll stops
  const adjusted = useRef(false); // F17 FR-9: opened "Ajustar importação" at least once
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
      adjusted.current = false;
      set({ kind: 'uploading', pct: 0 });
      try {
        // D-648: the account's Anki import allowance (Free: 1) is checked before uploading anything; the server also answers 402 'anki'.
        const ent = await api<Entitlements>('/v1/billing/entitlements').catch(() => null);
        if (run.current !== id) return;
        if (ent?.ok && ent.data.ankiImports !== null && ent.data.ankiImportsUsed >= ent.data.ankiImports) {
          paywall.show('anki');
          return set({ kind: 'idle' });
        }
        // D-1443: through the API (no browser PUT to the bucket); the server checks quota, size and that it is a zip.
        const up = await uploadApkg(file, (pct) => run.current === id && set({ kind: 'uploading', pct }));
        if (run.current !== id) return;
        if (!up.ok) {
          if (paywall.handle(up.error)) return set({ kind: 'idle' });
          return set({ kind: 'error', message: t('import.errors.upload') });
        }
        set({ kind: 'inspecting' });
        const insp = await post<ApkgSummary>('/v1/imports/anki/inspect', { key: up.data.key });
        if (run.current !== id) return;
        if (!insp.ok) return set({ kind: 'error', message: insp.error.message || t('errors.internal') });
        set({ kind: 'preview', key: up.data.key, summary: insp.data, plan: defaultPlan(insp.data), maxCards: ent?.ok ? ent.data.ankiImportMaxCards : null }); // null = no per-file cap
      } catch {
        set({ kind: 'error', message: t('errors.internal') });
      }
    },
    [set, paywall],
  );

  const setPlan = useCallback((plan: Plan) => setState((s) => (s.kind === 'preview' ? { ...s, plan } : s)), []);

  /** F17 FR-9: first opening of "Ajustar importação" is tracked once per file. */
  const markAdjusted = useCallback(() => {
    if (adjusted.current) return;
    adjusted.current = true;
    track('anki_import_adjust_opened', {});
  }, []);

  /** F17 FR-11: own active board with the same normalised title, or null (also on error: never block the import on this check). */
  const findExisting = useCallback(async (title: string) => {
    const r = await api<ExistingBoard>(`/v1/imports/anki/existing?title=${encodeURIComponent(title)}`).catch(() => null);
    return r?.ok ? r.data.board : null;
  }, []);

  const confirm = useCallback(
    async (board: ImportBoardInput, meta: { suggestedCount: number }) => {
      if (state.kind !== 'preview') return;
      const { key, summary, plan } = state;
      const id = ++run.current;
      set({ kind: 'importing', progress: null });
      try {
        const started = await post<{ importId: string }>('/v1/imports/anki', { key, plan: { ...plan, estimatedCards: estimate(summary, plan.deckIds) }, board });
        if (!started.ok) {
          if (paywall.handle(started.error)) return set({ ...state, submitError: undefined }); // the paywall dialog is open
          // 409/422 and friends: back to "Sobre o mapa" with the message, nothing lost
          return set({ ...state, submitError: started.error.message || t('errors.internal') });
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
        const target = board.target && board.target !== 'new' ? 'existing' : 'new';
        const items = board.matrixItemIds?.length ?? 0;
        track('anki_imported', {
          decks: plan.deckIds.length, cards: r.imported, media: summary.mediaCount, durationMs: r.durationMs, skipped: r.skippedDuplicate + r.skippedEmpty + r.missingMedia,
          area: board.area ?? 'CM', matrixItems: items, access: board.access ?? 'owner', adjusted: adjusted.current, target,
        });
        if (items > 0) track('board_linked_to_matrix', { count: items, suggestedCount: meta.suggestedCount });
        if (target === 'new' && board.access && board.access !== 'owner') track('board_access_changed', { from: 'owner', to: board.access, source: 'create' });
        set({ kind: 'done', report: r });
      } catch {
        set({ kind: 'error', message: t('errors.internal') });
      }
    },
    [state, paywall, set],
  );

  const reset = useCallback(() => {
    run.current++;
    adjusted.current = false;
    setState({ kind: 'idle' });
  }, []);

  return { state, start, setPlan, confirm, findExisting, markAdjusted, reset };
}
