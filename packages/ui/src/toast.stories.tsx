import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider, useToast } from './toast';
import { Button } from './button';

function Demo() {
  const { toast } = useToast();
  return <Button onClick={() => toast({ title: 'Mapa salvo', description: 'Há 1 segundo' })}>Disparar toast</Button>;
}

const meta = { title: 'Torph/Toast', component: ToastProvider } satisfies Meta<typeof ToastProvider>;
export default meta;
export const Default: StoryObj<typeof meta> = {
  args: { closeLabel: 'Fechar', viewportLabel: 'Avisos', children: null },
  render: (args) => <ToastProvider {...args}><Demo /></ToastProvider>,
};
