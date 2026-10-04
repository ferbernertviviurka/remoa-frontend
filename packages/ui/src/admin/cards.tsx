import type { ComponentProps, ElementType, ReactNode } from 'react';
import { focusRing } from '../button';
import { Icon, type IconName } from '../icons';

export type SparkTone = 'primary' | 'soft' | 'warn';
const sparkBar: Record<SparkTone, string> = { primary: 'bg-primary', soft: 'bg-steady-on-dark', warn: 'bg-watch' };

/**
 * StatCard (F19 FR-13): KPI da visão geral. Cartão de raio 28, padding 22 × 24: ícone em quadro de 36 px + `label`, `delta` (variação no período) em pílula,
 * `value` em Bricolage 46 px/800 (números tabulares) e mini-barras (`bars`, 12 valores de 0 a 1; 34 px de altura; crescem em 800 ms, 40 ms entre barras; `aria-hidden`).
 * `index` define a cascata de entrada (450 ms, 70 ms entre cartões). `tone="warn"` (âmbar) para o que pede atenção (chamados abertos). O valor é texto: o leitor lê "rótulo, valor, variação".
 */
export type StatCardProps = {
  label: string;
  value: string;
  icon: IconName;
  delta?: string;
  tone?: 'brand' | 'warn';
  sparkTone?: SparkTone;
  bars?: ReadonlyArray<number>;
  index?: number;
};

export function StatCard({ label, value, icon, delta, tone = 'brand', sparkTone = 'primary', bars = [], index = 0 }: StatCardProps) {
  const warn = tone === 'warn';
  return (
    <article style={{ animationDelay: `${index * 70}ms` }} className="slide box-border flex flex-col gap-2.5 rounded-[28px] border border-border bg-surface px-6 py-[22px]">
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2.5 font-bold text-muted">
          <span aria-hidden="true" className={`flex size-9 items-center justify-center rounded-[12px] ${warn ? 'bg-watch-bg text-watch-text' : 'bg-primary-tint text-primary-deep'}`}><Icon name={icon} size={20} /></span>
          {label}
        </span>
        {delta ? <span className={`rounded-pill px-2.5 py-[3px] text-[12.5px] font-bold ${warn ? 'bg-watch-bg text-watch-text' : 'bg-primary-tint text-primary-deep'}`}>{delta}</span> : null}
      </span>
      <span className="font-display text-[46px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{value}</span>
      <span aria-hidden="true" className="flex h-[34px] items-end gap-1">
        {bars.map((b, i) => (
          <span key={i} style={{ height: `${Math.max(4, Math.round(Math.min(1, Math.max(0, b)) * 34))}px`, animationDelay: `${i * 40}ms` }} className={`growy flex-1 rounded-[3px] ${sparkBar[sparkTone]}`} />
        ))}
      </span>
    </article>
  );
}

/**
 * BarChart (F19 FR-13): "Crescimento no período". Duas séries por dia (`a` = primária, `b` = suave), barras de até 14 px, 230 px de altura,
 * crescem em 800 ms com 18 ms entre barras. `animationKey` (ex.: o período) remonta as barras e repete a animação ao trocar. O gráfico é `role="img"` com `aria-label`
 * (resumo em texto no rótulo; a tabela de dados fica a cargo de quem usa, se necessário). `legend` = [rótulo de a, rótulo de b]; `startLabel`/`endLabel` = "há 30 dias" / "hoje".
 */
export type BarChartProps = {
  title: string;
  'aria-label': string;
  series: ReadonlyArray<{ a: number; b: number }>;
  legend: readonly [string, string];
  startLabel: string;
  endLabel: string;
  animationKey?: string;
};

export function BarChart({ title, series, legend, startLabel, endLabel, animationKey, ...rest }: BarChartProps) {
  const max = Math.max(1, ...series.map((s) => Math.max(s.a, s.b)));
  return (
    <section aria-label={title} className="box-border flex flex-col gap-4 rounded-[30px] border border-border bg-surface px-[26px] py-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 font-display text-[22px] font-extrabold tracking-[-0.02em]">{title}</h2>
        <span className="flex gap-4 text-[13px] font-semibold text-muted">
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-3 rounded bg-primary" />{legend[0]}</span>
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-3 rounded bg-steady-on-dark" />{legend[1]}</span>
        </span>
      </div>
      <div key={animationKey} role="img" aria-label={rest['aria-label']} className="flex h-[230px] items-end gap-1 border-b border-border pt-2.5">
        {series.map((s, i) => (
          <span key={i} className="flex h-full min-w-0 flex-1 items-end justify-center gap-0.5">
            <span style={{ height: `${(s.a / max) * 100}%`, animationDelay: `${i * 18}ms` }} className="growy max-w-3.5 flex-1 rounded-t bg-primary" />
            <span style={{ height: `${(s.b / max) * 100}%`, animationDelay: `${i * 18}ms` }} className="growy max-w-3.5 flex-1 rounded-t bg-steady-on-dark" />
          </span>
        ))}
      </div>
      <span className="flex justify-between text-[12.5px] text-muted"><span>{startLabel}</span><span>{endLabel}</span></span>
    </section>
  );
}

/** AdminSection: cartão de seção (raio 30, borda) com `title` (h2 22 px) e `action` opcional à direita (ex.: link "Ver todas"); o corpo costuma ser uma DataTable `flush`. */
export type AdminSectionProps = { title: string; action?: ReactNode; children: ReactNode };

export function AdminSection({ title, action, children }: AdminSectionProps) {
  return (
    <section aria-label={title} className="box-border overflow-hidden rounded-[30px] border border-border bg-surface">
      <div className="flex items-center justify-between px-6 pb-3 pt-[22px]">
        <h2 className="m-0 font-display text-[22px] font-extrabold tracking-[-0.02em]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * AttentionItem (F19 FR-13): linha de "Precisa de atenção": contador em círculo, texto e seta; é um link para a fila (raio 18). tone = warn | bad | info.
 * Elemento padrão <a>; passe `as` para next/link.
 */
export type AttentionItemProps = Omit<ComponentProps<'a'>, 'className' | 'children'> & { count: number; text: string; tone?: 'warn' | 'bad' | 'info'; as?: ElementType };
const attTone = { warn: 'bg-watch-bg text-watch-text', bad: 'bg-review-bg text-review-text', info: 'bg-primary-tint text-primary-deep' } as const;

export function AttentionItem({ count, text, tone = 'warn', as: As = 'a', ...rest }: AttentionItemProps) {
  return (
    <As {...rest} className={`lift flex items-center gap-3.5 rounded-[18px] p-3.5 text-ink no-underline ${attTone[tone]} ${focusRing}`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface font-display text-lg font-extrabold">{count}</span>
      <span className="flex-1 text-[14.5px] font-semibold leading-[1.35] text-ink">{text}</span>
      <Icon name="right" size={20} />
    </As>
  );
}

/** SummaryChip (F19 FR-14/16/17): resumo da tabela ("12 contas", "9 ativas"). tone = brand | ok | warn | bad. 44 px, raio 999; o número em Bricolage 19 px. */
export type SummaryChipProps = { value: string | number; label: string; tone?: 'brand' | 'ok' | 'warn' | 'bad' };
const sumTone = { brand: 'bg-track text-primary-deep', ok: 'bg-chip text-primary-deep', warn: 'bg-watch-bg text-watch-text', bad: 'bg-review-bg text-review-text' } as const;

export function SummaryChip({ value, label, tone = 'ok' }: SummaryChipProps) {
  return (
    <span className={`flex h-11 items-center gap-2.5 rounded-pill px-[18px] text-sm font-bold ${sumTone[tone]}`}>
      <span className="font-display text-[19px] font-extrabold">{value}</span>
      {label}
    </span>
  );
}

/**
 * FilterGroup: rótulo + chips de filtro de uma dimensão ("Plano", "Status"). `role="group"` com o rótulo; cada opção é um botão `aria-pressed`.
 * Escolha única; `value` é o `value` da opção marcada. Altura 40 px (mock; alvo de toque ≥ 44 px vem do `min-h-11` no celular).
 */
export type FilterGroupProps = { label: string; options: ReadonlyArray<{ value: string; label: string }>; value: string; onValueChange: (value: string) => void };

export function FilterGroup({ label, options, value, onValueChange }: FilterGroupProps) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span aria-hidden="true" className="text-[13px] font-bold text-muted">{label}</span>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onValueChange(o.value)} className={`h-10 cursor-pointer rounded-pill border-[1.5px] px-3.5 text-[13.5px] font-bold transition-colors duration-200 max-lg:h-11 ${on ? 'border-primary bg-primary-tint text-primary-deep' : 'border-border-strong bg-surface text-ink hover:border-primary'} ${focusRing}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
