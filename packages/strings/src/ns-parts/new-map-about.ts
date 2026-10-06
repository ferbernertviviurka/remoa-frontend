// P-507 (D-1069): one module per namespace, so a page only ships the namespaces it uses (webpack keeps or drops whole modules).
/** Formulário "Sobre o mapa" (passo 3 do Anki / passo 2 do Em branco / PDF). FR-2, FR-5, FR-7. */
export const newMapAbout = {
  // Títulos do passo
  title: 'Sobre o mapa',
  desc: 'Dê um nome, escolha a área e quem pode acessar. Você muda o nome e o acesso depois.',

  // Campos do formulário
  nameLabel: 'Nome do mapa',
  areaLabel: 'Grande área',
  itemsLabel: 'Itens da matriz',
  accessLabel: 'Acesso',

  // Busca de itens da matriz
  searchPlaceholder: 'Buscar por tema ou código',
  suggestionsLabel: 'Sugeridos',
  emptySearch: 'Nenhum item encontrado para essa busca.',

  // Limite de itens
  itemsMax: 'Você pode ligar até {max} {max, plural, one {item} other {itens}} da matriz.',

  // Aviso de troca de área
  areaChangedWarning: 'Os itens foram limpos porque a área mudou.',

  // Área sem matriz
  noMatrixMessage: 'A matriz Enamed desta área ainda não está disponível.',

  // Remoção de chip (aria)
  removeItem: 'Remover {label}',

  // Erros de validação
  nameRequired: 'Dê um nome ao mapa.',
  nameTooLong: 'O nome pode ter até 120 caracteres.',

  // Senha do mapa privado
  passwordLabel: 'Senha do mapa',
  passwordHint: 'De 6 a 64 caracteres.',
  passwordRequired: 'A senha é obrigatória para mapas privados.',
  passwordShowAriaLabel: 'Mostrar senha',
  passwordHideAriaLabel: 'Ocultar senha',
} as const;
