// F27 (D-977): company data shown in the Terms and the Privacy Policy. Lives in code, not in .env; changing it is a reviewed PR.
// Placeholders until the CNPJ is issued (P-436): replace with the data on the "cartão CNPJ" and bump the versions and the date.

/** `{{variável}}` of content/legal/*.md (docs/content/legal/README.md). `versao` comes from the version of each document. */
export type LegalVars = {
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  dpoNome: string;
  dpoEmail: string;
  foroCidade: string;
  /** AAAA-MM-DD */
  dataAtualizacao: string;
};
export type LegalVar = keyof LegalVars;

export type LegalConfig = {
  vars: LegalVars;
  /** Same values as the API's LEGAL_TERMS_VERSION / LEGAL_PRIVACY_VERSION (the API wins at sign-up, P-416). 1-32 of [A-Za-z0-9._-]. */
  termsVersion: string;
  privacyVersion: string;
};

const A_DEFINIR = 'a definir';

export const LEGAL_CONFIG: LegalConfig = {
  vars: {
    razaoSocial: 'Remoa',
    cnpj: 'em registro',
    endereco: A_DEFINIR,
    dpoNome: A_DEFINIR,
    dpoEmail: 'contato@remoa.com.br',
    foroCidade: A_DEFINIR,
    dataAtualizacao: '2026-10-05',
  },
  termsVersion: '2026-10-05',
  privacyVersion: '2026-10-05',
};
