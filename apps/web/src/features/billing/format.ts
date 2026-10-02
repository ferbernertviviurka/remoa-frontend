import { t } from '@remoa/strings';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (n: number) => brl.format(n).replace(/ /g, ' ');

const count = new Intl.NumberFormat('pt-BR');
/** `null` = unlimited. */
export const formatLimit = (n: number | null) => (n === null ? t('billing.pricing.unlimited') : count.format(n));

export const formatDate = (d: Date | string) => new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
