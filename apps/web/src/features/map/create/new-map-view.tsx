'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Board, MatrixItem } from '@remoa/contracts';
import { t, type StringKey } from '@remoa/strings';
import { Button, ChoiceCard, ChoiceRow, Dialog, Dropzone, FilterChip, Icon, IconButton, Input, Logo, Stepper } from '@remoa/ui';
import { track } from '@/lib/analytics';
import { api } from '@/lib/api';
import Link from 'next/link';
import { MapPreview, type Path } from './map-preview';

const PATHS: ReadonlyArray<{ id: Path; icon: 'file' | 'archive' | 'book' | 'plus' }> = [
  { id: 'pdf', icon: 'file' },
  { id: 'anki', icon: 'archive' },
  { id: 'seed', icon: 'book' },
  { id: 'blank', icon: 'plus' },
];
const AREAS = ['CM', 'Cirurgia', 'GO', 'Pediatria', 'MP'] as const;
const OPTS = { pdf: ['flows', 'rubrics'], anki: ['tags', 'images'] } as const;

type Props = { items: MatrixItem[]; initialPath?: Path };

export function NewMapView({ items, initialPath }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [path, setPath] = useState<Path>(initialPath ?? 'pdf');
  const [itemId, setItemId] = useState<string | null>(items[0]?.id ?? null);
  const [name, setName] = useState(items[0]?.title ?? '');
  const [touched, setTouched] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [opts, setOpts] = useState<Record<string, boolean>>({ flows: true, rubrics: true, tags: true, images: true });
  const [soon, setSoon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const item = items.find((i) => i.id === itemId);
  const area = t('boards.area.CM');
  const needsFile = path === 'pdf' || path === 'anki';
  const accept = path === 'pdf' ? '.pdf' : '.apkg';

  const pickItem = (i: MatrixItem) => {
    setItemId(i.id);
    if (!touched) setName(i.title);
  };

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<Board>('/v1/boards', { method: 'POST', body: JSON.stringify({ title: name.trim(), area: 'CM', matrixItemId: itemId }) });
      if (!r.ok) {
        setError(t(`errors.${r.error.code}` as StringKey));
        return;
      }
      track('board_created', {});
      router.push(`/mapas/${r.data.id}`);
    } catch {
      setError(t('errors.internal'));
    } finally {
      setBusy(false);
    }
  }

  const heading = (title: string, desc: string) => (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-[44px] font-extrabold leading-[1.05] tracking-[-0.035em]">{title}</h1>
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
      <main className="flex min-w-0 flex-1 flex-col gap-7 px-6 pb-8 pt-[30px] md:px-14">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label={t('pages.logoLink')} className="inline-flex no-underline">
            <Logo size={32} withWordmark />
          </Link>
          <Stepper aria-label={t('newMap.stepsLabel')} doneLabel={t('newMap.stepDone')} current={step} steps={[t('newMap.step.one'), t('newMap.step.two'), t('newMap.step.three')]} />
          <IconButton aria-label={t('newMap.closeLabel')} variant="secondary" onClick={() => router.push('/mapas')}>
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
                  {items.map((i) => (
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
              {heading(t(`newMap.step3Title.${path}` as StringKey), t(`newMap.step3Desc.${path}` as StringKey))}
              {needsFile ? (
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
                  {file ? (
                    <div className="flex flex-col gap-2.5">
                      {OPTS[path].map((o) => (
                        <ChoiceRow key={o} indicator="check" selected={!!opts[o]} onSelect={() => setOpts({ ...opts, [o]: !opts[o] })}>
                          {t(`newMap.opts.${path}.${o}` as StringKey)}
                        </ChoiceRow>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
              {path === 'seed' ? <p role="status" className="rounded-[22px] border border-border bg-surface px-[22px] py-4 text-muted">{t('newMap.seedSoon')}</p> : null}
              {path === 'blank' ? (
                <div className="flex flex-col gap-0.5 rounded-[22px] border border-border bg-surface px-[22px] py-1.5">
                  {row(t('newMap.nameLabel'), name)}
                  {row(t('newMap.areaLabel'), area)}
                  {row(t('newMap.itemLabel'), item?.title ?? '—', true)}
                </div>
              ) : null}
              {error ? <p role="alert" className="text-sm font-semibold text-review">{error}</p> : null}
            </>
          ) : null}
        </div>

        <div className="sticky bottom-0 -mb-8 flex max-w-[660px] items-center justify-between gap-3 bg-canvas pb-8 pt-3">
          {step > 0 ? (
            <Button variant="secondary" size="lg" icon={<Icon name="left" size={20} />} onClick={() => setStep((step - 1) as 0 | 1)}>{t('newMap.backButton')}</Button>
          ) : (
            <span />
          )}
          {last ? (
            <Button
              size="lg"
              disabled={!canFinish}
              loading={busy}
              loadingLabel={t('common.loading')}
              iconEnd={path === 'blank' ? <Icon name="right" size={20} /> : undefined}
              onClick={() => (path === 'blank' ? void create() : setSoon(true))}
            >
              {cta}
            </Button>
          ) : (
            <Button size="lg" disabled={!canContinue} iconEnd={<Icon name="right" size={20} />} onClick={() => setStep((step + 1) as 1 | 2)}>{t('newMap.continueButton')}</Button>
          )}
        </div>
      </main>

      <MapPreview path={path} step={step} name={name.trim()} area={area} item={item?.title ?? ''} />

      {/* D-068/D-071: PDF (F05), Anki (F06) and mapas prontos (F10/F12) do not exist in the backend yet; never pretend they generated. */}
      <Dialog open={soon} onOpenChange={setSoon} title={t('boards.soon.title')} description={t('boards.soon.body')} closeLabel={t('common.close')}>
        <Button onClick={() => setSoon(false)}>{t('common.close')}</Button>
      </Dialog>
    </div>
  );
}
