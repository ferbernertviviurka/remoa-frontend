import { t } from '@remoa/strings/admin';

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
export const formatDateTime = (iso: Date | string) => dateTime.format(new Date(iso));

/** "Mostrando 1–25 de 112" for the DataTable pagination. */
export const pageSummary = (key: 'admin.payments.pagination.summary' | 'admin.audit.pagination.summary', p: { page: number; pageSize: number; total: number }) =>
  t(key, { from: p.total === 0 ? 0 : (p.page - 1) * p.pageSize + 1, to: Math.min(p.page * p.pageSize, p.total), total: p.total });

/** Server-validated list params from the URL: unknown values are dropped (never forwarded as a 422). */
export const oneOf = <T extends string>(v: string | undefined, list: readonly T[]): T | undefined => list.find((x) => x === v);
export const pageOfParam = (v: string | undefined) => Math.max(1, Math.floor(Number(v)) || 1);
