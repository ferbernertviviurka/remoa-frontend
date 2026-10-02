'use client';

import { memo } from 'react';
import { clsx } from 'clsx';
import type { MapState } from '../state';
import { focusRing } from '../button';
import './canvas.css';

export type NodeType = 'concept' | 'case' | 'flow' | 'image';
export type NodeLayer = 'structure' | 'recall' | 'coverage';
/** Papel do nó no modo desafio: o testado, vizinho (50%) ou demais (18%). Sem valor = fora do desafio. */
export type NodeChallengeRole = 'target' | 'neighbor' | 'dim';
export type NodeChip = { label: string; active?: boolean };
export type NodeStep = { text: string; /** default | weak (passo fraco na camada Lembrança) | hidden (passo oculto no desafio) */ tone?: 'default' | 'weak' | 'hidden' };

/**
 * NodeCard: nó do mapa (v2). `<article>` com um `<button>` real cobrindo o card (clique/Enter/Espaço = `onSelect`).
 * Tamanhos fixos por `type`: concept 232×150, case 248×176, flow 248×282, image 248×206 (raio 20).
 * Camadas (`layer`): recall = borda e rodapé na cor do `state`; structure/coverage = borda neutra e rodapé neutro/primário.
 * O rodapé (`footer`) é texto pronto de quem chama ("Revisitar · 58% · vence hoje", "3 conexões"…).
 * `selected` = borda e anel primários. `pulse` = anel laranja pulsante, só aparece com `due` + layer recall + sem `challenge`
 * + não selecionado, e é desligado com prefers-reduced-motion. `challenge` ajusta opacidade (1 / .5 / .18).
 * Sem reflow entre camadas/seleção: a borda é desenhada com box-shadow. Conteúdo por tipo: concept `summary` (2 linhas),
 * case `chips`, flow `steps` (numerados), image `image` ({src} ou null = placeholder).
 * Performance: React.memo; passe `chips`/`steps`/`image` estáveis (useMemo) e `onSelect` estável.
 * Sem className livre. Texto todo por props.
 */
export type NodeCardProps = {
  type: NodeType;
  typeLabel: string;
  title: string;
  /** aria-label do botão que cobre o card (ex.: "Selecionar Sepse"). */
  selectLabel: string;
  onSelect?: () => void;
  layer: NodeLayer;
  state: MapState;
  footer: string;
  due?: boolean;
  selected?: boolean;
  challenge?: NodeChallengeRole;
  summary?: string;
  chips?: readonly NodeChip[];
  steps?: readonly NodeStep[];
  image?: { src: string | null; alt: string } | null;
};

const size: Record<NodeType, string> = {
  concept: 'w-[232px] h-[150px]',
  case: 'w-[248px] h-[176px]',
  flow: 'w-[248px] h-[282px]',
  image: 'w-[248px] h-[206px]',
};

const ring: Record<MapState, string> = {
  review: 'shadow-[inset_0_0_0_1.5px_var(--state-review-border),0_8px_24px_rgba(36,26,92,.07)]',
  watch: 'shadow-[inset_0_0_0_1.5px_var(--state-watch-border),0_8px_24px_rgba(36,26,92,.07)]',
  steady: 'shadow-[inset_0_0_0_1.5px_var(--state-steady-border),0_8px_24px_rgba(36,26,92,.07)]',
  unknown: 'shadow-[inset_0_0_0_1.5px_var(--state-unknown-border),0_8px_24px_rgba(36,26,92,.07)]',
};
const ringNeutral = 'shadow-[inset_0_0_0_1px_var(--cv-node-border),0_8px_24px_rgba(36,26,92,.07)]';
const ringSelected = 'shadow-[inset_0_0_0_2px_var(--primary),0_0_0_5px_var(--primary-tint),0_14px_34px_rgba(36,26,92,.14)]';

const footDot: Record<MapState, string> = { review: 'bg-review', watch: 'bg-watch', steady: 'bg-steady', unknown: 'bg-unknown' };
const footText: Record<MapState, string> = { review: 'text-review-text', watch: 'text-watch-text', steady: 'text-steady-text', unknown: 'text-unknown-text' };

const opacity: Record<NodeChallengeRole, string> = { target: 'opacity-100 z-[6]', neighbor: 'opacity-50', dim: 'opacity-[.18]' };

const stepTone = {
  default: { row: 'border border-border bg-surface text-(--cv-ink)', num: 'text-primary-deep' },
  weak: { row: 'border border-review bg-[#fff7f0] text-(--cv-ink)', num: 'text-review-text' },
  hidden: { row: 'border-[1.5px] border-dashed border-review bg-review-bg text-review-text', num: 'text-review-text' },
} as const;

export const NodeCard = memo(function NodeCard({
  type, typeLabel, title, selectLabel, onSelect, layer, state, footer, due, selected, challenge, summary, chips, steps, image,
}: NodeCardProps) {
  const recall = layer === 'recall';
  const pulse = !!due && recall && !challenge && !selected;
  return (
    <article
      data-layer={layer}
      data-state={state}
      className={clsx(
        'relative box-border flex flex-col gap-1.5 rounded-[20px] bg-surface px-[17.5px] pb-[13.5px] pt-[15.5px] text-(--cv-ink)',
        size[type],
        selected ? ringSelected : recall ? ring[state] : ringNeutral,
        challenge && opacity[challenge],
        pulse && 'cv-pulse',
      )}
    >
      <button type="button" aria-label={selectLabel} aria-pressed={!!selected} onClick={onSelect} className={clsx('absolute inset-0 rounded-[20px]', focusRing)} />
      <span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted">{typeLabel}</span>
      <span className="font-display text-[18px] font-bold leading-[1.2] tracking-[-.02em]">{title}</span>
      {type === 'concept' && summary ? <span className="line-clamp-2 text-[12.5px] leading-[18px] text-(--cv-ink-2)">{summary}</span> : null}
      {type === 'case' && chips ? (
        <ul className="m-0 flex list-none gap-1.5 p-0 text-[11px] font-bold">
          {chips.map((c) => (
            <li key={c.label} className={clsx('rounded-pill px-2 py-[3px]', c.active ? 'bg-primary text-on-primary' : 'border border-(--cv-border-strong) text-muted')}>{c.label}</li>
          ))}
        </ul>
      ) : null}
      {type === 'flow' && steps ? (
        <ol className="m-0 flex list-none flex-col gap-1 p-0 text-[12.5px] leading-4">
          {steps.map((s, i) => {
            const t = stepTone[s.tone ?? 'default'];
            return (
              <li key={i} className={clsx('flex gap-2 rounded-[9px] px-2 py-[5px]', t.row)}>
                <span className={clsx('font-bold', t.num)}>{i + 1}</span>
                <span>{s.text}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
      {type === 'image' ? (
        <span role={image && !image.src ? 'img' : undefined} aria-label={image && !image.src ? image.alt : undefined} className="relative block h-[84px] overflow-hidden rounded-[10px] bg-(--cv-panel-dark)">
          {image?.src ? (
            <img src={image.src} alt={image.alt} loading="lazy" draggable={false} className="size-full object-cover" />
          ) : (
            <>
              <span className="absolute left-3 top-3 h-4 w-14 rounded-[5px] bg-apricot" />
              <span className="absolute left-[112px] top-[34px] h-4 w-[70px] rounded-[5px] bg-apricot" />
              <span className="absolute left-[52px] top-[58px] h-4 w-[60px] rounded-[5px] bg-apricot" />
            </>
          )}
        </span>
      ) : null}
      <span
        className={clsx(
          'mt-auto flex items-center gap-[7px] border-t border-(--cv-line-soft) pt-2 text-xs font-semibold',
          recall ? footText[state] : layer === 'coverage' ? 'text-primary-deep' : 'text-muted',
        )}
      >
        <span className={clsx('block size-2 shrink-0 rounded-full', recall ? footDot[state] : layer === 'coverage' ? 'bg-primary' : 'bg-unknown')} />
        <span className="min-w-0 truncate">{footer}</span>
      </span>
    </article>
  );
});
