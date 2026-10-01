import type { Meta, StoryObj } from '@storybook/react';
import { Dialog } from './dialog';
import { Button } from './button';

const meta = { title: 'Dialog', component: Dialog } satisfies Meta<typeof Dialog>;
export default meta;
export const Default: StoryObj<typeof meta> = {
  args: { title: 'Excluir mapa?', description: 'Essa ação não pode ser desfeita.', closeLabel: 'Fechar', trigger: <Button>Abrir</Button>, children: 'Conteúdo' },
};
export const FullScreen: StoryObj<typeof meta> = {
  args: { title: 'Máscaras de Coração', description: 'Editor em tela cheia.', closeLabel: 'Fechar', size: 'full', trigger: <Button>Abrir</Button>, children: 'Conteúdo' },
};
