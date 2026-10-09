'use client';
import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { Alert, Button, Dialog, Input, Select } from '@remoa/ui';
import type { BoardSummary, ExamPaperPublic, QuestionListQuery } from '@remoa/contracts';
import { t } from './labels';

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
