'use client';

import { useEffect, useState } from 'react';
import { t } from '@remoa/strings';
import { ChallengeTour } from '@remoa/ui';

const EVENT = 'remoa:challenge-tour';
/**
 * D-606: "já viu o tutorial do desafio" fica no navegador. Não há campo por usuário no perfil/onboarding (CCR se o
 * Fernando quiser entre aparelhos, P-249). try/catch: storage bloqueado = mostra de novo, nunca quebra o mapa.
 */
export const TOUR_KEY = 'remoa-challenge-tour';

export const openChallengeTour = () => window.dispatchEvent(new Event(EVENT));

/** First own map opened in this browser: shows the tour once. */
export function maybeShowChallengeTour() {
  try {
    if (localStorage.getItem(TOUR_KEY)) return;
  } catch {
    /* storage blocked: show it */
  }
  openChallengeTour();
}

const markSeen = () => {
  try {
    localStorage.setItem(TOUR_KEY, '1');
  } catch {
    /* storage blocked */
  }
};

const scenes = ['format', 'answer', 'reveal', 'glow'] as const;
const steps = scenes.map((scene) => ({ scene, title: t(`challengeSetup.tour.steps.${scene}.title`), body: t(`challengeSetup.tour.steps.${scene}.body`) }));
const stepLabels = scenes.map((_, i) => t('challengeSetup.tour.stepOf', { n: i + 1, total: scenes.length }));
const labels = { next: t('challengeSetup.tour.next'), back: t('challengeSetup.tour.back'), done: t('challengeSetup.tour.done') };
const demo = {
  card: t('challengeSetup.tour.demo.card'),
  answer: t('challengeSetup.tour.demo.answer'),
  correct: t('challengeSetup.tour.demo.correct'),
  wrong: t('challengeSetup.tour.demo.wrong'),
  self: t('challengeSetup.tour.demo.self'),
  ai: t('challengeSetup.tour.demo.ai'),
  soon: t('challengeSetup.dialog.soon'),
};

/** Mounted once in the shell: opens on `openChallengeTour()` (first map, palette, map help). Closing in any way marks it seen. */
export function ChallengeTourHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(EVENT, show);
    return () => window.removeEventListener(EVENT, show);
  }, []);
  return (
    <ChallengeTour
      open={open}
      onOpenChange={(o) => {
        if (!o) markSeen();
        setOpen(o);
      }}
      onDone={markSeen}
      title={t('challengeSetup.tour.title')}
      closeLabel={t('common.close')}
      steps={steps}
      stepLabels={stepLabels}
      labels={labels}
      demo={demo}
    />
  );
}
