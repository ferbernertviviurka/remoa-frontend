'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Board, BoardGenerationProgress, MatrixItem } from '@remoa/contracts';
import { t, type StringKey } from '@remoa/strings';
import { Button, ChoiceCard, ChoiceRow, Dialog, Dropzone, FilterChip, Icon, IconButton, Input, Logo, Progress, Stepper } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { usePaywall } from '@/features/billing/paywall';
import { useMatrixSuggestions } from '@/features/coverage/matrix-suggestions';
import Link from 'next/link';
import { AnkiImportFlow } from '@/features/import/anki-import-flow';
import { useAnkiImport } from '@/features/import/use-anki-import';
import { MapPreview, type Path } from './map-preview';

const PATHS: ReadonlyArray<{ id: Path; icon: 'file' | 'archive' | 'book' | 'plus' }> = [
  { id: 'pdf', icon: 'file' },
  { id: 'anki', icon: 'archive' },
  { id: 'seed', icon: 'book' },
  { id: 'blank', icon: 'plus' },
];
const AREAS = ['CM', 'CIR', 'GO', 'PED', 'MP'] as const;
const OPTS = { pdf: ['flows', 'rubrics'] } as const;

type Props = { items: MatrixItem[]; initialPath?: Path; initialItemId?: string; initialStep?: 0 | 1 | 2 };

export function NewMapView({ items, initialPath, initialItemId, initialStep = 0 }: Props) {
  const router = useRouter();
  const paywall = usePaywall();
  const anki = useAnkiImport();
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (anki.state.kind !== 'idle') h1.current?.focus(); // each import stage announces itself by moving focus to its heading
  }, [anki.state.kind]);
  const [step, setStep] = useState<0 | 1 | 2>(initialStep);
  const [path, setPath] = useState<Path>(initialPath ?? 'pdf');
  const ankiRunning = path === 'anki' && anki.state.kind !== 'idle';
  const [itemId, setItemId] = useState<string | null>(initialItemId ?? items[0]?.id ?? null);
  const [name, setName] = useState((items.find((i) => i.id === (initialItemId ?? items[0]?.id)))?.title ?? '');
  const [touched, setTouched] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [opts, setOpts] = useState<Record<string, boolean>>({ flows: true, rubrics: true });
  const [seeds, setSeeds] = useState<{ id: string; title: string; temporalMark: string | null }[] | null>(null);
  const [soon, setSoon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState<'ocr' | 'extract' | 'layout' | null>(null);

  useEffect(() => {
    if (path !== 'seed') return;
    void Promise.resolve(api<{ id: string; title: string; temporalMark: string | null }[]>('/v1/editorial/seeds')).then((r) => setSeeds(r?.ok ? r.data : []));
  }, [path]);

  const suggested = useMatrixSuggestions(step >= 1 ? name : '', 300);
  const item = items.find((i) => i.id === itemId);
  // Suggestions (title similarity) go first in the list; the rest keep the catalog order.
  const sortedItems = [...suggested.flatMap((s) => items.find((i) => i.id === s.id) ?? []), ...items.filter((i) => !suggested.some((s) => s.id === i.id))];
  const area = t('boards.area.CM');
  const needsFile = path === 'pdf' || path === 'anki';
  const accept = path === 'pdf' ? '.pdf' : '.apkg';

  const pickItem = (i: MatrixItem) => {
    setItemId(i.id);
    if (!touched) setName(i.title);
  };

  async function generatePdf() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    setStage('ocr');
    const started = Date.now();
    const open = (boardId: string, cards: number, edges: number, pages = 1) => {
      track('board_generated_from_pdf', { pages, cards, edges, durationMs: Date.now() - started });
      router.push(`/app/mapas/${boardId}`);
    };
    try {
      const { data } = await createClient().auth.getSession();
      const token = data.session?.access_token;
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/v1/ai/generate-pdf?title=${encodeURIComponent(name.trim() || file.name.replace(/\.pdf$/i, ''))}`, {
        method: 'POST',
        headers: { authorization: token ? `Bearer ${token}` : '', 'content-type': 'application/pdf' },
        body: file,
      });
      const body = (await res.json()) as { ok: true; data: { boardId?: string | null; jobId?: string; cards?: number; edges?: number } } | { ok: false; error: { code: string; message?: string } };
      if (!body.ok) {
        if (!paywall.handle(body.error)) setError(body.error.message === 'pdf_unreadable' ? t('newMap.pdfUnreadable') : t('errors.internal'));
        return;
      }
      if (body.data.boardId && !body.data.jobId) {
        open(body.data.boardId, body.data.cards ?? 0, body.data.edges ?? 0);
        return;
      }
      if (!body.data.jobId) {
        setError(t('errors.internal'));
        return;
      }
      for (;;) {
        const job = await api<BoardGenerationProgress & { cards?: number; edges?: number; pages?: number }>(`/v1/ai/jobs/${body.data.jobId}`);
        if (!job.ok) {
          setError(t('errors.internal'));
          return;
        }
        setProgress(job.data.progress);
        setStage(job.data.stage === 'ocr' || job.data.stage === 'layout' ? job.data.stage : 'extract');
        if (job.data.status === 'done' && job.data.boardId) {
          open(job.data.boardId, job.data.cards ?? 0, job.data.edges ?? 0, job.data.pages ?? 1);
          return;
        }
        if (job.data.status === 'failed') {
          if (job.data.error === 'ai_generations') paywall.handle({ code: 'quota_exceeded', message: 'ai_generations' });
          else if (job.data.error === 'pdf_unreadable') setError(t('newMap.pdfUnreadable'));
          else if (job.data.error === 'generate_timeout') setError(t('newMap.generateTimeout'));
          else setError(t('errors.internal'));
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch {
      setError(t('errors.internal'));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<Board>('/v1/boards', { method: 'POST', body: JSON.stringify({ title: name.trim(), area: 'CM', matrixItemId: itemId }) });
      if (!r.ok) {
        if (!paywall.handle(r.error)) setError(t(`errors.${r.error.code}` as StringKey));
        return;
      }
      track('board_created', {});
      if (itemId) track('board_linked_to_matrix', { count: 1, suggestedCount: suggested.some((s) => s.id === itemId) ? 1 : 0 });
      router.push(`/app/mapas/${r.data.id}`);
    } catch {
      setError(t('errors.internal'));
    } finally {
      setBusy(false);
    }
  }

  async function copySeed(boardId: string) {
    setError(null);
    const r = await api<{ id: string }>('/v1/editorial/copy', { method: 'POST', body: JSON.stringify({ boardId }) });
    if (r.ok) {
      track('board_created', {});
      track('seed_board_copied', {});
      router.push(`/app/mapas/${r.data.id}`);
    } else if (!paywall.handle(r.error)) setError(t('errors.internal'));
  }

  const heading = (title: string, desc: string) => (
    <div className="flex flex-col gap-2">
      <h1 ref={h1} tabIndex={-1} className="outline-none font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.035em] md:text-[44px] md:leading-[1.05]">{title}</h1>
      <p className="text-base text-muted">{desc}</p>
    </div>
  );
  const sub = (label: string) => <span className="font-bold">{label}</span>;
  const row = (label: string, value: string, last = false) => (
    <div className={`flex justify-between py-3.5 ${last ? '' : 'border-b border-divider'}`}>
      <span className="text-muted">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );

  const last = step === 2;
  const canContinue = step === 0 || (step === 1 && name.trim().length > 0);
  const canFinish = path === 'blank' ? name.trim().length > 0 : needsFile && file != null; // seed: nothing to pick yet
  const cta = t(`newMap.cta.${path}` as StringKey);

  return (
    <div className="flex min-h-dvh bg-canvas text-ink">
      <main className="flex min-w-0 flex-1 flex-col lg:w-1/2 lg:flex-none gap-6 px-4 pb-8 pt-5 sm:px-6 sm:pt-[30px] md:gap-7 md:px-14">
        <div className="flex items-center justify-between gap-4">
          <Link href="/app/hoje" aria-label={t('pages.logoLink')} className="inline-flex min-h-11 min-w-11 items-center no-underline">
            <span className="max-sm:hidden"><Logo size={32} withWordmark /></span>
            <span className="sm:hidden"><Logo size={32} /></span>
          </Link>
          <Stepper aria-label={t('newMap.stepsLabel')} doneLabel={t('newMap.stepDone')} current={step} steps={[t('newMap.step.one'), t('newMap.step.two'), t('newMap.step.three')]} />
          <IconButton aria-label={t('newMap.closeLabel')} variant="secondary" onClick={() => router.push('/app/mapas')}>
            <Icon name="close" size={20} />
          </IconButton>
        </div>

        <div className="flex max-w-[660px] grow flex-col gap-[22px]">
          {step === 0 ? (
            <>
              {heading(t('newMap.step1Title'), t('newMap.step1Desc'))}
              <div role="group" aria-label={t('newMap.step1Title')} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {PATHS.map((p) => (
                  <ChoiceCard
                    key={p.id}
                    icon={p.icon}
                    tag={t(`newMap.path.${p.id}Tag` as StringKey)}
                    title={t(`newMap.path.${p.id}` as StringKey)}
                    description={t(`newMap.path.${p.id}Desc` as StringKey)}
                    selected={path === p.id}
                    onSelect={() => {
                      setPath(p.id);
                      setFile(null);
                    }}
                  />
                ))}
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              {heading(t('newMap.step2Title'), t('newMap.step2Desc'))}
              <div className="flex flex-col gap-2">
                {sub(t('newMap.areaLabel'))}
                <div role="group" aria-label={t('newMap.areaLabel')} className="flex flex-wrap gap-2.5">
                  {AREAS.map((a) =>
                    a === 'CM' ? (
                      <FilterChip key={a} pressed>{t('boards.area.CM')}</FilterChip>
                    ) : (
                      // D-083: only Clínica Médica is selectable in the MVP
                      <span key={a} className="opacity-50">
                        <FilterChip pressed={false} disabled title={t('newMap.areaSoon')}>{t(`boards.area.${a}` as StringKey)}</FilterChip>
                      </span>
                    ),
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {sub(t('newMap.itemLabel'))}
                <div role="group" aria-label={t('newMap.itemLabel')} className="-m-1 flex max-h-[240px] flex-col gap-2 overflow-y-auto p-1">
                  {items.length === 0 ? <p className="text-sm text-muted">{t('newMap.noItems')}</p> : null}
                  {sortedItems.map((i) => (
                    <ChoiceRow key={i.id} indicator="radio" selected={i.id === itemId} onSelect={() => pickItem(i)}>{i.title}</ChoiceRow>
                  ))}
                </div>
              </div>
              <Input
                label={t('newMap.nameLabel')}
                value={name}
                maxLength={120}
                onChange={(e) => {
                  setName(e.target.value);
                  setTouched(true);
                }}
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              {ankiRunning && anki.state.kind !== 'idle'
                ? heading(t(`import.heading.${anki.state.kind === 'uploading' || anki.state.kind === 'inspecting' ? 'sending' : anki.state.kind}.title` as StringKey), t(`import.heading.${anki.state.kind === 'uploading' || anki.state.kind === 'inspecting' ? 'sending' : anki.state.kind}.desc` as StringKey))
                : heading(t(`newMap.step3Title.${path}` as StringKey), t(`newMap.step3Desc.${path}` as StringKey))}
              {ankiRunning && anki.state.kind !== 'idle' ? (
                <AnkiImportFlow state={anki.state} onPlan={anki.setPlan} onConfirm={() => void anki.confirm()} onReset={anki.reset} onOpen={(id) => router.push(`/app/mapas/${id}`)} />
              ) : null}
              {needsFile && !ankiRunning ? (
                <>
                  <Dropzone
                    title={t(`newMap.dropTitle.${path}` as StringKey)}
                    description={t(`newMap.dropDesc.${path}` as StringKey)}
                    buttonLabel={t('newMap.filePickerLabel')}
                    accept={accept}
                    onFiles={(f) => setFile(f[0] ?? null)}
                    file={file ? { name: file.name, meta: t('newMap.fileMeta', { mb: (file.size / 1_048_576).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }) } : null}
                    replaceLabel={t('newMap.replaceFile')}
                    onReplace={() => setFile(null)}
                  />
                  {file && path === 'anki' ? <p className="text-sm text-muted">{t('import.subdecksNote')}</p> : null}
                  {file && path === 'pdf' ? (
                    <div className="flex flex-col gap-2.5">
                      {OPTS.pdf.map((o) => (
                        <ChoiceRow key={o} indicator="check" selected={!!opts[o]} onSelect={() => setOpts({ ...opts, [o]: !opts[o] })}>
                          {t(`newMap.opts.${path}.${o}` as StringKey)}
                        </ChoiceRow>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
              {path === 'seed' ? (
                seeds && seeds.length > 0 ? (
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {seeds.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 rounded-[22px] border border-border bg-surface px-[22px] py-4">
                        <span>
                          <span className="block font-semibold">{s.title}</span>
                          {s.temporalMark ? <span className="text-sm text-muted">{s.temporalMark}</span> : null}
                        </span>
                        <Button size="sm" onClick={() => void copySeed(s.id)}>{t('editorial.copy')}</Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p role="status" className="rounded-[22px] border border-border bg-surface px-[22px] py-4 text-muted">{t('newMap.seedSoon')}</p>
                )
              ) : null}
              {path === 'blank' ? (
                <div className="flex flex-col gap-0.5 rounded-[22px] border border-border bg-surface px-[22px] py-1.5">
                  {row(t('newMap.nameLabel'), name)}
                  {row(t('newMap.areaLabel'), area)}
                  {row(t('newMap.itemLabel'), item?.title ?? '—', true)}
                </div>
              ) : null}
              {progress != null ? (
                <div className="flex flex-col gap-2">
                  <p role="status" className="m-0 text-sm font-semibold">{t('newMap.generating', { stage: t(`newMap.stage.${stage ?? 'extract'}`), n: progress })}</p>
                  <Progress aria-label={t('newMap.generatingLabel')} value={progress} />
                </div>
              ) : null}
              {error ? <p role="alert" className="text-sm font-semibold text-review">{error}</p> : null}
            </>
          ) : null}
        </div>

        {ankiRunning ? null : <div className="sticky bottom-0 -mb-8 flex max-w-[660px] items-center justify-between gap-3 max-sm:flex-col-reverse max-sm:items-stretch max-sm:[&>button]:w-full bg-canvas pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3">
          {step > 0 ? (
            <Button variant="secondary" size="lg" icon={<Icon name="left" size={20} />} onClick={() => setStep((step - 1) as 0 | 1)}>{t('newMap.backButton')}</Button>
          ) : (
            <span className="max-sm:hidden" />
          )}
          {last && path !== 'seed' ? (
            <Button
              size="lg"
              disabled={!canFinish}
              loading={busy}
              loadingLabel={t('common.loading')}
              iconEnd={path === 'blank' ? <Icon name="right" size={20} /> : undefined}
              onClick={() => (path === 'blank' ? void create() : path === 'anki' && file ? void anki.start(file) : path === 'pdf' && file ? void generatePdf() : setSoon(true))}
            >
              {cta}
            </Button>
          ) : !last ? (
            <Button size="lg" disabled={!canContinue} iconEnd={<Icon name="right" size={20} />} onClick={() => setStep((step + 1) as 1 | 2)}>{t('newMap.continueButton')}</Button>
          ) : null}
        </div>}
        <MapPreview compact path={path} step={step} name={name.trim()} area={area} item={item?.title ?? ''} />
      </main>

      <MapPreview path={path} step={step} name={name.trim()} area={area} item={item?.title ?? ''} />

      {/* D-068/D-071: PDF (F05), Anki (F06) and mapas prontos (F10/F12) do not exist in the backend yet; never pretend they generated. */}
      <Dialog open={soon} onOpenChange={setSoon} title={t('boards.soon.title')} description={t('boards.soon.body')} closeLabel={t('common.close')}>
        <Button onClick={() => setSoon(false)}>{t('common.close')}</Button>
      </Dialog>
    </div>
  );
}
