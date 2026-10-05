'use client';

import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { focusRing } from '../button-styles';
import { Spinner } from '../spinner';

/**
 * RatingButton v2: nota FSRS no painel do desafio. `label` ("Bom") e `hint` ("volta em 4 dias"), alinhados à esquerda.
 * `suggested` = nota sugerida pelo grader (borda primária, fundo tint, texto primary-deep); `shortcut` = tecla anunciada.
 * Alvo >= 44 px. `RatingGroup` é o rótulo ("Como foi lembrar? Sugestão: Bom") + grade 2 colunas.
 */
export type RatingButtonProps = { label: string; hint: string; suggested?: boolean; shortcut?: string; onClick: () => void; disabled?: boolean; loading?: boolean };

export function RatingButton({ label, hint, suggested, shortcut, onClick, disabled, loading }: RatingButtonProps) {
  return (
    <button
      type="button"
      aria-keyshortcuts={shortcut}
      data-suggested={suggested ? 'true' : undefined}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      className={clsx(
        'flex min-h-[56px] cursor-pointer disabled:cursor-default disabled:opacity-50 data-[loading=true]:opacity-100 flex-col gap-0.5 rounded-[14px] border-[1.5px] px-3 py-2.5 text-left',
        focusRing,
        suggested ? 'border-primary bg-primary-tint' : 'border-border bg-surface hover:border-primary',
      )}
    >
      <span className={clsx('inline-flex items-center gap-2 text-sm font-bold', suggested ? 'text-primary-deep' : 'text-(--cv-ink)')}>{loading ? <Spinner /> : null}{label}</span>
      <span className="text-xs text-muted">{hint}</span>
    </button>
  );
}

export function RatingGroup({ label, children, busy }: { label: string; children: ReactNode; busy?: boolean }) {
  return (
    <div role="group" aria-label={label} aria-busy={busy || undefined} className="flex flex-col gap-2">
      <span aria-hidden="true" className="text-xs font-bold uppercase tracking-[.12em] text-muted">{label}</span>
      <div className="grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}
