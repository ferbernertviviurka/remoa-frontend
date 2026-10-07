'use client';

import { useState } from 'react';
import { CHALLENGE_OPTION_AVAILABLE, DEFAULT_CHALLENGE_OPTIONS, type ChallengeOptions, type ChallengeOrder, type GradingMode, type StudyOrder } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, ChoiceRow, Dialog } from '@remoa/ui';

const soon = t('challengeSetup.dialog.soon');

/**
 * G14 ponto 21 (D-604): "Desafiar este mapa" pergunta o formato (Eu respondo · IA responde "Em breve") e a ordem
 * (Aleatório · Seguindo o fluxo das setas) antes de começar. O que o servidor ainda não aceita vem de CHALLENGE_OPTION_AVAILABLE.
 */
export function ChallengeSetupDialog({ open, onOpenChange, onStart, hasTrail = false }: { open: boolean; onOpenChange: (o: boolean) => void; onStart: (o: ChallengeOptions, studyOrder?: StudyOrder) => void; hasTrail?: boolean }) {
  const [gradingMode, setGrading] = useState<GradingMode>(DEFAULT_CHALLENGE_OPTIONS.gradingMode);
  const [order, setOrder] = useState<ChallengeOrder>(DEFAULT_CHALLENGE_OPTIONS.order);
  const [studyOrder, setStudyOrder] = useState<StudyOrder>('trail'); // F31 FR-10 (D-1481): only on trail maps
  const grading = (['self', 'ai'] as const).map((g) => ({ g, off: !CHALLENGE_OPTION_AVAILABLE.gradingMode[g] }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('challengeSetup.dialog.title')} description={t('challengeSetup.dialog.description')} closeLabel={t('common.close')}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          onStart({ gradingMode, order, answerMode: 'write' }, hasTrail ? studyOrder : undefined);
        }}
      >
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-sm font-bold">{t('challengeSetup.dialog.format')}</legend>
          {grading.map(({ g, off }) => (
            <ChoiceRow
              key={g}
              size="lg"
              indicator="radio"
              selected={gradingMode === g}
              onSelect={() => setGrading(g)}
              disabled={off}
              title={t(`challengeSetup.dialog.${g}.title`)}
              description={t(`challengeSetup.dialog.${g}.description`)}
              badge={off ? soon : undefined}
            />
          ))}
        </fieldset>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-sm font-bold">{t('challengeSetup.dialog.order')}</legend>
          {(['random', 'flow'] as const).map((o) => (
            <ChoiceRow
              key={o}
              size="lg"
              indicator="radio"
              selected={order === o}
              onSelect={() => setOrder(o)}
              title={t(`challengeSetup.dialog.${o}.title`)}
              description={t(`challengeSetup.dialog.${o}.description`)}
            />
          ))}
        </fieldset>
        {hasTrail ? (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 text-sm font-bold">{t('challengeSetup.dialog.studyOrder')}</legend>
            {(['trail', 'mixed'] as const).map((o) => (
              <ChoiceRow
                key={o}
                size="lg"
                indicator="radio"
                selected={studyOrder === o}
                onSelect={() => setStudyOrder(o)}
                title={t(`challengeSetup.dialog.${o}.title`)}
                description={t(`challengeSetup.dialog.${o}.description`)}
              />
            ))}
          </fieldset>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{t('challengeSetup.dialog.cancel')}</Button>
          <Button type="submit">{t('challengeSetup.dialog.start')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
