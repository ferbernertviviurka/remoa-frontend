import Link from 'next/link';
import type { ChallengeItemPublic, SessionSummary } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, Card, Eyebrow, Stat } from '@remoa/ui';

/** FR-9: acertos, erros, cards que pedem revisão (com link para o mapa), próximo vencimento e "Mais 5". */
export function Summary({ summary, items, onMore }: { summary: SessionSummary; items: ChallengeItemPublic[]; onMore: () => void }) {
  const cards = [...new Map(summary.toReview.map((id) => [id, items.find((i) => i.cardId === id)] as const)).values()].filter((i): i is ChallengeItemPublic => !!i);
  const minutes = Math.max(1, Math.round(summary.durationMs / 60_000));
  return (
    <section aria-labelledby="summary-title" className="flex flex-col gap-5" aria-live="polite">
      <h2 id="summary-title" className="font-display text-xl font-bold text-text">
        {t('challenge.summary.title')}
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('challenge.summary.correct')} value={String(summary.correct)} />
        <Stat label={t('challenge.summary.wrong')} value={String(summary.wrong)} />
        <Stat label={t('challenge.summary.duration')} value={t('challenge.summary.minutes', { n: minutes })} />
      </div>
      <Card>
        <div className="flex flex-col gap-2">
          <Eyebrow>{t('challenge.summary.toReview')}</Eyebrow>
          {cards.length === 0 ? (
            <p className="text-sm text-muted">{t('challenge.summary.toReviewNone')}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {cards.map((c) => (
                <li key={c.cardId}>
                  <Link href={`/mapas/${c.boardId}`} className="font-semibold text-text underline" aria-label={`${t('challenge.summary.openBoard')}: ${c.cardTitle || t('challenge.summary.untitled')}`}>
                    {c.cardTitle || t('challenge.summary.untitled')}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
      <p className="text-sm text-muted">
        {summary.nextDue
          ? `${t('challenge.summary.nextDue')}: ${new Date(summary.nextDue).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}`
          : t('challenge.summary.nextNone')}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={onMore}>{t('challenge.summary.more')}</Button>
        <Link href="/revisar" className="inline-flex min-h-11 items-center font-semibold text-primary-deep underline">
          {t('challenge.backToReview')}
        </Link>
      </div>
    </section>
  );
}
