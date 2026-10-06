'use client';

import { AiNotice, AiWarning } from '@/features/ai/ai-notice';
import { useNavigate } from '@/features/shell/use-navigate';
import { useEffect, useRef, useState } from 'react';
import type { Board, BoardGenerationProgress, ImportBoardInput, ImportTarget, MatrixItem } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { Alert, Button, ChoiceCard, ChoiceRow, Dialog, Dropzone, Icon, IconButton, Logo, Progress, Stepper } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import { usePaywall } from '@/features/billing/paywall';
import { useEntitlements } from '@/features/shell/entitlements';
import { useMatrixSuggestions } from '@/features/coverage/matrix-suggestions';
import Link from 'next/link';
import { AnkiImportFlow } from '@/features/import/anki-import-flow';
import { ExistingBoardDialog } from '@/features/import/existing-board-dialog';
import { defaultBoardTitle, estimate } from '@/features/import/plan';
import { useAnkiImport } from '@/features/import/use-anki-import';
import { AboutMapForm, aboutErrors, aboutPayload, emptyAboutMap, type AboutMap } from './about-map-form';
import { MapPreview, type Path } from './map-preview';

const t = withStrings({ ankiSteps: more.ankiSteps, boards: more.boards, editorial: more.editorial, import: more.import, newMap: more.newMap, newMapAbout: more.newMapAbout });
type StringKey = Parameters<typeof t>[0];

const PATHS: ReadonlyArray<{ id: Path; icon: 'file' | 'archive' | 'book' | 'plus' }> = [
  { id: 'pdf', icon: 'file' },
  { id: 'anki', icon: 'archive' },
  { id: 'seed', icon: 'book' },
  { id: 'blank', icon: 'plus' },
];
const OPTS = { pdf: ['flows', 'rubrics'] } as const;

/** `items`: every CM matrix item (groups label the leaves in the picker). */
type Props = { items: MatrixItem[]; initialPath?: Path; initialItemId?: string; initialStep?: 0 | 1 | 2 };

export function NewMapView({ items, initialPath, initialItemId, initialStep = 0 }: Props) {
  const [navigating, router] = useNavigate();
  const paywall = usePaywall();
  const anki = useAnkiImport();
  const { entitlements } = useEntitlements();
  const h1 = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (anki.state.kind !== 'idle') h1.current?.focus(); // each import stage announces itself by moving focus to its heading
  }, [anki.state.kind]);
  const [step, setStep] = useState<0 | 1 | 2>(initialStep);
  const [path, setPath] = useState<Path>(initialPath ?? 'pdf');
  const [about, setAbout] = useState<AboutMap>(() => emptyAboutMap(items.find((i) => i.id === initialItemId)?.title ?? '', initialItemId ? [initialItemId] : []));
  const [titleTouched, setTitleTouched] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [existing, setExisting] = useState<{ id: string; title: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [opts, setOpts] = useState<Record<string, boolean>>({ flows: true, rubrics: true });
  const [seeds, setSeeds] = useState<{ id: string; title: string; temporalMark: string | null }[] | null>(null);
  const [soon, setSoon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState<'ocr' | 'extract' | 'layout' | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [failedJob, setFailedJob] = useState<string | null>(null);
  const [ready, setReady] = useState<{ dropped: number; go: () => void } | null>(null);

  // FR-3: the name follows the file (root deck, or file name) until the student types one.
  const ankiKey = anki.state.kind === 'preview' ? anki.state.key : null;
  useEffect(() => {
    if (titleTouched) return;
    const st = anki.state;
    if (path === 'anki' && st.kind === 'preview' && file) setAbout((a) => ({ ...a, title: defaultBoardTitle(st.summary, file.name) }));
    if (path === 'pdf' && file) setAbout((a) => ({ ...a, title: file.name.replace(/\.pdf$/i, '').slice(0, 120) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when a new file is read
  }, [ankiKey, file, path]);

  useEffect(() => {
    if (path !== 'seed') return;
    void Promise.resolve(api<{ id: string; title: string; temporalMark: string | null }[]>('/v1/editorial/seeds')).then((r) => setSeeds(r?.ok ? r.data : []));
  }, [path]);

  const suggested = useMatrixSuggestions(step >= 1 ? about.title : '', 300);
  const firstItem = items.find((i) => i.id === about.matrixItemIds[0]);
  const area = t(`boards.area.${about.area}` as StringKey);
  const needsFile = path === 'pdf' || path === 'anki';
  const accept = path === 'pdf' ? '.pdf' : '.apkg';
  const suggestedCount = about.matrixItemIds.filter((id) => suggested.some((s) => s.id === id)).length;
  const payload = aboutPayload(about);
  const trackAbout = () => {
    if (payload.matrixItemIds.length) track('board_linked_to_matrix', { count: payload.matrixItemIds.length, suggestedCount });
    if (payload.access !== 'owner') track('board_access_changed', { from: 'owner', to: payload.access, source: 'create' });
  };

  /** Polls a generation job until it ends; failures keep the job id so "Tentar de novo" can call /retry (G22). */
  async function runJob(id: string) {
    const started = Date.now();
    setJobId(id);
    for (;;) {
      const job = await api<BoardGenerationProgress>(`/v1/ai/jobs/${id}`);
      if (!job.ok) return setError(t(`errors.${job.error.code}` as StringKey));
      const j = job.data;
      setProgress(j.progress);
      setStage(j.stage === 'ocr' || j.stage === 'layout' ? j.stage : 'extract');
      if (j.status === 'done' && j.boardId) {
        const boardId = j.boardId;
        const go = () => {
          track('board_generated_from_pdf', { pages: j.pages ?? 1, cards: j.cards ?? 0, edges: j.edges ?? 0, durationMs: Date.now() - started });
          trackAbout();
          router.push(`/app/mapas/${boardId}`);
        };
        if (j.dropped) setReady({ dropped: j.dropped, go }); // cards without a source excerpt were dropped: say so before opening
        else go();
        return;
      }
      if (j.status === 'failed') {
        if (j.error === 'ai_generations') return void paywall.handle({ code: 'quota_exceeded', message: 'ai_generations' });
        setFailedJob(id);
        if (j.error === 'canceled') setError(t('newMap.canceled'));
        else if (j.error === 'pdf_unreadable') setError(t('newMap.pdfUnreadable'));
        else if (j.error === 'generate_timeout') setError(t('newMap.generateTimeout'));
        else setError(j.ai?.message || t('errors.internal')); // no_content, no_sourced_cards, invalid_output, provider_error, timeout...
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  async function retryJob() {
    if (!failedJob) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const r = await api(`/v1/ai/jobs/${failedJob}/retry`, { method: 'POST' });
      if (!r.ok) setError(t(`errors.${r.error.code}` as StringKey));
      else {
        setFailedJob(null);
        await runJob(failedJob);
      }
    } catch {
      setError(t('errors.internal'));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  /** 409 = the job already ended: the polling shows how. */
  const cancelJob = () => void (jobId && api(`/v1/ai/jobs/${jobId}/cancel`, { method: 'POST' }));

  async function generatePdf() {
    if (!file) return;
    if (entitlements?.limits.ai_generations === 0) return paywall.show('pdf'); // D-647: PDF maps are not in the Free plan; nothing is uploaded
    setBusy(true);
    setError(null);
    setProgress(0);
    setStage('ocr');
    setFailedJob(null);
    setReady(null);
    const started = Date.now();
    const open = async (boardId: string, cards: number, edges: number, pages = 1) => {
      track('board_generated_from_pdf', { pages, cards, edges, durationMs: Date.now() - started });
      trackAbout();
      router.push(`/app/mapas/${boardId}`);
    };
    try {
      const { data } = await (await import('@/lib/supabase/client')).createClient().auth.getSession();
      const token = data.session?.access_token;
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      // D-541: multipart `file` + `board` (D-532); the browser sets the content-type boundary.
      const form = new FormData();
      form.set('file', file);
      form.set('board', JSON.stringify(payload));
      const res = await fetch(`${base}/v1/ai/generate-pdf`, { method: 'POST', headers: { authorization: token ? `Bearer ${token}` : '' }, body: form });
      const body = (await res.json()) as { ok: true; data: { boardId?: string | null; jobId?: string; cards?: number; edges?: number } } | { ok?: false; error: { code: string; message?: string } };
      if (!body.ok) {
        // D-499: quota (402 → paywall), size/type (422) and rate limit (429) come back before the job starts.
        const e = body.error;
        if (paywall.handle(e)) return;
        // D-580: 503 ai_unavailable (`ai_not_configured` = the API has no OPENROUTER_API_KEY and no AI=mock); any other code says its own typed message.
        const msg = { pdf_unreadable: 'newMap.pdfUnreadable', pdf_too_large: 'newMap.pdfTooLarge', pdf_invalid: 'newMap.pdfInvalid', ai_not_configured: 'newMap.aiNotConfigured' }[e.message ?? ''];
        setError(t((msg ?? `errors.${e.code}`) as StringKey));
        return;
      }
      if (body.data.boardId && !body.data.jobId) {
        await open(body.data.boardId, body.data.cards ?? 0, body.data.edges ?? 0);
        return;
      }
      if (!body.data.jobId) {
        setError(t('errors.internal'));
        return;
      }
      await runJob(body.data.jobId);
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
      const r = await api<Board>('/v1/boards', { method: 'POST', body: JSON.stringify(payload) });
      if (!r.ok) {
        if (!paywall.handle(r.error)) setError(t(`errors.${r.error.code}` as StringKey));
        return;
      }
      track('board_created', {});
      trackAbout();
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

  /** FR-11: the existing-board choice comes before the import; access is only sent for a new board. */
  function importAnki(target: ImportTarget) {
    setExisting(null);
    const board: ImportBoardInput = target === 'new' ? { ...payload, target } : { title: payload.title, area: payload.area, matrixItemIds: payload.matrixItemIds, target };
    void anki.confirm(board, { suggestedCount });
  }

  async function submit() {
    setShowErrors(true);
    if (Object.keys(aboutErrors(about)).length) return;
    if (path === 'blank') return void create();
    if (path === 'pdf') return void generatePdf();
    if (path !== 'anki') return setSoon(true);
    setBusy(true);
    const found = await anki.findExisting(payload.title);
    setBusy(false);
    if (found) setExisting(found);
    else importAnki('new');
  }

  const pickFile = (f: File | null) => {
    setFile(f);
    anki.reset();
    if (f && path === 'anki') void anki.start(f); // FR-1: upload and inspection start on choosing the file
  };

  const heading = (title: string, desc: string) => (
    <div className="flex flex-col gap-2">
      <h1 ref={h1} tabIndex={-1} className="outline-none font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.035em] md:text-[44px] md:leading-[1.05]">{title}</h1>
      <p className="text-base text-muted">{desc}</p>
    </div>
  );
  const st = anki.state;
  const sending = st.kind === 'uploading' || st.kind === 'inspecting';
  const ankiAfter = path === 'anki' && step === 2 && (st.kind === 'importing' || st.kind === 'done' || st.kind === 'error');
  const steps = path === 'blank' ? [t('ankiSteps.step1'), t('ankiSteps.step3')] : path === 'seed' ? [t('ankiSteps.step1'), t('newMap.step3Title.seed')] : [t('ankiSteps.step1'), t('ankiSteps.step2'), t('ankiSteps.step3')];
  const aboutStep = (path === 'blank' && step === 1) || (needsFile && step === 2);
  const last = aboutStep || (path === 'seed' && step === 1);
  const canContinue = step === 0 || (step === 1 && (path === 'pdf' ? file != null : path === 'anki' ? st.kind === 'preview' : false));
  const total = st.kind === 'preview' ? estimate(st.summary, st.plan.deckIds) : 0;
  const canFinish = path === 'anki' ? st.kind === 'preview' && st.plan.deckIds.length > 0 : path === 'pdf' ? file != null : true;
  const cta = path === 'anki' ? t('ankiSteps.importCta', { n: total }) : t(`newMap.cta.${path}` as StringKey);
  const form = (
    <AboutMapForm
      value={about}
      onChange={(v) => {
        if (v.title !== about.title) setTitleTouched(true);
        setAbout(v);
      }}
      items={items}
      suggestions={suggested}
      showErrors={showErrors}
    />
  );

  return (
    <div className="flex min-h-dvh bg-canvas text-ink">
      <main className="flex min-w-0 flex-1 flex-col lg:w-1/2 lg:flex-none gap-6 px-4 pb-8 pt-5 sm:px-6 sm:pt-[30px] md:gap-7 md:px-14">
        {/* D-1212: the labelled steps (~510 px) do not fit beside the logo and the close button in half the screen: own row from sm up */}
        <div data-new-map-header="" className="grid grid-cols-[auto_1fr_auto] items-center gap-4 sm:grid-cols-[1fr_auto] sm:gap-y-5">
          <Link href="/app/hoje" aria-label={t('pages.logoLink')} className="inline-flex min-h-11 min-w-11 items-center no-underline sm:col-start-1 sm:row-start-1">
            <span className="max-sm:hidden"><Logo size={32} withWordmark /></span>
            <span className="sm:hidden"><Logo size={32} /></span>
          </Link>
          <div className="min-w-0 justify-self-center sm:col-span-2 sm:row-start-2 sm:justify-self-start">
            <Stepper aria-label={t('newMap.stepsLabel')} doneLabel={t('newMap.stepDone')} current={step} steps={steps} />
          </div>
          <span className="sm:col-start-2 sm:row-start-1">
            <IconButton aria-label={t('newMap.closeLabel')} variant="secondary" onClick={() => router.push('/app/mapas')}>
              <Icon name="close" size={20} />
            </IconButton>
          </span>
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
                      if (p.id === path) return;
                      setPath(p.id);
                      setFile(null);
                      anki.reset();
                    }}
                  />
                ))}
              </div>
            </>
          ) : null}

          {step === 1 && needsFile ? (
            <>
              {path === 'anki' && (sending || st.kind === 'error')
                ? heading(t(`import.heading.${sending ? 'sending' : 'error'}.title` as StringKey), t(`import.heading.${sending ? 'sending' : 'error'}.desc` as StringKey))
                : heading(t(`newMap.step3Title.${path}` as StringKey), t(`newMap.step3Desc.${path}` as StringKey))}
              <Dropzone
                title={t(`newMap.dropTitle.${path}` as StringKey)}
                description={t(`newMap.dropDesc.${path}` as StringKey)}
                buttonLabel={t('newMap.filePickerLabel')}
                accept={accept}
                onFiles={(f) => pickFile(f[0] ?? null)}
                file={file ? { name: file.name, meta: t('newMap.fileMeta', { mb: (file.size / 1_048_576).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }) } : null}
                replaceLabel={t('newMap.replaceFile')}
                onReplace={() => pickFile(null)}
              />
              {path === 'anki' && st.kind !== 'idle' && st.kind !== 'preview' ? (
                <AnkiImportFlow state={st} onPlan={anki.setPlan} onAdjustOpened={anki.markAdjusted} onReset={() => pickFile(null)} onOpen={(id) => router.push(`/app/mapas/${id}`)} />
              ) : null}
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

          {step === 1 && path === 'seed' ? (
            <>
              {heading(t('newMap.step3Title.seed'), t('newMap.step3Desc.seed'))}
              {seeds && seeds.length > 0 ? (
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
              )}
            </>
          ) : null}

          {ankiAfter ? (
            <>
              {heading(t(`import.heading.${st.kind}.title` as StringKey), t(`import.heading.${st.kind}.desc` as StringKey))}
              <AnkiImportFlow state={st} onPlan={anki.setPlan} onAdjustOpened={anki.markAdjusted} onReset={() => { pickFile(null); setStep(1); }} onOpen={(id) => router.push(`/app/mapas/${id}`)} />
            </>
          ) : aboutStep ? (
            <>
              {heading(t('newMapAbout.title'), t('newMapAbout.desc'))}
              {form}
              {path === 'anki' && st.kind === 'preview' ? (
                <>
                  {st.submitError ? <Alert tone="review" role="alert" title={st.submitError} /> : null}
                  <AnkiImportFlow state={st} onPlan={anki.setPlan} onAdjustOpened={anki.markAdjusted} onReset={() => pickFile(null)} onOpen={(id) => router.push(`/app/mapas/${id}`)} />
                </>
              ) : null}
              {progress != null ? (
                <div className="flex flex-col gap-2">
                  <p role="status" className="m-0 text-sm font-semibold">{t('newMap.generating', { stage: t(`newMap.stage.${stage ?? 'extract'}`), n: progress })}</p>
                  <Progress aria-label={t('newMap.generatingLabel')} value={progress} />
                </div>
              ) : null}
              {progress != null && jobId && busy ? <Button variant="secondary" onClick={cancelJob}>{t('newMap.cancel')}</Button> : null}
              {ready ? (
                <Alert tone="watch" title={t('newMap.dropped', { n: ready.dropped })}>
                  <Button onClick={ready.go}>{t('newMap.openMap')}</Button>
                </Alert>
              ) : null}
              {path === 'pdf' ? <AiWarning /> : null}
              {error && path === 'pdf' ? <AiNotice ai={{ status: 'error', code: 'generate_failed', message: error }} onRetry={() => void (failedJob ? retryJob() : generatePdf())} /> : error ? <p role="alert" className="text-sm font-semibold text-review">{error}</p> : null}
            </>
          ) : null}
        </div>

        {ankiAfter ? null : <div className="sticky bottom-0 z-10 -mb-8 flex max-w-[660px] items-center justify-between gap-3 max-sm:flex-col-reverse max-sm:items-stretch max-sm:[&>button]:w-full bg-canvas pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3">
          {step > 0 ? (
            <Button variant="secondary" size="lg" icon={<Icon name="left" size={20} />} onClick={() => setStep((step - 1) as 0 | 1)}>{t('newMap.backButton')}</Button>
          ) : (
            <span className="max-sm:hidden" />
          )}
          {last && path !== 'seed' ? (
            <Button size="lg" disabled={!canFinish} loading={busy || navigating} loadingLabel={t('common.loading')} iconEnd={path === 'blank' ? <Icon name="right" size={20} /> : undefined} onClick={() => void submit()}>
              {cta}
            </Button>
          ) : !last ? (
            <Button size="lg" disabled={!canContinue} iconEnd={<Icon name="right" size={20} />} onClick={() => setStep((step + 1) as 1 | 2)}>{t('newMap.continueButton')}</Button>
          ) : null}
        </div>}
        <MapPreview compact path={path} step={step} name={about.title.trim()} area={area} item={firstItem?.title ?? ''} />
      </main>

      <MapPreview path={path} step={step} name={about.title.trim()} area={area} item={firstItem?.title ?? ''} />

      <ExistingBoardDialog open={existing != null} existing={existing} onChoose={importAnki} onCancel={() => setExisting(null)} />
      {/* D-068/D-071: PDF (F05), Anki (F06) and mapas prontos (F10/F12) do not exist in the backend yet; never pretend they generated. */}
      <Dialog open={soon} onOpenChange={setSoon} title={t('boards.soon.title')} description={t('boards.soon.body')} closeLabel={t('common.close')}>
        <Button onClick={() => setSoon(false)}>{t('common.close')}</Button>
      </Dialog>
    </div>
  );
}
