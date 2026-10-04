// F16 FR-15 (D-513): Termos de uso e Política de Privacidade. Rascunho até o parecer jurídico (Q-016).
// Escrito só com fatos do repositório; dados da empresa são marcadores [entre colchetes] a preencher pelo Fernando.
export const legal = {
  draftBadge: 'Versão preliminar',
  draftNote: 'Versão preliminar — aguardando revisão jurídica (Q-016). O texto pode mudar antes da publicação.',
  updatedAt: 'Última atualização: [data de publicação]',
  terms: {
    pageTitle: 'Termos de uso',
    sections: {
      who: { title: '1. Quem somos', body: 'O Remoa é um mapa de estudo para estudantes de medicina e candidatos à residência, operado por [razão social], CNPJ [CNPJ], com sede em [endereço].' },
      service: { title: '2. O que o serviço oferece', body: 'Você monta mapas de cards conectados, faz revisão espaçada e pode desafiar o próprio mapa. Há um plano gratuito e o plano Pro, com limites e recursos descritos na página de planos.' },
      account: { title: '3. Sua conta', body: 'Você é responsável pelos dados de acesso e pelo que faz na sua conta. Informe dados verdadeiros e não compartilhe a conta com terceiros.' },
      content: { title: '4. Seu conteúdo', body: 'Os mapas, cards, imagens e arquivos que você cria ou importa continuam sendo seus. Você nos autoriza a armazená-los e processá-los apenas para prestar o serviço. Não envie conteúdo que você não tenha direito de usar.' },
      medical: { title: '5. Conteúdo médico', body: 'O Remoa é uma ferramenta de estudo e não oferece aconselhamento médico, diagnóstico ou tratamento. O conteúdo gerado por IA nasce como rascunho; só o conteúdo aprovado por revisor médico identificado por nome e CRM é apresentado como revisado, com fonte e marco temporal. Confira sempre doses, drogas e condutas em fontes oficiais.' },
      payments: { title: '6. Pagamentos e cancelamento', body: 'O plano Pro é cobrado pelo Stripe, por Pix ou cartão. Você pode cancelar a qualquer momento pelo portal de cobrança em Conta; o acesso segue até o fim do período já pago. Condições de reembolso: [política de reembolso a definir].' },
      referral: { title: '7. Programa de indicação', body: 'Os créditos do programa de indicação seguem o regulamento próprio, publicado em /regulamento-indicacao.' },
      conduct: { title: '8. Uso adequado', body: 'Não use o serviço para violar direitos de terceiros, tentar acessar dados de outras contas ou sobrecarregar a plataforma. Contas que descumprirem estes termos podem ser suspensas.' },
      deletion: { title: '9. Encerramento da conta', body: 'Você pode excluir a conta em Conta, Dados. A exclusão é definitiva após 7 dias de carência, período em que você pode cancelá-la.' },
      changes: { title: '10. Mudanças e contato', body: 'Podemos atualizar estes termos e avisaremos sobre mudanças relevantes. Dúvidas: botão Suporte dentro do app ou [e-mail de contato]. Foro: [foro a definir].' },
    },
  },
  privacy: {
    pageTitle: 'Política de privacidade',
    sections: {
      controller: { title: '1. Quem trata seus dados', body: 'O controlador é [razão social], CNPJ [CNPJ]. Encarregado pelo tratamento de dados (LGPD): [nome do encarregado], [e-mail do encarregado].' },
      collected: { title: '2. Dados que coletamos', body: 'Dados de conta: e-mail, nome, foto e preferências. Dados de estudo: mapas, cards e suas tentativas de resposta, incluindo o texto das respostas. Arquivos que você envia: imagens, PDFs e importações do Anki. Voz: o áudio de respostas por voz é transcrito e descartado, não é armazenado. Pagamentos: o Stripe processa os dados de cobrança, e guardamos o status da assinatura e dos pagamentos, não o número do cartão. Suporte: suas mensagens e anexos, junto de informações técnicas do chamado (página, navegador e versão do app).' },
      purposes: { title: '3. Para que usamos', body: 'Prestar o serviço (mapas, agendamento de revisões, desafios e correção), cobrar o plano Pro, enviar e-mails da conta e lembretes de revisão (que você pode desligar), atender o suporte, prevenir fraude e medir o uso do produto de forma agregada.' },
      processors: { title: '4. Com quem compartilhamos', body: 'Usamos operadores que tratam dados em nosso nome: Supabase (banco de dados e login), Cloudflare R2 (arquivos), Stripe (pagamentos), Resend (e-mails), Mixpanel (análise de uso do produto), Anthropic (IA que gera e corrige mapas) e OpenRouter (roteamento das chamadas ao modelo de IA; o conteúdo do pedido passa por ele a caminho da Anthropic), Mistral (leitura de PDFs por OCR), Inngest (tarefas em segundo plano) e Vercel (hospedagem do site). Não vendemos seus dados.' },
      retention: { title: '5. Por quanto tempo guardamos', body: 'Texto das respostas: 180 dias. Conta excluída: removida após 7 dias de carência. Chamados de suporte: 12 meses após a resolução. Anexos de suporte: 90 dias após a resolução. Registro de auditoria de ações administrativas: 24 meses. Áudio de voz: não é guardado.' },
      admin: { title: '6. Acesso da equipe', body: 'A equipe do Remoa só abre conteúdo de usuário em modo leitura, com motivo informado, e cada acesso fica registrado. Não existe entrada na sua conta como se fosse você.' },
      rights: { title: '7. Seus direitos (LGPD)', body: 'Você pode confirmar o tratamento, acessar, corrigir, exportar, eliminar seus dados, revogar consentimento e pedir informações sobre compartilhamento. Exporte e exclua seus dados em Conta, Dados. Para os demais pedidos, use o botão Suporte ou escreva ao encarregado.' },
      security: { title: '8. Segurança', body: 'Cada aluno só acessa os próprios dados, com controle de acesso no banco de dados. Mantemos registros de acesso administrativo e não armazenamos segredos no código.' },
      referral: { title: '9. Programa de indicação', body: 'No programa de indicação, e-mails de convidados são guardados apenas como hash para validação. Veja o regulamento em /regulamento-indicacao.' },
      changes: { title: '10. Mudanças', body: 'Esta política pode ser atualizada, e avisaremos sobre mudanças relevantes. Autoridade: você também pode reclamar à ANPD.' },
    },
  },
} as const;
