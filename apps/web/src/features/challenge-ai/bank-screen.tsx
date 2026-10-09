'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { questionBankItemPublicSchema, enamedTopicOptionSchema, questionDifficulties, questionSources, questionStatuses, questionTypes, type BoardSummary, type QuestionBankItemPublic } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Alert, Button, Card, Empty, Input, Select, SkeletonBlock, SkeletonRegion, Tag, Textarea } from '@remoa/ui';
import { api } from '@/lib/api';

const t = withStrings({ boards: more.boards, inspector: more.inspector, map: more.map, questions: more.questions });

type Difficulty = (typeof questionDifficulties)[number];
type QType = (typeof questionTypes)[number];
type Status = (typeof questionStatuses)[number];
type Source = (typeof questionSources)[number];
type Filters = {
  board: string; area: string; domain: string; topic: string; q: string;
  difficulty: Difficulty | 'all'; type: QType | 'all'; status: Status | 'all'; source: Source | 'all';
};

const ALL = 'all';
const NO_FILTERS: Filters = { board: ALL, area: ALL, domain: ALL, topic: ALL, q: '', difficulty: ALL, type: ALL, status: ALL, source: ALL };
type Named = { id: string; name: string };

const statusLabel = (s: Status) => (s === 'archived' ? t('boards.archivedBadge') : t(`inspector.status.${s}` as 'inspector.status.draft'));

/** `.strip()`: keep only the public fields, so a stray reference field from the server is discarded instead of reaching the DOM. */
const publicItem = questionBankItemPublicSchema.strip();
const parseItems = (data: unknown): QuestionBankItemPublic[] =>
  Array.isArray(data) ? data.flatMap((d) => { const r = publicItem.safeParse(d); return r.success ? [r.data] : []; }) : [];

const parseTopics = (data: unknown) =>
  Array.isArray(data) ? data.flatMap((d) => { const r = enamedTopicOptionSchema.safeParse(d); return r.success ? [r.data] : []; }) : [];

/** Known machine codes become sentences. A sentence from the server stays; a raw code does not. */
const explain = (message: string | undefined) => {
  if (message === 'ungrounded_number') return t('challengeAi.ungrounded');
  if (message === 'topic_not_in_list') return t('challengeAi.topicNotInList');
  if (message && !/^[a-z0-9_]+$/.test(message)) return message;
  return t('errors.internal');
};

/** F32 FR-18: banco de questões. A lista mostra o enunciado e os metadados, nunca o gabarito; arquivar e reportar são as únicas ações. */
export function BankScreen() {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [items, setItems] = useState<QuestionBankItemPublic[]>([]);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; stem: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reported, setReported] = useState<ReadonlySet<string>>(new Set());
  const [topics, setTopics] = useState<Record<string, { id: string; name: string }[]>>({});
  const [areas, setAreas] = useState<Named[]>([]);
  const [domains, setDomains] = useState<Named[]>([]);
  const [topicOptions, setTopicOptions] = useState<Named[]>([]);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const n = ++seq.current;
    const qs = new URLSearchParams();
    if (filters.board !== ALL) qs.set('board', filters.board);
    if (filters.area !== ALL) qs.set('area', filters.area);
    if (filters.domain !== ALL) qs.set('domain', filters.domain);
    if (filters.topic !== ALL) qs.set('topic', filters.topic);
    if (filters.source !== ALL) qs.set('source', filters.source);
    if (filters.q.trim()) qs.set('q', filters.q.trim());
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

  const openAreas = [...new Set(items.filter((q) => q.status !== 'archived' && !q.enamedConfirmed).map((q) => q.enamedAreaId ?? '*'))].sort().join('\n');
  useEffect(() => {
    if (!openAreas) return;
    let cancel = false;
    void Promise.all(openAreas.split('\n').map(async (key) => {
      const areaId = key === '*' ? '' : key;
      const path = areaId ? `/v1/challenge-ai/topics?areaId=${areaId}` : '/v1/challenge-ai/topics';
      const r = await api<unknown>(path).catch(() => null);
      return [areaId, r?.ok ? parseTopics(r.data) : []] as const;
    })).then((rows) => { if (!cancel) setTopics(Object.fromEntries(rows)); });
    return () => { cancel = true; };
  }, [openAreas]);

  // The board filter is optional: if the list of maps fails, the other filters keep working.
  useEffect(() => {
    void api<BoardSummary[]>('/v1/boards').then((r) => { if (r.ok) setBoards(r.data); }).catch(() => undefined);
    const loadKind = (kind: 'area' | 'domain' | 'topic') =>
      api<unknown>(`/v1/challenge-ai/taxonomy?kind=${kind}`).then((r) => (r.ok ? parseTopics(r.data) : [])).catch(() => [] as Named[]);
    void loadKind('area').then(setAreas);
    void loadKind('domain').then(setDomains);
    void loadKind('topic').then(setTopicOptions);
  }, []);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => { setActionError(null); setState('loading'); setFilters((f) => ({ ...f, [key]: value })); };

  const save = async () => {
    if (!editing) return;
    setBusy(editing.id);
    setActionError(null);
    const r = await api<unknown>(`/v1/challenge-ai/bank/${editing.id}`, { method: 'POST', body: JSON.stringify({ stem: editing.stem }) }).catch(() => null);
    setBusy(null);
    if (r?.ok) { setEditing(null); void load(); }
    else setActionError(explain(r && !r.ok ? r.error.message : undefined));
  };

  const confirm = async (q: QuestionBankItemPublic, topicId: string) => {
    setBusy(q.id);
    setActionError(null);
    const r = await api<unknown>(`/v1/challenge-ai/bank/${q.id}/confirm`, { method: 'POST', body: JSON.stringify({ topicId }) }).catch(() => null);
    setBusy(null);
    if (r?.ok) void load();
    else setActionError(explain(r && !r.ok ? r.error.message : undefined));
  };

  const report = async (id: string) => {
    setBusy(id);
    setActionError(null);
    const r = await api<unknown>(`/v1/challenge-ai/items/${id}/report`, { method: 'POST' }).catch(() => null);
    setBusy(null);
    if (r?.ok) setReported((prev) => new Set(prev).add(id));
    else setActionError(explain(r && !r.ok ? r.error.message : undefined));
  };

  const archive = async (id: string) => {
    setBusy(id);
    setActionError(null);
    const r = await api<unknown>(`/v1/challenge-ai/bank/${id}/archive`, { method: 'POST' }).catch(() => null);
    setBusy(null);
    if (r?.ok) void load();
    else setActionError(explain(r && !r.ok ? r.error.message : undefined));
  };

  const filtered = (Object.keys(NO_FILTERS) as (keyof Filters)[]).some((k) => filters[k] !== NO_FILTERS[k]);
  const namedOptions = (rows: Named[]) => [{ value: ALL, label: t('questions.all') }, ...rows.map((r) => ({ value: r.id, label: r.name }))];
  const choice = <T extends string>(label: string, value: T | 'all', values: readonly T[], name: (item: T) => string, onValueChange: (next: T | 'all') => void) => (
    <Select label={label} value={value} onValueChange={(next) => onValueChange(next as T | 'all')} options={[{ value: ALL, label: t('questions.all') }, ...values.map((item) => ({ value: item, label: name(item) }))]} />
  );

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 py-2 md:px-6">
      <header>
        <p className="mb-3 text-xs font-bold uppercase tracking-[.12em] text-muted">{t('questions.eyebrow')}</p>
        <h1 className="m-0 font-display text-[34px] font-extrabold leading-[1.1] tracking-[-0.03em] outline-none md:text-[44px]">{t('questions.title')}</h1>
        <p className="mt-3 text-muted">{t('questions.subtitle')}</p>
      </header>

      <section aria-label={t('questions.filters')} className="rounded-[26px] border border-border bg-surface p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Input variant="search" label={t('challengeAi.search')} value={filters.q} onChange={(e) => set('q', e.target.value)} />
        <Select
          label={t('library.columns.map')}
          value={filters.board}
          onValueChange={(v) => set('board', v)}
          options={[{ value: ALL, label: t('questions.all') }, ...boards.map((b) => ({ value: b.id, label: b.title }))]}
        />
        <Select label={t('challengeAi.filterArea')} value={filters.area} onValueChange={(v) => set('area', v)} options={namedOptions(areas)} />
        <Select label={t('challengeAi.filterDomain')} value={filters.domain} onValueChange={(v) => set('domain', v)} options={namedOptions(domains)} />
        <Select label={t('challengeAi.filterTopic')} value={filters.topic} onValueChange={(v) => set('topic', v)} options={namedOptions(topicOptions)} />
        {choice(t('challengeAi.origin'), filters.source, questionSources, (s) => t(`challengeAi.source.${s}`), (next) => set('source', next))}
        {choice(t('questions.difficulty'), filters.difficulty, questionDifficulties, (d) => t(`challengeAi.difficulty.${d}`), (next) => set('difficulty', next))}
        {choice(t('questions.type'), filters.type, questionTypes, (k) => t(`challengeAi.type.${k}`), (next) => set('type', next))}
        {choice(t('inspector.statusLabel'), filters.status, questionStatuses, statusLabel, (next) => set('status', next))}
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
                    <span className="text-xs text-muted">{t('challengeAi.stats', { correct: q.stats.correct, incorrect: q.stats.incorrect })}</span>
                  </div>
                  {editing?.id === q.id ? (
                    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
                      <Textarea label={t('challengeAi.edit')} value={editing.stem} onChange={(e) => setEditing({ id: q.id, stem: e.target.value })} />
                      <Button type="submit" size="sm" loading={busy === q.id} disabled={busy === q.id || !editing.stem.trim()}>{t('challengeAi.saveEdit')}</Button>
                    </form>
                  ) : q.status !== 'archived' && !q.enamedConfirmed ? (
                    <Select
                      label={t('challengeAi.chooseTopic')}
                      placeholder={t('challengeAi.chooseTopic')}
                      value={(topics[q.enamedAreaId ?? ''] ?? []).some((o) => o.id === q.enamedTopicId) ? (q.enamedTopicId ?? undefined) : undefined}
                      onValueChange={(v) => { if (v) void confirm(q, v); }}
                      options={(topics[q.enamedAreaId ?? ''] ?? []).map((o) => ({ value: o.id, label: o.name }))}
                    />
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {reported.has(q.id) ? (
                      <p role="status" className="m-0 text-sm font-semibold">{t('challengeAi.reportSent')}</p>
                    ) : (
                      <Button variant="quiet" size="sm" loading={busy === q.id} disabled={busy === q.id} onClick={() => void report(q.id)}>{t('challengeAi.report')}</Button>
                    )}
                    {q.status !== 'archived' && q.enamedTopicId && !q.enamedConfirmed ? (
                      <Button variant="secondary" size="sm" loading={busy === q.id} disabled={busy === q.id} onClick={() => { const id = q.enamedTopicId; if (id) void confirm(q, id); }}>{t('challengeAi.confirmTopic')}</Button>
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
