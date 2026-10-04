import Link from 'next/link';
import type { ChallengeItemPublic, SessionSummary } from '@remoa/contracts';
import { t } from '@remoa/strings';
import { Button, Stat } from '@remoa/ui';

/** FR-9 inside the map panel: acertos, erros, cards que pedem revisão (com link para o mapa), próximo vencimento, "Mais 5". */
export function Summary({ summary, items, onMore, onExit }: { summary: SessionSummary; items: ChallengeItemPublic[]; onMore: () => void; onExit: () => void }) {
  const cards = [...new Map(summary.toReview.map((id) => [id, items.find((i) => i.cardId === id)] as const)).values()].filter((i): i is ChallengeItemPublic => !!i);
  const minutes = Math.max(1, Math.round(summary.durationMs / 60_000));
  return (
    <section aria-label={t('quiz.summaryPanel')} className="flex h-full flex-col gap-4 overflow-auto px-5 py-5" aria-live="polite">
      <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{t('editor.challenge')}</span>
      <h2 className="m-0 font-display text-[21px] font-bold leading-[1.25] tracking-[-.02em]">{t('challenge.summary.title')}</h2>
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t('challenge.summary.correct')} value={String(summary.correct)} />
        <Stat label={t('challenge.summary.wrong')} value={String(summary.wrong)} />
        <Stat label={t('challenge.summary.duration')} value={t('challenge.summary.minutes', { n: minutes })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-[.12em] text-muted">{t('challenge.summary.toReview')}</span>
        {cards.length === 0 ? (
          <p className="m-0 text-sm text-muted">{t('challenge.summary.toReviewNone')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {cards.map((c) => (
              <li key={c.cardId}>
                <Link href={`/app/mapas/${c.boardId}`} className="font-semibold text-text underline" aria-label={`${t('challenge.summary.openBoard')}: ${c.cardTitle || t('challenge.summary.untitled')}`}>
                  {c.cardTitle || t('challenge.summary.untitled')}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="m-0 text-sm text-muted">
        {summary.nextDue
          ? `${t('challenge.summary.nextDue')}: ${new Date(summary.nextDue).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}`
          : t('challenge.summary.nextNone')}
      </p>
      <span className="grow" />
      <Button onClick={onMore}>{t('challenge.summary.more')}</Button>
      <Button variant="secondary" onClick={onExit}>{t('quiz.exit')}</Button>
      <Link href="/app/revisar" className="inline-flex min-h-11 items-center justify-center font-semibold text-primary-deep underline">
        {t('challenge.backToReview')}
      </Link>
    </section>
  );
}
