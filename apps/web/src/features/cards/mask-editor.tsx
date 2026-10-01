'use client';

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { MAX_MASKS_PER_IMAGE, type CardMask } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Alert, Button, Input, Segmented } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { isTiny, moveVertex, nearestVertex, normalize, pointInPolygon, rectToPolygon, toPoints, translate, type Pt } from './polygon';

type Tool = 'select' | 'rect' | 'polygon';
type Drag = { kind: 'rect'; start: Pt } | { kind: 'move'; id: string; start: Pt; orig: Pt[] } | { kind: 'vertex'; id: string; i: number; orig: Pt[] };

const HIT_PX = 12;
const STEP = 0.01;
const MAX_VERTICES = 64; // maskSchema polygon.max(64)
const MASK_STROKE = '#9a5a2e';

/** Masks drawn over an image box; viewBox 0..1 stretched to the image, so it matches at any size. Overlay only. */
export function MaskOverlay({ masks, selected }: { masks: CardMask[]; selected?: string | null }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
      {masks.map((m) => (
        <MaskShape key={m.id} mask={m} selected={m.id === selected} />
      ))}
    </svg>
  );
}

function MaskShape({ mask, selected }: { mask: CardMask; selected: boolean }) {
  return (
    <polygon
      data-mask-id={mask.id}
      points={toPoints(mask.polygon)}
      fill="var(--apricot)"
      fillOpacity={0.8}
      stroke={selected ? 'var(--primary)' : MASK_STROKE}
      strokeWidth={selected ? 3 : 1.5}
      strokeDasharray={selected ? '6 3' : undefined}
      vectorEffect="non-scaling-stroke"
    />
  );
}

const Handle = ({ p, first }: { p: Pt; first?: boolean }) => (
  <span
    aria-hidden="true"
    className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 border-primary ${first ? 'h-4 w-4 bg-primary' : 'h-3 w-3 bg-surface'}`}
    style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
  />
);

/** FR-4: draw rectangles (drag) and polygons (clicks), select, move, resize, label and delete masks. */
export function MaskEditor({ src, alt, masks, onChange }: { src: string; alt: string; masks: CardMask[]; onChange: (m: CardMask[]) => void }) {
  const [tool, setTool] = useState<Tool>('rect');
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Pt[] | null>(null); // rect being dragged
  const [poly, setPoly] = useState<Pt[]>([]); // polygon being clicked
  const drag = useRef<Drag | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const full = masks.length >= MAX_MASKS_PER_IMAGE;
  const current = masks.find((m) => m.id === selected) ?? null;

  const box = () => svg.current!.getBoundingClientRect();
  const at = (e: PointerEvent) => normalize({ x: e.clientX, y: e.clientY }, box());
  const setPolygon = (id: string, polygon: Pt[]) => onChange(masks.map((m) => (m.id === id ? { ...m, polygon } : m)));

  function add(polygon: Pt[]) {
    if (full) return;
    const m: CardMask = { id: crypto.randomUUID(), polygon, label: t('cards.mask.defaultLabel', { n: masks.length + 1 }) };
    onChange([...masks, m]);
    setSelected(m.id);
    track('mask_created', {});
  }

  function closePolygon() {
    // a double click adds the same point twice: drop near-duplicates before closing
    const pts = poly.filter((p, i) => i === 0 || Math.hypot(p.x - poly[i - 1]!.x, p.y - poly[i - 1]!.y) > 0.002);
    if (pts.length >= 3) add(pts);
    setPoly([]);
  }

  function remove(id: string) {
    onChange(masks.filter((m) => m.id !== id));
    setSelected(null);
  }

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    const p = at(e);
    if (tool === 'rect') {
      if (full) return;
      drag.current = { kind: 'rect', start: p };
      setDraft(rectToPolygon(p, p));
    } else if (tool === 'polygon') {
      if (full) return;
      const r = box();
      if (poly.length >= MAX_VERTICES || (poly.length >= 3 && nearestVertex([poly[0]!], p, r, HIT_PX) === 0)) closePolygon();
      else setPoly([...poly, p]);
      return;
    } else {
      const r = box();
      const i = current ? nearestVertex(current.polygon, p, r, HIT_PX) : -1;
      if (current && i >= 0) drag.current = { kind: 'vertex', id: current.id, i, orig: current.polygon };
      else {
        const hit = [...masks].reverse().find((m) => pointInPolygon(p, m.polygon));
        setSelected(hit?.id ?? null);
        if (hit) drag.current = { kind: 'move', id: hit.id, start: p, orig: hit.polygon };
      }
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d) return;
    const p = at(e);
    if (d.kind === 'rect') setDraft(rectToPolygon(d.start, p));
    else if (d.kind === 'move') setPolygon(d.id, translate(d.orig, p.x - d.start.x, p.y - d.start.y));
    else setPolygon(d.id, moveVertex(d.orig, d.i, p));
  }

  function onPointerUp(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    drag.current = null;
    if (d?.kind !== 'rect') return;
    const shape = rectToPolygon(d.start, at(e));
    setDraft(null);
    if (!isTiny(shape)) add(shape);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!(e.target instanceof Node) || !svg.current?.contains(e.target)) return; // only on the drawing surface (not the label input or tools)
    if (e.key === 'Enter' && tool === 'polygon' && poly.length >= 3) {
      e.preventDefault();
      closePolygon();
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && current) {
      e.preventDefault();
      remove(current.id);
    } else if (current && e.key.startsWith('Arrow')) {
      e.preventDefault();
      const s = e.shiftKey ? STEP * 5 : STEP;
      const [dx, dy] = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key] ?? [0, 0];
      setPolygon(current.id, translate(current.polygon, dx!, dy!));
    }
  }

  const tools = (['select', 'rect', 'polygon'] as const).map((v) => ({ value: v, label: t(`cards.mask.tool.${v}`) }));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row" onKeyDown={onKeyDown}>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-map bg-canvas p-2">
        <div className="relative inline-block">
          <img src={src} alt={alt} draggable={false} className="block max-h-[calc(100dvh-12rem)] max-w-full select-none" />
          <svg
            ref={svg}
            role="group"
            tabIndex={0}
            aria-label={t('cards.mask.surface')}
            className={`absolute inset-0 h-full w-full touch-none ${tool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onDoubleClick={() => tool === 'polygon' && closePolygon()}
          >
            {masks.map((m) => (
              <g
                key={m.id}
                role="button"
                tabIndex={0}
                aria-label={t('cards.mask.item', { label: m.label })}
                aria-pressed={m.id === selected}
                onFocus={() => setSelected(m.id)}
                className="outline-none"
              >
                <MaskShape mask={m} selected={m.id === selected} />
              </g>
            ))}
            {draft ? <polygon points={toPoints(draft)} fill="var(--apricot)" fillOpacity={0.5} stroke="var(--primary)" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" /> : null}
            {poly.length ? <polyline points={toPoints(poly)} fill="none" stroke="var(--primary)" strokeWidth={2} vectorEffect="non-scaling-stroke" /> : null}
          </svg>
          {current ? current.polygon.map((p, i) => <Handle key={i} p={p} />) : null}
          {poly.map((p, i) => (
            <Handle key={`p${i}`} p={p} first={i === 0} />
          ))}
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-4 md:w-72">
        <Segmented
          aria-label={t('cards.mask.tools')}
          options={tools}
          value={tool}
          onValueChange={(v) => {
            setTool(v as Tool);
            setPoly([]);
          }}
        />
        <p className="text-xs text-muted">{t(`cards.mask.${tool === 'select' ? 'selectHint' : tool === 'rect' ? 'rectHint' : 'polygonHint'}`)}</p>
        <p className="text-sm font-semibold" aria-live="polite">
          {t('cards.mask.count', { n: masks.length, max: MAX_MASKS_PER_IMAGE })}
        </p>
        {full ? <Alert tone="watch" title={t('cards.mask.limit', { max: MAX_MASKS_PER_IMAGE })} /> : null}
        {/* keyboard path: pointer-only drawing would leave keyboard users unable to create a mask */}
        <Button variant="secondary" disabled={full} onClick={() => add(rectToPolygon({ x: 0.35, y: 0.4 }, { x: 0.65, y: 0.6 }))}>
          {t('cards.mask.add')}
        </Button>
        {current ? (
          <div className="flex flex-col gap-3">
            <Input
              label={t('cards.mask.label')}
              value={current.label}
              maxLength={120}
              onChange={(e) => onChange(masks.map((m) => (m.id === current.id ? { ...m, label: e.target.value } : m)))}
            />
            <Button variant="danger" onClick={() => remove(current.id)}>
              {t('cards.mask.delete')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
