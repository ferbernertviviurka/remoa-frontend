// P-507 (D-1069): one module per namespace, so a page only ships the namespaces it uses (webpack keeps or drops whole modules).
/** Mapa existente com mesmo nome (FR-11). */
export const importExisting = {
  title: 'Já existe um mapa com esse nome',
  importIntoExisting: 'Importar no mapa existente (cards repetidos são ignorados)',
  createNew: 'Criar um mapa novo',
  accessWarning: 'O acesso do mapa existente não muda.',
} as const;
