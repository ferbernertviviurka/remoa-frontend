'use client';

import { useEffect, type ReactNode } from 'react';
import type { ApkgSummary } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Accordion, Alert, Card } from '@remoa/ui';
import { AnkiPreview } from './anki-preview';
import { applyMapping, estimate } from './plan';
import type { Plan } from './use-anki-import';

const t = withStrings({ import: more.import, importAdjust: more.importAdjust, importSummary: more.importSummary });

type Props = { summary: ApkgSummary; plan: Plan; maxCards: number | null; onPlan: (plan: Plan) => void; onAdjustOpened: () => void };

/** Radix mounts the accordion content only while open: mounting = "opened" (FR-9 telemetry, no extra prop on the Torph Accordion). */
function Opened({ onOpen, children }: { onOpen: () => void; children: ReactNode }) {
  useEffect(onOpen, [onOpen]);
  return <>{children}</>;
}

/** F17 FR-8/FR-9: one summary card + 3 examples; decks and field mapping stay inside the closed "Ajustar importação". */
export function AnkiImportSummary({ summary, plan, maxCards, onPlan, onAdjustOpened }: Props) {
  const total = estimate(summary, plan.deckIds);
  const unknown = summary.noteTypes.filter((nt) => nt.kind === 'other' && nt.noteCount > 0).length;
  const examples = summary.noteTypes
    .flatMap((nt) => {
      const m = plan.mappings.find((x) => x.noteTypeId === nt.id);
      return m ? nt.samples.map((s) => applyMapping(s, m, nt.kind)) : [];
    })
    .filter((p) => p.front || p.back)
    .slice(0, 3);

  return (
    <section className="flex flex-col gap-4" aria-label={t('importSummary.examplesTitle')}>
      <Card>
        <p className="m-0 font-display text-lg font-bold" data-testid="import-summary">
          {t('importSummary.card', { cards: total, media: summary.mediaCount, decks: plan.deckIds.length })}
        </p>
      </Card>
      {maxCards != null && total > maxCards ? (
        <Alert tone="watch" role="alert" title={t('importSummary.alertPlanLimitTitle')}>{t('importSummary.alertPlanLimit', { total, max: maxCards })}</Alert>
      ) : null}
      {unknown > 0 ? <Alert tone="watch" title={t('importSummary.alertUnknownNoteTypes', { n: unknown })} /> : null}
      {plan.deckIds.length === 0 ? <p role="alert" className="text-sm font-semibold text-review">{t('import.noDeck')}</p> : null}
      {examples.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-base font-bold">{t('importSummary.examplesTitle')}</h2>
          <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-3">
            {examples.map((e, i) => (
              <li key={i} className="flex flex-col gap-1.5 rounded-[16px] border border-border bg-surface p-3 text-sm">
                <span className="text-xs font-bold text-muted">{t('import.sample.colFront')}</span>
                <span className="line-clamp-3">{e.front || t('import.sample.empty')}</span>
                <span className="text-xs font-bold text-muted">{t('import.sample.colBack')}</span>
                <span className="line-clamp-3">{e.back || t('import.sample.empty')}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Accordion
        items={[
          {
            value: 'adjust',
            title: t('importAdjust.title'),
            content: (
              <Opened onOpen={onAdjustOpened}>
                <p className="mb-4">{t('importAdjust.desc')}</p>
                <AnkiPreview summary={summary} plan={plan} onChange={onPlan} />
              </Opened>
            ),
          },
        ]}
      />
    </section>
  );
}
