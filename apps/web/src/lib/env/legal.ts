// G19 / F27 (D-914): the one module that reads the legal and blog server settings of the web. No NEXT_PUBLIC_ here: import it only
// from server code (in a client bundle every value is undefined). Nothing about the company is written in code (D-904).

/** `{{variável}}` of docs/content/legal/*.md → .env key (docs/content/legal/README.md). `versao` is per document. */
export const LEGAL_TEMPLATE_ENV = {
  razaoSocial: 'LEGAL_COMPANY_NAME',
  cnpj: 'LEGAL_CNPJ',
  endereco: 'LEGAL_ADDRESS',
  dpoNome: 'LEGAL_DPO_NAME',
  dpoEmail: 'LEGAL_DPO_EMAIL',
  foroCidade: 'LEGAL_FORO_CITY',
  dataAtualizacao: 'LEGAL_UPDATED_AT',
} as const;
export type LegalVar = keyof typeof LEGAL_TEMPLATE_ENV;

export type LegalEnv = {
  /** Template values; a missing one is '' and listed in `missing`. */
  vars: Record<LegalVar, string>;
  termsVersion: string;
  privacyVersion: string;
  /** .env keys without a value. FR-43: highlighted outside production, fails the production deploy (T9). */
  missing: string[];
};

type Source = Record<string, string | undefined>;

export function legalEnv(source: Source = process.env): LegalEnv {
  const missing: string[] = [];
  const read = (key: string) => {
    const v = source[key]?.trim() ?? '';
    if (!v) missing.push(key);
    return v;
  };
  const vars = Object.fromEntries(Object.entries(LEGAL_TEMPLATE_ENV).map(([k, key]) => [k, read(key)])) as Record<LegalVar, string>;
  return { vars, termsVersion: read('LEGAL_TERMS_VERSION'), privacyVersion: read('LEGAL_PRIVACY_VERSION'), missing };
}

/** Bearer of POST /api/revalidate (same value as the API's REVALIDATE_SECRET); undefined = endpoint refuses everything. */
export const revalidateSecret = (source: Source = process.env): string | undefined => {
  const v = source.REVALIDATE_SECRET?.trim();
  return v && v.length >= 32 ? v : undefined;
};

/** Optional Search Console token for <meta name="google-site-verification">. */
export const googleSiteVerification = (source: Source = process.env): string | undefined => source.GOOGLE_SITE_VERIFICATION?.trim() || undefined;
