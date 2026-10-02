'use client';

import { clsx } from 'clsx';
import { focusRing } from '../button';
import './canvas.css';

/**
 * EdgeLabel v2: pílula do rótulo da conexão, posicionada pelo chamador no ponto médio (`route().lx/ly`, translate -50%/-50%).
 * Fundo branco, borda forte, 12px/600. Sem `onClick` é um `<span>` (decorativo para o foco); com `onClick` vira botão
 * (alvo de edição do rótulo) e exige `buttonLabel`. `dimmed` reduz a pílula no modo desafio. Sem className livre.
 */
export type EdgeLabelProps = {
  label: string;
  onClick?: () => void;
  buttonLabel?: string;
  dimmed?: boolean;
};

const pill = 'whitespace-nowrap rounded-pill border border-(--cv-border-strong) bg-surface px-2.5 py-[3px] text-xs font-semibold text-(--cv-ink-2)';

export function EdgeLabel({ label, onClick, buttonLabel, dimmed }: EdgeLabelProps) {
  const cls = clsx(pill, dimmed && 'opacity-35');
  if (!onClick) return <span className={cls}>{label}</span>;
  return (
    <button type="button" aria-label={buttonLabel} onClick={onClick} className={clsx(cls, focusRing)}>
      {label}
    </button>
  );
}
