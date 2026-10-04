'use client';

import { t } from '@remoa/strings';
import { Alert, Button, Card, Progress, Spinner } from '@remoa/ui';
import { AnkiImportSummary } from './anki-import-summary';
import type { AnkiState, Plan } from './use-anki-import';

type Props = { state: Exclude<AnkiState, { kind: 'idle' }>; onPlan: (plan: Plan) => void; onAdjustOpened: () => void; onReset: () => void; onOpen: (boardId: string) => void };

/** Everything after the file is chosen: upload/inspect, summary (F17 FR-8), progress, report with one "Abrir mapa" (FR-18). The CTA lives in the page footer. */
export function AnkiImportFlow({ state, onPlan, onAdjustOpened, onReset, onOpen }: Props) {
  switch (state.kind) {
    case 'uploading':
      return (
        <div className="flex flex-col gap-3">
          <p role="status" className="text-sm font-semibold">{t('import.uploading', { pct: state.pct })}</p>
          <Progress aria-label={t('import.uploadingLabel')} value={state.pct} />
        </div>
      );
    case 'inspecting':
      return (
        <div className="flex items-center gap-3">
          <Spinner label={t('import.inspecting')} />
          <span className="text-sm font-semibold">{t('import.inspecting')}</span>
        </div>
      );
    case 'preview':
      return <AnkiImportSummary summary={state.summary} plan={state.plan} maxCards={state.maxCards} onPlan={onPlan} onAdjustOpened={onAdjustOpened} />;
    case 'importing': {
      const p = state.progress;
      return (
        <div className="flex flex-col gap-3">
          <p role="status" className="text-sm font-semibold">{p ? t('import.progressText', { processed: p.processed, total: p.total }) : t('common.loading')}</p>
          <Progress aria-label={t('import.progress')} value={p?.processed ?? 0} max={Math.max(p?.total ?? 1, 1)} />
        </div>
      );
    }
    case 'done': {
      const r = state.report;
      const rows: Array<[string, string]> = [
        [t('import.report.imported'), String(r.imported)],
        [t('import.report.skippedDuplicate'), String(r.skippedDuplicate)],
        [t('import.report.skippedEmpty'), String(r.skippedEmpty)],
        [t('import.report.missingMedia'), String(r.missingMedia)],
        [t('import.report.duration'), t('import.report.seconds', { s: (r.durationMs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) })],
      ];
      return (
        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="mb-2 font-display text-lg font-bold">{t('import.report.title')}</h2>
            <dl className="m-0">
              {rows.map(([k, v], i) => (
                <div key={k} className={`flex justify-between py-3 ${i < rows.length - 1 ? 'border-b border-divider' : ''}`}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="m-0 font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {r.boardIds[0] ? (
            <div>
              <Button size="lg" onClick={() => onOpen(r.boardIds[0]!)}>{t('importReport.open')}</Button>
            </div>
          ) : null}
        </div>
      );
    }
    case 'error':
      return (
        <div className="flex flex-col gap-4">
          <Alert tone="review" role="alert" title={state.message} />
          <div>
            <Button variant="secondary" size="lg" onClick={onReset}>{t('common.retry')}</Button>
          </div>
        </div>
      );
  }
}
