// ponytail: o contrato do perfil ainda não tem fuso; o produto é BR, então America/Sao_Paulo. Trocar quando o perfil expuser `timezone`.
export const TZ = 'America/Sao_Paulo';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const hourIn = (now: Date) => Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: TZ }).format(now));
export const salutationKey = (hour: number) => (hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening') as 'morning' | 'afternoon' | 'evening';
export const todayIso = (now: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);

/** "Quinta-feira, 1 de outubro" */
export const eyebrowDate = (now: Date) => cap(new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).format(now));

/** Weekday name of a YYYY-MM-DD calendar date ("Sábado"). */
export const weekdayName = (iso: string) => cap(new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`)));
