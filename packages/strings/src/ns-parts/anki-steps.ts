// P-507 (D-1069): one module per namespace, so a page only ships the namespaces it uses (webpack keeps or drops whole modules).
// boards.area.{CM,CIR,GO,PED,MP} já existem em pt-BR.ts:763-769 — não duplicar.
// T5-T7: usar t('boards.area.CM') etc.
/** Passos do fluxo Anki v2 (FR-1). */
export const ankiSteps = {
  step1: 'Como começar',
  step2: 'Envie o seu arquivo',
  step3: 'Sobre o mapa',

  // Passo 2: upload com progresso
  uploading: 'Enviando… {pct}%',
  uploadingLabel: 'Progresso do envio',
  inspecting: 'Inspecionando o arquivo… {pct}%',
  inspectingLabel: 'Progresso da inspeção',

  // CTA do passo 3
  importCta: '{n, plural, one {Importar # card} other {Importar # cards}}',
} as const;
