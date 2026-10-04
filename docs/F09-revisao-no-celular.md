# F09 — Revisão no celular

Data: 2026-10-04. FRD `docs/features/F09-mobile-pwa.md`. Tudo desta feature está neste repo. A API que corrige a resposta está descrita em `remoa-backend/docs/F09-revisao-no-celular.md`.

Tema escuro seguindo o sistema não foi feito. Foi pedido para remover. Painéis escuros de layout (conta, hero) continuam. Em Preferências, “Escuro” fica desabilitado, com “Em breve”. Não há `prefers-color-scheme: dark` nem `data-theme` escuro no CSS.

## FR-1 — Barra e cabeçalho

Abaixo de 768 px (o `md` do Tailwind; a FRD dizia 760) o cabeçalho do app tem 65 px (`h-[65px] md:hidden`). A barra inferior tem os itens Revisar, Mapas, Cobertura, Loja e Conta. A FRD pedia “Revisar, Mapas, Enamed, Boards”. A decisão de produto manteve Loja e Conta, e Cobertura no lugar de Enamed. Alvos de toque da barra e das notas buscam no mínimo 44 px.

`viewport-fit=cover` e o padding de safe area entram no shell, para o conteúdo não ficar atrás do indicador do telefone.

## FR-2 — Um desafio por vez

`ChallengePanel` mostra um item, o campo de resposta, o microfone quando o modo é falar, o botão de corrigir e as notas. `RatingGroup` é `grid grid-cols-2`. O e2e `e2e/mobile-review.spec.ts` usa viewport 360×740.

“Sair do desafio” volta ao mapa sem o modo. Pular respeita `MAX_SKIPS`. Ao terminar a sessão, `countSession` incrementa `localStorage remoa-sessions`, que o convite de instalação lê.

## FR-3 — Lista no lugar do canvas

`mobileListInsteadOfCanvas` esconde o canvas abaixo de 768 px, exceto quando a URL tem `?modo=desafio`. A lista busca e filtra por estado e por lembrança. A busca dobra acento: NFD, remove marcas, minúsculas. “insuficiencia” encontra “Insuficiência cardíaca”. “Sépsie” não encontra “sepse”, porque depois da dobra as palavras continuam diferentes (`sepsie` e `sepse`).

Lista filtrada vazia mostra `map.listEmpty`: “Nenhum card com esse filtro.”

A folha do card é só leitura. Tem “Revisar este conceito” e o link “Editar no computador” para `/mapas/${boardId}`. Não há alça de arrastar nem edição de ligação nessa folha. A marca de rascunho de IA aparece aqui também, pelo `AiDraftTag`.

## FR-4 — Voz

`useSpeech` (`features/challenge/speech.ts`) usa `SpeechRecognition` ou `webkitSpeechRecognition`. `lang` é `pt-BR`. `interimResults` é falso: o texto só entra quando a frase fecha. Sem a API, `supported` é falso, o botão some e o campo de texto fica.

`start` devolve falso se o browser recusar. Isso dispara `voice_used` com `success: false`. Resultado vazio, erro ou `onend` sem texto também chamam `onFail` uma vez. `settled` é marcado antes da checagem de texto vazio, para `onend` não disparar de novo. Texto não vazio chama `onText`, preenche o campo e dispara `voice_used` com `success: true`. O aluno ainda aperta corrigir; a transcrição não é enviada sozinha.

O áudio não é enviado nem guardado. O que segue no POST é `{ inputKind: 'voice', text }`.

`SpeakFeedback` só monta quando a resposta que acabou de ser corrigida teve `inputKind` de voz. Fala em pt-BR o título do veredito e o feedback. Não fala se `data-motion=reduced` no documento ou se `prefers-reduced-motion: reduce`. Cancela a fala anterior ao montar e ao desmontar.

## FR-5 — Instalação

`app/manifest.ts`: nome Remoa, `short_name` Remoa, `start_url` `/revisar`, `display: standalone`, `theme_color` `#6D5BD0`, `background_color` `#f6f5fb`, `lang` pt-BR. Ícones: `/icon-192` (192, rota `src/app/icon-192/route.tsx`) e `/icon` (512, `any` e `maskable`, `src/app/icon.tsx`).

`Pwa` registra `/sw.js`. `beforeinstallprompt` sempre chama `preventDefault` e guarda o evento. O banner abre quando esse evento existe e `remoa-sessions` é pelo menos 2. Fechar o banner não grava a recusa: numa sessão seguinte ele pode voltar. `appinstalled` dispara `pwa_installed`.

Não há `beforeinstallprompt` no iOS, e não foi acrescentado um texto de “Adicionar à Tela de Início”. A plataforma do evento (`analytics.ts`) só vira `pwa` quando `display-mode: standalone`. `navigator.standalone` não é lido.

O middleware deixa de interceptar `sw.js` e `offline.html`. `/revisar` continua protegido: sem sessão, o redirect vai para `/entrar`. O service worker não pode guardar esse redirect como se fosse a página de revisão.

## FR-6 — Sem rede

Cache `remoa-shell-v5` em `public/sw.js` e em `features/shell/shell-cache.ts`. Ativar apaga outros caches cujo nome começa com `remoa-shell`.

Na instalação, busca `/offline.html`. Se a resposta é `ok` e não é redirect, guarda uma cópia em `/offline.html` e outra em `/revisar`. `shouldPrecacheOffline` é essa condição. Assim o login não é gravado como página inicial.

Numa navegação do shell (`/`, `/revisar`, `/hoje`, `/mapas`), a rede vem primeiro. Resposta ok, sem redirect, e com o mesmo path, entra no cache. Se a rede falha em `/revisar`, a resposta é o cache de `/offline.html` e, só se esse não existir, o cache de `/revisar`. Outros paths usam o cache da própria URL. O worker não intercepta outro origin: a API na porta 4000 não entra no cache.

`public/offline.html` está em pt-BR fixo, sem `t()`, porque não há app montado. O título vazio é “Sem conexão”. Se `localStorage remoa-last-session` existe (`{ kind, boardId?, data }`), mostra um item por vez, as notas, e enfileira resposta, nota e fim. Tira o último item ao concluir. O texto usa `textContent`, não `innerHTML`. O progresso do passo fica em `sessionStorage remoa-offline-step`. `window.addEventListener('online', () => location.reload())` remonta o app, e `Pwa` chama `flushOffline`.

A fila do app é `remoa-offline-answers`: no máximo 30 itens `{ path: 'answer' | 'rate' | 'finish', body }`. `flushOffline` reenvia em ordem. Sucesso sai da fila e dispara `offline_answer_synced`. Falha de rede ou `internal` fica. Rejeição de validação sai, para não repetir para sempre. A correção por IA só acontece nesse POST.

`remoa-queue` / `/revisar/fila.json` guarda a lista de revisão, mas `offline.html` não a lê. Os itens da fila não trazem o enunciado. Sem uma sessão já aberta neste aparelho, a página offline só avisa que não há conexão. Não se inicia uma sessão só para pré-carregar o enunciado, porque isso criaria sessão órfã no banco.

O e2e `e2e/pwa.spec.ts` (com o servidor já no ar) confere que `/revisar` sem rede responde 200 e o título é “Sem conexão”. Os testes de `shell-cache` conferem o nome do cache, o `cache.put` da página offline e do start, o `cache.match` da página offline e o listener de `online`.

Lighthouse não foi medido. O `npx lighthouse` não instala: o registro npm aponta para um Artifactory inacessível. Não há gate de categoria PWA no `.lighthouserc.json`. A checagem que existe é o Playwright.

## FR-7 — Safe area

`viewport-fit=cover` e os insets no banner de instalação (`bottom: calc(5.5rem + env(safe-area-inset-bottom))`) e no shell. O tema automático ficou de fora, como no início deste arquivo.
