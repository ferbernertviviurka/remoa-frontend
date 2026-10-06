'use client';

import type { CaseStage } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { IconButton, Tooltip } from '@remoa/ui';

const t = withStrings({ cards: more.cards });

const help = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.6" stroke="currentColor" strokeWidth="1.6" />
    <path d="M6.2 6.3a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="8" cy="11.6" r=".9" fill="currentColor" />
  </svg>
);

/**
 * G06: a case stage label with its "what is this / what filling it changes" tooltip (same text as the map node).
 * The tooltip opens on hover and on keyboard focus of the help button (Radix), which is also how it is announced.
 */
export function CaseStageHelp({ stage, filled, iconOnly }: { stage: CaseStage; filled?: boolean; /** next to a field that already shows the label */ iconOnly?: boolean }) {
  const label = t(`cards.case.stage.${stage}`);
  const button = (
    <Tooltip label={t(`cards.case.hint.${stage}`)}>
      <IconButton aria-label={t('cards.case.hintLabel', { stage: label })}>{help}</IconButton>
    </Tooltip>
  );
  if (iconOnly) return button;
  return (
    <span className="flex items-center gap-1">
      <span className={`text-xs font-bold uppercase tracking-[.1em] ${filled === false ? 'text-muted' : 'text-primary-deep'}`}>{label}</span>
      {button}
    </span>
  );
}
