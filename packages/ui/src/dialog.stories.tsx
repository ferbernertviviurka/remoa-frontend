import type { Meta, StoryObj } from '@storybook/react';
import { Dialog } from './dialog';
import { Button } from './button';

const meta = { title: 'Torph/Dialog', component: Dialog } satisfies Meta<typeof Dialog>;
export default meta;
export const Default: StoryObj<typeof meta> = {
  args: { title: 'Excluir mapa?', description: 'Essa ação não pode ser desfeita.', closeLabel: 'Fechar', trigger: <Button>Abrir</Button>, children: 'Conteúdo' },
};
