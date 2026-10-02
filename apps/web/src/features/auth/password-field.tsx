'use client';

import { useState, type ComponentProps } from 'react';
import { t } from '@remoa/strings';
import { Icon, Input } from '@remoa/ui';

type Props = Omit<ComponentProps<typeof Input>, 'type'>;

/** Input de senha com mostrar/ocultar (alvo 44 px). O rótulo do botão não contém "senha" para não colidir com o do campo. */
export function PasswordField(props: Props) {
  const [shown, setShown] = useState(false);
  return (
    <span className="relative block">
      <Input {...props} type={shown ? 'text' : 'password'} />
      <button
        type="button"
        aria-label={t('auth.showChars')}
        aria-pressed={shown}
        onClick={() => setShown((v) => !v)}
        className="absolute bottom-1 right-1 flex size-11 items-center justify-center rounded-xl text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Icon name={shown ? 'eyeOff' : 'eye'} size={20} />
      </button>
    </span>
  );
}

/** Mensagem de erro de campo, ligada ao input por `id` (use em `aria-describedby`). */
export function FieldError({ id, children }: { id: string; children?: string | null }) {
  return children ? <p id={id} role="alert" className="m-0 -mt-2 text-sm font-semibold text-review-text">{children}</p> : null;
}
