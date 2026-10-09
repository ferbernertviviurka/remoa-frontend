'use client';

import { strings } from '@remoa/strings/landing';
import { Section } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { useDemoPlayer } from '../use-demo';
import '../demos.css';
import { BankPlayer } from './bank-player';

const b = strings.landing.bank;
const stepOn = ['calOn1', 'calOn2', 'calOn3'];

export function BankSection() {
  const demo = useDemoPlayer(() => track('bank_demo_viewed', {}));
  return (
    <Section id="banco" eyebrow={b.eyebrow} title={b.title} lead={b.lead}>
      <div ref={demo.root} className="lp-bank grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
        <ol className="m-0 flex list-none flex-col gap-3.5 p-0 lg:col-span-5">
          {b.steps.map((step, i) => (
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
          <BankPlayer playerRef={demo.player} />
        </div>
      </div>
    </Section>
  );
}
