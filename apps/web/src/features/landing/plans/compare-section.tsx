import { strings, t } from '@remoa/strings/full';
import { CompareMark, FeatureComparison, Logo, Section } from '@remoa/ui';

const { columns, rows, notNative } = strings.landing.compare;
const cell = (v: string, brand: boolean) =>
  v === t('landing.compare.yes') ? <CompareMark kind={brand ? 'brand' : 'yes'} label={v} /> : v === notNative ? <CompareMark kind="no" label={v} /> : <span className="text-xs font-semibold leading-tight text-ink-2 md:text-sm">{v}</span>;

/** Comparação Remoa × Anki × Notion e Miro (FR-11): só o logo do Remoa, sem logotipos de terceiros. */
export function CompareSection() {
  const now = new Date();
  const footnote = t('landing.compare.footnote', { month: String(now.getMonth() + 1).padStart(2, '0'), year: now.getFullYear() });
  return (
    <Section id="comparacao" eyebrow={t('landing.compare.eyebrow')} title={t('landing.compare.title')}>
      <FeatureComparison
        caption={t('landing.compare.title')}
        scrollLabel={t('landing.compare.scrollLabel')}
        featureHeader={t('landing.compare.featureHeader')}
        columns={[<><span className="hidden md:inline-flex"><Logo size={22} onDark /></span>{columns.remoa}</>, columns.anki, columns.notion]}
        highlightColumn={0}
        rows={rows.map((r) => ({ feature: r.feature, cells: [cell(r.remoa, true), cell(r.anki, false), cell(r.notion, false)] }))}
      />
      <p className="m-0 text-[13px] leading-normal text-muted">{footnote}</p>
    </Section>
  );
}
