import type { ComponentProps } from 'react';

/**
 * StatusPill (F19): etiqueta de estado de chamado, usuário, pagamento, indicação, resultado de auditoria.
 * tone = ok (lilás) | warn (âmbar) | bad (laranja) | info (lilás escuro) | muted (cinza). Raio 999, 12,5 px/700 (`sm` = 12 px, usado nas listas).
 * A cor nunca é a única pista: o texto (`children`) sempre diz o estado.
 */
export type StatusTone = 'ok' | 'warn' | 'bad' | 'info' | 'muted';
export type StatusPillProps = Omit<ComponentProps<'span'>, 'className'> & { tone?: StatusTone; size?: 'md' | 'sm' };

export const statusToneClasses: Record<StatusTone, string> = {
  ok: 'bg-primary-tint text-primary-deep',
  warn: 'bg-watch-bg text-watch-text',
  bad: 'bg-review-bg text-review-text',
  info: 'bg-track text-primary-deep',
  muted: 'bg-unknown-bg text-unknown-text',
};

export function StatusPill({ tone = 'muted', size = 'md', ...rest }: StatusPillProps) {
  return <span {...rest} className={`inline-block whitespace-nowrap rounded-pill px-3 py-[3px] font-bold ${size === 'sm' ? 'text-xs' : 'text-[12.5px]'} ${statusToneClasses[tone]}`} />;
}
