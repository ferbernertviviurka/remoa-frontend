/** Error boundary copy; its own module so `@remoa/strings/boundary` ships only this (P-410). */
export const boundary = {
  title: 'Algo deu errado',
  body: 'Tivemos um problema ao abrir esta tela.',
  retry: 'Tentar de novo',
  home: 'Ir para Meus mapas',
  ref: 'Código do erro: {id}',
} as const;
