import type { Meta, StoryObj } from '@storybook/react';
import { CopyField } from './copy-field';

const meta = { title: 'CopyField', component: CopyField } satisfies Meta<typeof CopyField>;
export default meta;
type S = StoryObj<typeof meta>;

export const Default: S = {
  args: {
    label: 'Link de compartilhamento',
    value: 'https://remoa.app/m/AbCdEf123',
    copyLabel: 'Copiar',
    copiedLabel: 'Copiado',
    onCopied: () => undefined,
  },
};
