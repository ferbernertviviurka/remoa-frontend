'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mapSummaryPublicSchema, summaryFocuses, summarySizes, type MapSummaryPublic, type SummarySection } from '@remoa/contracts';
import { t, type StringKey } from '@remoa/strings';
import { Alert, Button, Card, FilterChip, SkeletonRegion, SkeletonBlock } from '@remoa/ui';
import { api } from '@/lib/api';

type Size = (typeof summarySizes)[number];
type Focus = (typeof summaryFocuses)[number];
type Titles = Readonly<Record<string, string>>;

/** Plain text of the summary for the clipboard. Only schema fields, never markup. */
export function summaryToText(summary: MapSummaryPublic): string {
  return summary.sections
    .map((s) => {
      const lines = s.items.map((i) => `- ${i.text}`);
      const rows = s.table ? [s.table.header.join(' | '), ...s.table.rows.map((r) => r.cells.join(' | '))] : [];
      return [s.title, ...lines, ...rows].join('\n');
    })
    .join('\n\n');
}

function CardIds({ ids, titles, onOpen }: { ids: readonly string[]; titles: Titles; onOpen: (id: string) => void }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {ids.map((id) => (
        <Button key={id} variant="quiet" size="sm" aria-label={titles[id] ?? id} onClick={() => onOpen(id)}>
          {titles[id] ?? id}
        </Button>
      ))}
    </span>
  );
}

function Section({ section, titles, onOpen }: { section: SummarySection; titles: Titles; onOpen: (id: string) => void }) {
  return (
    <section aria-label={section.title} className="flex flex-col gap-2">
      <h2 className="m-0 font-display text-lg font-bold tracking-[-.02em]">{section.title}</h2>
      {section.items.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {section.items.map((item, i) => (
            <li key={i} className="flex flex-col gap-1 text-[15px] leading-[1.5]">
              <span>{item.text}</span>
              <CardIds ids={item.cardIds} titles={titles} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      ) : null}
      {section.table ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                {section.table.header.map((h, i) => (
                  <th key={i} scope="col" className="border-b border-border px-3 py-2 font-bold">
                    {h}
                  </th>
                ))}
                <td className="border-b border-border" />
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, r) => (
                <tr key={r}>
                  {row.cells.map((c, i) => (
                    <td key={i} className="border-b border-border px-3 py-2 align-top">
                      {c}
                    </td>
                  ))}
                  <td className="border-b border-border px-1 py-1 align-top">
                    <CardIds ids={row.cardIds} titles={titles} onOpen={onOpen} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

/** F32 T9 (FR-46–FR-50): "Resumo com IA" of a map. Nothing but the public schema is rendered, as text. */
export function SummaryScreen({ boardId, cardTitles = {}, initial = null }: { boardId: string; cardTitles?: Titles; initial?: MapSummaryPublic | null }) {
  const router = useRouter();
  const [size, setSize] = useState<Size>('standard');
  const [focus, setFocus] = useState<Focus>('overview');
  const [summary, setSummary] = useState<MapSummaryPublic | null>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);

  const generate = async () => {
    setPending(true);
    setError(null);
    try {
      const r = await api<unknown>('/v1/challenge-ai/summaries', { method: 'POST', body: JSON.stringify({ boardId, size, focus }) });
      if (!r.ok) {
        setError(`errors.${r.error.code}` as StringKey);
        return;
      }
      const parsed = mapSummaryPublicSchema.safeParse(r.data);
      if (!parsed.success) setError('errors.internal');
      else setSummary(parsed.data);
    } catch {
      setError('errors.internal');
    } finally {
      setPending(false);
    }
  };

  const open = (cardId: string) => router.push(`/app/mapas/${encodeURIComponent(boardId)}?card=${encodeURIComponent(cardId)}`);
  const copy = () => void navigator.clipboard.writeText(summary ? summaryToText(summary) : '');
  const submit = (
    <Button loading={pending} disabled={pending} onClick={() => void generate()}>
      {t('challengeAi.summaryButton')}
    </Button>
  );
  const stale = summary?.stale === true;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-6">
      <h1 className="m-0 font-display text-2xl font-extrabold tracking-[-.02em]">{t('challengeAi.summaryButton')}</h1>
      <div className="flex flex-col gap-3">
        <div role="group" aria-label={t('challengeAi.count')} className="flex flex-wrap gap-2">
          {summarySizes.map((v) => (
            <FilterChip key={v} pressed={size === v} onClick={() => setSize(v)}>
              {t(`challengeAi.summarySize.${v}` as StringKey)}
            </FilterChip>
          ))}
        </div>
        <div role="group" aria-label={t('challengeAi.summaryButton')} className="flex flex-wrap gap-2">
          {summaryFocuses.map((v) => (
            <FilterChip key={v} pressed={focus === v} onClick={() => setFocus(v)}>
              {t(`challengeAi.summaryFocus.${v}` as StringKey)}
            </FilterChip>
          ))}
        </div>
        {stale ? null : <div>{submit}</div>}
      </div>

      {stale ? (
        <Alert tone="watch" title={t('challengeAi.summaryStale')}>
          {submit}
        </Alert>
      ) : null}
      {error ? <Alert tone="review" role="alert" title={t(error)} /> : null}
      {pending ? (
        <SkeletonRegion label={t('common.loading')}>
          <SkeletonBlock height={96} />
        </SkeletonRegion>
      ) : null}

      {summary ? (
        <Card radius="map">
          <div className="flex flex-col gap-5">
            {summary.sections.map((s, i) => (
              <Section key={`${s.kind}-${i}`} section={s} titles={cardTitles} onOpen={open} />
            ))}
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button variant="secondary" size="sm" onClick={copy}>
                {t('challengeAi.copy')}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()}>
                {t('challengeAi.print')}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <p className="m-0 text-sm text-muted">{t('challengeAi.summaryDisclaimer')}</p>
    </main>
  );
}
