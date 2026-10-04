'use client';

import { memo, useEffect, useId, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import type { MapState } from '../state';
import { anchor, type Rect, type Side, type Point } from './route';
import { focusRing } from '../button-styles';
import { Icon } from '../icons';
import './canvas.css';

export type NodeType = 'concept' | 'case' | 'flow' | 'image' | 'note';
export type NodeLayer = 'structure' | 'recall' | 'coverage';
/** Formato do contorno (D-095). Espelha `CardShape` de @remoa/contracts; só `concept` usa algo além de `rect`. */
export type CardShape = 'rect' | 'pill' | 'circle' | 'diamond' | 'hexagon';
/**
 * Papel no modo desafio (D-097): só `target` é relevante (card em foco, sempre só a frente). O desfoque do resto do mapa
 * é do editor (um filtro no canvas). @deprecated `neighbor` e `dim` ficam por compatibilidade (opacidade 50% / 18%).
 */
export type NodeChallengeRole = 'target' | 'neighbor' | 'dim';
export type NodeChip = { label: string; active?: boolean };
export type NodeImage = { src: string | null; alt: string };
/** Etapa do caso clínico (Apresentação → Exames → Diagnóstico → Conduta). `text` preenchido = etapa preenchida; `hint` = o que é e o que muda ao preencher (Tooltip). */
export type CaseStage = { key: string; label: string; text?: string; hint: string; image?: NodeImage; /** Preenchida sem o texto em mãos (o mapa só tem `preview.stages`; o texto vem ao virar). Default: `text` não vazio. */ filled?: boolean };
export type NodeStep = { image?: NodeImage; text: string; /** default | weak (passo fraco na camada Lembrança) | hidden (passo oculto no desafio) */ tone?: 'default' | 'weak' | 'hidden' };

/**
 * NodeCard: nó do mapa (v2). `<article>` com um `<button>` real cobrindo o card (clique/Enter/Espaço = `onSelect`).
 * Tamanhos fixos por `type`: concept 232×150, case 280×216, flow 248×282, image 248×206 (raio 20).
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
  /** Obrigatório exceto em `note` (Conteúdo não tem rodapé de lembrança). */
  footer?: string;
  due?: boolean;
  selected?: boolean;
  challenge?: NodeChallengeRole;
  summary?: string;
  /** @deprecated use `caseStages`. */
  chips?: readonly NodeChip[];
  /** Caso clínico: trilha de etapas com Tooltip. Com card grande (h ≥ 250) mostra o resumo da última etapa preenchida (nunca no desafio). */
  caseStages?: readonly CaseStage[];
  /** Tamanho livre (D-202); sobrepõe `nodeSize`. O conteúdo se adapta (linhas cortadas, imagem escala, rodapé sempre visível). */
  size?: Size;
  /** Imagem da resposta, no verso (D-201). */
  backImage?: NodeImage;
  steps?: readonly NodeStep[];
  image?: { src: string | null; alt: string } | null;
  /** Formato (só concept; demais tipos são sempre rect). Default 'rect'. */
  shape?: CardShape;
  /** Imagem da pergunta na frente (D-096). Só em formato rect e tipo != image; aumenta a altura: use `nodeSize(type, shape, { frontImage: true })`. `src: null` = placeholder. */
  frontImage?: { src: string | null; alt: string };
  /** Verso (D-097): resposta. Só é montado enquanto `flipped`. Sem `back` não há botão de virar. */
  back?: ReactNode;
  flipped?: boolean;
  onFlip?: () => void;
  /** Rótulos do botão de virar ("Ver resposta" / "Ver pergunta"); obrigatórios quando há `back`. */
  flipLabel?: string;
  unflipLabel?: string;
};

export type Size = { w: number; h: number };
const concept: Record<CardShape, Size> = {
  rect: { w: 232, h: 150 },
  pill: { w: 232, h: 132 },
  circle: { w: 180, h: 180 },
  diamond: { w: 224, h: 224 }, // 200 deixava só ~100px úteis no losango; 224 dá ~112
  hexagon: { w: 220, h: 190 },
};
const fixed: Record<Exclude<NodeType, 'concept'>, Size> = { case: { w: 280, h: 216 }, flow: { w: 248, h: 282 }, image: { w: 248, h: 206 }, note: { w: 248, h: 176 } };
/** Altura extra da imagem da pergunta (84 de imagem + gap). */
export const FRONT_IMAGE_EXTRA = 90;
/** Tamanho fixo do nó. Para layout/dagre/route. `frontImage` só soma em rect e tipo != image. */
export function nodeSize(type: NodeType, shape: CardShape = 'rect', opts?: { frontImage?: boolean; size?: Size | null }): Size {
  if (opts?.size) return { w: opts.size.w, h: opts.size.h };
  const base = type === 'concept' ? concept[shape] : fixed[type];
  const extra = opts?.frontImage && type !== 'image' && (type !== 'concept' || shape === 'rect') ? FRONT_IMAGE_EXTRA : 0;
  return { w: base.w, h: base.h + extra };
}
/** Tabela completa `NODE_SIZE[type][shape]` (sem frontImage). */
export const NODE_SIZE: Record<NodeType, Record<CardShape, Size>> = {
  concept,
  case: { rect: fixed.case, pill: fixed.case, circle: fixed.case, diamond: fixed.case, hexagon: fixed.case },
  flow: { rect: fixed.flow, pill: fixed.flow, circle: fixed.flow, diamond: fixed.flow, hexagon: fixed.flow },
  image: { rect: fixed.image, pill: fixed.image, circle: fixed.image, diamond: fixed.image, hexagon: fixed.image },
  note: { rect: fixed.note, pill: fixed.note, circle: fixed.note, diamond: fixed.note, hexagon: fixed.note },
};
/**
 * Âncora na borda real do formato. Para todos os formatos o meio de cada lado do retângulo envolvente já cai sobre o contorno
 * (circle: pontos cardeais; diamond: vértices; hexagon: vértices l/r e meio das arestas t/b), então é `anchor`.
 */
export function shapeAnchor(_shape: CardShape, rect: Rect, side: Side): Point {
  return anchor(rect, side);
}

const size: Record<NodeType, string> = {
  concept: 'w-[232px] h-[150px]',
  case: 'w-[280px] h-[216px]',
  flow: 'w-[248px] h-[282px]',
  image: 'w-[248px] h-[206px]',
  note: 'w-[248px] h-[176px]',
};

const shapeSize: Record<CardShape, string> = {
  rect: 'w-[232px] h-[150px]',
  pill: 'w-[232px] h-[132px]',
  circle: 'w-[180px] h-[180px]',
  diamond: 'w-[224px] h-[224px]',
  hexagon: 'w-[220px] h-[190px]',
};
const radius: Record<CardShape, string> = { rect: 'rounded-[20px]', pill: 'rounded-[66px]', circle: 'rounded-full', diamond: 'rounded-none', hexagon: 'rounded-none' };
/** Contorno desenhado em SVG (box-shadow some com clip-path). viewBox = tamanho do nó; inset 2px para o traço caber. */
const polygon = {
  diamond: '112,2 222,112 112,222 2,112',
  hexagon: '57,2 163,2 218,95 163,188 57,188 2,95',
} as const;
const stateStroke: Record<MapState, string> = {
  review: 'var(--state-review-border)', watch: 'var(--state-watch-border)', steady: 'var(--state-steady-border)', unknown: 'var(--state-unknown-border)',
};
const dropShadow = 'drop-shadow(0 8px 12px rgba(36,26,92,.07))';
const dropShadowSel = 'drop-shadow(0 12px 16px rgba(36,26,92,.14))';

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
  default: { marker: 'bg-primary text-on-primary', text: 'text-(--cv-ink)' },
  weak: { marker: 'border border-review bg-review-bg text-review-text', text: 'text-review-text' },
  hidden: { marker: 'border-[1.5px] border-dashed border-review bg-review-bg text-review-text', text: 'text-review-text' },
} as const;
const clamp = ['', 'line-clamp-1', 'line-clamp-2', 'line-clamp-3', 'line-clamp-4', 'line-clamp-5', 'line-clamp-6', 'line-clamp-7', 'line-clamp-8'] as const;
const lines = (n: number) => clamp[Math.max(1, Math.min(8, Math.floor(n)))]!;


/** Botão de virar sempre dentro do retângulo do nó (nunca passa de `nodeSize`). */
const flipPos: Record<CardShape, string> = {
  rect: 'right-2.5 top-2.5',
  pill: 'bottom-2 left-1/2 -translate-x-1/2',
  circle: 'bottom-4 left-1/2 -translate-x-1/2',
  diamond: 'bottom-[50px] left-1/2 -translate-x-1/2',
  hexagon: 'bottom-2 left-1/2 -translate-x-1/2',
};

type FaceProps = { free?: boolean; shape: CardShape; ringClass: string; stroke: string; strokeW: number; focused: boolean; back?: boolean; inert?: boolean; children: ReactNode };
/** Uma face do card (frente ou verso). Decorativa: pointer-events-none (só o botão que cobre o card recebe clique). */
function Face({ free, shape, ringClass, stroke, strokeW, focused, back, inert, children }: FaceProps) {
  const poly = shape === 'diamond' || shape === 'hexagon' ? polygon[shape] : null;
  const { w, h } = concept[shape];
  return (
    <div
      inert={inert}
      style={back ? { transform: 'rotateY(180deg)' } : undefined}
      className={clsx(
        'pointer-events-none absolute inset-0 isolate box-border flex flex-col [backface-visibility:hidden]',
        poly ? 'items-center justify-center text-center' : clsx('gap-1.5 bg-surface px-[17.5px] pb-[13.5px] pt-[15.5px]', radius[shape], ringClass),
        shape === 'circle' && 'items-center justify-center px-[26px] pb-[46px] pt-[22px] text-center',
        shape === 'pill' && 'justify-center px-7 pb-10 pt-2.5',
        shape === 'diamond' && 'px-[56px] pb-[78px] pt-[52px]',
        shape === 'hexagon' && 'px-[40px] pb-[40px] pt-[22px]',
      )}
    >
      {poly ? (
        <svg aria-hidden="true" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio={free ? 'none' : undefined} className="absolute inset-0 -z-10 size-full overflow-visible" style={{ filter: focused ? dropShadowSel : dropShadow }}>
          {focused ? <polygon points={poly} fill="none" stroke="var(--primary-tint)" strokeWidth={10} strokeLinejoin="round" /> : null}
          <polygon points={poly} fill="var(--surface)" stroke={stroke} strokeWidth={strokeW} strokeLinejoin="round" />
        </svg>
      ) : null}
      {children}
    </div>
  );
}


/** Miniatura/placeholder de imagem em passo ou etapa. */
function Thumb({ image, className }: { image: NodeImage; className: string }) {
  return image.src ? (
    <img src={image.src} alt={image.alt} loading="lazy" draggable={false} className={clsx('rounded-md object-cover', className)} />
  ) : (
    <span role="img" aria-label={image.alt} className={clsx('rounded-md bg-(--cv-panel-dark)', className)} />
  );
}

/**
 * Fluxograma como timeline vertical (G06): trilho + marcador numerado por passo + conector. Passos `weak`/`hidden` mantêm o
 * estilo de aviso. `compact` (dentro do card): 1 linha por passo e miniatura de 24 px; sem `compact` (verso, painel): texto
 * inteiro e imagem de 96 px de altura. Montado só onde é mostrado (verso só quando virado).
 */
export function StepTimeline({ steps, compact }: { steps: readonly NodeStep[]; compact?: boolean }) {
  return (
    <ol className="m-0 flex list-none flex-col p-0 text-[12.5px] leading-4">
      {steps.map((s, i) => {
        const t = stepTone[s.tone ?? 'default'];
        const last = i === steps.length - 1;
        return (
          <li key={i} className={clsx('relative flex gap-2.5', !last && (compact ? 'pb-2' : 'pb-3.5'))}>
            {!last ? <span aria-hidden="true" className="absolute bottom-0 left-[9px] top-5 w-0.5 bg-(--cv-border-strong)" /> : null}
            <span aria-hidden="true" className={clsx('z-[1] flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', t.marker)}>{i + 1}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className={clsx('pt-0.5 font-semibold', t.text, compact && 'line-clamp-1')}>{s.text}</span>
              {s.image && !compact ? <Thumb image={s.image} className="h-24 w-full" /> : null}
            </span>
            {s.image && compact ? <Thumb image={s.image} className="size-6 shrink-0" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Etapas do caso por extenso (verso e painel): rótulo, texto completo e imagem de cada etapa. */
export function CaseStageList({ stages }: { stages: readonly CaseStage[] }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0 text-[12.5px] leading-[18px]">
      {stages.map((st) => (
        <li key={st.key} className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-[.1em] text-primary-deep">{st.label}</span>
          {st.text ? <span className="text-(--cv-ink-2)">{st.text}</span> : null}
          {st.image ? <Thumb image={st.image} className="h-24 w-full" /> : null}
        </li>
      ))}
    </ol>
  );
}

const filledOf = (st: CaseStage) => st.filled ?? !!st.text?.trim();

/** Etapas Apresentação · Exames · Diagnóstico · Conduta em grade 2×2 (rótulo inteiro, sem corte). Cada etapa é um botão (seleciona o card) com dica em CSS (hint). */
function CaseTrail({ stages, onSelect }: { stages: readonly CaseStage[]; onSelect?: () => void }) {
  const uid = useId();
  const [active, setActive] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  // WCAG 1.4.13: Esc fecha a dica sem mexer no foco nem no ponteiro (vale para hover e foco).
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDismissed(active); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);
  const leave = () => { setActive(null); setDismissed(null); };
  return (
    <ol className="pointer-events-auto relative m-0 grid shrink-0 list-none grid-cols-2 gap-x-2 gap-y-1 p-0">
      {stages.map((st, i) => {
        const filled = filledOf(st);
        const hid = `${uid}-${st.key}`;
        return (
          <li key={st.key} data-dismissed={dismissed === hid} onPointerEnter={() => setActive(hid)} onPointerLeave={leave} onFocus={() => setActive(hid)} onBlur={leave} className="group/tip relative min-w-0">
            <button
                type="button"
                data-filled={filled}
                aria-describedby={hid}
                onClick={onSelect}
                className={clsx('relative flex min-h-10 w-full cursor-pointer items-center gap-1.5 rounded-[10px] border px-1.5 text-left before:absolute before:-inset-0.5 before:content-[""]', filled ? 'border-primary bg-primary-tint' : 'border-dashed border-(--cv-border-strong) bg-surface', focusRing)}
              >
                <span aria-hidden="true" className={clsx('flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold', filled ? 'bg-primary text-on-primary' : 'border-[1.5px] border-dashed border-(--cv-border-strong) text-muted')}>
                  {filled ? <Icon name="check" size={13} /> : i + 1}
                </span>
                <span className={clsx('whitespace-nowrap text-xs font-semibold', filled ? 'text-primary-deep' : 'text-muted')}>{st.label}</span>
            </button>
            {/* Dica em CSS (D-558): sem Radix Tooltip/Popper no bundle da landing. aria-describedby aponta para ela (visibility:hidden tira do leitor de tela, mas o describedby continua valendo); aparece no hover e no foco, Esc fecha; fica dentro do card (D-560) para o overflow não cortar. */}
            <span id={hid} role="tooltip" className={clsx('pointer-events-none absolute z-50 w-max max-w-[200px] rounded-tag bg-navy px-2.5 py-1.5 text-xs font-semibold leading-[1.45] text-white opacity-0 invisible shadow-lift transition-[opacity,visibility] duration-150 group-hover/tip:visible group-hover/tip:opacity-100 group-focus-within/tip:visible group-focus-within/tip:opacity-100 group-data-[dismissed=true]/tip:invisible group-data-[dismissed=true]/tip:opacity-0', i < 2 ? 'top-full mt-1' : 'bottom-full mb-1', i % 2 ? 'right-0' : 'left-0')}>{st.hint}</span>
          </li>
        );
      })}
    </ol>
  );
}

export const NodeCard = memo(function NodeCard({
  type, typeLabel, title, selectLabel, onSelect, layer: layerProp, state, footer, due, selected, challenge, summary, chips, caseStages, size: sizeProp, backImage, steps, image,
  shape: shape0 = 'rect', frontImage, back, flipped, onFlip, flipLabel, unflipLabel,
}: NodeCardProps) {
  const note = type === 'note';
  const layer: NodeLayer = note ? 'structure' : layerProp; // Conteúdo: só Estrutura
  const recall = layer === 'recall';
  const target = challenge === 'target';
  const shape: CardShape = type === 'concept' ? shape0 : 'rect';
  const rect = shape === 'rect';
  const hasBack = back != null && !challenge && !note; // desafio: só a frente
  const isFlipped = hasBack && !!flipped;
  const pulse = !!due && recall && !challenge && !selected && shape !== 'diamond' && shape !== 'hexagon';
  const showImg = !!frontImage && rect && type !== 'image';
  const focused = !!selected || target;
  // o verso só existe enquanto virado (e durante a animação de volta): 200 nós não pagam por 200 versos
  const [lingering, setLingering] = useState(false);
  useEffect(() => {
    if (isFlipped) { setLingering(true); return; }
    const id = setTimeout(() => setLingering(false), 450);
    return () => clearTimeout(id);
  }, [isFlipped]);
  const mountBack = hasBack && (isFlipped || lingering);
  const ringClass = focused ? ringSelected : recall ? ring[state] : ringNeutral;
  const stroke = focused ? 'var(--primary)' : recall ? stateStroke[state] : 'var(--cv-node-border)';
  const strokeW = focused ? 2 : recall ? 1.5 : 1;
  const compact = !rect;
  const faceProps = { shape, ringClass, stroke, strokeW, focused, free: !!sizeProp };
  const dims = sizeProp ?? (showImg ? nodeSize(type, shape, { frontImage: true }) : null);
  const h = dims?.h ?? nodeSize(type, shape).h;
  // linhas conforme a altura: só com `size` livre (sem `size` o visual fixo de sempre)
  const free = !!sizeProp && rect;
  const titleLines = h < 140 ? 1 : h < 200 ? 2 : 3;
  const sumLines = free ? (showImg ? (h >= 260 ? 2 : 1) : Math.floor((h - (note ? 70 : 100) - 22 * titleLines) / 18)) : note ? 3 : 2;
  const stages = type === 'case' ? caseStages : undefined;
  const lastFilled = stages && !challenge && h >= 250 ? [...stages].reverse().find((st) => filledOf(st) && !!st.text?.trim()) : undefined;
  const select = (
    <button type="button" aria-label={selectLabel} aria-pressed={!!selected} onClick={onSelect} className={clsx('pointer-events-auto absolute inset-0', radius[shape], focusRing)} />
  );
  const label = note ? (
    <span className="flex shrink-0 items-center gap-1.5 self-start rounded-pill bg-primary-tint px-2 py-[3px] text-[11px] font-bold uppercase tracking-[.12em] text-primary-deep">
      <Icon name="book" size={12} />{typeLabel}
    </span>
  ) : (
    <span className={clsx('shrink-0 text-[11px] font-bold uppercase tracking-[.12em] text-muted', ((shape === 'diamond' || shape === 'pill') || (free && h < 110)) && 'sr-only')}>{typeLabel}</span>
  );
  const footerEl = note || footer == null ? null : (
    <span
      className={clsx(
        'flex shrink-0 items-center gap-[7px] text-xs font-semibold',
        compact ? 'max-w-full justify-center' : 'mt-auto w-full border-t border-(--cv-line-soft) pt-2',
        recall ? footText[state] : layer === 'coverage' ? 'text-primary-deep' : 'text-muted',
      )}
    >
      <span className={clsx('block size-2 shrink-0 rounded-full', recall ? footDot[state] : layer === 'coverage' ? 'bg-primary' : 'bg-unknown')} />
      <span className={clsx('min-w-0', compact ? 'line-clamp-2 leading-4' : 'truncate')}>{footer}</span>
    </span>
  );
  const titleEl = (
    <span className={clsx('shrink-0 font-display font-bold tracking-[-.02em]', compact ? 'line-clamp-2 text-[15px] leading-[1.2]' : 'text-[18px] leading-[1.2]', free && lines(titleLines), shape === 'pill' && 'line-clamp-1')}>{title}</span>
  );
  const grow = !!sizeProp;
  const sum = summary && (type === 'concept' || note) && (rect || shape === 'pill') && sumLines >= 1 ? (
    <span className={clsx('shrink-0 text-[12.5px] leading-[18px] text-(--cv-ink-2)', shape === 'pill' ? 'line-clamp-1' : lines(sumLines))}>{summary}</span>
  ) : null;
  const front = (
    <>
      {label}
      {titleEl}
      {sum}
      {type === 'case' && stages ? (
        <>
          <CaseTrail stages={stages} onSelect={onSelect} />
          {lastFilled ? <span className={clsx('shrink-0 text-[12.5px] leading-[18px] text-(--cv-ink-2)', h >= 280 ? 'line-clamp-2' : 'line-clamp-1')}>{lastFilled.text}</span> : null}
        </>
      ) : null}
      {type === 'case' && !stages && chips ? (
        <ul className="m-0 flex list-none gap-1.5 p-0 text-[11px] font-bold">
          {chips.map((c) => (
            <li key={c.label} className={clsx('rounded-pill px-2 py-[3px]', c.active ? 'bg-primary text-on-primary' : 'border border-(--cv-border-strong) text-muted')}>{c.label}</li>
          ))}
        </ul>
      ) : null}
      {type === 'flow' && steps ? <StepTimeline steps={steps} compact /> : null}
      {type === 'image' ? <Pic image={image} grow={grow} /> : null}
      {note && image ? <Pic image={image} grow={grow} /> : null}
      {showImg ? <Pic image={frontImage} grow={grow} /> : null}
    </>
  );
  return (
    <article
      data-layer={layer}
      data-state={state}
      data-shape={shape}
      data-type={type}
      data-flipped={isFlipped || undefined}
      style={dims ? (sizeProp ? { width: dims.w, height: dims.h } : { height: dims.h }) : undefined}
      className={clsx(
        'relative box-border text-(--cv-ink) [perspective:1100px]',
        type === 'concept' ? shapeSize[shape] : size[type],
        radius[shape],
        challenge && opacity[challenge],
        pulse && 'cv-pulse',
      )}
    >
      <div className={clsx('absolute inset-0', hasBack && 'cv-flip [transform-style:preserve-3d]')} style={isFlipped ? { transform: 'rotateY(180deg)' } : undefined}>
        <Face {...faceProps} inert={isFlipped}>
          {select}
          {rect ? <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">{front}</div> : front}
          {footerEl}
        </Face>
        {mountBack ? (
          <Face {...faceProps} back inert={!isFlipped}>
            {select}
            {label}
            {titleEl}
            <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden text-[12.5px] leading-[18px] text-(--cv-ink-2)">
              {back}
              {backImage ? <Pic image={backImage} grow /> : null}
            </div>
            {footerEl}
          </Face>
        ) : null}
      </div>
      {hasBack ? (
        <button
          type="button"
          aria-pressed={isFlipped}
          onClick={onFlip}
          className={clsx(
            // nodrag: o React Flow não arrasta o nó a partir do botão de virar (G04)
            'nodrag absolute z-10 h-7 whitespace-nowrap rounded-pill border border-(--cv-border-strong) bg-surface px-2.5 text-xs font-bold text-primary-deep before:absolute before:-inset-2 before:content-[""]',
            flipPos[shape],
            focusRing,
          )}
        >
          {isFlipped ? unflipLabel : flipLabel}
        </button>
      ) : null}
    </article>
  );
});

function Pic({ image, grow }: { image?: NodeImage | null; grow?: boolean }) {
  const ph = image && !image.src;
  return (
    <span role={ph ? 'img' : undefined} aria-label={ph ? image.alt : undefined} className={clsx('relative block overflow-hidden rounded-[10px] bg-(--cv-panel-dark)', grow ? 'min-h-8 flex-1' : 'h-[84px] shrink-0')}>
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
  );
}
