// P-507 (D-1069): one module per namespace, so a page only ships the namespaces it uses (webpack keeps or drops whole modules).
export const share = {
  title: 'Compartilhar',
  headerButton: 'Compartilhar',

  // CopyField
  copyLabel: 'Copiar',
  copiedLabel: 'Copiado',
  linkFieldLabel: 'Link de compartilhamento',
  copyToast: 'Link copiado',

  // Ações de link
  rotateLink: 'Gerar novo link',
  rotateLinkConfirm: 'O link atual vai parar de funcionar.',
  rotateLinkConfirmCta: 'Gerar novo link',
  rotateLinkCancel: 'Cancelar',

  // Troca de senha
  changePassword: 'Trocar senha',
  passwordCurrentHidden: 'A senha atual não é mostrada.',
  newPasswordLabel: 'Nova senha',
  savePassword: 'Salvar senha',

  // Responsabilidade
  responsibility: 'Você responde pelo conteúdo e pelas imagens que compartilha.',

  // Salvar acesso
  save: 'Salvar',

  // Erros
  saveError: 'Não conseguimos salvar. Tente de novo.',
  rotateError: 'Não conseguimos gerar um novo link. Tente de novo.',
  changePasswordError: 'Não conseguimos salvar a senha. Tente de novo.',

  // Contador de cópias (FR-20)
  copies: '{n, plural, =0 {Nenhuma cópia ainda} one {Copiado # vez} other {Copiado # vezes}}',
} as const;
