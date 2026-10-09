'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHALLENGE_SIZES, type BoardSummary, type ChallengeConfig } from '@remoa/contracts';
import { Alert, Button, Dialog, Input, Select } from '@remoa/ui';
import { api } from '@/lib/api';
import { aiChallengeHref, startAiChallenge } from '@/features/challenge-ai/start-ai';
import { t } from './labels';
import { listQuestionTaxonomy } from './api';

type Named = { id: string; name: string };
type Kind = 'objective' | 'discursive' | 'mixed';

const matches = (query: string, name: string) => name.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'));

function Suggest({ label, placeholder, query, onQuery, options, selectedId, onSelect }: {
  label: string; placeholder: string; query: string; onQuery: (value: string) => void; options: Named[]; selectedId: string | null; onSelect: (id: string, name: string) => void;
}) {
  const shown = options.filter((option) => matches(query, option.name)).slice(0, 8);
  return (
    <div className="flex flex-col gap-2">
      <Input label={label} placeholder={placeholder} value={query} onChange={(event) => onQuery(event.target.value)} autoComplete="off" />
      {query.trim() && shown.length ? (
        <ul className="m-0 flex max-h-40 list-none flex-col gap-1 overflow-auto p-0">
          {shown.map((option) => (
            <li key={option.id}>
              <Button variant={option.id === selectedId ? 'primary' : 'quiet'} onClick={() => onSelect(option.id, option.name)}>{option.name}</Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Starts a generated exam from a map the student already has, with subject, specialty, size, answer type and time. */
export function GenerateExamDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [boardsReady, setBoardsReady] = useState(false);
  const [areas, setAreas] = useState<Named[]>([]);
  const [topics, setTopics] = useState<Named[]>([]);
  const [content, setContent] = useState('');
  const [boardId, setBoardId] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState('');
  const [areaId, setAreaId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [topicId, setTopicId] = useState<string | null>(null);
  const [count, setCount] = useState<number>(10);
  const [kind, setKind] = useState<Kind>('mixed');
  const [perQuestion, setPerQuestion] = useState(90);
  const [total, setTotal] = useState(15);
  const [mode, setMode] = useState<'study' | 'simulation'>('simulation');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setBoardsReady(false);
    void Promise.all([
      api<BoardSummary[]>('/v1/boards').then((result) => { if (!active) return; if (result.ok) setBoards(result.data); else setError(t('questions.generateError')); }).catch(() => { if (active) setError(t('questions.generateError')); }),
      listQuestionTaxonomy('area').then((value) => { if (active) setAreas(value); }).catch(() => undefined),
      listQuestionTaxonomy('topic').then((value) => { if (active) setTopics(value); }).catch(() => undefined),
    ]).finally(() => { if (active) setBoardsReady(true); });
    return () => { active = false; };
  }, [open]);

  const maps = useMemo(() => boards.map((board) => ({ id: board.id, name: board.title })), [boards]);
  const topicOptions = useMemo(() => {
    if (!areaId) return topics;
    const narrowed = topics.filter((topic) => matches(specialty, topic.name) || matches(topic.name, specialty));
    return narrowed.length ? narrowed : topics;
  }, [areaId, specialty, topics]);
  const start = async () => {
    if (!boardId) { setError(t('questions.generateNeedMap')); return; }
    const subjectId = topicId ?? areaId;
    const config: ChallengeConfig = {
      boardId,
      scope: { kind: 'board' },
      format: 'generated',
      n: count,
      difficulty: 'mixed',
      questionType: kind,
      grading: mode === 'simulation' ? 'end' : 'immediate',
      timerSec: total > 0 ? total * 60 : null,
      preset: mode === 'simulation' ? 'mock' : 'practice',
      ...(subjectId ? { enamedTopicId: subjectId } : {}),
    };
    setBusy(true);
    setError(null);
    const result = await startAiChallenge(config);
    setBusy(false);
    if (!result.ok) { setError(t('questions.generateError')); return; }
    onOpenChange(false);
    router.push(aiChallengeHref(boardId, result.data.id));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }} size="xl" title={t('questions.generateTitle')} description={t('questions.generateDescription')} closeLabel={t('common.close')}>
      <div className="flex flex-col gap-4">
        {boardsReady && boards.length === 0 && !error ? <p className="text-sm text-muted">{t('questions.generateNoMaps')}</p> : null}
        <Suggest label={t('questions.generateContent')} placeholder={t('questions.generateContentPlaceholder')} query={content} onQuery={(value) => { setContent(value); setBoardId(null); }} options={maps} selectedId={boardId} onSelect={(id, name) => { setBoardId(id); setContent(name); }} />
        <Suggest label={t('questions.generateSpecialty')} placeholder={t('questions.generateSearchPlaceholder')} query={specialty} onQuery={(value) => { setSpecialty(value); setAreaId(null); }} options={areas} selectedId={areaId} onSelect={(id, name) => { setAreaId(id); setSpecialty(name); }} />
        <Suggest label={t('questions.generateSubject')} placeholder={t('questions.generateSearchPlaceholder')} query={subject} onQuery={(value) => { setSubject(value); setTopicId(null); }} options={topicOptions} selectedId={topicId} onSelect={(id, name) => { setTopicId(id); setSubject(name); }} />
        <Select label={t('questions.mode')} value={mode} onValueChange={(value) => setMode(value as typeof mode)} options={[{ value: 'simulation', label: t('questions.simulation') }, { value: 'study', label: t('questions.study') }]} />
        <Select label={t('questions.generateCount')} value={String(count)} onValueChange={(value) => { const next = Number(value); setCount(next); setTotal(Math.max(1, Math.round((perQuestion * next) / 60))); }} options={CHALLENGE_SIZES.map((value) => ({ value: String(value), label: String(value) }))} />
        <Select label={t('questions.generateType')} value={kind} onValueChange={(value) => setKind(value as Kind)} options={(['objective', 'discursive', 'mixed'] as const).map((value) => ({ value, label: t(`questions.generateTypes.${value}`) }))} />
        <Input label={t('questions.generatePerQuestion')} type="number" min={30} max={600} value={perQuestion} onChange={(event) => { const next = Number(event.target.value); setPerQuestion(next); if (Number.isFinite(next)) setTotal(Math.max(1, Math.round((next * count) / 60))); }} />
        <Input label={t('questions.generateTotal')} type="number" min={0} max={240} value={total} onChange={(event) => setTotal(Number(event.target.value))} />
        {error ? <Alert tone="review" role="alert" title={error} /> : null}
        <Button loading={busy} loadingLabel={t('questions.starting')} disabled={!boardId} onClick={() => void start()}>{t('questions.generateStart')}</Button>
      </div>
    </Dialog>
  );
}
