'use client';
import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { Alert, Button, Checkbox, Dialog, Input, Select } from '@remoa/ui';
import type { BoardSummary, ExamPaperPublic, QuestionFacets, QuestionListQuery } from '@remoa/contracts';
import { t } from './labels';
import { listQuestionFacets } from './api';
import { t as bt } from './bank-t';

type Filters = Partial<QuestionListQuery>;
type Named = { id: string; name: string };
type Option = { id: string; label: string; hint?: string };

const fold = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');

function FilterAutocomplete({ label, placeholder, value, options, onText, onPick }: {
  label: string;
  placeholder: string;
  value: string;
  options: Option[];
  onText: (value: string) => void;
  onPick: (option: Option) => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const query = fold(value.trim());
  const matched = query ? options.filter((option) => fold(`${option.label} ${option.hint ?? ''}`).includes(query)) : options;
  const shown = matched.slice(0, 8);
  const visible = open && (shown.length > 0 || value.trim() !== '');

  const pick = (option: Option) => {
    onPick(option);
    setOpen(false);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!visible) {
      if (event.key === 'ArrowDown') setOpen(true);
      return;
    }
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => (shown.length ? (index + 1) % shown.length : 0)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => (shown.length ? (index <= 0 ? shown.length - 1 : index - 1) : 0)); }
    if (event.key === 'Enter' && shown[active]) { event.preventDefault(); pick(shown[active]); }
    if (event.key === 'Escape') setOpen(false);
  };

  return (
    <div className="min-w-0" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <Input
        label={label}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={visible && shown[active] ? `${listId}-${shown[active].id}` : undefined}
        onFocus={() => { setOpen(true); setActive(0); }}
        onChange={(event) => { onText(event.target.value); setOpen(true); setActive(0); }}
        onKeyDown={onKeyDown}
      />
      {visible ? (
        <ul id={listId} role="listbox" aria-label={label} className="mt-1 max-h-52 overflow-auto rounded-[14px] border border-border bg-surface p-1">
          {shown.map((option, index) => (
            <li key={option.id}>
              <Button
                id={`${listId}-${option.id}`}
                type="button"
                role="option"
                aria-selected={index === active}
                variant={index === active ? 'secondary' : 'quiet'}
                align="start"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(option)}
              >
                {option.hint ? t('questions.institutionOption', { name: option.label, n: option.hint }) : option.label}
              </Button>
            </li>
          ))}
          {shown.length === 0 ? <li role="status" className="px-3 py-3 text-sm text-muted">{t('questions.filterNoMatch')}</li> : null}
          {matched.length > shown.length ? <li role="status" className="px-3 py-2 text-xs text-muted">{t('questions.filterMore', { n: shown.length })}</li> : null}
        </ul>
      ) : null}
    </div>
  );
}

export function QuestionFilterBar({
  search, onSearch, filters, onFilter, onClear, tabAi, resetKey, institution, onInstitution, institutions, institutionError, onInstitutionRetry, areas, topics, exams, boards,
}: {
  search: string;
  onSearch: (value: string) => void;
  filters: Filters;
  onFilter: (key: keyof Filters, value: string) => void;
  onClear: () => void;
  tabAi: boolean;
  resetKey: string;
  institution: string;
  onInstitution: (value: string) => void;
  institutions: { items: { name: string; paperCount: number }[]; truncated: boolean };
  institutionError: boolean;
  onInstitutionRetry: () => void;
  areas: Named[];
  topics: Named[];
  exams: ExamPaperPublic[];
  boards: BoardSummary[];
}) {
  const [open, setOpen] = useState(false);
  const [areaText, setAreaText] = useState('');
  const [topicText, setTopicText] = useState('');
  const [examText, setExamText] = useState('');
  const [boardText, setBoardText] = useState('');
  const advanced = [filters.origin, filters.difficulty, filters.examId, filters.boardId, filters.type, filters.state, filters.year].filter((value) => value !== undefined && value !== '').length;

  useEffect(() => {
    setAreaText('');
    setTopicText('');
    setExamText('');
    setBoardText('');
  }, [resetKey]);
  useEffect(() => {
    if (!filters.areaId) return;
    const name = areas.find((area) => area.id === filters.areaId)?.name;
    if (name) setAreaText(name);
  }, [filters.areaId, areas]);
  useEffect(() => {
    if (!filters.topicId) return;
    const name = topics.find((topic) => topic.id === filters.topicId)?.name;
    if (name) setTopicText(name);
  }, [filters.topicId, topics]);

  const clear = () => {
    setAreaText('');
    setTopicText('');
    setExamText('');
    setBoardText('');
    onClear();
  };

  return (
    <>
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input label={t('questions.search')} variant="search" placeholder={t('questions.searchPlaceholder')} value={search} onChange={(event) => onSearch(event.target.value)} />
          </div>
          <Button variant="secondary" onClick={() => setOpen(true)}>{advanced ? t('questions.advancedFiltersCount', { n: advanced }) : t('questions.advancedFilters')}</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="min-w-0 space-y-2">
            <FilterAutocomplete
              label={t('questions.institution')}
              placeholder={t('questions.institutionSearch')}
              value={institution}
              options={institutions.items.map((item) => ({ id: item.name, label: item.name, hint: String(item.paperCount) }))}
              onText={onInstitution}
              onPick={(option) => onInstitution(option.label)}
            />
            {institutions.truncated ? <p className="text-xs text-muted">{t('questions.institutionTruncated')}</p> : null}
            {institutionError ? <Alert tone="review" title={t('questions.institutionError')}><Button variant="quiet" onClick={onInstitutionRetry}>{t('common.retry')}</Button></Alert> : null}
          </div>
          <FilterAutocomplete
            label={t('questions.area')}
            placeholder={t('questions.generateSearchPlaceholder')}
            value={areaText}
            options={areas.map((area) => ({ id: area.id, label: area.name }))}
            onText={(value) => { setAreaText(value); if (filters.areaId) onFilter('areaId', ''); }}
            onPick={(option) => { setAreaText(option.label); onFilter('areaId', option.id); }}
          />
          <FilterAutocomplete
            label={t('questions.topic')}
            placeholder={t('questions.generateSearchPlaceholder')}
            value={topicText}
            options={topics.map((topic) => ({ id: topic.id, label: topic.name }))}
            onText={(value) => { setTopicText(value); if (filters.topicId) onFilter('topicId', ''); }}
            onPick={(option) => { setTopicText(option.label); onFilter('topicId', option.id); }}
          />
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen} size="xl" title={t('questions.advancedFiltersTitle')} description={t('questions.advancedFiltersDescription')} closeLabel={t('common.close')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Select label={t('questions.origin')} value={filters.origin ?? (tabAi ? 'ai_generated' : 'all')} onValueChange={(value) => onFilter('origin', value)} options={[{ value: 'all', label: t('questions.all') }, ...(['official_exam', 'remoa_authored', 'ai_generated', 'user_authored'] as const).map((value) => ({ value, label: t(`questions.source.${value}`) }))]} />
          <Select label={t('questions.difficulty')} value={filters.difficulty ?? 'all'} onValueChange={(value) => onFilter('difficulty', value)} options={[{ value: 'all', label: t('questions.all') }, ...(['easy', 'medium', 'hard'] as const).map((value) => ({ value, label: t(`questions.difficultyLabel.${value}`) }))]} />
          <FilterAutocomplete
            label={t('questions.examFilter')}
            placeholder={t('questions.generateSearchPlaceholder')}
            value={examText}
            options={exams.map((exam) => ({ id: exam.id, label: `${exam.institution} · ${exam.name} · ${exam.year}` }))}
            onText={(value) => { setExamText(value); if (filters.examId) onFilter('examId', ''); }}
            onPick={(option) => { setExamText(option.label); onFilter('examId', option.id); }}
          />
          <FilterAutocomplete
            label={t('questions.map')}
            placeholder={t('questions.generateSearchPlaceholder')}
            value={boardText}
            options={boards.map((board) => ({ id: board.id, label: board.title }))}
            onText={(value) => { setBoardText(value); if (filters.boardId) onFilter('boardId', ''); }}
            onPick={(option) => { setBoardText(option.label); onFilter('boardId', option.id); }}
          />
          <Select label={t('questions.type')} value={filters.type ?? 'all'} onValueChange={(value) => onFilter('type', value)} options={[{ value: 'all', label: t('questions.all') }, { value: 'objective', label: t('questions.typeLabel.objective') }, { value: 'discursive', label: t('questions.typeLabel.discursive') }]} />
          <Select label={t('questions.state')} value={filters.state ?? 'all'} onValueChange={(value) => onFilter('state', value)} options={[{ value: 'all', label: t('questions.all') }, ...(['unseen', 'answered', 'wrong', 'favorite', 'doubtful'] as const).map((value) => ({ value, label: t(`questions.states.${value}`) }))]} />
          <Input label={t('questions.year')} type="number" min={1900} max={2200} value={filters.year ?? ''} onChange={(event) => onFilter('year', event.target.value)} />
        </div>
        <div className="mt-4 flex justify-end"><Button variant="quiet" onClick={clear}>{t('questions.clear')}</Button></div>
      </Dialog>
    </>
  );
}

/* ---- F34 student bank filters (flag bankStudent): multivalue, facet counts, ARIA topic combobox ---- */

type Difficulty = 'easy' | 'medium' | 'hard';
export type BankFilters = { search: string; topicIds: string[]; institutions: string[]; years: number[]; difficulties: Difficulty[]; origin: '' | 'official_exam' | 'remoa_authored'; state: '' | 'unseen' | 'answered' | 'wrong' | 'favorite'; sort: '' | 'difficulty' | 'topic' };
export const emptyBankFilters: BankFilters = { search: '', topicIds: [], institutions: [], years: [], difficulties: [], origin: '', state: '', sort: '' };
export const bankFilterCount = (f: BankFilters) => f.topicIds.length + f.institutions.length + f.years.length + f.difficulties.length + (f.origin ? 1 : 0) + (f.state ? 1 : 0) + (f.search.trim() ? 1 : 0);
export type BankTab = 'catalog' | 'ai';
/** Query shared by list and facets (no cursor). The tab decides scope/origin (D-1823); the origin filter only exists in the catalog. */
export const bankQuery = (tab: BankTab, f: BankFilters): Partial<QuestionListQuery> => ({
  scope: tab === 'catalog' ? 'catalog' : 'mine',
  origin: tab === 'ai' ? 'ai_generated' : f.origin || undefined,
  search: f.search.trim() || undefined,
  topicIds: f.topicIds.length ? f.topicIds : undefined, institutions: f.institutions.length ? f.institutions : undefined,
  years: f.years.length ? f.years : undefined, difficulties: f.difficulties.length ? f.difficulties : undefined,
  state: f.state || undefined, sort: f.sort || undefined,
});
const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

function TopicCombobox({ tab, filters, onPick }: { tab: BankTab; filters: BankFilters; onPick: (topic: { id: string; name: string }) => void }) {
  const listId = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'ready' | 'error'; topics: { id: string; name: string; count: number }[] }>({ status: 'idle', topics: [] });
  const query = text.trim();
  useEffect(() => {
    if (!query) { setState({ status: 'idle', topics: [] }); return; }
    const controller = new AbortController();
    setState((old) => ({ ...old, status: 'loading' }));
    const timer = setTimeout(() => {
      void listQuestionFacets({ ...bankQuery(tab, filters), groups: ['topic'], topicQuery: query }, controller.signal)
        .then((facets) => { if (!controller.signal.aborted) setState({ status: 'ready', topics: facets.topics ?? [] }); })
        .catch(() => { if (!controller.signal.aborted) setState({ status: 'error', topics: [] }); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
    // filters other than the text change the counts, so they re-run the search too.
  }, [query, tab, filters]);
  const shown = state.topics.filter((topic) => !filters.topicIds.includes(topic.id));
  const visible = open && query !== '' && state.status !== 'idle';
  const pick = (topic: { id: string; name: string }) => { onPick(topic); setText(''); setOpen(false); setActive(0); };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!visible) { if (event.key === 'ArrowDown') setOpen(true); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => (shown.length ? (i + 1) % shown.length : 0)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => (shown.length ? (i <= 0 ? shown.length - 1 : i - 1) : 0)); }
    if (event.key === 'Enter' && shown[active]) { event.preventDefault(); pick(shown[active]); }
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
  };
  return (
    <div className="min-w-0" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <Input label={bt('questionsBank.topic')} placeholder={bt('questionsBank.topicPlaceholder')} value={text} autoComplete="off" role="combobox" aria-expanded={visible} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={visible && shown[active] ? `${listId}-${shown[active].id}` : undefined}
        onFocus={() => setOpen(true)} onChange={(event) => { setText(event.target.value); setOpen(true); setActive(0); }} onKeyDown={onKeyDown} />
      <ul id={listId} role="listbox" aria-label={bt('questionsBank.topic')} hidden={!visible} className="mt-1 max-h-56 overflow-auto rounded-[14px] border border-border bg-surface p-1">
        {state.status === 'ready' ? shown.map((topic, index) => (
          <li key={topic.id}><Button id={`${listId}-${topic.id}`} type="button" role="option" aria-selected={index === active} variant={index === active ? 'secondary' : 'quiet'} align="start"
            onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => pick(topic)}>{bt('questionsBank.topicOption', { name: topic.name, n: topic.count })}</Button></li>
        )) : null}
      </ul>
      {visible && state.status === 'loading' ? <p role="status" className="px-3 py-2 text-sm text-muted">{bt('questionsBank.topicLoading')}</p> : null}
      {visible && state.status === 'ready' && shown.length === 0 ? <p role="status" className="px-3 py-2 text-sm text-muted">{bt('questionsBank.topicNone')}</p> : null}
      {visible && state.status === 'error' ? <p role="alert" className="px-3 py-2 text-sm text-muted">{bt('questionsBank.topicError')}</p> : null}
    </div>
  );
}

function FacetGroup<V extends string | number>({ legend, options, selected, onToggle }: { legend: string; options: { value: V; label: string; count: number }[]; selected: V[]; onToggle: (value: V) => void }) {
  return (
    <fieldset className="min-w-0 space-y-1"><legend className="mb-1 text-sm font-semibold">{legend}</legend>
      <div className="max-h-48 overflow-auto">{options.map((o) => <Checkbox key={String(o.value)} checked={selected.includes(o.value)} onCheckedChange={() => onToggle(o.value)} label={bt('questionsBank.facetOption', { name: o.label, n: o.count })} />)}</div>
    </fieldset>
  );
}

export function BankFilterBar({ tab, filters, onChange, onClear, facets, facetsError, onFacetsRetry, topicNames }: {
  tab: BankTab; filters: BankFilters; onChange: (next: BankFilters) => void; onClear: () => void; facets: QuestionFacets | null; facetsError: boolean; onFacetsRetry: () => void; topicNames: Record<string, string>;
}) {
  const [search, setSearch] = useState(filters.search);
  useEffect(() => { setSearch(filters.search); }, [filters.search]);
  useEffect(() => { const timer = setTimeout(() => { if (search !== filters.search) onChange({ ...filters, search }); }, 300); return () => clearTimeout(timer); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = bankFilterCount(filters);
  const set = (patch: Partial<BankFilters>) => onChange({ ...filters, ...patch });
  const fieldName = (kind: Difficulty) => t(`questions.difficultyLabel.${kind}`);
  return (
    <div className="mb-5 flex flex-col gap-4" role="group" aria-label={bt('questionsBank.filtersGroup')}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
        <Input label={bt('questionsBank.search')} variant="search" placeholder={bt('questionsBank.searchPlaceholder')} value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select label={bt('questionsBank.sort')} value={filters.sort || 'recent'} onValueChange={(v) => set({ sort: v === 'recent' ? '' : (v as BankFilters['sort']) })}
          options={[{ value: 'recent', label: bt('questionsBank.sortRecent') }, { value: 'difficulty', label: bt('questionsBank.sortDifficulty') }, { value: 'topic', label: bt('questionsBank.sortTopic') }]} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <TopicCombobox tab={tab} filters={filters} onPick={(topic) => { topicNames[topic.id] = topic.name; set({ topicIds: toggle(filters.topicIds, topic.id) }); }} />
        {tab === 'catalog' ? <Select label={bt('questionsBank.origin')} value={filters.origin || 'all'} onValueChange={(v) => set({ origin: v === 'all' ? '' : (v as BankFilters['origin']) })}
          options={[{ value: 'all', label: bt('questionsBank.originAll') }, { value: 'official_exam', label: bt('questionsBank.originOfficial') }, { value: 'remoa_authored', label: bt('questionsBank.originRemoa') }]} /> : <div />}
        <Select label={bt('questionsBank.progress')} value={filters.state || 'all'} onValueChange={(v) => set({ state: v === 'all' ? '' : (v as BankFilters['state']) })}
          options={[{ value: 'all', label: bt('questionsBank.progressAll') }, { value: 'unseen', label: bt('questionsBank.progressUnseen') }, { value: 'answered', label: bt('questionsBank.progressAnswered') }, { value: 'wrong', label: bt('questionsBank.progressWrong') }, { value: 'favorite', label: bt('questionsBank.progressFavorite') }]} />
      </div>
      {filters.topicIds.length ? <ul aria-label={bt('questionsBank.topicSelected')} className="flex flex-wrap gap-2">{filters.topicIds.map((id) => {
        const name = topicNames[id] ?? bt('questionsBank.topicUnknown');
        return <li key={id}><Button variant="secondary" aria-label={bt('questionsBank.topicRemove', { name })} onClick={() => set({ topicIds: filters.topicIds.filter((v) => v !== id) })}>{name} ×</Button></li>;
      })}</ul> : null}
      {facets ? <div className="grid gap-4 md:grid-cols-3">
        {facets.institutions?.length ? <FacetGroup legend={bt('questionsBank.institution')} options={facets.institutions.map((i) => ({ value: i.name, label: i.name, count: i.count }))} selected={filters.institutions} onToggle={(v) => set({ institutions: toggle(filters.institutions, v) })} /> : null}
        {facets.years?.length ? <FacetGroup legend={bt('questionsBank.year')} options={facets.years.map((y) => ({ value: y.year, label: String(y.year), count: y.count }))} selected={filters.years} onToggle={(v) => set({ years: toggle(filters.years, v) })} /> : null}
        {facets.difficulties?.length ? <FacetGroup legend={bt('questionsBank.difficulty')} options={facets.difficulties.map((d) => ({ value: d.value, label: fieldName(d.value), count: d.count }))} selected={filters.difficulties} onToggle={(v) => set({ difficulties: toggle(filters.difficulties, v) })} /> : null}
      </div> : null}
      {facetsError ? <Alert tone="review" title={bt('questionsBank.facetsError')}><Button variant="quiet" onClick={onFacetsRetry}>{t('common.retry')}</Button></Alert> : null}
      {n > 0 ? <div><Button variant="quiet" onClick={onClear}>{bt('questionsBank.clearFilters', { n })}</Button></div> : null}
    </div>
  );
}
