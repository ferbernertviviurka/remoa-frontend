'use client';

import { useId, useState, type ComponentProps } from 'react';
import { fieldControl, focusRing, pressable } from './button-styles';
import { Icon } from './icons';

/**
 * PasswordInput: campo de senha com botão mostrar/ocultar.
 * Suporta erro, minLength/maxLength, autocomplete por prop.
 * Rótulo e aria-labels por prop (D-024, D-028). 'use client' (D-028).
 * Implementado independentemente de apps/web — não importa features/auth.
 */
export interface PasswordInputProps
  extends Omit<ComponentProps<'input'>, 'className' | 'id' | 'type'> {
  /** Visible label above the field */
  label: string;
  /** aria-label for the "show password" state of the toggle button */
  showAriaLabel: string;
  /** aria-label for the "hide password" state of the toggle button */
  hideAriaLabel: string;
  /** Error message displayed below the field; also adds aria-invalid */
  error?: string;
  /** Hint text displayed below the field when no error */
  hint?: string;
  /** autocomplete value for the underlying input */
  autocomplete?: 'new-password' | 'current-password' | 'off';
}

export function PasswordInput({
  label,
  showAriaLabel,
  hideAriaLabel,
  error,
  hint,
  autocomplete = 'current-password',
  minLength,
  maxLength,
  ...rest
}: PasswordInputProps) {
  const id = useId();
  const errorId = useId();
  const hintId = useId();
  const [visible, setVisible] = useState(false);

  const describedBy = [
    error ? errorId : null,
    hint && !error ? hintId : null,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold text-ink">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autocomplete}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          minLength={minLength}
          maxLength={maxLength}
          {...rest}
          className={[
            'h-[52px] pr-14',
            fieldControl,
            focusRing,
            error ? 'border-review hover:border-review focus-visible:border-review' : '',
          ].join(' ')}
        />
        <button
          type="button"
          aria-label={visible ? hideAriaLabel : showAriaLabel}
          aria-controls={id}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className={[
            'absolute right-2 top-1/2 -translate-y-1/2 flex h-[38px] w-[38px] items-center justify-center rounded-[12px] text-muted transition-colors duration-150 hover:text-ink',
            pressable,
            focusRing,
          ].join(' ')}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={20} />
        </button>
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm font-semibold text-review-text">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
