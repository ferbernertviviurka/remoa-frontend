import { Icon } from '../icons';
import { statusStyle, type ReferralStatus } from './status';

export interface ProgressTrackerProps {
  /** Nome da lista ("Seu progresso") */
  'aria-label': string;
  steps: ReadonlyArray<{ id: string; label: string }>;
  /** Passo atual, a partir de 1. Os anteriores ficam concluídos; `steps.length + 1` conclui todos. */
  current: number;
  /** Texto só para leitor de tela nos passos concluídos ("concluído") */
  doneLabel: string;
}

/** ProgressTracker (F18 FR-14): 3 cartões do convite (criar a conta, criar o primeiro mapa, os dois ganham). Cor muda em 400 ms; concluído mostra check. */
export function ProgressTracker({ steps, current, doneLabel, ...rest }: ProgressTrackerProps) {
  return (
    <ol aria-label={rest['aria-label']} className="m-0 grid list-none grid-cols-3 gap-3 p-0 max-sm:grid-cols-1">
      {steps.map((s, i) => {
        const n = i + 1;
        const done = current > n;
        const cur = current === n;
        return (
          <li key={s.id} aria-current={cur ? 'step' : undefined} className={['flex flex-col gap-2 rounded-[22px] border-[1.5px] p-4 transition-[background-color,border-color] duration-[400ms]', done || cur ? 'border-primary bg-primary-tint' : 'border-border bg-surface'].join(' ')}>
            <span aria-hidden="true" className={['flex size-8 items-center justify-center rounded-full text-sm font-extrabold', done ? 'bg-primary text-on-primary' : cur ? 'bg-primary-deep text-on-primary' : 'bg-chip text-muted'].join(' ')}>
              {done ? <Icon name="check" size={16} /> : n}
            </span>
            <span className="text-[15px] font-bold leading-snug">{s.label}{done ? <span className="sr-only"> ({doneLabel})</span> : null}</span>
          </li>
        );
      })}
    </ol>
  );
}

export interface ProgressTimelineProps {
  steps: ReadonlyArray<{ id: string; label: string; done: boolean }>;
  /** Cor do marcador dos passos concluídos */
  status: ReferralStatus;
  /** Texto só para leitor de tela nos passos concluídos */
  doneLabel: string;
}

/** ProgressTimeline (F18 FR-11): linha do tempo de 3 passos do detalhe do amigo (convite enviado, criou a conta, criou o primeiro mapa). */
export function ProgressTimeline({ steps, status, doneLabel }: ProgressTimelineProps) {
  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {steps.map((s) => (
        <li key={s.id} className={['flex items-center gap-2.5 text-sm', s.done ? 'font-bold text-ink' : 'font-medium text-muted'].join(' ')}>
          <span aria-hidden="true" className={['flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 text-on-primary transition-[background-color] duration-[400ms]', s.done ? `border-transparent ${statusStyle[status].step}` : 'border-border-strong bg-surface'].join(' ')}>
            {s.done ? <Icon name="check" size={12} /> : null}
          </span>
          {s.label}
          {s.done ? <span className="sr-only"> ({doneLabel})</span> : null}
        </li>
      ))}
    </ol>
  );
}

/** SuccessRing (F18 FR-14): anel que se desenha (900 ms) e check (500 ms, atraso 750 ms) do cadastro concluído. Decorativo. */
export function SuccessRing() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <circle cx="48" cy="48" r="34" fill="var(--primary-tint)" />
      <circle className="draw" cx="48" cy="48" r="42" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" transform="rotate(-90 48 48)" />
      <path className="drawc" d="M34 49l10 10 19-23" stroke="var(--primary-deep)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
