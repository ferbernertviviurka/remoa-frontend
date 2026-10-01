import type { Meta, StoryObj } from '@storybook/react';
import { RatingButton } from './rating-button';

const meta = { title: 'RatingButton', component: RatingButton, args: { onClick: () => undefined } } satisfies Meta<typeof RatingButton>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { label: 'Bom', hint: '4 dias', shortcut: '3' } };
export const Selected: S = { args: { label: 'Bom', hint: '4 dias', selected: true } };
export const Disabled: S = { args: { label: 'Fácil', hint: '9 dias', disabled: true } };
