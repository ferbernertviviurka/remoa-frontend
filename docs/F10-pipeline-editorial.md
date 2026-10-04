# F10 — Pipeline editorial (frontend)

Data: 2026-10-04. A regra de aprovar, publicar, copiar e semear está no backend (`docs/F10-pipeline-editorial.md`). Este arquivo descreve as telas.

## Fila

`/editorial` renderiza `EditorialView`. Aluno que recebe 404 vê `editorial.forbidden`.

A fila pede `GET /v1/editorial/queue` com os filtros. Os botões são todos, rascunho, sinal da IA e discordância. Se há mais de um mapa, um `select` filtra por mapa. A ordem e o limite de 40 vêm da API (mais antigos primeiro).

Cada item mostra o card. Discordância (`flagSource === 'user_disagree'`) mostra a resposta, o veredito e o feedback que a API juntou da tentativa. Os outros itens não mostram esse bloco.

A nota da revisão é um campo próprio (`editorial.note`). Ela vai na decisão e na resolução da disputa. Não vai no changelog.

CRM é um campo com botão de gravar em `POST /v1/editorial/crm`. Sucesso mostra `editorial.crmSaved`.

Aprovar dispara `card_approved`. Se a API recusa o próprio card, a tela mostra `editorial.ownCard`.

## Diff da rubrica

`rubric-diff.ts` compara os pontos anteriores com os novos e lista o que saiu e o que entrou. O inspector usa isso quando a rubrica traz `previousPoints` (o ajuste de discordância grava essa lista, mesmo vazia). Aprovar sem versão anterior não inventa um diff.

O inspector também mostra “O que mudou na edição {marco}” a partir do `temporalMark` e do changelog da versão.

## Publicar

Acima da lista de rascunhos há dois campos: “O que mudou nesta edição” (`editorial.changelog`) e “Marco temporal” (`editorial.temporalMark`). O marco começa em `Enamed 2026.2`.

`publish` recusa marco só com espaço: liga `markMissing` e mostra `editorial.publishMark`, sem POST. Com marco, o corpo é `{ boardId, changelog: changelog.trim() || título do mapa, temporalMark }`. A nota da revisão não entra nesse corpo. Falha (por exemplo cards ainda em rascunho) mostra `editorial.publishBlocked`. Sucesso dispara `version_published` e tira o mapa da lista local.

## Loja

`/loja` é `SeedsView`. `GET /v1/editorial/seeds` devolve os mapas `seed_approved`. A tela agrupa por área com os rótulos `boards.area.CM`, `CIR`, `GO`, `PED` e `MP`.

Enquanto carrega, não mostra o texto de catálogo vazio. Lista vazia depois de um carregamento ok mostra o vazio. Falha de rede mostra `errors.internal`, não o vazio.

“Adicionar aos meus mapas” chama a cópia e dispara `board_created` e `seed_board_copied`. Imagem com licença própria não vem: a API tira. A tela não tem um controle separado para isso.

## Métricas na própria fila

O topo liga para `/editorial/metricas` e, se a chamada de concordância veio, mostra o percentual ao lado. O detalhe da contagem está na página de métricas, descrita no arquivo da F11.

## O que a tela não decide

- Não publica mapa com card em rascunho. A API responde 422 e a tela só avisa.
- Não reescreve os cinco seeds. Eles continuam rascunho até alguém aprovar e publicar.
- O e-mail da discordância é do backend. Sem chave do Resend, a tela ainda mostra a decisão como registrada.
