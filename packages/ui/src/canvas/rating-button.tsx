'use client';

import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { focusRing } from '../button-styles';

/**
 * RatingButton v2: nota FSRS no painel do desafio. `label` ("Bom") e `hint` ("volta em 4 dias"), alinhados à esquerda.
 * `suggested` = nota sugerida pelo grader (borda primária, fundo tint, texto primary-deep); `shortcut` = tecla anunciada.
 * Alvo >= 44 px. `RatingGroup` é o rótulo ("Como foi lembrar? Sugestão: Bom") + grade 2 colunas.
 */
export type RatingButtonProps = { label: string; hint: string; suggested?: boolean; shortcut?: string; onClick: () => void };

export function RatingButton({ label, hint, suggested, shortcut, onClick }: RatingButtonProps) {
  return (
    <button
      type="button"
      aria-keyshortcuts={shortcut}
      data-suggested={suggested ? 'true' : undefined}
      onClick={onClick}
      className={clsx(
        'flex min-h-[56px] cursor-pointer flex-col gap-0.5 rounded-[14px] border-[1.5px] px-3 py-2.5 text-left',
        focusRing,
        suggested ? 'border-primary bg-primary-tint' : 'border-border bg-surface hover:border-primary',
      )}
    >
      <span className={clsx('text-sm font-bold', suggested ? 'text-primary-deep' : 'text-(--cv-ink)')}>{label}</span>
      <span className="text-xs text-muted">{hint}</span>
    </button>
  );
}

export function RatingGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span aria-hidden="true" className="text-xs font-bold uppercase tracking-[.12em] text-muted">{label}</span>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}
