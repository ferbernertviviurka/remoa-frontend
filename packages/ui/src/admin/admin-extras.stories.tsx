import type { Meta, StoryObj } from '@storybook/react';
import { ExternalLinkButton, JsonDiff } from './admin-extras';

const meta = { title: 'Admin/Extras', component: JsonDiff } satisfies Meta<typeof JsonDiff>;
export default meta;
type S = StoryObj<typeof meta>;

export const Diff: S = { args: { beforeLabel: 'Antes', afterLabel: 'Depois', before: { status: 'paid', amount: 3990 }, after: { status: 'refunded', amount: 3990 }, emptyText: 'Sem alterações' } };
export const SoDepois: S = { args: { beforeLabel: 'Antes', afterLabel: 'Depois', before: null, after: { status: 'paid' }, emptyText: 'Sem alterações' } };
export const LinkExterno: S = { ...Diff, render: () => <ExternalLinkButton href="https://dashboard.stripe.com/payments/pi_1" newTabLabel="(abre em nova aba)">Abrir no Stripe</ExternalLinkButton> };
