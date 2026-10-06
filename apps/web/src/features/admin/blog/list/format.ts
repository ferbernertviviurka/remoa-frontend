const tz = 'America/Sao_Paulo';
const day = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric' });
const full = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const formatDay = (d: Date | string) => day.format(new Date(d));
export const formatDateTime = (d: Date | string) => full.format(new Date(d));
