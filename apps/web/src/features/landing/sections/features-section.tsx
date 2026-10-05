'use client';

import { useEffect, useRef, useState } from 'react';
import { strings, t } from '@remoa/strings/landing';
import { FeatureExplorer, Section, type FeatureItem } from '@remoa/ui';
import type { LandingFlags } from '../flags';
import { track } from '@/lib/analytics';
import { RevealFallback } from './use-reveal-fallback';
import '../shell/shell.css';

/** ids match the `feature_tab_selected` enum in contracts. */
export const FEATURE_IDS = ['map', 'cards', 'challenge', 'grading', 'fsrs', 'enamed'] as const;
const FILES = ['mapa', 'cards', 'desafio', 'correcao', 'fsrs', 'enamed'];
const AUTO_MS = 4000;

/**
 * Auto-advances the tabs every AUTO_MS while the section is on screen (desktop only: on mobile the accordion would jump the page).
 * Hover/focus inside pauses and restarts the current step; picking a tab stops it for good. `running` drives the progress bar.
 */
function useAutoAdvance(active: string, setActive: (id: string) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const [stopped, setStopped] = useState(false);
  const [visible, setVisible] = useState(false);
  const [held, setHeld] = useState(false);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (stopped || !el || typeof IntersectionObserver === 'undefined' || !window.matchMedia?.('(min-width: 768px)').matches) return;
    setArmed(true);
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    const hold = () => setHeld(el.matches(':hover') || el.contains(document.activeElement));
    const ev = ['pointerenter', 'pointerleave', 'focusin', 'focusout'] as const;
    ev.forEach((n) => el.addEventListener(n, hold));
    return () => { setArmed(false); io.disconnect(); ev.forEach((n) => el.removeEventListener(n, hold)); };
  }, [stopped]);
  const running = visible && !held && !stopped;
  useEffect(() => {
    if (!running) return;
    const i = FEATURE_IDS.indexOf(active as (typeof FEATURE_IDS)[number]);
    const timer = setTimeout(() => setActive(FEATURE_IDS[(i + 1) % FEATURE_IDS.length]!), AUTO_MS);
    return () => clearTimeout(timer);
  }, [running, active, setActive]);
  return { ref, running, showBar: armed && !stopped, stop: () => setStopped(true) };
}

/** Decorative step bar (the tabs already expose the state): done steps full, the current one fills over AUTO_MS while running. */
function StepProgress({ active, running }: { active: string; running: boolean }) {
  const at = FEATURE_IDS.indexOf(active as (typeof FEATURE_IDS)[number]);
  return (
    <div aria-hidden="true" className="mb-6 flex gap-1.5">
      {FEATURE_IDS.map((id, i) => (
        <span key={id} className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--on-dark-line)]">
          <span
            key={i === at ? `${active}-${running}` : id}
            className={`block h-full origin-left rounded-full bg-on-dark ${i === at && running ? 'lp-step-fill' : ''}`}
            style={{ transform: `scaleX(${i < at || (i === at && !running) ? 1 : 0})`, opacity: i === at && !running ? 0.5 : 1, animationDuration: `${AUTO_MS}ms` }}
          />
        </span>
      ))}
    </div>
  );
}

export function FeaturesSection({ flags }: { flags?: Partial<LandingFlags> }) {
  const approved = !!flags?.approvedContent;
  const [active, setActive] = useState<string>(FEATURE_IDS[0]);
  const auto = useAutoAdvance(active, setActive);
  const items: FeatureItem[] = strings.landing.explorer.items.map((it, i) => {
    const id = FEATURE_IDS[i]!;
    return { id, title: it.title, description: id === 'grading' ? (approved ? strings.landing.grading.textApproved : strings.landing.grading.text) : it.description, benefits: [...(id === 'grading' && approved && 'benefitsApproved' in it ? it.benefitsApproved : it.benefits)], image: { src: `/landing/feat-${FILES[i]}.svg`, alt: id === 'grading' && approved ? strings.landing.featureAlts.gradingApproved : strings.landing.featureAlts[id], width: 640, height: 420 } };
  });
  return (
    <Section id="recursos" tone="dark" eyebrow={t('landing.nav.anchors.features')} title={t('landing.explorer.title')} lead={t('landing.explorer.lead')}>
      <RevealFallback />
      <div ref={auto.ref}>
      {auto.showBar ? <StepProgress active={active} running={auto.running} /> : null}
      <FeatureExplorer
        items={items}
        activeId={active}
        tablistLabel={t('landing.explorer.tablistAria')}
        onChange={(id) => {
          auto.stop();
          setActive(id);
          track('feature_tab_selected', { feature: id as (typeof FEATURE_IDS)[number] });
        }}
        caption={t('landing.explorer.caption', { tab: items.find((i) => i.id === active)?.title.toLowerCase() ?? '' })}
      />
      </div>
    </Section>
  );
}
