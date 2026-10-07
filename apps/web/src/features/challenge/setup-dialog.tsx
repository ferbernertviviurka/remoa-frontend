'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CHALLENGE_CARD_MAX,
  CHALLENGE_OPTION_AVAILABLE,
  CHALLENGE_SIZES,
  DEFAULT_CHALLENGE_OPTIONS,
  challengeFormats,
  type ChallengeConfig,
  type ChallengeFormat,
  type ChallengeOptions,
  type ChallengeOrder,
  type GradingMode,
  type StudyOrder,
} from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, ChoiceRow, Dialog, Segmented, Select } from '@remoa/ui';
import { rememberChallengeAiSession } from '@/features/challenge-ai/session-screen';
import { aiChallengeHref, aiCostUnits, startAiChallenge } from '@/features/challenge-ai/start-ai';

const soon = t('challengeSetup.dialog.soon');

type AiScope = 'card' | 'module' | 'board';
type AiDifficulty = ChallengeConfig['difficulty'];
type AiType = 'discursive' | 'objective' | 'mixed';
type AiGrading = 'now' | 'end';
type AiPreset = 'practice' | 'mock';

const SCOPES = ['card', 'module', 'board'] as const;
const DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed'] as const;
const TYPES = ['discursive', 'objective', 'mixed'] as const;
const GRADINGS = ['now', 'end'] as const;
const PRESETS = ['practice', 'mock'] as const;
const CARD_SIZES = Array.from({ length: CHALLENGE_CARD_MAX }, (_, i) => i + 1);

/** Group label for Segmented (required for a11y): the options read in order, built from the existing option strings. */
const joined = (labels: string[]) => labels.join(' · ');

/**
 * G14 ponto 21 (D-604): "Desafiar este mapa" pergunta o formato (Eu respondo · IA responde) e a ordem
 * (Aleatório · Seguindo o fluxo das setas) antes de começar. O que o servidor ainda não aceita vem de CHALLENGE_OPTION_AVAILABLE.
 *
 * F32 (G25, T6): "IA responde" abre os campos do desafio com IA neste modal e começa por POST /v1/challenge-ai/sessions. A flag
 * `CHALLENGE_OPTION_AVAILABLE.gradingMode.ai` continua false: o POST antigo recusa `ai` e a autoavaliação dele não pode virar IA.
 * `cardId` (botão Desafiar do card) trava o escopo em "card". `modules` = módulos da trilha do mapa (escopo "módulo").
 */
export function ChallengeSetupDialog({
  open,
  onOpenChange,
  onStart,
  hasTrail = false,
  boardId,
  cardId,
  modules = [],
  onAiStart,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onStart: (o: ChallengeOptions, studyOrder?: StudyOrder) => void;
  hasTrail?: boolean;
  boardId?: string;
  cardId?: string | null;
  modules?: readonly string[];
  /** Called with the new session id after the AI session was created, right before the navigation. */
  onAiStart?: (sessionId: string) => void;
}) {
  const router = useRouter();
  const [gradingMode, setGrading] = useState<GradingMode>(DEFAULT_CHALLENGE_OPTIONS.gradingMode);
  const [order, setOrder] = useState<ChallengeOrder>(DEFAULT_CHALLENGE_OPTIONS.order);
  const [studyOrder, setStudyOrder] = useState<StudyOrder>('trail'); // F31 FR-10 (D-1481): only on trail maps
  const [scopeChoice, setScope] = useState<AiScope>('board');
  const [moduleChoice, setModule] = useState<string | null>(null);
  const [format, setFormat] = useState<ChallengeFormat>('generated');
  const [countChoice, setCount] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<AiDifficulty>('mixed');
  const [questionType, setQuestionType] = useState<AiType>('mixed');
  const [gradingTime, setGradingTime] = useState<AiGrading>('now');
  const [preset, setPreset] = useState<AiPreset>('practice');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // The AI row needs a board to send; without one it keeps the "Em breve" badge. The flag stays false for the old endpoint.
  const aiReady = !!boardId;
  const grading = (['self', 'ai'] as const).map((g) => ({ g, off: g === 'ai' ? !aiReady : !CHALLENGE_OPTION_AVAILABLE.gradingMode[g] }));
  const ai = gradingMode === 'ai' && aiReady;

  const locked = !!cardId;
  const scope: AiScope = locked ? 'card' : scopeChoice === 'module' && modules.length === 0 ? 'board' : scopeChoice;
  const sizes: readonly number[] = scope === 'card' ? CARD_SIZES : CHALLENGE_SIZES;
  const count = countChoice !== null && sizes.includes(countChoice) ? countChoice : scope === 'card' ? 3 : 10;
  const selectedModule = moduleChoice !== null && modules.includes(moduleChoice) ? moduleChoice : modules[0];
  const type: AiType = format === 'generated' ? questionType : 'mixed';
  const cost = aiCostUnits(format, count, type);

  async function startAi() {
    if (!boardId || busy) return;
    const scopeBody: ChallengeConfig['scope'] | null =
      scope === 'card' ? (cardId ? { kind: 'card', cardId } : null) : scope === 'module' ? (selectedModule ? { kind: 'module', module: selectedModule } : null) : { kind: 'board' };
    if (!scopeBody) return setFailed(true);
    setBusy(true);
    setFailed(false);
    const r = await startAiChallenge({
      boardId,
      scope: scopeBody,
      format,
      n: count,
      difficulty,
      ...(format === 'generated' ? { questionType } : {}),
      grading: gradingTime === 'now' ? 'immediate' : 'end',
      timerSec: null,
      preset,
    });
    setBusy(false);
    if (!r.ok) return setFailed(true);
    rememberChallengeAiSession(r.data);
    onAiStart?.(r.data.id);
    router.push(aiChallengeHref(boardId, r.data.id));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('challengeSetup.dialog.title')} description={t('challengeSetup.dialog.description')} closeLabel={t('common.close')}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (ai) return void startAi(); // never the old session: its POST rejects `ai` and would self-grade
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
        {ai ? (
          <>
            <div className="flex flex-col gap-2">
              {locked ? (
                <p className="m-0 text-sm font-bold">{t('challengeAi.scope.card')}</p>
              ) : (
                <Segmented
                  aria-label={joined(SCOPES.map((s) => t(`challengeAi.scope.${s}`)))}
                  value={scope}
                  onValueChange={(v) => setScope(v as AiScope)}
                  options={SCOPES.map((s) => ({ value: s, label: t(`challengeAi.scope.${s}`), disabled: s === 'card' || (s === 'module' && modules.length === 0) }))}
                />
              )}
              {scope === 'module' && selectedModule ? (
                <Select label={t('challengeAi.scope.module')} value={selectedModule} onValueChange={setModule} options={modules.map((m) => ({ value: m, label: m }))} />
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Segmented
                aria-label={t('challengeSetup.dialog.format')}
                value={format}
                onValueChange={(v) => setFormat(v as ChallengeFormat)}
                options={challengeFormats.map((f) => ({ value: f, label: t(`challengeAi.format.${f}`) }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold">{t('challengeAi.count')}</span>
              <Segmented aria-label={t('challengeAi.count')} value={String(count)} onValueChange={(v) => setCount(Number(v))} options={sizes.map((n) => ({ value: String(n), label: String(n) }))} />
            </div>
            <Segmented
              aria-label={joined(DIFFICULTIES.map((d) => t(`challengeAi.difficulty.${d}`)))}
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as AiDifficulty)}
              options={DIFFICULTIES.map((d) => ({ value: d, label: t(`challengeAi.difficulty.${d}`) }))}
            />
            {format === 'generated' ? (
              <Segmented
                aria-label={joined(TYPES.map((x) => t(`challengeAi.type.${x}`)))}
                value={questionType}
                onValueChange={(v) => setQuestionType(v as AiType)}
                options={TYPES.map((x) => ({ value: x, label: t(`challengeAi.type.${x}`) }))}
              />
            ) : null}
            <Segmented
              aria-label={joined(GRADINGS.map((x) => t(`challengeAi.grading.${x}`)))}
              value={gradingTime}
              onValueChange={(v) => setGradingTime(v as AiGrading)}
              options={GRADINGS.map((x) => ({ value: x, label: t(`challengeAi.grading.${x}`) }))}
            />
            <Segmented
              aria-label={joined(PRESETS.map((x) => t(`challengeAi.preset.${x}`)))}
              value={preset}
              onValueChange={(v) => setPreset(v as AiPreset)}
              options={PRESETS.map((x) => ({ value: x, label: t(`challengeAi.preset.${x}`) }))}
            />
            <p role="status" className="m-0 text-sm font-semibold text-muted">{t('challengeAi.cost', { n: cost })}</p>
            {failed ? <p role="alert" className="m-0 text-sm font-semibold text-review">{t('errors.internal')}</p> : null}
          </>
        ) : (
          <>
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
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{t('challengeSetup.dialog.cancel')}</Button>
          <Button type="submit" loading={busy}>{t('challengeSetup.dialog.start')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
