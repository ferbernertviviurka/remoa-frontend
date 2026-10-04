'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { Icon } from '../icons';
import { focusRing } from '../button';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ChipInputProps {
  /** Rótulo do campo (invisível) */
  label: string;
  placeholder: string;
  addLabel: string;
  /** Rótulo do botão de remover de cada chip ("Remover d@x.com") */
  removeLabel: (email: string) => string;
  /** "Enviar 2 convites" */
  sendLabel: (count: number) => string;
  messages: { invalid: string; duplicate: string; max: string };
  /** E-mails (controlado) */
  emails: ReadonlyArray<string>;
  onEmailsChange: (emails: string[]) => void;
  onSend: (emails: string[]) => void;
  /** Máximo por envio (FR-7: 5) */
  max?: number;
  /** Enviando: desabilita o botão */
  sending?: boolean;
  /** Erro do envio ou limite diário (FR-24); `role="alert"`; com `onRetry`, mostra o botão de tentar de novo */
  error?: string;
  retryLabel?: string;
  onRetry?: () => void;
  /** Limite diário atingido: desabilita adicionar e enviar, mostra `error` */
  limitReached?: boolean;
}

/** ChipInput (F18 FR-7): campo de e-mail com validação, "Adicionar", chips removíveis (máx. 5) e "Enviar N convites". Enter adiciona. */
export function ChipInput({ label, placeholder, addLabel, removeLabel, sendLabel, messages, emails, onEmailsChange, onSend, max = 5, sending, error, retryLabel, onRetry, limitReached }: ChipInputProps) {
  const id = useId();
  const [value, setValue] = useState('');
  const [problem, setProblem] = useState('');

  function add() {
    const v = value.trim();
    if (!EMAIL.test(v)) return setProblem(messages.invalid);
    if (emails.some((e) => e.toLowerCase() === v.toLowerCase())) return setProblem(messages.duplicate);
    if (emails.length >= max) return setProblem(messages.max);
    onEmailsChange([...emails, v]);
    setValue('');
    setProblem('');
  }
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="flex gap-2.5">
        <label htmlFor={id} className="sr-only">{label}</label>
        <input id={id} type="email" value={value} placeholder={placeholder} disabled={limitReached} aria-invalid={problem ? true : undefined} aria-describedby={problem ? `${id}-p` : undefined}
          onChange={(e) => { setValue(e.target.value); setProblem(''); }} onKeyDown={key}
          className={['h-[54px] min-w-0 flex-1 rounded-[16px] border-[1.5px] bg-surface px-4 text-base text-ink', problem ? 'border-review' : 'border-border-strong', focusRing].join(' ')} />
        <button type="button" onClick={add} disabled={limitReached} className={['h-[54px] rounded-[16px] bg-primary-tint px-[22px] font-bold text-primary-deep disabled:opacity-50', focusRing].join(' ')}>{addLabel}</button>
      </span>
      {problem ? <span id={`${id}-p`} role="alert" className="text-[13px] font-semibold text-review-text">{problem}</span> : null}
      {emails.length > 0 ? (
        <>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {emails.map((e) => (
              <li key={e} className="pop flex h-10 items-center gap-1.5 rounded-pill bg-primary-tint pl-3.5 pr-1.5 text-sm font-bold text-primary-deep">
                {e}
                <button type="button" aria-label={removeLabel(e)} onClick={() => onEmailsChange(emails.filter((x) => x !== e))} className={['flex size-11 -my-0.5 items-center justify-center rounded-full text-primary-deep', focusRing].join(' ')}>
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" disabled={sending || limitReached} onClick={() => onSend([...emails])} className={['lift flex h-[52px] items-center gap-2.5 self-start rounded-btn bg-primary px-6 text-base font-extrabold text-on-primary disabled:opacity-60', focusRing].join(' ')}>
            <Icon name="send" size={18} />
            {sendLabel(emails.length)}
          </button>
        </>
      ) : null}
      {error ? (
        <span role="alert" className="flex flex-wrap items-center gap-3 rounded-[14px] bg-review-bg px-4 py-3 text-sm font-semibold text-review-text">
          {error}
          {onRetry && retryLabel && !limitReached ? <button type="button" onClick={onRetry} className={['min-h-11 rounded-[12px] px-2 font-bold underline', focusRing].join(' ')}>{retryLabel}</button> : null}
        </span>
      ) : null}
    </div>
  );
}
