import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './card';
import { Eyebrow } from './eyebrow';
import { Tag } from './tag';

const meta = { title: 'Card', component: Card } satisfies Meta<typeof Card>;
export default meta;
type S = StoryObj<typeof meta>;
export const Map: S = {
  render: () => (
    <div className="max-w-sm">
      <Card>
        <div className="flex flex-col gap-2">
          <Eyebrow>Mapa</Eyebrow>
          <p className="font-display text-lg font-bold">Choque séptico</p>
          <Tag tone="review">Revisitar</Tag>
        </div>
      </Card>
    </div>
  ),
};
export const Review: S = {
  render: () => (
    <div className="max-w-sm">
      <Card radius="review">
        <p className="font-display text-lg font-bold">Qual a primeira conduta?</p>
      </Card>
    </div>
  ),
};
