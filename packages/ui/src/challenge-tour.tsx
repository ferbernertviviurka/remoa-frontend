'use client';

import { useState, type CSSProperties } from 'react';
import { Button } from './button';
import { Dialog } from './dialog';
import { Tag } from './tag';

export type ChallengeTourScene = 'format' | 'answer' | 'reveal' | 'glow';

/**
 * ChallengeTour (G14 C1): diálogo em passos que mostra como funciona o desafio, cada passo com uma mini-animação
 * (`scene`): escolher o formato, responder um card, revelar e marcar, o mapa "acendendo" pela lembrança estimada.
 * Animações só com transform/opacity e keyframes de `from` (motion.css): com movimento reduzido fica o quadro final, estático.
 * Controlado (`open`/`onOpenChange`); "Entendi" no último passo chama `onDone` e fecha. Texto todo por props.
 */
export type ChallengeTourProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  title: string;
  closeLabel: string;
  steps: readonly { scene: ChallengeTourScene; title: string; body: string }[];
  /** "Passo 1 de 4", um por passo */
  stepLabels: readonly string[];
  labels: { next: string; back: string; done: string };
  demo: { card: string; answer: string; correct: string; wrong: string; self: string; ai: string; soon: string };
};

const delay = (s: number): CSSProperties => ({ animationDelay: `${s}s` });

function Scene({ scene, demo }: { scene: ChallengeTourScene; demo: ChallengeTourProps['demo'] }) {
  if (scene === 'format')
    return (
      <div className="flex w-full max-w-[280px] flex-col gap-2">
        <div className="pop flex items-center gap-2.5 rounded-[14px] border-2 border-primary bg-primary-tint px-3 py-2.5 text-sm font-bold text-primary-deep" style={delay(0.15)}>
          <span className="size-4 rounded-full border-[5px] border-primary bg-surface" />
          {demo.self}
        </div>
        <div className="slide flex items-center gap-2.5 rounded-[14px] border-2 border-border bg-surface px-3 py-2.5 text-sm font-bold text-muted" style={delay(0.35)}>
          <span className="size-4 rounded-full border-2 border-unknown-soft" />
          <span className="grow">{demo.ai}</span>
          <Tag tone="unknown">{demo.soon}</Tag>
        </div>
      </div>
    );
  if (scene === 'answer')
    return (
      <div className="flex w-full max-w-[280px] flex-col gap-2.5">
        <div className="pop rounded-[14px] border-2 border-primary bg-surface px-3 py-2.5 font-display text-base font-bold shadow-[0_0_0_5px_var(--primary-tint)]">{demo.card}</div>
        <div className="rounded-[12px] border-[1.5px] border-border-strong bg-surface px-3 py-2 text-sm">
          <span className="slide inline-block" style={delay(0.4)}>{demo.answer}</span>
        </div>
      </div>
    );
  if (scene === 'reveal')
    return (
      <div className="flex w-full max-w-[280px] flex-col gap-2.5">
        <div className="slide rounded-[12px] bg-primary-tint px-3 py-2 text-sm font-semibold text-primary-deep" style={delay(0.1)}>{demo.answer}</div>
        <div className="grid grid-cols-2 gap-2">
          <span className="slide rounded-[12px] border-[1.5px] border-border bg-surface px-3 py-2 text-center text-sm font-bold" style={delay(0.35)}>{demo.wrong}</span>
          <span className="pop rounded-[12px] border-[1.5px] border-primary bg-primary-tint px-3 py-2 text-center text-sm font-bold text-primary-deep" style={delay(0.6)}>{demo.correct}</span>
        </div>
      </div>
    );
  const dots = [
    ['steady', 0.2],
    ['watch', 0.45],
    ['steady', 0.7],
    ['review', 0.95],
    ['steady', 1.2],
  ] as const;
  const fill = { steady: 'bg-steady border-steady', watch: 'bg-watch border-watch', review: 'bg-review border-review' };
  return (
    <div className="relative h-[90px] w-[220px]" aria-hidden="true">
      <svg viewBox="0 0 220 90" className="absolute inset-0 size-full">
        <path d="M24 45 L76 20 L132 45 L188 22 M76 20 L110 75 L188 22" fill="none" stroke="var(--color-border-strong)" strokeWidth="2" />
      </svg>
      {([[24, 45], [76, 20], [132, 45], [188, 22], [110, 75]] as const).map(([x, y], i) => (
        <span key={i} className="absolute size-[22px] rounded-full border-2 border-unknown-soft bg-unknown-bg" style={{ left: x - 11, top: y - 11 }}>
          <span className={`pop absolute -inset-0.5 rounded-full border-2 ${fill[dots[i]![0]]}`} style={delay(dots[i]![1])} />
        </span>
      ))}
    </div>
  );
}

export function ChallengeTour({ open, onOpenChange, onDone, title, closeLabel, steps, stepLabels, labels, demo }: ChallengeTourProps) {
  const [i, setI] = useState(0);
  const step = steps[i]!;
  const last = i === steps.length - 1;
  const change = (o: boolean) => {
    if (!o) setI(0);
    onOpenChange(o);
  };
  return (
    <Dialog open={open} onOpenChange={change} title={title} closeLabel={closeLabel}>
      <div className="flex flex-col gap-4">
        <div key={i} aria-hidden="true" className="flex h-[150px] items-center justify-center rounded-[20px] bg-canvas p-4">
          <Scene scene={step.scene} demo={demo} />
        </div>
        <div aria-live="polite" className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{stepLabels[i]}</span>
          <h3 className="m-0 font-display text-lg font-bold">{step.title}</h3>
          <p className="m-0 text-sm leading-[1.5] text-muted">{step.body}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex grow gap-1.5" aria-hidden="true">
            {steps.map((s, k) => (
              <span key={s.scene} className={`h-1.5 w-6 rounded-full ${k <= i ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </span>
          {i > 0 ? (
            <Button variant="secondary" size="sm" onClick={() => setI(i - 1)}>
              {labels.back}
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={() => {
              if (!last) return setI(i + 1);
              onDone();
              change(false);
            }}
          >
            {last ? labels.done : labels.next}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
