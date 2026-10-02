import type { Meta, StoryObj } from '@storybook/react';
import { PasswordInput } from './password-input';

const meta = { title: 'PasswordInput', component: PasswordInput } satisfies Meta<typeof PasswordInput>;
export default meta;
type S = StoryObj<typeof meta>;

export const Default: S = {
  args: {
    label: 'Senha',
    placeholder: '••••••••',
    showAriaLabel: 'Mostrar senha',
    hideAriaLabel: 'Ocultar senha',
    autocomplete: 'current-password',
  },
};

export const WithError: S = {
  args: {
    label: 'Senha',
    placeholder: '••••••••',
    showAriaLabel: 'Mostrar senha',
    hideAriaLabel: 'Ocultar senha',
    error: 'A senha é obrigatória.',
    autocomplete: 'new-password',
  },
};

export const WithHint: S = {
  args: {
    label: 'Senha',
    placeholder: '••••••••',
    showAriaLabel: 'Mostrar senha',
    hideAriaLabel: 'Ocultar senha',
    hint: 'De 6 a 64 caracteres.',
    autocomplete: 'new-password',
    minLength: 6,
    maxLength: 64,
  },
};

export const NewPassword: S = {
  args: {
    label: 'Nova senha',
    placeholder: '••••••••',
    showAriaLabel: 'Mostrar senha',
    hideAriaLabel: 'Ocultar senha',
    autocomplete: 'new-password',
    hint: 'De 6 a 64 caracteres.',
    minLength: 6,
    maxLength: 64,
  },
};
