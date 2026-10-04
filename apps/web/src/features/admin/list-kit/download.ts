const day = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
/** "2 out" */
export const formatDay = (d: Date | string) => day.format(new Date(d)).replace('.', '');

export function downloadCsv(csv: string, name: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}
