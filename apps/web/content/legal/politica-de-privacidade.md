<!-- RASCUNHO. Revisar com advogado antes de publicar. Itens [CONFIRMAR] dependem de decisão ou de checagem. Variáveis {{...}} vêm de remoa-frontend/apps/web/src/features/legal/config.ts (D-977). -->

# Política de Privacidade

_Versão {{versao}} · Última atualização: {{dataAtualizacao}}_

Esta Política explica quais dados pessoais o Remoa coleta, para que usamos, com quem compartilhamos e como você exerce seus direitos, conforme a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).

## 1. Quem é o controlador

O controlador dos seus dados é {{razaoSocial}}, CNPJ {{cnpj}}, com sede em {{endereco}}. O contato do encarregado pelo tratamento de dados pessoais ({{dpoNome}}) é {{dpoEmail}}.

## 2. Dados que coletamos

- **Dados de cadastro:** nome, e-mail, senha (guardada de forma protegida), foto opcional, objetivo de prova, fuso horário e preferências.
- **Conteúdo de estudo:** mapas, cards, conexões, respostas, imagens e anexos, compromissos do calendário.
- **Suporte:** mensagens e anexos dos chamados.
- **Pagamento:** o Stripe processa o pagamento; nós guardamos identificadores, plano, valor, método e status, mas não o número do cartão.
- **Uso:** eventos de navegação e de uso (telas e ações, sem o texto do seu conteúdo), dispositivo, navegador e endereço IP, para segurança e melhoria do produto.
- **Login com Google:** nome e e-mail da sua conta Google, se você escolher essa opção.
- **Indicação:** quem convidou você e quem você convidou, para conceder o benefício.

O Remoa não foi feito para receber dados de pacientes. Pedimos que você não os inclua nos seus mapas.

## 3. Para que usamos e por quê

- Prestar o serviço e cumprir o contrato: criar sua conta, guardar seus mapas, agendar revisões e processar pagamentos.
- Legítimo interesse: segurança, prevenção a fraude, suporte e melhoria do produto com medições agregadas.
- Consentimento: comunicações promocionais, quando aplicável. Você pode retirar o consentimento quando quiser.
- Obrigação legal e exercício regular de direitos: guardar registros fiscais e responder a ordens legais.

## 4. Inteligência artificial

Quando você usa recursos de IA, enviamos ao provedor o trecho necessário para gerar ou corrigir cards. O provedor trata esse conteúdo conforme as próprias políticas de privacidade. Não coloque nos seus cards dados que identifiquem pacientes ou outras pessoas, e revise o que a IA gera.

**Provedores de IA.** Os pedidos de IA passam pelo OpenRouter, um roteador que os encaminha ao modelo escolhido, e depois pelo provedor desse modelo. O provedor do modelo pode mudar com o tempo; hoje, na fase de testes, é a NVIDIA, por meio de um modelo gratuito. [CONFIRMAR: lista final de provedores e modelo de produção, Q-162/Q-163.] Se a leitura de PDFs digitalizados estiver ativa, a Mistral também recebe o arquivo para extrair o texto. [CONFIRMAR: se o OCR da Mistral será usado em produção.]

**O que enviamos.** O conteúdo de estudo necessário para a tarefa (texto dos cards, trechos do material enviado e as respostas que você digita) e instruções do sistema. Não enviamos seu nome nem seu e-mail. Áudio de respostas por voz não é armazenado: é transcrito e descartado.

**Retenção.** Em produção, pedimos aos provedores que não registrem nem usem o conteúdo para treinar modelos (política de dados `deny` do OpenRouter). [CONFIRMAR: retenção efetiva de cada provedor e modelo escolhido, Q-162.] A leitura de PDFs pela Mistral não passa pelo OpenRouter e segue a política de dados da própria Mistral. Os pedidos de IA envolvem transferência internacional, descrita na seção 6.

## 5. Com quem compartilhamos

Compartilhamos dados com operadores que nos ajudam a prestar o serviço, apenas para as finalidades abaixo:

- Supabase: banco de dados e autenticação.
- Vercel: hospedagem do site e do aplicativo.
- Railway: hospedagem dos nossos servidores.
- Cloudflare R2: armazenamento de arquivos.
- Stripe: pagamentos.
- Resend: envio de e-mails.
- Inngest: tarefas em segundo plano.
- OpenRouter: recursos de IA (encaminha o pedido ao modelo de IA usado).
- Mistral: leitura de PDFs digitalizados.
- Google: login, se você o escolher.

Também podemos compartilhar dados para cumprir obrigação legal ou ordem de autoridade.

## 6. Transferência internacional

Alguns desses provedores tratam dados fora do Brasil, como Vercel, Railway, Stripe, Resend, Inngest, OpenRouter (e o provedor do modelo de IA) e Mistral. Nesses casos, a transferência segue as regras da LGPD para transferência internacional de dados.

## 7. Por quanto tempo guardamos

- Enquanto sua conta existir.
- Depois do pedido de exclusão, apagamos seus dados em até 7 dias, exceto o que a lei nos obriga a guardar. Cópias de segurança podem levar mais tempo para expirar.
- Registros de pagamento e fiscais: pelo prazo exigido pela legislação fiscal.
- Chamados de suporte: até 12 meses depois de resolvidos; anexos, até 90 dias.
- Notificações no app: 90 dias as lidas e 180 dias as não lidas.
- Registros de auditoria de segurança: pelo tempo necessário para proteger as contas e o serviço e para cumprir obrigações legais.

## 8. Seus direitos

Pela LGPD você pode, a qualquer momento: confirmar que tratamos seus dados; acessá-los; corrigi-los; pedir anonimização, bloqueio ou eliminação; pedir a portabilidade; saber com quem compartilhamos; retirar o consentimento; e se opor a um tratamento. Você pode exportar seus dados e excluir sua conta em Minha conta, ou escrever para {{dpoEmail}}. Respondemos nos prazos da lei.

## 9. Cookies e tecnologias semelhantes

- **Essenciais:** mantêm você conectado e guardam preferências. Não podem ser desligados.
- **Medição, publicidade e terceiros:** não usamos.

Não usamos pixel de rastreio de abertura nos nossos e-mails.

## 10. Segurança

Usamos criptografia em trânsito, controle de acesso por usuário, registros de auditoria e revisões de segurança. Nenhum sistema é infalível; se houver incidente que possa causar risco relevante, avisaremos você e a Autoridade Nacional de Proteção de Dados, como a lei exige.

## 11. Crianças e adolescentes

O Remoa é voltado a estudantes e não é direcionado a crianças (menores de 12 anos). Adolescentes podem usar o Remoa com a autorização de um responsável legal, e tratamos os dados deles no seu melhor interesse, como pede a LGPD. Se soubermos que coletamos dados de criança sem o consentimento de um responsável, vamos excluí-los.

## 12. E-mails e comunicações

Enviamos e-mails de conta, compra e segurança e, conforme suas preferências, lembretes de revisão e de compromissos. Cada lembrete tem um link para parar de receber aquele tipo de aviso.

## 13. Alterações desta política

Podemos atualizar esta Política. Quando a mudança for relevante, avisaremos por e-mail ou no app. A data da última atualização fica no topo desta página.

## 14. Contato e Autoridade

Para dúvidas ou pedidos sobre seus dados, escreva para {{dpoEmail}}. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).

