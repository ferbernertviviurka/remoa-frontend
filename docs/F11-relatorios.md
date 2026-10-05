# F11 — Relatórios e telemetria (frontend)

Data: 2026-10-04. Os números são calculados na API (`remoa-backend/docs/F11-relatorios.md`). Este arquivo descreve a tela, o gráfico e o cliente de eventos.

## /progresso

`ProgressView` (`features/reports/progress-view.tsx`) recebe o `ProgressSummary` já pronto. Ao montar, dispara `progress_viewed`.

Três cartões: retenção em 7 dias, retenção em 30 dias e sequência. `null` vira o texto `progress.none`, não “0%”. A sequência é o inteiro `streakDays`.

O gráfico é `BarChart` de `@remoa/ui` (`packages/ui/src/chart.tsx`). São as 30 barras de `reviewsPerDay`. O rótulo de cada barra é a data em pt-BR e a contagem (`progress.dayCount`). A seção tem `aria-label` vindo da string do gráfico.

A lista de cards fracos mostra o título, a lembrança em percentual e o link “revisar” para `/mapas/${boardId}?modo=desafio`. Lista vazia mostra `progress.weakEmpty`. A tela não recalcula a lembrança. Se a API não mandar passo de fluxo nem máscara, eles não aparecem aqui.

A acurácia da área e a de cada item da matriz são renderizadas a partir de `summary.accuracy`. A linha sem `matrixItemId` é o total da área.

O botão de exportar pede `GET /v1/reports/attempts.csv` com o Bearer e baixa `tentativas.csv`. Falha mostra `progress.loadError`. O arquivo não inclui o texto da resposta; isso é corte da API.

`/conta` também oferece o mesmo CSV.

Esta tela não foi percorrida no browser logado na rodada em que a API ficou pronta. A lógica de agregação e o componente estão cobertos por teste.

## /editorial/metricas

A página lê `graderAgreement`. Quem não é revisor cai no `notFound` do Next. Outro erro da API mostra `editorial.metricsError`.

O número é o percentual de concordância e a frase com quantas notas foram alteradas em quantas correções (`overridden` e `submitted`). Sem tentativas, a API manda `agreement: null` e a fila mostra “—”.

## Eventos

`track` em `apps/web/src/lib/analytics.ts` valida o corpo com o zod estrito de `@remoa/contracts` e só então acrescenta:

- `plan`: `pro` se `sessionStorage remoa-plan` for `pro`, senão `free`. O shell grava isso com `rememberPlan`.
- `platform`: `pwa` se `matchMedia('(display-mode: standalone)')` casar, senão `web`.
- `appVersion`: a constante `0.0.0`.
- `boardId` e `area` quando `rememberBoard` gravou um mapa aberto em `remoa-board`. A área só entra se for `CM`.

Sem analytics externo (decisão do Fernando): o evento vai só para `window.__remoaEvents`, que o e2e lê. `trackWhenIdle` adia para o browser ficar ocioso; a landing é quem deve usar isso, para não competir com o LCP.


Onde os eventos desta leva saem:

| Evento | Onde |
|---|---|
| `ai_graded`, `answer_submitted`, `grade_overridden`, `review_completed` | sessão do desafio |
| `voice_used` | microfone: sucesso só com transcrição; falha no clique recusado, no vazio ou no erro |
| `rubric_generated` | inspector, ao gravar a rubrica |
| `board_generated_from_pdf` | Novo mapa, ao abrir o mapa gerado |
| `progress_viewed` | `/progresso` |
| `card_approved`, `version_published`, `dispute_resolved` | editorial |
| `seed_board_copied` | loja e o caminho de mapa pronto no Novo mapa |
| `offline_answer_synced` | cada item da fila offline aceito pela API |
| `pwa_installed` | `appinstalled` |
| `paywall_viewed` | cota de correção no desafio |

Não se acrescenta campo extra no corpo antes do parse. Os testes comparam o objeto com `toContainEqual`. Plano, plataforma e versão entram depois.

## Gráfico

`BarChart` desenha uma barra por item, com rótulo acessível por barra. O teste em `packages/ui/src/chart.test.tsx` cobre a renderização mínima. Não é uma biblioteca de gráficos à parte.
