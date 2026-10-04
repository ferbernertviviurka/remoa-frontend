# remoa-frontend

App Next.js do Remoa: telas, design system (`@remoa/ui`, `@remoa/strings`) e o cliente da API. Comandos, mapa de pastas e regras deste repo estão em `CLAUDE.md`. O texto das FRDs e dos goals fica na pasta pai, em `../docs/features/` e `../docs/goals/`. O quadro de `../docs/STATUS.md` ainda marca F05, F09, F10 e F11 como “não iniciado”; o estado abaixo é o do código em 2026-10-04.

## FRDs

### F00 — Fundação

**Feito.** App Next, sessão no Supabase, middleware, Torph (`Button`, `Input`, `Tag`, `Card` e o resto do design system) e strings em pt-BR via `t()`.

**Faltou.** Preview na Vercel por pull request. O header `x-request-id` ainda não vai do browser para a API.

### F01 — Mapa

**Feito.** Canvas do mapa, criação, ligações e o painel do card.

**Faltou.** A meta de 60 fps com 200 cards foi medida no Playwright. Falta o profiler do Chrome numa máquina real.

### F02 — Cards

**Feito.** Conceito, fluxograma, imagem com oclusão e caso clínico, com upload de imagem.

**Faltou.** No deploy, a política de CORS do bucket para o PUT direto do browser.

### F03 — Fila de revisão

**Feito.** Tela “Revisar hoje”, fila e a nota que alimenta o FSRS.

**Faltou.** Nada de produto aberto neste repo. O agendador mora no backend.

### F04 — Desafio

**Feito.** Um card por vez, escrever, opções e falar. O veredito vem da API.

**Faltou.** A correção com o modelo de verdade depende da chave do OpenRouter, que entra no backend. Sem a chave, a tela mostra a rubrica local.

### F06 — Importação do Anki

**Feito.** Caminho Anki em Novo mapa: arquivo, prévia, progresso, relatório e abertura do mapa. Paywall quando a cota estoura.

**Faltou.** O fluxo curto do F17 (nome primeiro, busca na matriz, acesso do mapa) não substituiu esta prévia. Ver G09.

### F07 — Cobertura Enamed

**Feito.** `/cobertura` com resumo, lacunas e o link para criar um mapa do tema. O mapa mostra quanto do tema ele cobre.

**Faltou.** A lista é a curadoria Remoa, não a matriz oficial do INEP. O rodapé da tela já diz isso.

### F08 — Cobrança

**Feito.** Paywall nos 402, preços em `/planos` e a conta ligada à assinatura.

**Faltou.** Checkout com chave de teste do Stripe no browser. O que rodou foi o mock.

### F09 — Revisão no celular

**Feito.**

- Abaixo de 768 px: cabeçalho de 65 px e barra inferior com Revisar, Mapas, Cobertura, Loja e Conta.
- Desafio em uma coluna, microfone, “Corrigir resposta” e notas em grade 2×2, com alvo de 44 px. O e2e em 360×740 cobre esse fluxo.
- No celular o mapa vira lista, com busca sem acento, filtro e uma folha só de leitura (“Revisar este conceito” e “Editar no computador”).
- `SpeechRecognition` em pt-BR. O texto cai no campo antes de corrigir. O áudio não sai do aparelho. Sem a API, o botão some. Gravação vazia conta como falha.
- Manifesto com início em `/revisar`, ícone roxo e `display: standalone`. Service worker `remoa-shell-v5`. O convite de instalação aparece depois de duas sessões concluídas.
- Sem rede, `/revisar` abre `offline.html`. Se havia uma sessão neste aparelho, dá para responder e notar; a fila sobe quando a rede volta e a página recarrega. O e2e confirma o título “Sem conexão”.
- `viewport-fit=cover` e safe area.

**Faltou.**

- Tema escuro seguindo o sistema. Foi pedido para tirar. Painéis escuros de layout (conta, hero) continuam. Em Preferências, “Escuro” fica desabilitado, com “Em breve”.
- A barra não é “Revisar, Mapas, Enamed, Boards”. Ficou Revisar, Mapas, Cobertura, Loja e Conta.
- O corte é o `md` do Tailwind, 768 px, e não 760 px.
- Lighthouse PWA não foi medido: o pacote não instala porque o registro npm aponta para um Artifactory inacessível. Não há gate de categoria PWA.
- Sem sessão já aberta, a página offline não monta um desafio a partir da fila guardada. A fila não traz o enunciado.
- No iOS não há `beforeinstallprompt` nem um texto de “Adicionar à Tela de Início”. Fechar o convite não grava a escolha; ele pode voltar numa sessão seguinte.
- Instalado, a plataforma do evento só vira `pwa` quando `display-mode` é `standalone`. O `navigator.standalone` do iOS não entra nessa conta.

### F10 — Pipeline editorial

**Feito.**

- `/editorial`: fila dos mais antigos, limite 40, filtro por mapa e por tipo (rascunho, sinal da IA, discordância).
- Aprovar mostra o revisor no inspector, com o diff dos pontos quando há versão anterior.
- Publicar pede changelog e marco temporal (o padrão do marco é “Enamed 2026.2”). A nota da revisão não vira o changelog. Marco vazio bloqueia a publicação.
- `/loja` agrupa os mapas prontos por grande área. Falha ao carregar mostra erro, não a mensagem de catálogo vazio.
- Discordância mostra resposta, veredito e rubrica, e oferece “rubrica certa” ou “ajustar”.
- O inspector mostra o que mudou na edição e a marca “Gerado por IA, não revisado” enquanto o card é rascunho da IA.

**Faltou.** O e-mail da discordância só sai se o backend tiver a chave do Resend. Os mapas-semente continuam rascunho até um revisor humano publicar. `/editorial/metricas` não foi percorrida no browser logado nesta rodada; a tela está coberta por teste.

### F11 — Relatórios

**Feito.** `/progresso` com retenção em 7 e 30 dias, gráfico de 30 dias, sequência, até 20 cards fracos com link para o desafio do mapa, e acurácia da área e do item da matriz. CSV de tentativas em `/progresso` e em `/conta`, sem o texto da resposta. `/editorial/metricas` mostra a concordância e a contagem de notas alteradas. Eventos das telas saem com plano, plataforma e versão do app.

**Faltou.** `/progresso` não foi percorrida no browser logado nesta rodada. A lista de cards fracos não inclui passo de fluxograma nem máscara de imagem: a API só devolve o item principal do card.

### F12 — Landing e onboarding

**Feito.** Entrada em `/`, com o app logado em `/hoje`. Auth em `/entrar` e `/cadastro`.

**Faltou.** O onboarding do primeiro mapa e a landing desenhada no F12 não são o que está no ar. A landing v2 é o F16, ainda aberta.

### F13 — Minha conta

**Feito.** Perfil, segurança, plano, preferências, sessões, exportar e excluir conta. Avatar no trilho.

**Faltou.** Troca de senha segura e a validade do código no projeto de produção do Supabase. E-mail transacional depende da chave do Resend no backend.

### F14 — Navbar e carrossel

**Feito.** Navbar com o plano, carrossel de mapas em Hoje e o limite de mapas do plano Free na biblioteca.

**Faltou.** Alguns snapshots visuais de Linux (Hoje e Mapas) ficaram para regenerar no CI.

### F15 — Planos

**Feito.** `/planos` com comparação, resumo, Pix, cartão, cupom e a página de sucesso. `/precos` redireciona para lá.

**Faltou.** Uma passagem no browser com chave de teste do Stripe. A rodada usou o mock.

### F16 — Landing page v2

**Feito.** A rota `/` existe. Parte do material visual entrou em `public/landing/`.

**Faltou.** A landing do canvas (herói ao vivo, as seções, a demo sem cadastro, SEO e a lista de espera) não está publicada. O goal G05 da landing segue em andamento.

### F17 — Importador Anki v2

**Feito.** A página pública `/m/[token]` e o diálogo de compartilhamento existem. Os testes dessa tela falhavam quando o trabalho parou (consultas ambíguas e falta de limpeza entre testes).

**Faltou.** Os passos novos do Novo mapa (nome primeiro, busca na matriz, área e acesso) não foram escritos. No caminho Anki, nome, área e item escolhidos na tela ainda não mandam no mapa criado. Ver G09.

## Goals

### G01 — Interface v2

**Feito.** Shell, Hoje, Meus mapas, Novo mapa, editor e desafio na linguagem da v2. Critérios locais verdes, inclusive 200 cards a 60 fps no Playwright.

**Faltou.** Nada de produto aberto neste goal. A v1 ficou como histórico em `../docs/features/G01-polir-interface.md`.

### G03 — Minha conta

**Feito.** A tela de conta no layout v2, com as seções do F13.

**Faltou.** As mesmas ressalvas do F13: senha e e-mail no ambiente de produção.

### G03 — Navbar e carrossel

**Feito.** O que o F14 descreve: chip do plano, painel e carrossel.

**Faltou.** Os snapshots de Linux citados no F14.

### G04 e G05 — Planos

O pacote chamava a tela de G04; no repo o goal vigente é `../docs/goals/G05-planos.md`, porque G04 já era outro pedido. **Feito:** a tela `/planos` do F15. **Faltou:** Stripe real, como no F15.

### G05 — Landing page v2

**Feito.** Material e a rota `/`. O app logado não usa mais essa página como home: entra em `/hoje`.

**Faltou.** Publicar a landing do F16. Status do goal: em andamento.

### G09 — Importador Anki mais simples

**Feito.** O que o F06 já entrega, mais o começo da página pública do F17.

**Faltou.** Status do goal: pausado. Faltam os três passos da tela (caminho, arquivo, “Sobre o mapa”), a busca com vários itens da matriz, as cinco grandes áreas como rótulo de verdade e o acesso Só eu / Privado / Público nesse fluxo. O passo de nome, área e item ainda é descartado no import Anki.

### G12 — Correção por voz

**Feito, como base, não como goal fechado.** Texto e voz passam pelo mesmo envio. A leitura em voz alta só vem depois de uma resposta falada e cala com movimento reduzido. Sem rede, a resposta espera no aparelho. Os critérios do arquivo `../docs/goals/G12-correcao-por-voz.md` estão marcados, e o status do goal continua **planejado**.

**Faltou.** Ver o modelo de verdade com a chave do OpenRouter. Sem a chave, a correção é a rubrica local. O goal não deve ser tratado como concluído.
