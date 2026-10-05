const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlRound = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const int = new Intl.NumberFormat('pt-BR');
const rel = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
const time = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

export const formatCount = (n: number) => int.format(n);
export const formatBRL = (cents: number) => brl.format(cents / 100);
/** "+312" / "−2" / "+R$ 749" */
export const formatDelta = (n: number, money = false) => `${n < 0 ? '−' : '+'}${money ? brlRound.format(Math.abs(n) / 100) : int.format(Math.abs(n))}`;
/** "+8%" / "−3%" */
export const formatPct = (n: number) => `${n < 0 ? '−' : '+'}${int.format(Math.abs(n))}%`;
export const formatTime = (d: Date | string) => time.format(new Date(d));
/** "há 3 dias", "ontem", "há 5 minutos" */
export function formatWhen(iso: Date | string, now = Date.now()) {
  const s = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, size] of [['day', 86400], ['hour', 3600], ['minute', 60]] as const) {
    if (Math.abs(s) >= size) return rel.format(Math.round(s / size), unit);
  }
  return rel.format(0, 'second');
}
