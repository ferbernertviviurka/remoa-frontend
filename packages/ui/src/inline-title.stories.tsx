import type { Meta, StoryObj } from '@storybook/react';
import { InlineTitle } from './inline-title';

const meta = { title: 'Torph/InlineTitle', component: InlineTitle } satisfies Meta<typeof InlineTitle>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { value: 'Sepse', inputLabel: 'Nome do mapa', editHint: 'Renomear mapa', onSave: () => undefined, maxLength: 120 } };
