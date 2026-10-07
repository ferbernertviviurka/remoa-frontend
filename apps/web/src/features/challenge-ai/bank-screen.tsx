'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { questionBankItemPublicSchema, questionDifficulties, questionStatuses, questionTypes, type BoardSummary, type QuestionBankItemPublic } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Alert, Button, Card, Empty, FilterChip, Select, SkeletonBlock, SkeletonRegion, Tag, Textarea } from '@remoa/ui';
import { api } from '@/lib/api';
import { openSupport } from '@/features/support/open';

const t = withStrings({ boards: more.boards, inspector: more.inspector, map: more.map });

type Difficulty = (typeof questionDifficulties)[number];
type QType = (typeof questionTypes)[number];
type Status = (typeof questionStatuses)[number];
type Filters = { board: string; difficulty: Difficulty | 'all'; type: QType | 'all'; status: Status | 'all' };

const ALL = 'all';
const NO_FILTERS: Filters = { board: ALL, difficulty: ALL, type: ALL, status: ALL };

const statusLabel = (s: Status) => (s === 'archived' ? t('boards.archivedBadge') : t(`inspector.status.${s}` as 'inspector.status.draft'));

/** `.strip()`: keep only the public fields, so a stray reference field from the server is discarded instead of reaching the DOM. */
const publicItem = questionBankItemPublicSchema.strip();
const parseItems = (data: unknown): QuestionBankItemPublic[] =>
  Array.isArray(data) ? data.flatMap((d) => { const r = publicItem.safeParse(d); return r.success ? [r.data] : []; }) : [];

/** F32 FR-18: banco de questões. A lista mostra o enunciado e os metadados, nunca o gabarito; arquivar e reportar são as únicas ações. */
export function BankScreen() {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [items, setItems] = useState<QuestionBankItemPublic[]>([]);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; stem: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const n = ++seq.current;
    const qs = new URLSearchParams();
    if (filters.board !== ALL) qs.set('board', filters.board);
    if (filters.difficulty !== ALL) qs.set('difficulty', filters.difficulty);
    if (filters.type !== ALL) qs.set('type', filters.type);
    if (filters.status !== ALL) qs.set('status', filters.status);
    const query = qs.toString();
    const r = await api<unknown>(`/v1/challenge-ai/bank${query ? `?${query}` : ''}`).catch(() => null);
    if (n !== seq.current) return;
    if (r?.ok) {
      setItems(parseItems(r.data));
      setState('ready');
    } else setState('error');
  }, [filters]);
  useEffect(() => void load(), [load]);

  // The board filter is optional: if the list of maps fails, the other filters keep working.
  useEffect(() => {
    void api<BoardSummary[]>('/v1/boards').then((r) => { if (r.ok) setBoards(r.data); }).catch(() => undefined);
  }, []);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => { setActionError(null); setState('loading'); setFilters((f) => ({ ...f, [key]: value })); };

  const save = async () => {
    if (!editing) return;
    setBusy(editing.id);
    setActionError(null);
    const r = await api<unknown>(`/v1/challenge-ai/bank/${editing.id}`, { method: 'POST', body: JSON.stringify({ stem: editing.stem }) }).catch(() => null);
    setBusy(null);
    if (r?.ok) { setEditing(null); void load(); }
    else setActionError(r && !r.ok && r.error.message === 'ungrounded_number' ? t('challengeAi.ungrounded') : r && !r.ok ? r.error.message : t('errors.internal'));
  };

  const confirm = async (q: QuestionBankItemPublic) => {
    if (!q.enamedTopicId) return;
    setBusy(q.id);
    setActionError(null);
    const r = await api<unknown>(`/v1/challenge-ai/bank/${q.id}/confirm`, { method: 'POST', body: JSON.stringify({ topicId: q.enamedTopicId }) }).catch(() => null);
    setBusy(null);
    if (r?.ok) void load();
    else setActionError(r && !r.ok ? r.error.message : t('errors.internal'));
  };

  const archive = async (id: string) => {
    setBusy(id);
    setActionError(null);
    const r = await api<unknown>(`/v1/challenge-ai/bank/${id}/archive`, { method: 'POST' }).catch(() => null);
    setBusy(null);
    if (r?.ok) void load();
    else setActionError(r && !r.ok ? r.error.message : t('errors.internal'));
  };

  const filtered = Object.values(filters).some((v) => v !== ALL);

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 md:px-6 md:py-2">
      <header>
        <h1 className="m-0 font-display text-[44px] font-extrabold leading-none tracking-[-0.03em]">{t('challengeAi.bankTitle')}</h1>
      </header>

      <section aria-label={t('challengeAi.bankTitle')} className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <Select
          label={t('library.columns.map')}
          value={filters.board}
          onValueChange={(v) => set('board', v)}
          options={[{ value: ALL, label: t('boards.statusAll') }, ...boards.map((b) => ({ value: b.id, label: b.title }))]}
        />
        <div role="group" aria-label={`${t('challengeAi.difficulty.easy')} / ${t('challengeAi.difficulty.medium')} / ${t('challengeAi.difficulty.hard')}`} className="flex flex-wrap gap-2">
          <FilterChip pressed={filters.difficulty === ALL} onClick={() => set('difficulty', ALL)}>{t('boards.statusAll')}</FilterChip>
          {questionDifficulties.map((d) => (
            <FilterChip key={d} pressed={filters.difficulty === d} onClick={() => set('difficulty', d)}>{t(`challengeAi.difficulty.${d}`)}</FilterChip>
          ))}
        </div>
        <div role="group" aria-label={t('map.inspector.type')} className="flex flex-wrap gap-2">
          <FilterChip pressed={filters.type === ALL} onClick={() => set('type', ALL)}>{t('boards.statusAll')}</FilterChip>
          {questionTypes.map((k) => (
            <FilterChip key={k} pressed={filters.type === k} onClick={() => set('type', k)}>{t(`challengeAi.type.${k}`)}</FilterChip>
          ))}
        </div>
        <div role="group" aria-label={t('inspector.statusLabel')} className="flex flex-wrap gap-2">
          <FilterChip pressed={filters.status === ALL} onClick={() => set('status', ALL)}>{t('boards.statusAll')}</FilterChip>
          {questionStatuses.map((s) => (
            <FilterChip key={s} pressed={filters.status === s} onClick={() => set('status', s)}>{statusLabel(s)}</FilterChip>
          ))}
        </div>
      </section>

      {actionError ? <Alert tone="review" role="alert" title={actionError} /> : null}

      {state === 'loading' ? (
        <SkeletonRegion label={t('common.loading')}>
          <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <SkeletonBlock key={i} height={96} radius={20} />)}</div>
        </SkeletonRegion>
      ) : state === 'error' ? (
        <Alert tone="review" role="alert" title={t('errors.internal')}>
          <Button variant="secondary" size="sm" onClick={() => { setState('loading'); void load(); }}>{t('common.retry')}</Button>
        </Alert>
      ) : items.length === 0 ? (
        <Empty
          title={t('challengeAi.bankTitle')}
          action={filtered ? <Button variant="secondary" onClick={() => { setState('loading'); setFilters(NO_FILTERS); }}>{t('boards.statusAll')}</Button> : undefined}
        />
      ) : (
        <ul aria-label={t('challengeAi.bankTitle')} className="m-0 flex list-none flex-col gap-3 p-0">
          {items.map((q) => (
            <li key={q.id}>
              <Card>
                <article aria-label={q.stem} className="flex flex-col gap-3">
                  <p className="m-0 whitespace-pre-line text-base leading-relaxed">{q.stem}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone="brand">{t(`challengeAi.difficulty.${q.difficulty}`)}</Tag>
                    <Tag tone="unknown">{t(`challengeAi.type.${q.type}`)}</Tag>
                    <Tag tone={q.status === 'approved' ? 'steady' : 'watch'}>{statusLabel(q.status)}</Tag>
                    {q.source === 'ai' ? <span className="text-xs text-muted">{t('challengeAi.generatedLabel')}</span> : null}
                    {q.enamedTopicName ? <span className="text-xs text-muted">{t(q.enamedConfirmed ? 'challengeAi.topicConfirmed' : 'challengeAi.topicSuggested', { name: q.enamedTopicName })}</span> : null}
                  </div>
                  {editing?.id === q.id ? (
                    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
                      <Textarea label={t('challengeAi.edit')} value={editing.stem} onChange={(e) => setEditing({ id: q.id, stem: e.target.value })} />
                      <Button type="submit" size="sm" loading={busy === q.id} disabled={busy === q.id || !editing.stem.trim()}>{t('challengeAi.saveEdit')}</Button>
                    </form>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="quiet" size="sm" onClick={() => openSupport('fab')}>{t('challengeAi.report')}</Button>
                    {q.status !== 'archived' && q.enamedTopicId && !q.enamedConfirmed ? (
                      <Button variant="secondary" size="sm" loading={busy === q.id} disabled={busy === q.id} onClick={() => void confirm(q)}>{t('challengeAi.confirmTopic')}</Button>
                    ) : null}
                    {q.status !== 'archived' ? (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => { setActionError(null); setEditing({ id: q.id, stem: q.stem }); }}>{t('challengeAi.edit')}</Button>
                        <Button variant="secondary" size="sm" loading={busy === q.id} disabled={busy === q.id} onClick={() => void archive(q.id)}>{t('boards.archive')}</Button>
                      </>
                    ) : null}
                  </div>
                </article>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
