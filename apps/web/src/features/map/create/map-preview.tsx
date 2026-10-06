import { PLAN_LIMITS } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { TextMorph } from 'torph/react';
import { MeasuredText } from './measured-text';
import { PathArt } from './path-art';

const t = withStrings({ newMap: more.newMap });
type StringKey = Parameters<typeof t>[0];

export type Path = 'pdf' | 'anki' | 'seed' | 'blank';

/** Server-safe (a Server Component calls it: do not move into a 'use client' file). */
export function parsePath(v: string | undefined): Path {
  return v === 'pdf' || v === 'anki' || v === 'blank' ? v : v === 'pronto' || v === 'seed' ? 'seed' : 'blank';
}

/** Server-safe: `?caminho=` wins for the path; a valid `?item=` (a selectable matrix item) pre-selects it, defaults to "Em branco" and opens on "Sobre o mapa". A ready map (`seed`) opens on the list. Unknown ids are ignored. */
export function parseInitial(caminho: string | undefined, item: string | undefined, items: ReadonlyArray<{ id: string }>): { path?: Path; itemId?: string; step: 0 | 1 | 2 } {
  const itemId = item && items.some((i) => i.id === item) ? item : undefined;
  const path = caminho ? parsePath(caminho) : itemId ? 'blank' : undefined;
  const step = path === 'seed' || caminho === 'blank' || itemId ? 1 : 0; // F17: the seed list and "Sobre o mapa" (Em branco) are both step 2 of 2; ?caminho=blank (onboarding, G14 ponto 17) skips the path choice
  return { path, itemId, step };
}

const n = (v: number | null) => (v === null ? t('newMap.limits.unlimited') : v.toLocaleString('pt-BR'));
/** PDF: 0 = não incluso; senão "N por mês". Valores sempre de PLAN_LIMITS. */
const perMonth = (v: number | null) => (v === 0 ? t('newMap.limits.notIncluded') : v === null ? n(v) : t('newMap.limits.perMonth', { n: n(v) }));
const LIMIT_VARS: Record<Path, Record<string, string | number>> = {
  pdf: { free: perMonth(PLAN_LIMITS.free.limits.ai_generations), pro: perMonth(PLAN_LIMITS.pro.limits.ai_generations) },
  anki: { freeImports: PLAN_LIMITS.free.ankiImports, free: n(PLAN_LIMITS.free.ankiImportMaxCards), pro: n(PLAN_LIMITS.pro.ankiImports) },
  seed: {},
  blank: { boards: n(PLAN_LIMITS.free.limits.boards), cards: n(PLAN_LIMITS.free.limits.cards) },
};

/** Title: short enough for one line, so a plain TextMorph. Paragraphs: MeasuredText (per-line TextMorph by measured width). */
const Morph = ({ children, className, as }: { children: string; className?: string; as?: 'h2' }) =>
  as ? (
    <TextMorph as={as} locale="pt-BR" duration={320} ease="cubic-bezier(0.19, 1, 0.22, 1)" respectReducedMotion className={className}>{children}</TextMorph>
  ) : (
    <MeasuredText text={children} className={className} />
  );

function PathInfo({ path, compact, brief = false }: { path: Path; compact: boolean; brief?: boolean }) {
  const k = (f: string) => t(`newMap.info.${path}.${f}` as StringKey);
  const body = compact ? 'text-sm' : 'text-[15px]';
  return (
    <div className={`flex flex-col ${compact ? 'gap-4' : 'grow gap-6'}`}>
      <div className="flex flex-col gap-2">
        <Morph as="h2" className={`m-0 font-display font-extrabold leading-[1.1] tracking-[-0.025em] ${compact ? 'text-xl' : 'min-h-[34px] text-[28px]'}`}>{k('title')}</Morph>
        {brief ? null : <Morph className={`m-0 text-on-dark-muted-2 ${body} ${compact ? '' : 'min-h-[45px]'}`}>{k('lead')}</Morph>}
      </div>
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-[.12em] text-on-dark-muted">{t('newMap.info.howLabel')}</span>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {(['s1', 's2', 's3'] as const).map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold">{i + 1}</span>
              <Morph className={`m-0 ${body} ${compact ? '' : 'min-h-[45px]'}`}>{k(s)}</Morph>
            </li>
          ))}
        </ol>
      </div>
      {brief ? null : <dl className={`m-0 grid gap-4 ${compact ? '' : 'grid-cols-2 gap-6'} ${body}`}>
        <div className="flex flex-col gap-1.5">
          <dt className="text-xs font-bold uppercase tracking-[.12em] text-on-dark-muted">{t('newMap.info.getsLabel')}</dt>
          <dd className={`m-0 text-on-dark-muted-2 ${compact ? '' : 'min-h-[45px]'}`}><Morph className="m-0">{k('gets')}</Morph></dd>
        </div>
        <div className="flex flex-col gap-1.5">
          <dt className="text-xs font-bold uppercase tracking-[.12em] text-on-dark-muted">{t('newMap.info.limitLabel')}</dt>
          <dd className={`m-0 text-on-dark-muted-2 ${compact ? '' : 'min-h-[45px]'}`}><Morph className="m-0">{t(`newMap.info.${path}.limit` as StringKey, LIMIT_VARS[path])}</Morph></dd>
        </div>
      </dl>}
      <div className={`rounded-xl bg-white/10 px-4 py-3 font-semibold ${compact ? '' : 'mt-auto'} ${body}`}><Morph className="m-0">{k('status')}</Morph></div>
    </div>
  );
}

/** Dark live preview (aside, 50% on lg+). From step 2 on, the live name/item sit on the drawing's hub card. */
export function MapPreview({ path, step, name, area, item, compact = false }: { path: Path; step: 0 | 1 | 2; name: string; area: string; item: string; compact?: boolean }) {
  // Celular/tablet (< lg): resumo escuro abaixo do formulário, com o desenho menor no topo (decorativo, o nome já está no campo).
  if (compact) {
    return (
      <div className="flex flex-col gap-4 rounded-[22px] bg-panel-dark px-5 py-5 text-on-dark lg:hidden">
        <span className="text-xs font-bold uppercase tracking-[.12em] text-on-dark-muted">{t('newMap.previewLabel')}</span>
        <PathArt path={path} className="mx-auto max-w-[260px]" />
        <PathInfo path={path} compact />
        {step > 0 ? (
          <div aria-hidden="true" className="flex flex-col gap-0.5 border-t border-white/15 pt-4">
            <span className="line-clamp-2 font-display text-lg font-extrabold leading-[1.15] tracking-[-0.02em]">{name || t('newMap.nameLabel')}</span>
            <span className="text-sm text-on-dark-muted-2">{item}</span>
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <aside aria-label={t('newMap.previewLabel')} className="hidden w-1/2 shrink-0 flex-col gap-6 bg-panel-dark px-14 pb-10 pt-10 text-on-dark lg:flex">
      <span className="text-xs font-bold uppercase tracking-[.12em] text-on-dark-muted">{t('newMap.previewLabel')}</span>
      <PathArt path={path} className="mx-auto max-w-[480px] shrink-0" live={step > 0 ? { name: name || t('newMap.nameLabel'), area, item: path === 'blank' ? '' : item } : undefined} />
      <PathInfo path={path} compact={false} brief={step > 0} />
    </aside>
  );
}
