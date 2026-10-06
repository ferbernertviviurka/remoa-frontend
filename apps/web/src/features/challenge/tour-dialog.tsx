'use client';

import { t } from '@remoa/strings';
import { ChallengeTour } from '@remoa/ui';

// P-507 (D-1071): the tour dialog loads when it opens (first own map, palette, map help), not in every page's initial JS.
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

export function TourDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (open: boolean) => void; onDone: () => void }) {
  return (
    <ChallengeTour
      open={open}
      onOpenChange={onOpenChange}
      onDone={onDone}
      title={t('challengeSetup.tour.title')}
      closeLabel={t('common.close')}
      steps={steps}
      stepLabels={stepLabels}
      labels={labels}
      demo={demo}
    />
  );
}
