'use client';

import { useId } from 'react';
import { Icon } from '../../icons';
import { focusRing } from '../../button-styles';
import { Switch } from '../../switch';

/**
 * GooglePreview (F27 FR-8): prévia do resultado no Google (caixa branca, fonte Arial como o buscador: o domínio, o título azul de 20 px e a descrição cinza).
 * `site` é o domínio de `SITE_URL` (ex.: "remoa.com.br"). Título e descrição já chegam cortados pelo app (≈ 60 e 160 caracteres). Cores do Google fixas de propósito (é uma simulação do buscador).
 */
export function GooglePreview({ site, slug, title, description, label }: { site: string; slug: string; title: string; description: string; label: string }) {
  return (
    <div role="group" aria-label={label} className="box-border flex flex-col gap-[3px] rounded-2xl border border-border bg-surface p-4 font-[Arial,Helvetica,sans-serif]">
      <span className="truncate text-[12.5px] text-[#4d5156]">{site} › blog › {slug}</span>
      <span className="text-xl leading-[1.3] text-[#1a0dab]">{title}</span>
      <span className="text-sm leading-[1.55] text-[#4d5156]">{description}</span>
    </div>
  );
}

/**
 * SeoPanel (F27 FR-8): aba SEO do editor. Título para o Google (≤ 60, contador `n/60` que vira laranja acima do limite), endereço `/blog/slug` com a dica do 301, palavra-chave principal,
 * interruptor de indexação (`Switch`), `GooglePreview` e o checklist de 10 itens com pontuação (`score`/`total`) e barra animada de 500 ms (`transform`-free: largura com transição `rb-score`;
 * movimento reduzido já zera). Os `items` chegam prontos do cálculo do servidor/contrato (`SeoCheck`): `state` ok (verde), warn (âmbar, não bloqueia) ou error (laranja).
 * A cor da pontuação: ≥ 8 verde, ≥ 5 âmbar, abaixo laranja (mock). Controlado: o app guarda os campos e recalcula `items`. Cada item mostra o ícone e o texto (nunca só a cor).
 */
export type SeoCheckItem = { id: string; title: string; hint: string; state: 'ok' | 'warn' | 'error' };
export type SeoPanelProps = {
  labels: {
    preview: string; titleLabel: string; titleHint: string; slugLabel: string; slugHint: string; keywordLabel: string; keywordPlaceholder: string;
    indexLabel: string; indexNote: string; noindexNote: string; checklist: string;
  };
  site: string;
  postTitle: string;
  description: string;
  seoTitle: string;
  onSeoTitleChange: (v: string) => void;
  slug: string;
  onSlugChange: (v: string) => void;
  keyword: string;
  onKeywordChange: (v: string) => void;
  indexable: boolean;
  onIndexableChange: (v: boolean) => void;
  items: ReadonlyArray<SeoCheckItem>;
  score: number;
  total: number;
};

const field = `box-border w-full rounded-[13px] border-[1.5px] border-border-strong bg-surface px-3.5 py-3 text-[15.5px] leading-normal text-ink placeholder:text-muted ${focusRing}`;
const TITLE_MAX = 60;

export function SeoPanel(p: SeoPanelProps) {
  const id = useId();
  const L = p.labels;
  const shown = p.seoTitle.trim() || p.postTitle;
  const scoreCls = p.score >= 8 ? 'ok' : p.score >= 5 ? 'watch' : 'review';
  const bar = { ok: 'bg-ok', watch: 'bg-watch', review: 'bg-review' }[scoreCls];
  const txt = { ok: 'text-ok', watch: 'text-watch-text', review: 'text-review-text' }[scoreCls];
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold tracking-[0.12em] text-muted uppercase">{L.preview}</span>
        <GooglePreview label={L.preview} site={p.site} slug={p.slug} title={shown} description={p.description} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="flex justify-between">
          <label htmlFor={`${id}-t`} className="text-sm font-bold">{L.titleLabel}</label>
          <span aria-live="polite" className={`text-[12.5px] ${p.seoTitle.length > TITLE_MAX ? 'font-bold text-review-text' : 'text-muted'}`}>{p.seoTitle.length}/{TITLE_MAX}</span>
        </span>
        <input id={`${id}-t`} type="text" value={p.seoTitle} placeholder={p.postTitle} onChange={(e) => p.onSeoTitleChange(e.target.value)} className={field} />
        <span className="text-[12.5px] text-muted">{L.titleHint}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-s`} className="text-sm font-bold">{L.slugLabel}</label>
        <span className="flex items-center overflow-hidden rounded-[13px] border-[1.5px] border-border-strong bg-canvas focus-within:border-primary">
          <span aria-hidden="true" className="pl-3 text-[13px] whitespace-nowrap text-muted">/blog/</span>
          <input id={`${id}-s`} type="text" value={p.slug} onChange={(e) => p.onSlugChange(e.target.value)} className="box-border h-[46px] min-w-0 grow border-0 bg-transparent pr-3 pl-0.5 text-[14.5px] text-ink outline-none" />
        </span>
        <span className="text-[12.5px] text-muted">{L.slugHint}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-k`} className="text-sm font-bold">{L.keywordLabel}</label>
        <input id={`${id}-k`} type="text" value={p.keyword} placeholder={L.keywordPlaceholder} onChange={(e) => p.onKeywordChange(e.target.value)} className={field} />
      </div>
      <div className="flex flex-col">
        <Switch label={L.indexLabel} checked={p.indexable} onCheckedChange={p.onIndexableChange} size="lg" />
        <span className="text-[12.5px] text-muted">{p.indexable ? L.indexNote : L.noindexNote}</span>
      </div>
      <div className="flex flex-col gap-2 border-t border-divider pt-1.5">
        <span className="flex items-center justify-between">
          <h3 className="m-0 text-xs font-bold tracking-[0.12em] text-muted uppercase">{L.checklist}</h3>
          <span className={`font-extrabold ${txt}`}>{p.score}/{p.total}</span>
        </span>
        <span role="progressbar" aria-label={L.checklist} aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.score} className="block h-2 overflow-hidden rounded bg-divider">
          <span className={`rb-score block h-2 rounded ${bar}`} style={{ width: `${p.total ? Math.round((p.score / p.total) * 100) : 0}%` }} />
        </span>
        <ul className="m-0 flex list-none flex-col p-0">
          {p.items.map((c) => (
            <li key={c.id} className="flex items-start gap-2.5 py-1.5" data-state={c.state}>
              <span aria-hidden="true" className={`mt-px flex size-[22px] shrink-0 items-center justify-center rounded-full text-on-primary ${c.state === 'ok' ? 'bg-ok' : c.state === 'warn' ? 'bg-watch' : 'bg-review'}`}>
                <Icon name={c.state === 'ok' ? 'check' : c.state === 'warn' ? 'warning' : 'close'} size={14} strokeWidth={2.6} />
              </span>
              <span className="flex flex-col leading-[1.35]">
                <span className="text-sm font-semibold">{c.title}</span>
                <span className="text-[12.5px] text-muted">{c.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
