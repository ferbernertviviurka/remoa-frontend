'use client';
import { useState } from 'react';
import { Alert, Button, Dialog, Input, Select } from '@remoa/ui';
import type { BoardSummary, ExamPaperPublic, QuestionListQuery } from '@remoa/contracts';
import { t } from './labels';

type Filters = Partial<QuestionListQuery>;
type Named = { id: string; name: string };

export function QuestionFilterBar({
  search, onSearch, filters, onFilter, onClear, tabAi, institution, onInstitution, institutions, institutionError, onInstitutionRetry, areas, topics, exams, boards,
}: {
  search: string;
  onSearch: (value: string) => void;
  filters: Filters;
  onFilter: (key: keyof Filters, value: string) => void;
  onClear: () => void;
  tabAi: boolean;
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
  const options = (values: Named[]) => [{ value: 'all', label: t('questions.all') }, ...values.map((v) => ({ value: v.id, label: v.name }))];
  const advanced = [filters.origin, filters.difficulty, filters.areaId, filters.topicId, filters.examId, filters.boardId, filters.type, filters.state, filters.year, institution]
    .filter((value) => value !== undefined && value !== '').length;
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Input label={t('questions.search')} variant="search" placeholder={t('questions.searchPlaceholder')} value={search} onChange={(e) => onSearch(e.target.value)} />
        </div>
        <Button variant="secondary" onClick={() => setOpen(true)}>{advanced ? t('questions.advancedFiltersCount', { n: advanced }) : t('questions.advancedFilters')}</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen} size="xl" title={t('questions.advancedFiltersTitle')} description={t('questions.advancedFiltersDescription')} closeLabel={t('common.close')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Select label={t('questions.origin')} value={filters.origin ?? (tabAi ? 'ai_generated' : 'all')} onValueChange={(v) => onFilter('origin', v)} options={[{ value: 'all', label: t('questions.all') }, ...(['official_exam', 'remoa_authored', 'ai_generated', 'user_authored'] as const).map((value) => ({ value, label: t(`questions.source.${value}`) }))]} />
          <Select label={t('questions.difficulty')} value={filters.difficulty ?? 'all'} onValueChange={(v) => onFilter('difficulty', v)} options={[{ value: 'all', label: t('questions.all') }, ...(['easy', 'medium', 'hard'] as const).map((value) => ({ value, label: t(`questions.difficultyLabel.${value}`) }))]} />
          {areas.length ? <Select label={t('questions.area')} value={filters.areaId ?? 'all'} onValueChange={(v) => onFilter('areaId', v)} options={options(areas)} /> : null}
          {topics.length ? <Select label={t('questions.topic')} value={filters.topicId ?? 'all'} onValueChange={(v) => onFilter('topicId', v)} options={options(topics)} /> : null}
          <div className="min-w-0 space-y-2">
            <Input label={t('questions.institution')} placeholder={t('questions.institutionSearch')} list="question-institutions" value={institution} onChange={(event) => onInstitution(event.target.value)} />
            <datalist id="question-institutions">{institutions.items.map((value) => <option key={value.name} value={value.name}>{t('questions.institutionOption', { name: value.name, n: value.paperCount })}</option>)}</datalist>
            {institutions.truncated ? <p className="text-xs text-muted">{t('questions.institutionTruncated')}</p> : null}
            {institutionError ? <Alert tone="review" title={t('questions.institutionError')}><Button variant="quiet" onClick={onInstitutionRetry}>{t('common.retry')}</Button></Alert> : null}
          </div>
          {exams.length ? <Select label={t('questions.examFilter')} value={filters.examId ?? 'all'} onValueChange={(v) => onFilter('examId', v)} options={options(exams.map((e) => ({ id: e.id, name: `${e.institution} · ${e.name} · ${e.year}` })))} /> : null}
          {boards.length ? <Select label={t('questions.map')} value={filters.boardId ?? 'all'} onValueChange={(v) => onFilter('boardId', v)} options={options(boards.map((b) => ({ id: b.id, name: b.title })))} /> : null}
          <Select label={t('questions.type')} value={filters.type ?? 'all'} onValueChange={(v) => onFilter('type', v)} options={[{ value: 'all', label: t('questions.all') }, { value: 'objective', label: t('questions.typeLabel.objective') }, { value: 'discursive', label: t('questions.typeLabel.discursive') }]} />
          <Select label={t('questions.state')} value={filters.state ?? 'all'} onValueChange={(v) => onFilter('state', v)} options={[{ value: 'all', label: t('questions.all') }, ...(['unseen', 'answered', 'wrong', 'favorite', 'doubtful'] as const).map((value) => ({ value, label: t(`questions.states.${value}`) }))]} />
          <Input label={t('questions.year')} type="number" min={1900} max={2200} value={filters.year ?? ''} onChange={(e) => onFilter('year', e.target.value)} />
        </div>
        <div className="mt-4 flex justify-end"><Button variant="quiet" onClick={onClear}>{t('questions.clear')}</Button></div>
      </Dialog>
    </>
  );
}
