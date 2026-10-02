export type MeterTone = 'ok' | 'warn' | 'full' | 'unlimited';

/** Tom do medidor: sem limite (`null`) = unlimited; >= 100% full (laranja); >= 80% warn (âmbar); senão ok (marca). Limite <= 0 conta como cheio. */
export function meterTone(used: number, limit: number | null): MeterTone {
  if (limit == null) return 'unlimited';
  if (limit <= 0) return 'full';
  const r = used / limit;
  return r >= 1 ? 'full' : r >= 0.8 ? 'warn' : 'ok';
}

/**
 * LimitMeter: medidor de uso (painel do plano, F14). Caixa de 12 × 14 px, raio 16, fundo --canvas; rótulo 13 px, valor Bricolage 800 20 px e barra de 6 px.
 * `label` e `value` já traduzidos ("Mapas", "1 de 2", "Ilimitados"). `used` + `limit` (null = ilimitado: barra cheia em tint, tom `unlimited`)
 * decidem cor e largura: >= 80% âmbar, 100% laranja. Barra decorativa (aria-hidden): o valor em texto carrega a informação. `fillx` 900 ms (desligado com Reduzir movimento).
 */
export type LimitMeterProps = { label: string; value: string; used: number; limit: number | null };

const bar = { ok: 'bg-primary', warn: 'bg-watch', full: 'bg-review', unlimited: 'bg-border-strong' } as const;
const text = { ok: 'text-ink', warn: 'text-watch-text', full: 'text-review-text', unlimited: 'text-ink' } as const;

export function LimitMeter({ label, value, used, limit }: LimitMeterProps) {
  const tone = meterTone(used, limit);
  const pct = limit == null ? 100 : limit <= 0 ? 100 : Math.min(100, Math.max(0, (used / limit) * 100));
  return (
    <div data-tone={tone} className="flex min-w-0 flex-col gap-1.5 rounded-[16px] bg-canvas px-3.5 py-3">
      <span className="text-[13px] text-muted">{label}</span>
      <span className={`font-display text-xl font-extrabold leading-[1.1] ${text[tone]}`}>{value}</span>
      <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-[3px] bg-border">
        <span data-testid="meter-fill" className={`fillx block h-1.5 rounded-[3px] ${bar[tone]}`} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}
