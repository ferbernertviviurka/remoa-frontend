import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './card';

const meta = { title: 'Torph/Card', component: Card } satisfies Meta<typeof Card>;
export default meta;
type S = StoryObj<typeof meta>;
export const Map: S = { args: { children: 'Choque séptico' } };
export const Review: S = { args: { radius: 'review', children: 'Qual a primeira conduta?' } };
