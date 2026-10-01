import type { ChallengeContext, ChallengeMode } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Card, Eyebrow, Stat, Tag } from '@remoa/ui';

/** "No mapa": neighbours with their connection label (never the answer), session modes and the running tally. */
export function SidePanel({ context, modes, correct, wrong, left }: { context: ChallengeContext; modes: ChallengeMode[]; correct: number; wrong: number; left: number }) {
  return (
    <aside aria-label={t('challenge.context.title')} className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-2">
          <Eyebrow>{t('challenge.context.title')}</Eyebrow>
          {context.neighbors.length === 0 ? (
            <p className="text-sm text-muted">{t('challenge.context.none')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {context.neighbors.map((n, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 text-sm text-text">
                  <span className="font-semibold">{n.title}</span>
                  <Tag tone={n.label ? 'brand' : 'unknown'}>{n.label ?? t('challenge.context.unlabelled')}</Tag>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
      <Card>
        <div className="flex flex-col gap-2">
          <Eyebrow>{t('challenge.modes')}</Eyebrow>
          <ul className="flex flex-wrap gap-2">
            {modes.map((m) => (
              <li key={m}>
                <Tag>{t(`challengeMode.${m}`)}</Tag>
              </li>
            ))}
          </ul>
        </div>
      </Card>
      <div className="grid grid-cols-3 gap-2" role="status" aria-live="off">
        <Stat label={t('challenge.tally.correct')} value={String(correct)} />
        <Stat label={t('challenge.tally.wrong')} value={String(wrong)} />
        <Stat label={t('challenge.tally.left')} value={String(left)} />
      </div>
    </aside>
  );
}
