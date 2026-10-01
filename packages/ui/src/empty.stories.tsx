import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Empty } from './empty';

const meta = { title: 'Empty', component: Empty } satisfies Meta<typeof Empty>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {
  args: { title: 'Nenhum mapa ainda', description: 'Crie o primeiro mapa para começar a revisar.' },
  render: (args) => <Empty {...args} action={<Button>Criar mapa</Button>} />,
};
