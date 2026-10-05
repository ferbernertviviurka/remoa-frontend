'use client';

import { useId, type ReactNode } from 'react';
import * as RT from '@radix-ui/react-tabs';
import type { ComponentType } from 'react';
import { focusRing, pressable } from '../button-styles';
import { Icon } from '../icons';
import { Logo } from '../logo';

/** Selo EM BREVE com brilho contínuo (3 s). `tone="dark"` (aviso) é chapado em panel-dark; o padrão é damasco sobre fundo escuro. */
export function SoonSeal({ children, tone = 'apricot' }: { children: ReactNode; tone?: 'apricot' | 'dark' }) {
  const look = tone === 'dark' ? 'bg-panel-dark text-white' : 'bg-apricot text-panel-dark';
  return (
    <span className={`relative inline-flex items-center overflow-hidden rounded-pill px-3.5 py-1 text-xs font-extrabold tracking-[.06em] ${look}`}>
      {children}
      <span aria-hidden="true" className="st-shine pointer-events-none absolute inset-0" />
    </span>
  );
}

/** Aviso permanente da Loja (FR-1): `role="status"`, sem botão de fechar. */
export function SoonBanner({ text, seal }: { text: string; seal: string }) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-3.5 rounded-[18px] border-[1.5px] border-watch-on-dark bg-watch-bg px-[18px] py-3 text-watch-text">
      <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-surface"><Icon name="clock" size={20} /></span>
      <span className="min-w-0 flex-1 font-bold">{text}</span>
      <SoonSeal tone="dark">{seal}</SoonSeal>
    </div>
  );
}

export type StatusItem = { title: string; desc: string; chip: string; now?: boolean };

/** "Em que pé estamos": etapas numeradas; a etapa `now` fica destacada e pulsa. Nunca recebe datas. */
export function StatusTrack({ items }: { items: ReadonlyArray<StatusItem> }) {
  return (
    <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
      {items.map((it, i) => (
        <li
          key={it.title}
          style={{ animationDelay: `${i * 90}ms` }}
          className={`slide flex flex-col gap-2 rounded-list border p-5 ${it.now ? 'st-ring border-primary bg-primary-tint' : 'border-border bg-surface'}`}
        >
          <span className="flex items-center justify-between">
            <span className={`flex size-8 items-center justify-center rounded-full text-sm font-extrabold ${it.now ? 'bg-primary text-on-primary' : 'bg-track text-muted'}`}>{i + 1}</span>
            <span className={`rounded-pill px-3 py-1 text-xs font-bold ${it.now ? 'bg-primary text-on-primary' : 'bg-track text-muted'}`}>{it.chip}</span>
          </span>
          <span className="font-display text-lg font-extrabold">{it.title}</span>
          <span className="text-sm text-muted">{it.desc}</span>
        </li>
      ))}
    </ol>
  );
}

export type StoreTab = { value: string; label: string; content: ReactNode };

/** Abas "Quero comprar" / "Quero vender" com marcador deslizante (400 ms). Teclado: setas, Home e End (Radix). */
export function StoreTabs({ label, tabs, value, onValueChange }: { label: string; tabs: ReadonlyArray<StoreTab>; value: string; onValueChange: (v: string) => void }) {
  const index = Math.max(0, tabs.findIndex((x) => x.value === value));
  return (
    <RT.Root value={value} onValueChange={onValueChange} className="flex flex-col gap-5">
      <RT.List aria-label={label} className="relative grid w-fit grid-flow-col auto-cols-fr rounded-[16px] bg-track p-1">
        <span
          aria-hidden="true"
          style={{ width: `calc((100% - 8px) / ${tabs.length})`, transform: `translateX(${index * 100}%)` }}
          className="absolute left-1 top-1 h-[calc(100%-8px)] rounded-[12px] bg-surface shadow-card transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        />
        {tabs.map((tab) => (
          <RT.Trigger key={tab.value} value={tab.value} className={`relative z-10 min-h-11 rounded-[12px] px-5 text-sm font-bold text-muted data-[state=active]:text-primary-deep ${focusRing}`}>
            {tab.label}
          </RT.Trigger>
        ))}
      </RT.List>
      {tabs.map((tab) => (
        <RT.Content key={tab.value} value={tab.value} className="outline-none">
          {tab.content}
        </RT.Content>
      ))}
    </RT.Root>
  );
}

export type StepItem = { title: string; desc: string };

/** Três passos numerados, entrando em cascata de 90 ms. */
export function StepList({ steps }: { steps: ReadonlyArray<StepItem> }) {
  return (
    <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
      {steps.map((s, i) => (
        <li key={s.title} style={{ animationDelay: `${i * 90}ms` }} className="slide flex flex-col gap-2 rounded-list border border-border bg-surface p-5">
          <span className="font-display text-sm font-extrabold text-primary">{`0${i + 1}`}</span>
          <h3 className="m-0 font-display text-lg font-extrabold">{s.title}</h3>
          <p className="m-0 text-sm text-muted">{s.desc}</p>
        </li>
      ))}
    </ol>
  );
}

/** Valor em centavos de cada parte. O vendedor arredonda; a plataforma fica com o resto, então a soma é sempre o total. */
export function splitCents(priceReais: number, sellerPct: number) {
  const total = Math.round(priceReais * 100);
  const seller = Math.round((total * sellerPct) / 100);
  return { total, seller, platform: total - seller };
}

export type SplitSimulatorProps = {
  priceLabel: string;
  /** Valor em reais (R$ 19 a R$ 199, passo 5). */
  price: number;
  onPriceChange: (price: number) => void;
  /** Vem de `storeConfig.splitSellerPct`; nunca escrito no código ou nos textos fixos. */
  sellerPct: number;
  formatMoney: (reais: number) => string;
  labels: { buyer: string; payment: string; you: string; brand: string; seller: string; platform: string; sellerLegend: string; platformLegend: string; note: string };
  min?: number;
  max?: number;
  step?: number;
};

/** Fluxo Comprador, Pagamento, Vendedor e plataforma com pontos viajando, controle de preço e barra de divisão. */
export function SplitSimulator({ priceLabel, price, onPriceChange, sellerPct, formatMoney, labels, min = 19, max = 199, step = 5 }: SplitSimulatorProps) {
  const id = useId();
  const { seller, platform } = splitCents(price, sellerPct);
  const node = 'flex size-11 items-center justify-center sm:size-14 rounded-full bg-navy text-xs font-extrabold text-white';
  return (
    <div className="grid gap-6 rounded-list border border-border bg-surface p-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="flex min-h-48 items-center justify-between gap-1.5 sm:gap-3">
        <span aria-hidden="true" className="flex flex-col items-center gap-1 text-xs font-bold sm:text-sm"><span className={node}><Icon name="user" size={24} /></span>{labels.buyer}</span>
        <span aria-hidden="true" className="relative h-0.5 min-w-2 flex-1 bg-border-strong"><span className="st-dot absolute -top-[5px] size-3 rounded-full bg-primary" /></span>
        <span aria-hidden="true" className="flex flex-col items-center gap-1 text-xs font-bold sm:text-sm"><span className={node}><Icon name="pix" size={24} /></span>{labels.payment}</span>
        <svg aria-hidden="true" viewBox="0 0 56 136" className="h-[136px] w-10 shrink-0 sm:w-14" fill="none" strokeWidth="2" strokeLinecap="round">
          <defs>
            <marker id={`${id}-a`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1L7 4L1 7Z" className="fill-primary" /></marker>
            <marker id={`${id}-b`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1L7 4L1 7Z" className="fill-navy" /></marker>
          </defs>
          <path d="M2 68C24 68 24 28 50 28" className="st-flow stroke-primary" markerEnd={`url(#${id}-a)`} />
          <path d="M2 68C24 68 24 108 50 108" className="st-flow stroke-navy" markerEnd={`url(#${id}-b)`} />
        </svg>
        <span className="flex flex-col gap-6">
          <span className="flex items-center gap-1.5 sm:gap-2"><span aria-hidden="true" className={`${node} !bg-primary`}>{labels.you}</span><span className="flex flex-col leading-tight"><span className="font-display text-lg font-extrabold tabular-nums sm:text-xl">{formatMoney(seller / 100)}</span><span className="text-xs text-muted">{labels.seller}</span></span></span>
          <span className="flex items-center gap-1.5 sm:gap-2"><span aria-hidden="true" className={node}><Logo onDark size={28} /></span><span className="flex flex-col leading-tight"><span className="font-display text-lg font-extrabold tabular-nums sm:text-xl">{formatMoney(platform / 100)}</span><span className="text-xs text-muted">{labels.platform}</span></span></span>
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <label htmlFor={id} className="font-bold">{priceLabel}</label>
          <output htmlFor={id} className="font-display text-2xl font-extrabold tabular-nums">{formatMoney(price)}</output>
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={price}
          aria-valuetext={formatMoney(price)}
          onChange={(e) => onPriceChange(Number(e.target.value))}
          className={`h-11 w-full accent-primary ${focusRing}`}
        />
        <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-pill bg-track">
          <span className="bg-primary transition-[flex-basis] duration-500" style={{ flexBasis: `${sellerPct}%` }} />
          <span className="bg-navy" style={{ flexBasis: `${100 - sellerPct}%` }} />
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-semibold">
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full bg-primary" />{labels.sellerLegend}</span>
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-full bg-navy" />{labels.platformLegend}</span>
        </div>
        <p className="m-0 text-[13px] text-muted">{labels.note}</p>
      </div>
    </div>
  );
}

export type LockedListingCardProps = {
  exampleLabel: string;
  title: string;
  author: string;
  badge?: string;
  meta: string;
  rating: string;
  ratingLabel: string;
  priceMask: string;
  priceLabel: string;
  delayMs?: number;
};

/** Cartão da prévia travada: `aria-disabled`, sem foco nem clique, preço borrado. Autores e notas são fictícios. */
export function LockedListingCard({ exampleLabel, title, author, badge, meta, rating, ratingLabel, priceMask, priceLabel, delayMs = 0 }: LockedListingCardProps) {
  return (
    <div aria-disabled="true" style={{ animationDelay: `${delayMs}ms` }} className="st-rise pointer-events-none flex select-none flex-col overflow-hidden rounded-list border border-border bg-surface">
      <div aria-hidden="true" className="relative flex h-28 items-center justify-center bg-primary-tint text-primary">
        <svg width="120" height="64" viewBox="0 0 120 64" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 32L60 12M20 32L60 52M60 12L100 32M60 52L100 32" /><circle cx="20" cy="32" r="7" fill="currentColor" /><circle cx="60" cy="12" r="7" fill="currentColor" /><circle cx="60" cy="52" r="7" fill="currentColor" /><circle cx="100" cy="32" r="7" fill="currentColor" /></svg>
        <span className="absolute left-3 top-3 rounded-tag bg-surface px-2 py-0.5 text-xs font-bold text-primary-deep">{exampleLabel}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="font-display text-base font-extrabold leading-snug">{title}</span>
        <span className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold">{author}</span>{badge ? <span className="inline-flex items-center gap-1 rounded-tag bg-steady-bg px-2 py-0.5 text-xs font-semibold text-steady-text"><Icon name="shield" size={12} />{badge}</span> : null}</span>
        <span className="text-[13px] text-muted">{meta}</span>
      </div>
      <div className="flex items-center justify-between border-t border-divider px-4 py-3">
        <span aria-label={ratingLabel} className="text-sm font-bold">{rating}</span>
        <span aria-label={priceLabel} className="font-display font-extrabold blur-sm">{priceMask}</span>
      </div>
    </div>
  );
}

const heroGraphs = [
  { edges: 'M36 62L104 30M36 62L168 66M104 30L92 98M168 66L92 98M92 98L204 98M92 98L150 18M104 30L52 22', nodes: [[20, 53, 0], [88, 21, 1], [152, 57, 2], [76, 89, 0], [188, 89, 1], [134, 9, 2], [36, 13, 1]] },
  { edges: 'M120 60L50 30M120 60L190 28M50 30L46 96M190 28L46 96M46 96L196 96M46 96L120 104M50 30L120 16', nodes: [[104, 51, 0], [34, 21, 1], [174, 19, 2], [30, 87, 0], [180, 87, 1], [104, 95, 2], [104, 7, 1]] },
  { edges: 'M44 60L96 28M44 60L96 94M96 28L150 60M96 94L150 60M150 60L204 30M150 60L204 92M96 28L150 16', nodes: [[28, 51, 0], [80, 19, 1], [80, 85, 2], [134, 51, 0], [188, 21, 1], [188, 83, 2], [134, 7, 1]] },
] as const;
const nodeFill = ['var(--primary)', 'var(--state-steady-on-dark)', 'var(--heat-1)'] as const;

function HeroGraph({ i }: { i: 0 | 1 | 2 }) {
  const g = heroGraphs[i];
  return (
    <svg viewBox="0 0 240 120" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d={g.edges} stroke="var(--on-dark-muted)" strokeWidth="2" strokeLinecap="round" fill="none" />
      {g.nodes.map(([x, y, c]) => <rect key={`${x}-${y}`} x={x} y={y} width="32" height="18" rx="7" fill={nodeFill[c]} />)}
    </svg>
  );
}

/** Ilustração do herói: três cartões brancos com prévias de grafo e um cadeado no da frente. Decorativa (`aria-hidden`). */
export function StoreHeroArt() {
  const card = 'absolute box-border bg-surface p-3 shadow-[0_24px_50px_rgba(0,0,0,.3)]';
  return (
    <div aria-hidden="true" className="relative hidden h-[340px] w-[470px] shrink-0 lg:block">
      <div className="st-rise" style={{ animationDelay: '0.4s' }}><div className={`${card} left-[10px] top-[60px] h-[150px] w-[210px] -rotate-[8deg] rounded-[24px]`}><div className="st-float size-full"><HeroGraph i={0} /></div></div></div>
      <div className="st-rise" style={{ animationDelay: '0.6s' }}><div className={`${card} left-[250px] top-[20px] h-[150px] w-[210px] rotate-6 rounded-[24px]`}><div className="st-float size-full" style={{ animationDuration: '7s' }}><HeroGraph i={1} /></div></div></div>
      <div className="st-rise" style={{ animationDelay: '0.8s' }}>
        <div className={`${card} left-[120px] top-[170px] h-[160px] w-[230px] rounded-[26px] shadow-[0_30px_60px_rgba(0,0,0,.35)]`}>
          <div className="st-float size-full" style={{ animationDuration: '5s' }}><HeroGraph i={2} /></div>
          <span className="absolute left-1/2 top-1/2 -ml-[26px] -mt-[26px] flex size-[52px] items-center justify-center rounded-full bg-panel-dark text-white shadow-[0_8px_20px_rgba(36,26,92,.4)]"><Icon name="lock" size={26} /></span>
        </div>
      </div>
    </div>
  );
}

/** Sucesso da lista de espera: anel (900 ms) e check (500 ms) se desenham; "Alterar minhas respostas" volta ao formulário. */
export function WaitlistSuccess({ title, text, editLabel, onEdit }: { title: string; text: string; editLabel: string; onEdit: () => void }) {
  return (
    <div role="status" className="pop flex flex-col items-center gap-3 py-6 text-center">
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <circle cx="48" cy="48" r="42" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" className="draw" transform="rotate(-90 48 48)" />
        <path d="M30 49l13 13 24-26" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="drawc" />
      </svg>
      <h3 className="m-0 font-display text-2xl font-extrabold">{title}</h3>
      <p className="m-0 max-w-md text-muted">{text}</p>
      <button type="button" onClick={onEdit} className={`min-h-11 rounded-btn px-4 font-bold text-primary-deep underline ${focusRing}`}>{editLabel}</button>
    </div>
  );
}

type LinkLike = ComponentType<{ href: string; className?: string; children?: ReactNode; onClick?: () => void }> | 'a';

/** Link com a cara do Button (primary 48 px ou secondary). `as` troca o elemento (ex.: next/link). */
export function StoreLink({ href, as, variant = 'primary', onDark, icon, iconEnd, onClick, children }: { href: string; as?: LinkLike; variant?: 'primary' | 'secondary'; onDark?: boolean; icon?: ReactNode; iconEnd?: ReactNode; onClick?: () => void; children: ReactNode }) {
  const As: LinkLike = as ?? 'a';
  const look = onDark ? (variant === 'primary' ? 'bg-white text-panel-dark hover:brightness-95' : 'border-[1.5px] border-white/40 bg-transparent text-white hover:bg-white/10') : variant === 'primary' ? 'bg-primary text-on-primary hover:brightness-110' : 'border border-border-strong bg-surface text-ink hover:border-primary hover:bg-primary-tint';
  return (
    <As href={href} {...(onClick ? { onClick } : {})} className={`inline-flex items-center justify-center gap-2.5 rounded-btn font-bold no-underline ${onDark ? 'min-h-14 px-6 text-[17px]' : 'min-h-12 px-5 text-[15px]'} ${look} ${pressable} ${focusRing}`}>
      {icon}
      {children}
      {iconEnd}
    </As>
  );
}
