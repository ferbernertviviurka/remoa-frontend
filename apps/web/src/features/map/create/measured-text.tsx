'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { useTextMorph } from '@remoa/ui';

/** Greedy word wrap by measured width. `measure` is injected so it can be unit-tested without a canvas. */
export function splitLines(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const w of text.split(' ')) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && measure(next) > maxWidth) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

let ctx: CanvasRenderingContext2D | null = null; // cached only once it exists (jsdom has none)
const canvas = () => (ctx ??= typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d'));

function measureLines(el: HTMLElement, text: string): string[] | null {
  const c = canvas();
  const width = el.getBoundingClientRect().width;
  if (!c || width <= 0) return null;
  const cs = getComputedStyle(el);
  c.font = cs.font;
  if ('letterSpacing' in c) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
  return splitLines(text, width - 1, (s) => c.measureText(s).width);
}

/**
 * Multi-line text that morphs with Torph. TextMorph's root is `nowrap`, so each visual line is its own TextMorph (stable key = line index);
 * lines come from measuring the container (font, letter-spacing, width) and are recomputed on resize and when fonts load.
 * Until measured (SSR, first paint, no canvas), until Torph arrives after the first paint, and with reduced motion (P-512, Torph never
 * downloads then), it is a plain, normally wrapping paragraph.
 */
export function MeasuredText({ text, className, as: Tag = 'p' }: { text: string; className?: string; as?: 'p' | 'span' }) {
  const ref = useRef<HTMLElement>(null);
  const [lines, setLines] = useState<string[] | null>(null);
  const TextMorph = useTextMorph();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Torph captures glyph positions when it mounts: wait for the web fonts, or it measures the fallback font (words glued together).
    let alive = true;
    const fonts = typeof document === 'undefined' ? undefined : document.fonts;
    let ready = !fonts || fonts.status === 'loaded';
    const run = () => alive && ready && setLines(measureLines(el, text));
    if (!ready) void fonts?.ready.then(() => ((ready = true), run()));
    else run();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(run);
    ro?.observe(el);
    return () => {
      alive = false;
      ro?.disconnect();
    };
  }, [text]);

  return (
    // w-full/min-w-0: the width we measure must come from the parent, not from the content (a flex item would shrink to its own lines and loop)
    <Tag ref={ref as never} className={`w-full min-w-0 ${className ?? ''}`}>
      {lines && TextMorph
        ? lines.map((l, i) => (
            // block wrapper, inline-block TextMorph root: Torph sizes its own root, a `block` root broke the glyph offsets
            <span key={i} className="block"><TextMorph as="span" locale="pt-BR" duration={320} ease="cubic-bezier(0.19, 1, 0.22, 1)" respectReducedMotion>{l}</TextMorph></span>
          ))
        : text}
    </Tag>
  );
}
