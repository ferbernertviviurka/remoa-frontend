import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { Icon } from '../icons';
import './canvas.css';

/**
 * VerdictBox v2: veredito do grader dentro do painel do desafio. `verdict` = correct (primary) | partial (watch) | incorrect (review):
 * caixa de raio 20, borda 1,5 px e fundo no tom, selo maiúsculo (`label`, ex.: "Correto") + `headline`.
 * `matched` (✓) e `missing` (—) são linhas opcionais; `note` = procedência/revisor (12,5 px muted). `role="status"`
 * (anunciado ao aparecer; entra com `pop`, desligado em prefers-reduced-motion). Texto por props.
 */
export type VerdictBoxProps = {
  verdict: 'correct' | 'partial' | 'incorrect';
  label: string;
  headline: string;
  matched?: string;
  missing?: string;
  note?: string;
  children?: ReactNode;
};

const tone = {
  correct: { box: 'cv-pop border-steady bg-steady-bg', tag: 'bg-steady-text', fg: 'text-steady-text', icon: 'check' },
  partial: { box: 'cv-pop border-watch bg-watch-bg', tag: 'bg-watch-text', fg: 'text-watch-text', icon: 'minus' },
  incorrect: { box: 'cv-shake border-review bg-review-bg', tag: 'bg-review-text', fg: 'text-review-text', icon: 'close' },
} as const;

export function VerdictBox({ verdict, label, headline, matched, missing, note, children }: VerdictBoxProps) {
  const t = tone[verdict];
  return (
    <div role="status" data-verdict={verdict} className={clsx('flex flex-col gap-2.5 rounded-[20px] border-[1.5px] p-4', t.box)}>
      <p className="m-0 flex items-center gap-2.5">
        <span aria-hidden="true" className={clsx('relative flex size-7 shrink-0 items-center justify-center rounded-full text-white', t.tag, verdict === 'correct' && 'cv-burst')}>
          <Icon name={t.icon} size={16} />
        </span>
        <span className={clsx('rounded-[7px] px-2.5 py-1 text-xs font-bold uppercase tracking-[.08em] text-white', t.tag)}>{label}</span>
        <span className={clsx('font-bold', t.fg)}>{headline}</span>
      </p>
      {matched ? (
        <p className="m-0 flex items-center gap-2 text-sm text-(--cv-ink)"><Icon name="check" size={16} />{matched}</p>
      ) : null}
      {missing ? (
        <p className={clsx('m-0 flex items-center gap-2 text-sm font-semibold', t.fg)}><span aria-hidden="true" className="font-extrabold">—</span>{missing}</p>
      ) : null}
      {note ? <p className="m-0 text-[12.5px] leading-[1.45] text-muted">{note}</p> : null}
      {children}
    </div>
  );
}
