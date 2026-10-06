// P-507 (D-1069): one module per namespace, so a page only ships the namespaces it uses (webpack keeps or drops whole modules).
/** Diálogo "Compartilhar" no editor (FR-12). */
/** FR-21: "Propriedades do mapa". */
export const mapProps = {
  menu: 'Propriedades do mapa',
  title: 'Propriedades do mapa',
  desc: 'Nome, grande área, itens da matriz e acesso.',
  save: 'Salvar',
  saved: 'Propriedades salvas',
  areaWarning: 'Ao mudar a área, os itens da matriz de outras áreas serão removidos deste mapa.',
  error: 'Não foi possível salvar tudo. Tente de novo.',
} as const;
