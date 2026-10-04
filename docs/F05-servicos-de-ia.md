# F05 — Serviços de IA (frontend)

Data: 2026-10-04. A correção, a extração e o custo moram no `remoa-backend` (`docs/F05-servicos-de-ia.md`). Este arquivo descreve o que o app mostra e dispara.

A chave do OpenRouter não é configurada aqui. Sem ela, a API devolve a rubrica local e a tela trata esse veredito como qualquer outro. Com ela, o feedback pode chegar em pedaços.

## Marca de rascunho

`AI_DRAFT_SOURCE` em `@remoa/contracts` é a string `Gerado por IA, não revisado`. `showsAiDraftTag` (`features/map/ai-draft.tsx`) é verdadeiro só quando o card está `draft` e `source` é exatamente essa string. Card escrito pelo aluno não ganha a marca.

`AiDraftTag` renderiza essa frase via `t('inspector.aiDraft')`, que precisa ser a mesma string da constante. O inspector do mapa e a folha do celular usam esse componente. A tag some quando o revisor aprova o card, porque o status deixa de ser `draft`.

## Gerar mapa a partir do PDF

`NewMapView` (`features/map/create/new-map-view.tsx`) manda o arquivo para `POST /v1/ai/generate-pdf?title=...`, com `content-type: application/pdf` e o Bearer da sessão. O título é o nome digitado ou o nome do arquivo sem `.pdf`.

A resposta com `jobId` não bloqueia a tela. O estado local começa em progresso 0 e estágio `ocr`. A tela consulta o job e avança por `ocr`, `extract` e `layout`. Ao terminar, `open` dispara `board_generated_from_pdf` com páginas, cards, ligações e a duração, e navega para `/mapas/${boardId}`. Se a API já devolver `boardId` sem `jobId`, a navegação é imediata. Páginas, quando o job não manda, caem no padrão 1.

Erros mapeados: cota de geração pelo paywall (`ai_generations` vira o motivo de PDF), PDF ilegível (`newMap.pdfUnreadable`) e falha genérica (`errors.internal`). Timeout de geração (`generate_timeout`) também cai no erro interno se o paywall não o reconhecer. PDF ilegível não deve ter consumido a cota: isso é regra da API, e a tela só mostra o erro.

O caminho de texto longo e o layout dagre não rodam no browser. O app só acompanha o progresso e abre o mapa `private` com cards `draft`.

## Rubrica no inspector

Pedir a rubrica de um card chama a API e, no sucesso, dispara `rubric_generated`. Rubrica aprovada não é reescrita: a API responde conflito e a tela não substitui o texto do revisor. Gerar rubrica gasta a cota diária de correções, não a cota mensal de mapas. Se a cota estoura, o paywall de correção (`ai_quota`) é o caminho, não o de PDF.

## Correção no desafio

`challengeClient.answer` (`features/challenge/client.ts`) pede `Accept: text/event-stream` quando recebe um callback de feedback. Sem o callback, o POST é JSON e a API corrige de uma vez.

O painel (`ChallengePanel`) guarda o texto que vai chegando em `setLive` enquanto ainda não há veredito (`out`). Quando o evento final chega, o `VerdictBox` lista o que acertou e o que faltou. `gradeLocked` esconde as notas que não são “Não lembrei” e mostra o alerta `challenge.gradeLocked`. O componente de nota da v2 não tem `disabled`; a nota travada simplesmente não é oferecida.

Fallbacks que a tela conhece: `no_rubric`, `grader_error`, `quota` e `offline`. Cota dispara `paywall_viewed` com motivo `ai_quota`. O texto de `grader_error` é o aviso para revelar e avaliar.

`answer_submitted` sai com o modo, o tipo de entrada, o veredito e a latência. Se veio veredito, sai também `ai_graded` com veredito, latência, `costCents` e o nome do modelo cortado em 64 caracteres.

## O que a tela não faz

- Não chama o OpenRouter. Não guarda chave.
- Não mede custo. Mostra o `costCents` que a API mandar, dentro do evento.
- Não inventa a rubrica. Sem resposta da API, o card continua sem ela.
- O teste de 20 páginas e a avaliação dos 50 casos são do backend.
