'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, buttonVariants, Checkbox, Empty, FilterChip, focusRing, Icon, IconButton, Tag } from '@remoa/ui';
import type { QuestionFacets, QuestionPublic } from '@remoa/contracts';
import { t } from './bank-t';
import { listQuestionFacets, listQuestions, saveUserState } from './api';
import { BankFilterPanel, BankSearchBar, bankFilterCount, bankQuery, emptyBankFilters, type BankFilters, type BankTab } from './questions-filters';
import { useCourseOptions } from './course-field';
import { canSelectQuestion } from './team-disclosure';
import { QuestionDrawer, BankMeta } from './question-drawer';
import { SelectionBar, BANK_SELECTION_MAX } from './selection-bar';
import { QuestionsSkeleton } from './questions-skeleton';
import { ConfigDialog, PageTitle } from './shared';

export const BANK_EXAM_HREF = '/app/banco-de-questoes/prova';
type Status = 'loading' | 'ready' | 'error';
const progressTone = { unseen: 'unknown', correct: 'steady', wrong: 'review' } as const;
const progressEdge = { unseen: 'border-l-border', correct: 'border-l-steady', wrong: 'border-l-review' } as const;
const linkButton = `${buttonVariants.secondary} ${focusRing} inline-flex min-h-12 items-center justify-center gap-2 rounded-btn px-5 text-[15px] no-underline`;

/** F34 student bank (flag bankStudent, D-1821). Lists never carry a key or verdict (D-1822); correction only in the drawer's answer response. */
export function BankStudent() {
  const router = useRouter();
  const [tab, setTab] = useState<BankTab>('all');
  // G29: no default course; the course is an optional filter and never empties the list on its own.
  const [filters, setFilters] = useState<BankFilters>(emptyBankFilters);
  const { name: courseName } = useCourseOptions(filters.course);
  const [items, setItems] = useState<QuestionPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [facets, setFacets] = useState<QuestionFacets | null>(null);
  const [facetsError, setFacetsError] = useState(false);
  const [facetsReload, setFacetsReload] = useState(0);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState<QuestionPublic | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [favoriteError, setFavoriteError] = useState(false);
  const [progress, setProgress] = useState<Record<string, 'correct' | 'wrong'>>({});
  const topicNames = useRef<Record<string, string>>({});
  const generation = useRef(0);
  const moreController = useRef<AbortController | null>(null);
  const retryMore = useRef<HTMLButtonElement>(null);
  const focusAfterMore = useRef<string | null>(null);
  const opener = useRef<string | null>(null);
  const [practice, setPractice] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(() => {
    const seq = ++generation.current;
    moreController.current?.abort();
    const controller = new AbortController();
    setStatus('loading'); setMoreError(false); setLoadingMore(false); setCursor(null);
    listQuestions({ ...bankQuery(tab, filters), limit: 25 }, controller.signal)
      .then((data) => { if (seq !== generation.current) return; setItems(data.items); setTotal(data.total); setCursor(data.nextCursor); setStatus('ready'); })
      .catch(() => { if (seq === generation.current) setStatus('error'); });
    return () => controller.abort();
  }, [tab, filters]);
  useEffect(() => load(), [load]);

  // Baseline: how many eligible questions exist with NO filters, to tell "empty for this filter" from "catalog still empty".
  useEffect(() => {
    const controller = new AbortController();
    setBaseline(null);
    listQuestionFacets({ ...bankQuery(tab, emptyBankFilters), groups: ['difficulty'] }, controller.signal).then((f) => { if (!controller.signal.aborted) setBaseline(f.total); }).catch(() => undefined);
    return () => controller.abort();
  }, [tab]);
  useEffect(() => {
    const controller = new AbortController();
    setFacetsError(false);
    listQuestionFacets({ ...bankQuery(tab, filters), groups: ['institution', 'year', 'difficulty'] }, controller.signal)
      .then((f) => { if (!controller.signal.aborted) setFacets(f); })
      .catch(() => { if (!controller.signal.aborted) setFacetsError(true); });
    return () => controller.abort();
  }, [tab, filters, facetsReload]);

  const more = async () => {
    if (!cursor || loadingMore) return;
    const seq = generation.current;
    const controller = new AbortController();
    moreController.current = controller;
    setLoadingMore(true); setMoreError(false);
    try {
      const data = await listQuestions({ ...bankQuery(tab, filters), limit: 25, cursor }, controller.signal);
      if (seq !== generation.current) return;
      const fresh = data.items.filter((q) => !items.some((x) => x.id === q.id));
      focusAfterMore.current = fresh[0]?.id ?? null;
      setItems((old) => [...old, ...fresh.filter((q) => !old.some((x) => x.id === q.id))]); setCursor(data.nextCursor); setTotal(data.total);
    } catch { if (seq === generation.current) setMoreError(true); } finally { if (seq === generation.current) setLoadingMore(false); }
  };
  useEffect(() => { if (moreError) retryMore.current?.focus(); }, [moreError]);
  useEffect(() => {
    const id = focusAfterMore.current; if (!id || loadingMore) return;
    focusAfterMore.current = null;
    document.querySelector<HTMLButtonElement>(`[data-bank-open="${id}"]`)?.focus();
  }, [items, loadingMore]);

  const reset = (next: BankTab) => { setTab(next); setFilters(emptyBankFilters); };
  const toggleSelect = (id: string) => setSelected((old) => (old.includes(id) ? old.filter((v) => v !== id) : old.length >= BANK_SELECTION_MAX ? old : [...old, id]));
  const toggleFavorite = async (q: QuestionPublic) => {
    const next = !(favorites[q.id] ?? q.userState?.favorite ?? false);
    setFavorites((old) => ({ ...old, [q.id]: next })); setFavoriteError(false);
    try { await saveUserState(q.id, { favorite: next }); } catch { setFavorites((old) => ({ ...old, [q.id]: !next })); setFavoriteError(true); }
  };
  const close = () => { const id = opener.current; setOpen(null); if (id) setTimeout(() => document.querySelector<HTMLButtonElement>(`[data-bank-open="${id}"]`)?.focus(), 0); };
  const noFilters = bankFilterCount(filters) === 0;
  const catalogEmpty = baseline !== null ? baseline === 0 : noFilters && total === 0;
  const remaining = Math.min(25, total - items.length);

  const clearFilters = () => setFilters(emptyBankFilters);
  const n = bankFilterCount(filters);
  const empty = catalogEmpty
    ? tab === 'mine' ? <Empty title={t('questionsBank.emptyMineTitle')} description={t('questionsBank.emptyMineHelp')} action={<Link className={linkButton} href="/app/mapas">{t('questionsBank.emptyAiAction')}</Link>} />
    : <Empty title={t('questionsBank.emptyAllTitle')} description={t('questionsBank.emptyAllHelp')} action={<Button variant="secondary" onClick={() => reset('mine')}>{t('questionsBank.emptyAllAction')}</Button>} />
    : filters.course ? <Empty title={t('questionsBank.emptyCourseFilterTitle', { course: courseName })} description={t('questionsBank.emptyCourseFilterHelp')} action={<Button variant="secondary" onClick={clearFilters}>{t('questionsBank.clearFilters', { n })}</Button>} />
    : <Empty title={t('questionsBank.emptyFilterTitle')} description={t('questionsBank.emptyFilterHelp')} action={n > 0 ? <Button variant="secondary" onClick={clearFilters}>{t('questionsBank.clearFilters', { n })}</Button> : undefined} />;

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 py-2 md:px-6">
      <PageTitle title={t('questions.title')} description={t('questions.subtitle')}>
        <div className="flex flex-wrap gap-2">
          <Link className={linkButton} href={tab === 'mine' ? `${BANK_EXAM_HREF}?source=ai` : BANK_EXAM_HREF}>{t('questionsBank.buildExam')}</Link>
          <Button icon={<Icon name="bolt" size={18} />} disabled={status !== 'ready' || total === 0} onClick={() => setPractice(true)}>{t('questionsBank.practice')}</Button>
        </div>
      </PageTitle>
      <nav aria-label={t('questionsBank.tabsLabel')} className="flex flex-wrap items-center gap-2">
        <FilterChip pressed={tab === 'all'} onClick={() => reset('all')}>{t('questionsBank.tabAll')}</FilterChip>
        <FilterChip pressed={tab === 'mine'} onClick={() => reset('mine')}>{t('questionsBank.tabMine')}</FilterChip>
      </nav>
      {tab === 'mine' ? <p className="max-w-3xl text-sm text-muted">{t('questionsBank.mineNote')}</p> : null}
      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside>
          <div className="lg:hidden">
            <Button variant="secondary" icon={<Icon name="filter" size={18} />} aria-expanded={filtersOpen} aria-controls="bank-filters" onClick={() => setFiltersOpen((v) => !v)}>
              {n > 0 ? t('questionsBank.filtersShowCount', { n }) : t('questionsBank.filtersShow')}
            </Button>
          </div>
          <div id="bank-filters" className={`${filtersOpen ? 'mt-3' : 'max-lg:hidden'} rounded-[24px] border border-border bg-surface p-5`}>
            <BankFilterPanel tab={tab} filters={filters} onChange={setFilters} onClear={clearFilters} facets={facets} facetsError={facetsError && status !== 'error'} onFacetsRetry={() => setFacetsReload((v) => v + 1)} topicNames={topicNames.current} />
          </div>
        </aside>
        <section className="flex min-w-0 flex-col gap-4" aria-label={t('questionsBank.list')}>
          <BankSearchBar filters={filters} onChange={setFilters} />
          {status === 'loading' ? <QuestionsSkeleton /> : null}
          {status === 'error' ? <Alert role="alert" tone="review" title={t('questionsBank.listError')}><Button variant="secondary" onClick={() => load()}>{t('common.retry')}</Button></Alert> : null}
          {status === 'ready' ? <>
            <p className="text-sm font-semibold text-muted" role="status">{total === 1 ? t('questionsBank.countOne') : t('questionsBank.count', { n: total })}</p>
            {items.length === 0 ? empty : null}
            {favoriteError ? <Alert role="alert" tone="review" title={t('questionsBank.favoriteError')} /> : null}
            <ul className="flex flex-col gap-3">{items.map((q) => {
              const mark = progress[q.id] ?? q.progress ?? 'unseen';
              const fav = favorites[q.id] ?? q.userState?.favorite ?? false;
              const isPicked = selected.includes(q.id);
              return <li key={q.id}><article aria-label={q.stem.slice(0, 120)} className={`rounded-[20px] border border-l-4 bg-surface p-4 transition-colors md:p-5 ${isPicked ? 'border-primary' : 'border-border'} ${progressEdge[mark]}`}>
                <div className="flex flex-wrap items-center gap-2"><Tag tone={progressTone[mark]}>{t(`questionsBank.badge.${mark}`)}</Tag><BankMeta question={q} course={filters.course ? courseName : undefined} /></div>
                <h2 className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-base font-semibold leading-relaxed text-ink md:text-[17px]">{q.stem}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Button size="sm" data-bank-open={q.id} onClick={() => { opener.current = q.id; setOpen(q); }}>{t('questionsBank.open')}</Button>
                  <IconButton variant="quiet" aria-pressed={fav} aria-label={fav ? t('questionsBank.unfavorite') : t('questionsBank.favorite')} onClick={() => void toggleFavorite(q)}><Icon name="star" size={20} fill={fav ? 'currentColor' : 'none'} /></IconButton>
                  <Checkbox checked={isPicked} disabled={!isPicked && (!canSelectQuestion(q) || selected.length >= BANK_SELECTION_MAX)} onCheckedChange={() => toggleSelect(q.id)} aria-label={`${t('questionsBank.select')}: ${q.stem.slice(0, 80)}`} label={t('questionsBank.selectShort')} />
                </div>
              </article></li>;
            })}</ul>
            {selected.length >= BANK_SELECTION_MAX ? <p className="text-sm text-muted">{t('questionsBank.selectMax', { n: BANK_SELECTION_MAX })}</p> : null}
            {moreError ? <Alert role="alert" tone="review" title={t('questionsBank.moreError')}><Button ref={retryMore} variant="secondary" onClick={() => void more()}>{t('common.retry')}</Button></Alert> : null}
            {cursor && !moreError ? <div><Button variant="secondary" loading={loadingMore} onClick={() => void more()}>{remaining > 0 ? t('questionsBank.loadMore', { n: remaining }) : t('questionsBank.loadMoreAny')}</Button></div> : null}
          </> : null}
        </section>
      </div>
      <SelectionBar count={selected.length} onClear={() => setSelected([])} onCreate={() => router.push(`${BANK_EXAM_HREF}?ids=${selected.join(',')}`)} />
      {practice ? <ConfigDialog filters={bankQuery(tab, filters)} open onOpenChange={(v) => { if (!v) setPractice(false); }} /> : null}
      {open ? <QuestionDrawer key={open.id} question={open} inExam={selected.includes(open.id)} examFull={selected.length >= BANK_SELECTION_MAX} onToggleExam={() => toggleSelect(open.id)}
        onAnswered={(id, result) => { if (result !== 'annulled') setProgress((old) => ({ ...old, [id]: result === 'correct' ? 'correct' : 'wrong' })); }} onClose={close} /> : null}
    </div>
  );
}
