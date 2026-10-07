'use client';

import { strings } from '@remoa/strings/landing';
import { Reveal, Section } from '@remoa/ui';
import { track } from '@/lib/analytics';
import type { IaFeature, IaFeatureState } from '../flags';
import { useDemoPlayer } from '../use-demo';
import '../demos.css';
import { iaCardBody, iaLead } from './ia-copy';
import { IaPlayer } from './ia-player';

const ia = strings.landing.ia;
const stepOn = ['iaOn1', 'iaOn2', 'iaOn3', 'iaOn4'];
const cards = ['pdf', 'gerar', 'corrigir', 'resumo'] as const satisfies readonly IaFeature[];

const icon = 'flex h-[52px] w-[52px] items-center justify-center rounded-2xl';

export function IaSection({ features }: { features: Record<IaFeature, IaFeatureState> }) {
  const demo = useDemoPlayer(() => track('ia_demo_viewed', {}));
  return (
    <Section id="ia" eyebrow={ia.eyebrow} title={ia.title} lead={iaLead(features)}>
      <div ref={demo.root} className="lp-ia grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
        <ol className="m-0 flex list-none flex-col gap-3.5 p-0 lg:col-span-5">
          {ia.steps.map((step, i) => (
            <li key={step.title} className="relative flex items-start gap-4 rounded-3xl border-[1.5px] border-border bg-surface px-5 py-[18px]">
              <span className={`stepGlow k ${stepOn[i]} pointer-events-none absolute inset-0 rounded-3xl border-[1.5px] border-primary bg-[#F3F2FB]`} aria-hidden />
              <span className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-extrabold text-white">{i + 1}</span>
              <span className="relative z-[1] flex flex-col gap-0.5">
                <span className="font-display text-xl font-extrabold tracking-[-0.02em]">{step.title}</span>
                <span className="text-[15px] leading-normal text-muted">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="lg:col-span-7">
          <IaPlayer playerRef={demo.player} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {cards.map((key) => {
          const card = ia.cards[key];
          const soon = features[key] === 'soon';
          return (
            <Reveal key={key}>
              <article className="flex h-full flex-col gap-2.5 rounded-[30px] border border-border bg-surface px-[26px] py-7">
                <CardIcon kind={key} />
                <h3 className="m-0 font-display text-[22px] leading-tight font-extrabold tracking-[-0.02em]">{card.title}</h3>
                <p className="m-0 text-[15.5px] leading-normal text-muted">{iaCardBody(key, features[key])}</p>
                {soon ? <span className="mt-auto self-start rounded-full bg-[#F3F2FB] px-3 py-0.5 text-xs font-extrabold text-primary-deep">{ia.soon}</span> : null}
                {key === 'pdf' && !soon ? (
                  <a href="/#planos" onClick={() => track('ia_cta_clicked', {})} className="mt-auto inline-flex min-h-11 items-center self-start rounded-full bg-[#F3F2FB] px-3 text-xs font-extrabold text-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{ia.pro}</a>
                ) : null}
              </article>
            </Reveal>
          );
        })}
      </div>
      <p className="m-0 text-center text-sm text-muted">{ia.warning}</p>
    </Section>
  );
}

function CardIcon({ kind }: { kind: IaFeature }) {
  const box = kind === 'pdf' ? 'bg-[#F3F2FB] text-primary' : kind === 'gerar' ? 'bg-[#E4DFF8] text-primary-deep' : kind === 'corrigir' ? 'bg-[#FEF3C7] text-[#854D0E]' : 'bg-[#FFEDD5] text-[#9A3412]';
  return (
    <span className={`${icon} ${box}`} aria-hidden>
      {kind === 'pdf' ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 15v5h16v-5" /></svg> : null}
      {kind === 'gerar' ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg> : null}
      {kind === 'corrigir' ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 6" /></svg> : null}
      {kind === 'resumo' ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg> : null}
    </span>
  );
}
