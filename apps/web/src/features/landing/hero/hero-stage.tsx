'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { strings, t } from '@remoa/strings/landing';
import { CanvasPanel, EdgeLabel, Icon, LayerSwitch, NodeCard, QuestionPanel, VerdictBox, anchor, route, type MapState, type Rect, type Side } from '@remoa/ui';
import { track } from '@/lib/analytics';
import type { LandingFlags } from '../flags';
import { HERO_CSS } from './hero-css';

const map = strings.landing.hero.map;
const W = 232;
const H = 150;
const PCT = 58;

/** Card slots in canvas units (3 × 2 grid, like the mock). `m`: also on mobile (4 cards). Index = `map.cards` index. */
type Slot = { x: number; y: number; state: MapState; pct: number; m: boolean };
const SLOTS: Slot[] = [
  { x: 412, y: 300, state: 'steady', pct: 94, m: true }, // Sepse e choque séptico
  { x: 0, y: 310, state: 'review', pct: PCT, m: true }, // Choque séptico: the tested card
  { x: 412, y: 0, state: 'watch', pct: 78, m: true }, // Triagem
  { x: 824, y: 40, state: 'watch', pct: 71, m: false }, // Hemoculturas
  { x: 824, y: 320, state: 'steady', pct: 88, m: false }, // ATB
  { x: 0, y: 30, state: 'unknown', pct: 0, m: true }, // Cristaloide
];
const TESTED = 1;
const NEIGHBORS = new Set([0, 5]);
const rect = (i: number): Rect => ({ ...SLOTS[i]!, w: W, h: H });

/** Edges: [from, side, to, side, lane offset (two edges share Sepse ↔ Triagem)]. Index = `map.edges` index. */
type EdgeDef = [number, Side, number, Side, number];
const EDGES: EdgeDef[] = [
  [0, 'l', 1, 'r', 0], // desencadeia
  [0, 't', 2, 'b', -40], // requer triagem
  [2, 'b', 0, 't', 40], // nenhuma triagem afasta
  [3, 'b', 4, 't', 0], // colher antes
  [0, 'r', 4, 'l', 0], // iniciar dentro de 1 hora
  [1, 't', 5, 'b', 0], // volume na primeira hora
];
const shift = (r: Rect, side: Side, o: number): Rect => (side === 't' || side === 'b' ? { ...r, x: r.x + o } : { ...r, y: r.y + o });
const arrow = ([x, y]: readonly [number, number], s: Side) =>
  s === 'l' ? `M${x - 8} ${y - 5}L${x} ${y}L${x - 8} ${y + 5}` : s === 'r' ? `M${x + 8} ${y - 5}L${x} ${y}L${x + 8} ${y + 5}` : s === 't' ? `M${x - 5} ${y - 8}L${x} ${y}L${x + 5} ${y - 8}` : `M${x - 5} ${y + 8}L${x} ${y}L${x + 5} ${y + 8}`;

const d = (s: number, extra?: CSSProperties) => ({ '--d': `${s}s`, ...extra }) as CSSProperties;
const footer = (s: Slot) => (s.state === 'unknown' ? t('canvas.footer.none') : t('canvas.footer.recall', { state: t(`mapState.${s.state}`), pct: s.pct }));
const noop = () => {};
const layers = [
  { value: 'structure', label: t('canvas.layerSwitch.structure') },
  { value: 'recall', label: t('canvas.layerSwitch.recall') },
  { value: 'coverage', label: t('canvas.layerSwitch.coverage') },
] as const;
const modes = [
  { value: 'write', label: t('challenge.write') },
  { value: 'options', label: t('challenge.options') },
  { value: 'speak', label: t('quiz.speak') },
] as const;
const chips = [
  { label: t('challengeMode.hidden_card'), tone: 'brand' },
  { label: t('quiz.chipState', { subject: t('quiz.subject.card'), state: t('mapState.review') }), tone: 'review' },
] as const;

/** `data-motion` (saved preference) wins over the system setting (same rule as hero-css.ts / tokens.css). */
function prefersReduced() {
  const pref = document.documentElement.dataset.motion;
  return pref === 'reduced' || (pref !== 'full' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function Card({ i, summary = true }: { i: number; summary?: boolean }) {
  const s = SLOTS[i]!;
  const c = map.cards[i]!;
  return (
    <NodeCard
      type="concept"
      typeLabel={t('canvas.nodeType.concept')}
      title={c.title}
      summary={summary && c.text ? c.text : undefined}
      selectLabel={t('canvas.selectCard', { title: c.title })}
      layer="recall"
      state={s.state}
      footer={footer(s)}
    />
  );
}

/** The map scene (canvas units, scaled per breakpoint). Final frame is the static markup; hero-css.ts replays it under [data-play]. */
function Scene() {
  return (
    <div className="absolute left-[calc(50%-167px)] top-[48px] h-[470px] w-[1056px] origin-top-left scale-[.52] md:left-[calc(50%-258px)] md:top-[60px] md:scale-[.8] lg:left-[18px] lg:top-[86px] lg:scale-[.76]">
      <svg aria-hidden="true" width="1056" height="470" className="absolute inset-0 overflow-visible">
        {EDGES.map(([a, as, b, bs, o], i) => {
          const ra = shift(rect(a), as, o);
          const rb = shift(rect(b), bs, o);
          const r = route(ra, as, rb, bs);
          const delay = 1.8 + i * 0.15;
          const mobile = SLOTS[a]!.m && SLOTS[b]!.m;
          return (
            <g key={i} className={mobile ? undefined : 'max-lg:hidden'}>
              <path className="hx-draw hx-edge" style={d(delay)} d={r.d} pathLength={1} fill="none" stroke="var(--cv-edge)" strokeWidth={2} strokeLinecap="round" />
              <path className="hx-fade" style={d(delay + 0.7)} d={arrow(anchor(rb, bs), bs)} fill="none" stroke="var(--cv-edge)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}
      </svg>
      {EDGES.map(([a, as, b, bs, o], i) => {
        const r = route(shift(rect(a), as, o), as, shift(rect(b), bs, o), bs);
        const mobile = SLOTS[a]!.m && SLOTS[b]!.m;
        // the two Sepse ↔ Triagem labels are staggered so they do not overlap
        const ly = r.ly + (o === 0 ? 0 : o < 0 ? -24 : 24);
        return (
          <span key={i} className={`hx-fade absolute z-[2] -translate-x-1/2 -translate-y-1/2 ${mobile ? '' : 'max-lg:hidden'}`} style={d(1.8 + i * 0.15 + 0.5, { left: r.lx, top: ly })}>
            <EdgeLabel label={map.edges[i]!} />
          </span>
        );
      })}
      {SLOTS.map((s, i) => {
        const opacity = i === TESTED ? 1 : NEIGHBORS.has(i) ? 0.55 : 0.2;
        return (
          <div key={i} className={`hx-pop absolute z-[3] ${s.m ? '' : 'max-lg:hidden'}`} style={d(0.5 + i * 0.2, { left: s.x, top: s.y })}>
            <div className="hx-node" style={{ opacity, '--h': `${2.7 + i * 0.1}s` } as CSSProperties}>
              <Card i={i} />
              {i === TESTED ? (
                // before the reveal (5.4 s) the tested card shows only its front
                <div className="hx-out absolute inset-0" style={d(5.4)}>
                  <Card i={i} summary={false} />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Panel({ approved }: { approved: boolean }) {
  return (
    <CanvasPanel aria-label={t('editor.challenge')}>
      <QuestionPanel
        eyebrow={t('editor.challenge')}
        progressText={t('editor.progress', { n: 3, total: 12 })}
        progress={0.25}
        progressLabel={t('challenge.progressLabel')}
        chips={chips}
        question={t('landing.hero.map.question')}
        questionAs="p"
        modeLabel={t('challenge.answerMode')}
        modes={modes}
        mode="write"
        onModeChange={noop}
        answerLabel={t('challenge.textLabel')}
        answer={map.answer}
        onAnswerChange={noop}
        optionsLabel={t('challenge.optionsLabel')}
        options={[]}
        selectedOption={null}
        onSelectOption={noop}
        checkLabel={t('challenge.submitText')}
        canCheck={false}
        onCheck={noop}
        result={
          <>
            <p className="m-0 flex gap-1 text-sm text-muted">
              <strong>{t('challenge.yourAnswer')}:</strong>
              <span className="hx-typed inline-block text-ink">{map.answer}</span>
            </p>
            <div className="hx-verdict">
              <VerdictBox verdict="partial" label={map.verdict} headline={map.verdictText} note={approved ? map.rubricLineApproved : map.rubricLine}>
                {approved ? null : <p className="m-0 text-[12.5px] font-semibold text-muted">{map.provenanceDraft}</p>}
              </VerdictBox>
            </div>
          </>
        }
      />
    </CanvasPanel>
  );
}

const chip = 'hx-chip absolute z-10 flex items-center gap-2.5 rounded-[16px] px-4 py-2.5 text-[13.5px] font-bold shadow-[0_18px_40px_rgba(36,26,92,.2)]';

/**
 * HeroStage (FR-4, D-230): the product window with the Sepse map built from the real canvas components. Server-rendered as the
 * final frame (LCP); on the client it plays once when it enters the viewport (`data-play`), and "Reproduzir de novo" remounts it.
 * Reduced motion (system or `data-motion="reduced"`): never sets `data-play`, so the final frame stays.
 */
export function HeroStage({ flags }: { flags: Pick<LandingFlags, 'approvedContent'> }) {
  const [run, setRun] = useState(0); // 0 = not played yet; n > 0 = play #n (the key remounts the stage)
  const ref = useRef<HTMLDivElement>(null);
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced() || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setRun((n) => n || 1);
        io.disconnect();
      }
    }, { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const replay = () => {
    track('hero_replayed', {});
    if (!prefersReduced()) setRun((n) => n + 1);
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 md:px-10" style={{ marginTop: 56 }}>
      <style href="remoa-hero" precedence="default">{HERO_CSS}</style>
      <div
        // first play (0 → 1) keeps the SSR nodes: remounting them made a post-hydration LCP candidate (G11/D-356, LCP 3,5 s)
        key={Math.max(run, 1)}
        ref={ref}
        role="img"
        aria-label={t('landing.hero.stageAria')}
        aria-describedby={descId}
        data-play={run > 0 ? '' : undefined}
        className="hx-stage relative mx-auto h-[910px] w-full max-w-[1160px] md:h-[920px] lg:h-[600px]"
      >
        <div aria-hidden="true" inert className="hx-window absolute inset-0 overflow-hidden rounded-[30px] border border-border bg-surface shadow-[0_44px_110px_rgba(36,26,92,.24)]">
          <div className="absolute inset-x-0 top-0 flex h-[52px] items-center gap-2 border-b border-border bg-canvas px-5">
            <span className="size-[11px] rounded-full bg-border" />
            <span className="size-[11px] rounded-full bg-border" />
            <span className="size-[11px] rounded-full bg-border" />
          </div>
          <div className="absolute inset-x-0 bottom-0 top-[52px] max-md:h-[332px] md:max-lg:h-[452px]" style={{ backgroundColor: 'var(--canvas)', backgroundImage: 'radial-gradient(var(--grid-dot) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            <div className="absolute left-3 top-2.5 z-[5] origin-top-left max-lg:scale-[.72] lg:left-6">
              <LayerSwitch label={t('editor.layers')} options={layers} value="recall" onChange={noop} />
              <div className="hx-out absolute inset-0" style={d(2.5)}>
                <LayerSwitch label={t('editor.layers')} options={layers} value="structure" onChange={noop} />
              </div>
            </div>
            <Scene />
          </div>
          <div className="hx-panel absolute bottom-3 left-3 right-3 top-[396px] md:top-[516px] lg:bottom-[18px] lg:left-auto lg:right-5 lg:top-[70px] [&_aside]:h-full max-lg:[&_aside]:w-full">
            <Panel approved={flags.approvedContent} />
          </div>
        </div>
        <span aria-hidden="true" className={`${chip} right-3 top-1 bg-panel-dark text-white lg:-right-[26px] lg:top-24`} style={d(3.4, { '--f': '7s' } as CSSProperties)}>
          <span className="block size-2.5 rounded-full bg-[var(--state-review-on-dark)]" />
          {t('landing.hero.chips.retrievability', { pct: PCT })}
        </span>
        {flags.approvedContent ? (
          <span aria-hidden="true" data-chip="reviewed" className={`${chip} left-3 top-[340px] border md:top-[454px] border-border bg-surface text-ink lg:-left-[30px] lg:top-auto lg:bottom-24`} style={d(3.8, { '--f': '6s' } as CSSProperties)}>
            <span className="flex size-[30px] items-center justify-center rounded-full bg-primary text-on-primary"><Icon name="check" size={16} /></span>
            {t('landing.hero.chips.reviewed')}
          </span>
        ) : null}
        <p id={descId} className="sr-only">
          {t('landing.hero.map.question')} {t('challenge.yourAnswer')}: {map.answer}. {map.verdict}: {map.verdictText}
        </p>
      </div>
      <div className="mt-[22px] flex justify-center">
        <button type="button" onClick={replay} className="flex h-11 cursor-pointer items-center gap-2 rounded-[14px] border border-border-strong bg-surface px-[18px] text-sm font-bold text-(--cv-ink-2) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <Icon name="bolt" size={16} />
          {t('landing.hero.replay')}
        </button>
      </div>
    </div>
  );
}
