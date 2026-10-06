// P-507 (D-1069): one module per namespace, so a page only ships the namespaces it uses (webpack keeps or drops whole modules).
/** Níveis de acesso do mapa. FR-7, FR-12. */
export const boardsAccess = {
  owner: 'Só eu',
  ownerDesc: 'Só você acessa. Sem link.',
  password: 'Privado',
  passwordDesc: 'Quem tiver o link e a senha pode ver e copiar.',
  public: 'Público',
  publicDesc: 'Quem tiver o link pode ver e copiar.',
} as const;
