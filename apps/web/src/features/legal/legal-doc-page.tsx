// F27 FR-42/43: shared body of /termos-de-uso and /politica-de-privacidade (static: content file + .env read at build time).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import { t } from '@remoa/strings';
import { LegalDocument } from '@remoa/ui';
import { legalEnv } from '@/lib/env/legal';
import { siteUrl } from '@/lib/seo/site';
import { renderLegal } from './render-legal';

const DOCS = {
  terms: { file: 'termos-de-uso.md', path: '/termos-de-uso' },
  privacy: { file: 'politica-de-privacidade.md', path: '/politica-de-privacidade' },
} as const;
export type LegalKind = keyof typeof DOCS;

const isProd = () => process.env.VERCEL_ENV === 'production';
const pt = (iso: string) => /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split('-').reverse().join('/') : iso;

export function legalMetadata(kind: LegalKind): Metadata {
  const title = t(`legal.${kind}.pageTitle`);
  const description = t(`legal.${kind}.description`);
  const url = `${siteUrl}${DOCS[kind].path}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: 'website' } };
}

export function LegalDocPage({ kind }: { kind: LegalKind }) {
  const env = legalEnv();
  const version = kind === 'terms' ? env.termsVersion : env.privacyVersion;
  const production = isProd();
  const doc = renderLegal(readFileSync(join(process.cwd(), 'content', 'legal', DOCS[kind].file), 'utf8'), {
    vars: { ...env.vars, versao: version },
    production,
  });
  const date = env.vars.dataAtualizacao;
  const meta = t('legal.pages.version', { version: version || t('legal.pages.pendingVersion'), date: date ? pt(date) : t('legal.pages.pendingDate') });
  const incomplete = !version || !date;
  return (
    <LegalDocument
      eyebrow={t('legal.pages.eyebrow')}
      title={doc.title || t(`legal.${kind}.pageTitle`)}
      lead={doc.lead}
      meta={incomplete && !production ? <mark className="rb-pending">{meta}</mark> : meta}
      printLabel={t('legal.pages.print')}
      tocLabel={t('legal.pages.tableOfContentsLabel')}
      tocTitle={t('legal.pages.tableOfContents')}
      notice={production ? undefined : t('legal.pages.draftWarning')}
      sections={doc.sections}
    />
  );
}
