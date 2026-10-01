import type { Meta, StoryObj } from '@storybook/react';
import { EdgeLabel } from './edge-label';

const meta = { title: 'Torph/EdgeLabel', component: EdgeLabel } satisfies Meta<typeof EdgeLabel>;
export default meta;
type S = StoryObj<typeof meta>;
const base = { emptyText: 'Sem rótulo não vira pergunta', inputLabel: 'Rótulo da conexão', onSave: () => undefined };
export const Labelled: S = { args: { ...base, label: 'pode evoluir para', buttonLabel: 'Editar rótulo: pode evoluir para' } };
export const Empty: S = { args: { ...base, label: null, buttonLabel: 'Adicionar rótulo' } };
