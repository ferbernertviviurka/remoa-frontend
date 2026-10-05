import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../button';
import { Input } from '../input';
import { FullSheet } from './full-sheet';

/**
 * Regra de uso (F23 FR-14): editor em folha cheia sobre o mapa (a 52 px do topo, mapa esmaecido por trás). Sem X: Cancelar
 * no `start`, Salvar no `end`; Esc chama `onOpenChange(false)`.
 */
const meta = { title: 'Sheet/FullSheet', component: FullSheet, parameters: { viewport: { defaultViewport: 'mobile1' } } } satisfies Meta<typeof FullSheet>;
export default meta;
type S = StoryObj<typeof meta>;

export const EditorDeCard: S = {
  args: {
    open: true,
    title: 'Novo conceito',
    start: <Button variant="quiet">Cancelar</Button>,
    end: <Button>Salvar</Button>,
    children: (
      <div className="flex flex-col gap-4 px-[18px] pt-5">
        <Input label="Título" defaultValue="Lactato na sepse" />
        <Input label="Fonte" defaultValue="Surviving Sepsis Campaign 2021" />
      </div>
    ),
  },
};
