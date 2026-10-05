'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { Button } from '../button';
import { Dialog } from '../dialog';
import { Icon } from '../icons';
import { labelTone } from './palette';

export type CalendarTourCloseHow = 'finish' | 'skip' | 'create' | 'esc';

export type CalendarTourDemo = {
  coverChip: string; label: string; eventTitle: string; when: string; place: string; notes: string;
  labels: readonly [string, string, string, string]; rows: readonly [string, string, string];
  d1: string; d1At: string; d0: string; d0At: string; bell: string;
  upcoming: string; items: ReadonlyArray<{ day: string; mon: string; title: string; chip: string; urgent: boolean }>;
};

/**
 * CalendarTour (F25 FR-16): modal de 5 passos com ilustração animada por passo (tabela de movimentos do FRD).
 * Troca de passo em 500 ms vindo da direita (Próximo) ou da esquerda (Voltar); pontos de progresso: o ativo alarga em 400 ms.
 * Voltar/Próximo/Pular, setas e Esc. Último passo: `createCta` (padrão) mostra "Criar meu primeiro compromisso" (`onClose('create')`);
 * sem ele, o botão é `text.done` (`onClose('finish')`). Seta para a direita no último passo também conclui (`finish`). Esc e clique fora = `esc`.
 * `onStep(n)` (1–5) dispara ao abrir e a cada troca. Movimento reduzido (CSS de motion.css) mostra as ilustrações já montadas: os keyframes só têm `from`.
 */
export type CalendarTourProps = {
  open: boolean;
  onClose: (how: CalendarTourCloseHow) => void;
  onStep?: (step: number) => void;
  steps: ReadonlyArray<{ title: string; body: string }>;
  createCta?: boolean;
  demo: CalendarTourDemo;
  text: { dialog: string; eyebrow: (step: number, total: number) => string; skip: string; back: string; next: string; create: string; done: string };
};

const d = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });
const tone = {
  prova: labelTone('#C2410C'), trabalho: labelTone('#CA8A04'), importante: labelTone('#6D5BD0'), plantao: labelTone('#0F766E'),
};

function Illustration({ step, demo }: { step: number; demo: CalendarTourDemo }) {
  if (step === 0) {
    const bars: Record<number, string> = { 10: tone.prova.dot, 17: tone.trabalho.dot, 23: tone.importante.dot };
    return (
      <div className="w-[380px] max-w-[92%] rounded-[24px] border border-border bg-soft p-3.5">
        <div className="grid grid-cols-7 gap-1" aria-hidden="true">
          {Array.from({ length: 28 }, (_, i) => (
            <span key={i} className="popn relative h-[42px] rounded-[8px] border border-divider bg-surface" style={d(i * 16)}>
              <span className="block px-1.5 pt-[3px] text-[10.5px] font-bold text-muted">{i + 1}</span>
              {i === 11 ? <span className="popn absolute left-1 top-1 size-[22px] rounded-full bg-primary" style={d(450)} /> : null}
              {bars[i + 1] ? <span className="popn absolute inset-x-1 bottom-1 h-2 rounded-[3px] border-l-[3px]" style={{ ...d(700 + (i % 5) * 40), background: `color-mix(in srgb, ${bars[i + 1]} 20%, white)`, borderLeftColor: bars[i + 1] }} /> : null}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (step === 1)
    return (
      <div className="popn w-[340px] max-w-[92%] overflow-hidden rounded-[24px] border border-border bg-surface shadow-float">
        <div className="flex h-[104px] items-end justify-end p-2.5" style={{ background: `linear-gradient(135deg, ${tone.prova.from}, ${tone.prova.to})`, animation: 'popn .6s cubic-bezier(.22,1,.36,1) both' }}>
          <span className="rounded-pill bg-surface px-2.5 py-0.5 text-[11px] font-bold" style={{ color: tone.prova.text }}>{demo.coverChip}</span>
        </div>
        <div className="flex flex-col gap-2 p-4">
          <span className="slide w-fit rounded-pill px-2.5 py-0.5 text-xs font-bold" style={{ ...d(250), background: tone.prova.bg, color: tone.prova.text }}>{demo.label}</span>
          <span className="overflow-hidden whitespace-nowrap font-display text-xl font-bold text-ink" style={{ animation: 'cal-type 1.1s steps(24) .7s both' }}>{demo.eventTitle}</span>
          {([['clock', demo.when], ['link', demo.place], ['pencil', demo.notes]] as const).map(([ic, tx], i) => (
            <span key={ic} className="slide flex items-center gap-2 text-sm text-ink-2" style={d(1000 + i * 250)}><span className="text-muted"><Icon name={ic} size={16} /></span>{tx}</span>
          ))}
        </div>
      </div>
    );
  if (step === 2) {
    const chips = [tone.prova, tone.trabalho, tone.importante, tone.plantao];
    return (
      <div className="flex w-[380px] max-w-[92%] flex-col items-center gap-3.5">
        <div className="flex flex-wrap justify-center gap-2">
          {demo.labels.map((n, i) => (
            <span key={n} className="popn inline-flex items-center gap-2 rounded-pill px-3.5 py-1.5 text-sm font-bold" style={{ ...d(i * 120), background: chips[i]!.bg, color: chips[i]!.text }}>
              <span className="size-2.5 rounded-full" style={{ background: chips[i]!.dot }} />{n}
            </span>
          ))}
        </div>
        <div className="flex w-full flex-col gap-2 rounded-[20px] border border-border bg-soft p-3">
          {demo.rows.map((r, i) => (
            <span key={r} className="slide rounded-[10px] border-l-[3px] bg-surface px-3 py-2.5 text-sm font-bold text-ink" style={{ ...d(500 + i * 80), borderLeftColor: chips[i]!.dot, ...(i ? { opacity: i === 1 ? 0.55 : 0.2, animation: `slidein .5s cubic-bezier(.22,1,.36,1) ${500 + i * 80}ms both, cal-dim .6s ease 1.8s both` } : {}) }}>{r}</span>
          ))}
        </div>
      </div>
    );
  }
  if (step === 3)
    return (
      <div className="relative h-[180px] w-[420px] max-w-[92%]">
        <span className="popn absolute left-1/2 top-4 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 text-[13px] font-bold text-ink" style={d(2100)}><Icon name="bell" size={14} />{demo.bell}</span>
        <span className="fillx absolute left-[60px] right-[60px] top-[84px] h-[3px] rounded bg-primary" style={{ animationDuration: '1.6s' }} />
        <span className="absolute left-[44px] top-[44px] flex size-9 items-center justify-center rounded-[10px] bg-primary-tint text-primary-deep" style={{ animation: 'cal-travel 2.4s ease-in-out infinite' }}><Icon name="mail" size={18} /></span>
        {([[demo.d1, demo.d1At, 'left-[60px]'], [demo.d0, demo.d0At, 'right-[60px]']] as const).map(([a, b, pos]) => (
          <span key={a} className={`absolute top-[68px] flex flex-col items-center text-center text-xs ${pos} ${pos.startsWith('left') ? '-translate-x-1/2' : 'translate-x-1/2'}`}>
            <span className="popn size-8 rounded-full border-[3px] border-primary bg-surface" />
            <span className="mt-1.5 font-bold text-ink">{a}</span><span className="text-muted">{b}</span>
          </span>
        ))}
      </div>
    );
  return (
    <div className="popn w-[340px] max-w-[92%] rounded-[24px] border border-border bg-surface p-4 shadow-float" style={{ animationDuration: '.6s' }}>
      <span className="block border-b border-divider pb-2 font-display text-lg font-bold text-ink">{demo.upcoming}</span>
      {demo.items.map((it, i) => (
        <span key={it.title} className={`flex items-center gap-3 py-2 ${i ? 'border-t border-divider' : ''}`}>
          <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[12px] bg-soft leading-none"><b className="font-display text-base">{it.day}</b><span className="text-[10px] font-bold uppercase text-muted">{it.mon}</span></span>
          <span className="grow text-sm font-bold text-ink">{it.title}</span>
          <span className={`shrink-0 rounded-pill px-2.5 py-0.5 text-xs font-bold ${it.urgent ? 'cal-pulse-d bg-watch-bg text-watch-text' : 'bg-chip text-primary-deep'}`}>{it.chip}</span>
        </span>
      ))}
    </div>
  );
}

export function CalendarTour({ open, onClose, onStep, steps, createCta = true, demo, text }: CalendarTourProps) {
  const [st, setSt] = useState<{ step: number; dir: 'next' | 'prev' }>({ step: 0, dir: 'next' });
  const total = steps.length;
  const last = st.step === total - 1;
  useEffect(() => { if (open) onStep?.(st.step + 1); }, [open, st.step]); // eslint-disable-line react-hooks/exhaustive-deps -- onStep é callback de telemetria
  const go = (by: 1 | -1) => {
    if (by === 1 && last) { onClose('finish'); return; }
    setSt((s) => ({ step: Math.min(total - 1, Math.max(0, s.step + by)), dir: by === 1 ? 'next' : 'prev' }));
  };
  const anim = st.dir === 'next' ? 'tour-next' : 'tour-prev';
  const cur = steps[st.step]!;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose('esc'); }} title={text.dialog} closeLabel={text.skip} size="tour" srOnlyHeader>
      <div
        onKeyDown={(e) => { if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); }}
        className="flex flex-col overflow-hidden rounded-[36px] bg-surface shadow-[0_40px_110px_rgba(26,21,51,.55)]"
      >
        <div className="flex items-center justify-between px-6 pt-4">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{text.eyebrow(st.step + 1, total)}</span>
          <button type="button" onClick={() => onClose('skip')} className="min-h-11 px-2.5 text-sm font-bold text-muted focus-visible:outline-2 focus-visible:outline-primary">{text.skip}</button>
        </div>
        <div className="relative h-[330px] overflow-hidden bg-gradient-to-b from-soft to-surface">
          <div key={st.step} className={`${anim} flex h-full items-center justify-center`} aria-hidden="true"><Illustration step={st.step} demo={demo} /></div>
        </div>
        <div key={`t${st.step}`} className={`${anim} flex min-h-[128px] flex-col gap-2 px-10 pb-2 pt-1.5`}>
          <h2 className="m-0 font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.035em] text-ink">{cur.title}</h2>
          <p className="m-0 text-[16.5px] leading-[1.55] text-ink-2">{cur.body}</p>
        </div>
        <div className="flex items-center justify-between gap-3 px-8 pb-6 pt-3.5">
          <span aria-hidden="true" className="flex items-center gap-[7px]">
            {steps.map((_, i) => <span key={i} className={`block h-2 rounded-[4px] transition-[width,background-color] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${i === st.step ? 'w-7 bg-primary' : 'w-2 bg-border-strong'}`} />)}
          </span>
          <span className="flex gap-2.5">
            {st.step > 0 ? <Button variant="secondary" size="lg" onClick={() => go(-1)}>{text.back}</Button> : null}
            {last ? (
              <Button size="lg" onClick={() => onClose(createCta ? 'create' : 'finish')}>{createCta ? text.create : text.done}</Button>
            ) : (
              <Button size="lg" onClick={() => go(1)}>{text.next}</Button>
            )}
          </span>
        </div>
      </div>
    </Dialog>
  );
}
