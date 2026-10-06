import { clsx } from 'clsx';

/**
 * Stepper: passos do Novo mapa. `<ol aria-label>` obrigatório; `steps` rótulos, `current` índice (0-based) do passo atual.
 * Passo atual = pílula --panel-dark com número em círculo branco (`aria-current="step"`); feitos = tint com ✓ em círculo --primary; futuros = --track.
 * `doneLabel` (ex.: "concluído") entra só para leitor de tela nos passos feitos.
 */
export type StepperProps = { 'aria-label': string; steps: readonly string[]; current: number; doneLabel?: string };

// D-1212 fix (P-516 qa): flex-wrap/nowrap só de `sm` para cima; no celular o rótulo do passo atual quebra dentro da pílula (2 linhas cabem nos 40 px) e o stepper fica numa linha.
export function Stepper({ steps, current, doneLabel, ...rest }: StepperProps) {
  return (
    <ol {...rest} className="m-0 flex list-none items-center sm:flex-wrap gap-1.5 p-0 sm:gap-2.5">
      {steps.map((label, i) => {
        const done = i < current;
        const cur = i === current;
        return (
          <li
            key={label}
            aria-current={cur ? 'step' : undefined}
            data-state={cur ? 'current' : done ? 'done' : 'todo'}
            className={clsx(
              'flex h-10 items-center gap-2 rounded-pill sm:whitespace-nowrap pl-2 pr-4 text-sm font-bold',
              !cur && 'max-sm:w-10 max-sm:justify-center max-sm:p-0', // celular: só o passo atual mostra o rótulo
              cur ? 'bg-panel-dark text-on-dark' : done ? 'bg-primary-tint text-primary-deep' : 'bg-track text-muted',
            )}
          >
            <span
              aria-hidden="true"
              className={clsx(
                'flex size-[26px] items-center justify-center rounded-full text-[13px]',
                cur ? 'bg-surface text-panel-dark' : done ? 'bg-primary text-on-primary' : 'bg-surface text-muted',
              )}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={cur ? undefined : 'max-sm:sr-only'}>{label}</span>
            {done && doneLabel ? <span className="sr-only">{doneLabel}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
