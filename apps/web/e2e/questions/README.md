# F33 — navegador com componentes de produção e API sintética

Este harness é exclusivo de QA. Renderiza os componentes reais da feature e seus validadores compartilhados em Vite. Substitui somente transporte/autenticação e navegação Next por adaptadores de teste. A API HTTP em memória responde em `127.0.0.1:4317`; não chama Supabase, IA, API 4000 ou banco do Remoa.

Todos os textos de questões e imagens são sintéticos e não médicos. Os números do acervo são fixtures, não inventário real. As prévias de prova/gabarito usam um SVG demonstrativo, portanto **não verificam a renderização de PDF real**. Papéis são parâmetros do harness; segurança da autorização real depende da etapa integrada com o backend.

## Reproduzir

Na pasta `remoa-frontend/apps/web`, com dependências existentes:

```sh
pnpm exec vite --config e2e/questions/harness/vite.config.mts
```

Em outro terminal, executar **sequencialmente** enquanto o servidor está ativo:

```sh
node e2e/questions/verify-ui.mjs
node e2e/questions/journeys-ui.mjs
```

Os scripts compartilham estado sintético e fazem reset explícito. Não executá-los em paralelo. Chromium instalado pelo Playwright e `axe-core` já são dependências do projeto. Em macOS restrito, execução do Chromium e escuta local podem exigir permissão do sandbox.

## Evidências

`artifacts/ui-report.json`: onze telas × duas larguras (1440 e 390), screenshots, WCAG A/AA do axe, largura horizontal e exceções JavaScript. Verifica que as telas carregam, em vez de aceitar screenshots de erro como sucesso.

`artifacts/journeys-report.json`: simulado com resposta persistida após reload e referências bloqueadas antes de finalizar; estudo com primeira resposta travada; anotação/dúvida persistidas; estado vazio IA e quota; figuras/descrição/motivo na conferência; revisão médica de um hash e publicação por administrador separado. Screenshots de resultado, correção, anotação, vazio e quota.

As fixtures incluem palavra/URL com mais de 200 caracteres, imagem de 1600 pixels e anotação longa. Jornadas usam viewport 390, contexto com touch, foco por teclado e verificação de dialog/retorno de foco.

## Limites

Este resultado é verificação de **UI com API stub**, não E2E do backend. Faltam nesta etapa autenticação real, guards SSR, transações/auditoria, PDF/OCR, filas externas, URLs assinadas reais, restrições de publicação reais e integração em banco isolado. Não existe fallback sintético no produto.

## Integração HTTP e PostgreSQL isolado

A segunda etapa usa os mesmos componentes de produção com `harness/vite-real.config.mts` e o adaptador `api-real.ts`. Os endpoints `/v1/*` vêm de `createApp` real, consultam PostgreSQL local isolado e verificam os papéis persistidos. JWT local sem assinatura criptográfica, armazenamento privado em memória e disparo manual do worker são exclusivos do entrypoint de teste; não validam Supabase Auth, R2/S3 ou Inngest externos. A prova PDF comprimida, extração por unpdf, associação do caderno/gabarito, revisão e transações de publicação são reais, com conteúdo sintético não médico.

O launcher recusa produção e qualquer URL fora de localhost e dos bancos explicitamente isolados. A URL é lida de arquivo privado, nunca impressa. Cada execução cria UUIDs próprios e remove somente seus atores, sessões, documentos, lotes, fontes e taxonomia ao finalizar. Nenhuma migração é executada. Não executar jornadas simultâneas. Execute `real-journeys.mjs` uma vez por execução do launcher; finalize e reinicie o backend para repetir com fixtures novas.

```sh
# remoa-backend/apps/api; manter até a execução do navegador terminar
node src/questions/e2e-harness/start.mjs /private/tmp/remoa-f33-test-url
# remoa-frontend/apps/web, segundo terminal
pnpm exec vite --config e2e/questions/harness/vite-real.config.mts
# terceiro terminal, mesma pasta web
node e2e/questions/real-journeys.mjs
# finalizar o backend e remover fixtures próprias depois de revisar os resultados
curl --request POST http://127.0.0.1:4341/__test/finish
```

Portas privadas: API 4341 e UI 4318. `artifacts/real-api/report.json` registra os gates reais; screenshots separados do stub. A navegação Vite não executa guards SSR Next nem autenticação externa. Os testes HTTP verificam 404 para papel inadequado e propriedade privada, respostas sem gabarito antes do gate e flags desligadas.

A captura do Chromium headless não mostra o visualizador PDF nativo no iframe. A entrega dos bytes privados e a extração real são verificadas; a apresentação do documento no visualizador nativo ainda exige conferência em navegador com esse recurso habilitado. O prazo vencido é exercitado adiantando somente o deadline da sessão própria pelo endpoint de teste, depois reabrindo a UI; não há substituição do relógio ou do cálculo do servidor.

A integração real cobre também a fila FR23: administrador vê relato privado com enunciado oculto, reviewer não acessa relato privado alheio, aluno recebe 404 administrativo. Triagem pública pelo reviewer e privada pelo admin exigem motivo/updatedAt; hashes, gabarito, revisão e publicação permanecem iguais. O relatório registra WCAG/overflow por captura, incluindo relato com palavra de 200 caracteres.

CCR116/117, ampliadas por CCR118: dez verificações reais no total. Não sei envia selectedKey:null e entra como erro; Pular não envia resposta. O simulado permite alterar Não sei antes de concluir. O recálculo completo ou incompleto é opcional, com motivo/versões/data; a nota e os resultados históricos permanecem preservados, enquanto referências retiradas são redigidas pelo gate atual. Instituição vem do endpoint dedicado e combina com ano e Prova/examId. As dezoito capturas reais registram WCAG A/AA e overflow.

CCR118 (10/10 verificações passando, 18 PNGs, axe/overflow zero): a prova sintética agora contém um quadrado e um triângulo vetoriais, sem palavra-chave de figura no texto. A jornada associa a página original inteira quando imageRefs está vazio, exige descrição/motivo, confere preservação do rascunho e revisão incrementada, verifica conflito de revisão, papel, bloqueio após publicação e flag de importação. Capturas adicionais em 390 e 1440 incluem a imagem privada gerada pelo renderer real.

Medição de bundle em 2026-10-08, após reduzir os namespaces globais e separar o transporte das flags: `pnpm --filter @remoa/web build` passou com as fontes reais. As 16 rotas F33 mediram 208–218 kB de First Load JS gzip; o compartilhado mediu 105 kB. `artifacts/bundle-report.json` registra valores por rota e ceilings com a margem existente de 5%. Somente essas rotas receberam ceilings em `perf-budgets.json`; todos os valores anteriores foram preservados. A meta informativa de 170 kB continua não atingida. `node apps/web/scripts/check-bundle.mjs /private/tmp/remoa-f33-next-build.log` permanece vermelho somente pelo ceiling preexistente de mapas/novo (188 > 177 kB, também 188 kB em HEAD) e registra cinco outras rotas sem ceiling; não houve `--update` global.

O fluxo com asset manual revelou divergência entre a ordem das chaves em JSON e JSONB no hash clínico. CCR119 estabilizou a canonização; a jornada repetida com namespace novo assinou e publicou corretamente, sem recalcular versões publicadas. O watch do Vite ignora testes, scripts e artefatos para impedir recarregamentos durante as interações. Não editar módulos de produção durante uma rodada de navegador.

CCR120: 47 testes focais passaram em 10 arquivos. A edição preserva as letras existentes, remove o gabarito quando sua alternativa sai, usa a primeira letra livre ao adicionar e exige nova conferência após alterações. Um rascunho `needs_review` pode ser salvo sem gabarito; a aceitação permanece bloqueada.

Comparação independente de HEAD: `artifacts/bundle-baseline-comparison.json` registra frontend `79cfecc` e backend `86ad6c5` arquivados integralmente em `/private/tmp`, com dependências externas instaladas e links `@remoa` locais de HEAD. O build usou fontes reais e uma API pública de teste vazia (GET 404, demais métodos 405) apenas para o comportamento vazio de blog já previsto no HEAD; nenhuma API compartilhada ou banco foi usado. Auditoria 258→267 kB, indicações 239→248 kB e transações 241→249 kB são aumentos do diff, identificados como imports legados do dicionário completo. Mapas/novo já media 188 kB em HEAD e continua 188 kB, acima do ceiling 177 kB. Após migrar somente dois imports para o dicionário admin, auditoria caiu para 212 kB, indicações para 192 kB e transações para 194 kB, todos dentro dos limites existentes. Os 14 testes administrativos passaram. O carregamento tardio de avisos do PDF e a seleção da única string editorial usada passaram nos 22 testes existentes de criação de mapa; o código específico caiu de 27,4 para 26,7 kB, mas First Load JS permaneceu em 188 kB.

CCR121–123: cinco testes novos de procedência limitada/privacidade, composição pública e início da discursiva selecionada passaram. O novo início usa resposta pública compartilhada e o sanitizador/tela F32 existentes; a integração HTTP desse endpoint e os screenshots dos metadados novos continuam pendentes. Next build final passou com tipos; ESLint das features próprias e dos três arquivos pontuais de CCR126 passou.

Onda HTTP11 preparada (ainda não executada): adiciona uma questão discursiva privada com enunciado maior que 4.000 caracteres e negação final, ligada a um mapa próprio sem cards. O início selecionado, retomada, item/attempts e contador de cota usam HTTP/PostgreSQL reais. Somente a resposta do provider IA é simulada no entry de teste; chamadas de geração/stream são proibidas e o launcher usa uma lista explícita de variáveis que não herda credenciais de provider. O frontend reutiliza a SessionScreen F32 existente. A jornada também confere procedência autorizada, cobertura pública com IA privada excluída, sucessora em rascunho, publicação retificada e retirada sem ressuscitar a antecessora. Isso não reclassifica os resultados anteriores de HTTP10.

Medição posterior com loaders específicos e flags sob demanda: build Next e tipos passaram; 59 testes focais/13 arquivos passaram. As 16 rotas F33 agora medem 176–218 kB iniciais, com o compartilhado em 105 kB e todos os ceilings preservados. A meta 170 kB continua pendente. O checker global falha somente em mapas/novo (189 > 177 kB; HEAD 188 kB). O loader inicial pelo namespace inteiro de contratos aumentava o carregamento posterior em 49,8 KiB no banco e foi substituído por folhas próprias que reexportam somente os validadores compartilhados usados. `bundle-report.json` preserva os valores anteriores e atuais.

`node apps/web/e2e/questions/bundle-flow.mjs` mede a união dos arquivos JS iniciais e dos schemas obrigatórios sob demanda. O resultado está em `artifacts/bundle-flow-report.json`: abrir o banco soma 212,2 KiB; iniciar a discursiva selecionada soma 230,9 KiB; listar provas soma 205,1 KiB; a sessão objetiva soma 207,2 KiB. São gzip KiB calculados sobre arquivos emitidos, sem CSS/API JSON/cabeçalhos e sem medição de rede no navegador. O ganho inicial não equivale ao mesmo ganho no fluxo completo. Esse script usa os manifestos do último build e deve ser reexecutado após qualquer build novo.

O launcher HTTP usa uma lista explícita de variáveis do processo filho, incluindo apenas o ambiente local necessário, banco isolado e segredos sintéticos de teste. Nenhuma credencial de provider é herdada. A arquitetura de IA passou em sete testes; as flags permanecem desabilitadas quando a resposta é inválida ou o schema não carrega, e uma resposta antiga não libera navegação após um refresh mais recente negado. HTTP11 continua preparado e não executado enquanto o PostgreSQL isolado estiver indisponível.

Última medição, após separar os modais por primeira abertura e mover somente o fallback legado para uma fronteira cliente que preserva SSR: build/tipos passaram. Os 64 testes focais/15 arquivos passaram, com reexecução dos cinco testes de fronteira após o wrapper final; lint/tipos passaram. As listas de provas/simulados agora medem 140 kB, a sessão 156 kB, o inventário administrativo 143 kB e a fila editorial 141 kB. O banco mede 176 kB e os formulários/detalhes 206–218 kB: a meta 170 continua pendente para esses casos. O único ceiling global reprovado continua mapas/novo (188 > 177 kB, igual ao HEAD). Valores anteriores no texto são medições históricas; os JSONs apontam a última medição.

Na última união gzip KiB de JS: banco 204,8 KiB, provas 169,2 KiB e sessão 183,9 KiB. O relatório também calcula a transferência adicional dos três modais e do início da discursiva selecionada. As validações e os componentes existentes são reutilizados. Os modais permanecem montados depois da primeira abertura para preservar rascunhos e chaves de idempotência; falha no carregamento oferece retry/fechar localmente e Escape enquanto carrega. A revisão de navegador após essas fronteiras e HTTP11 permanecem pendentes até seus relatórios específicos.


CCR127 — última medição: build Next passou, 64 testes focais/15 arquivos passaram e tipos/lint das features passaram. Constantes vêm da folha sem Zod; source/upload/candidate/review usam os mesmos schemas compartilhados sob demanda no submit, e o editor de rascunho carrega apenas para administrador autorizado em draft/in_review, com estado de carregamento e retry local. Nada modifica os gates clínicos, direitos, classificação, revisão ou hash. A mensagem de falha do modal agora descreve abertura, e não salvamento.

First Load JS final (kB arredondados pelo Next): fontes 182, importar 180, staging 186, detalhe editorial 183; inventário 143, fila editorial 142, banco 176, provas/simulados 140 e sessão 156. Relatos permanecem 206. O checker global permanece vermelho apenas por mapas/novo 189 > 177 (HEAD 188); nenhum ceiling foi elevado. A meta informativa de 170 kB ainda não foi atingida em parte das rotas.

União estática gzip KiB dos arquivos iniciais + validadores obrigatórios: fontes 206,8; importar 204,9; staging 210,8; detalhe editorial 207,8; banco 204,9; provas 169,2; sessão 184,0. O JSON também inclui modais, início selecionado e editor condicional de rascunho. Esses números não são transferência de rede observada. Logs finais: /private/tmp/remoa-f33-ccr127-next-build.log, /private/tmp/remoa-f33-ccr127-bundle-check.log e /private/tmp/remoa-f33-ccr127-bundle-flow.log. API localhost4351 GET404 usada somente no build, sem DB/auth/S3/provider externos.

A última rodada anterior de navegador com API stub passou 22 páginas, 6 jornadas e 4 estados da fronteira de modal, com axe/overflow zero. Foi repetida após CCR127 com os mesmos resultados: 22 páginas, 6 jornadas e 4 estados passaram; axe, overflow e exceções JS zero. Ela usa componentes reais e fixtures sintéticas, sem Next SSR ou PostgreSQL. HTTP11 permanece preparado e não executado enquanto o PostgreSQL isolado estiver indisponível.

Último replay de UI stub após CCR127: `/private/tmp/remoa-f33-ccr127-verify-ui.log`, `/private/tmp/remoa-f33-ccr127-journeys-ui.log` e `/private/tmp/remoa-f33-ccr127-dialog-boundary-ui.log`. Screenshots de staging mobile, revisão médica desktop e falha mobile foram inspecionados visualmente. Retry abre o formulário real, Escape/fechar devolvem foco e o rascunho permanece após reabertura. A checagem completa do frontend executada pelo orquestrador passou 10/10 tarefas antes desse replay. HTTP11 continua pendente, sem resultados fictícios de SQL.

Última otimização pontual de relatos: o schema de encaminhamento, usado só ao salvar, agora vem da mesma folha de schemas sob demanda; outros schemas nessa tela são importações apenas de tipo. Cinco testes focais passaram (inclui limite 500 caracteres aplicado antes de mutation, busy liberado para correção, motivo/foco após conflito e versão lida), tipos/lint e o único build passaram. As quatro rotas de relatos caíram de 206 para 177 kB First Load JS. O checker continua vermelho somente por mapas/novo189 >177; nenhum teto foi alterado e a meta170 permanece pendente. A união gzip KiB de relatos com validadores obrigatórios está no JSON da última medição e não é economia igual ao ganho inicial. Logs: /private/tmp/remoa-f33-reports-lazy-{tests,tsc,eslint,next-build,bundle-check,bundle-flow}.log. O replay stub22/6/4 anterior valida CCR127; não é atribuído automaticamente a esta mudança. HTTP11 continua pendente da infraestrutura isolada.

CCR130 — recuperação manual e contextos comuns: a rodada independente executada pelo orquestrador passou 10/10 jornadas (cinco em 390 px e cinco em 1440 px), com axe, overflow horizontal e exceções JS zero nas capturas. `artifacts/recovery/recovery-report.json` registra criação da questão ausente sem gabarito fabricado, reparo de número, associação de contexto/imagem por ID existente, decisão explícita de não questão, conflito com atualização deliberada da revisão e preservação do rascunho/ID. A interface retorna foco ao botão real de abertura após salvar, fechar e Escape. Os testes adicionais de foco passaram 5/5; tipos e lint focais passaram. Isso valida componentes reais com HTTP sintético estritamente validado, sem SQL, autenticação, armazenamento externo, provider ou Next SSR.

Reprodução local (cwd `remoa-frontend/apps/web`, em dois terminais):

```sh
node --import /Users/fernandoviviurka/Desktop/Projetos/remoa/remoa-backend/node_modules/.pnpm/tsx@4.23.15/node_modules/tsx/dist/loader.mjs /Users/fernandoviviurka/Desktop/Projetos/remoa/remoa-frontend/node_modules/.pnpm/vite@6.4.3_@types+node@20.19.43_jiti@2.7.0_lightningcss@1.32.0/node_modules/vite/bin/vite.js --config e2e/questions/harness/vite.config.mts --port 4327
F33_UI_BASE_URL=http://127.0.0.1:4327 node e2e/questions/recovery-ui.mjs
```

Use somente listener de teste local e não execute resets em paralelo. O middleware de fixtures é carregado na inicialização do Vite: uma sessão antiga precisa de outro listener isolado ou reinicialização deliberada; HMR dos componentes não atualiza necessariamente as fixtures. Cenários `recovery` e `recovery-conflict`, URL `/admin/questoes/importacoes/00000000-0000-4000-8000-000000000004`. O script usa Chromium completo (`channel: 'chromium'`), pois o headless shell aborta documentos PDF e mantém a confirmação bloqueada. O PDF é autoral, gerado localmente e não contém conteúdo médico; imagens ilustrativas são identificadas como fixtures. O carregamento do iframe não comprova renderização nativa precisa dos pixels nem conferência da região. Os controles em percentuais mostram a página original, mas ainda não desenham um overlay de bbox sobre o PDF. Não há bypass de readiness no código de produção.

As 14 capturas da rodada atual estão em `artifacts/recovery/` (`initial`, `create-ready`, `number-draft-preserved`, `context-ready`, `context-bound`, `non-question`, `conflict`, em ambas as larguras). `failure-390.png` preserva a falha histórica anterior ao ajuste de foco/seletores; não representa o replay final. `create-ready-390.png` e `context-bound-1440.png` foram inspecionadas visualmente. A nova rodada não reclassifica HTTP11, que continua pendente da infraestrutura isolada, nem atualiza medições antigas de bundle.


CCR130 — build atual executado pelo orquestrador: Next terminou com código 0 (`/private/tmp/remoa-f33-ccr130-root-next-build.log`). First Load JS (kB arredondados pelo Next): inventário/lista de importações 145, fontes 183, staging 191, importar 181, fila editorial 143, detalhe editorial 184, relatos 178, banco 176, provas/lista de simulados 140 e sessão 156; compartilhado 105. `artifacts/bundle-report.json` agora contém essas medidas e preserva valores anteriores em `beforeCcr130FirstLoadKb` e `historicalBeforeCcr130`, além dos baselines históricos e de todos os ceilings.

O checker atual terminou com código 1 somente por `/app/mapas/novo`: 189 > 177 kB (`/private/tmp/remoa-f33-ccr130-root-bundle-check.log`). As 16 rotas F33 permanecem dentro dos ceilings atuais; a meta informativa de 170 kB continua pendente para banco, formulários/detalhes e relatos. Nenhum teto foi elevado. Há cinco rotas sem ceiling no relatório global, que não foram alteradas por esta atualização.

A união estática gzip KiB atual, produzida pelo orquestrador em `artifacts/bundle-flow-report.json` às 03:13:53 UTC, mede: inventário 171,6; fontes 209,2; staging 217,0; importar 207,4; relatos 204,4; banco 205,8; provas 170,2; sessão 184,9; fila editorial 170,0; detalhe editorial 210,2. O JSON também preserva os fluxos opcionais de modais, início da discursiva e editor administrativo. Esses valores unem arquivos JS emitidos iniciais e schemas obrigatórios sob demanda; não são transferência de rede medida no navegador e excluem CSS, JSON, cabeçalhos e autenticação externa. Esta atualização é documental: não executou build, testes, banco, Docker ou publicação novos e não altera a pendência HTTP11.


CCR131 — a rodada independente final do orquestrador passou 18/18 verificações (nove em 390 px e nove em 1440 px), preservando as dez jornadas anteriores. Axe, overflow horizontal e exceções JS ficaram em zero. O relatório atual `artifacts/recovery/recovery-report.json` valida bytes/SHA do PDF autoral C01 de quatro páginas e PNGs originais das páginas 1 e 2, rasterizados a 100 DPI com 850 × 1100 pixels. O overlay acompanha a imagem real; a seleção usa percentuais normalizados, controles de teclado e posição de ponteiro com tolerância de um pixel CSS por arredondamento do navegador. Capturas adicionais de viewport e diálogo tornam os marcadores legíveis no celular.

As verificações incluem erro de API, dimensões intrínsecas divergentes, retry, expiração de 300 segundos, resposta atrasada de uma página anterior e imagem em cache. Cada nova prévia revoga a confirmação anterior; nenhum readiness é fabricado no produto. A barreira de corrida do teste espera a entrada da requisição antes de mudar de página e sempre libera a resposta em finally, com timeout limitado. As capturas históricas de falha permanecem como histórico. O original comprova a proveniência da fixture e a geometria no navegador; não comprova autenticação real, SQL, armazenamento privado externo, conferência médica, Next SSR ou extração automática de contextos. HTTP11 continua pendente da infraestrutura isolada.


CCR136 — replay independente final do orquestrador terminou com código 0: 20/20 verificações (dez em 390 px e dez em 1440 px), com axe, overflow horizontal e exceções JS zero. Os 20 testes focais de marker/page-preview/recovery-dialog também passaram. A rodada preserva as 18 verificações CCR131 e acrescenta zoom em cada largura. O relatório atual inclui duas entradas `zoomMeasurements`, com tamanhos reais, rolagem, ponteiro, coordenadas após teclado e alinhamento do overlay.

Zoom 150/200/300% mantém o mesmo PNG original verificado (850 × 1100 pixels), usando apenas CSS e rolagem interna. Em 390 px, as larguras medidas foram 460,19 / 613,59 / 920,39 pixels CSS; em 1440 px, 642 / 856 / 1284. A seleção após rolagem permaneceu alinhada dentro de um pixel CSS; setas movem 1% e Shift+setas 0,1%. Controles têm alvo mínimo de 46 pixels. Zoom sozinho mantém a confirmação; mudança de imagem/página restaura 100% e exige nova confirmação, e erro/expiração continuam bloqueando. O root inspecionou a captura mobile a 300% e confirmou legibilidade. Capturas `overlay-zoom-300-{390,1440}{,-viewport,-dialog}.png` e JSON ficam em `artifacts/recovery/`.

Esta evidência valida UI real com HTTP sintético estrito e bytes originais da fixture autoral. Não valida SQL, auth/storage externos, publicação médica ou Next SSR, nem implica resultado novo para HTTP11. Nenhum DPI, OCR, provenance ou backend foi alterado para implementar zoom. O listener isolado usado pelo root foi encerrado; a sessão antiga 4317 foi preservada.


CCR135 — painel de avisos da extração original: o replay independente do orquestrador de `parser-warnings-ui.mjs` terminou com código 0 e passou 14/14 verificações (sete em cada largura 390/1440), separadas das verificações de overlay/zoom. Use o mesmo listener Vite isolado e `F33_UI_BASE_URL=http://127.0.0.1:4327 node e2e/questions/parser-warnings-ui.mjs`. O middleware novo precisa ser carregado na inicialização; não execute os dois scripts/reset em paralelo. Cenários `recovery-warnings`, `-unknown`, `-incomplete`, `-pending`, `-not-recorded`, `-truncated` e `-denied` usam respostas validadas pelo schema compartilhado exato. O teste inclui recuperação manual seguida de atualização explícita: o aviso original permanece, mesmo após mudança do staging.

O relatório `artifacts/parser-warnings/parser-warnings-report.json` registra as 14 verificações aprovadas; as capturas estão no mesmo diretório, com axe, overflow horizontal e exceções JS checados pelo script. O orquestrador inspecionou visualmente `original-warning-390.png` e `incomplete-1440.png`. Este agente apenas atualizou a documentação a partir da execução independente. A nova rodada de overlay ainda estava em execução nesta atualização; este resultado de avisos não antecipa aprovação dela. Diagnósticos indisponíveis ou incompletos não viram totais zero; uma lista conhecida vazia com avisos desconhecidos não vira aprovação da extração. A recuperação abre vazia e não preenche número, página ou letra automaticamente. O teste é exclusivamente UI + HTTP sintético; não executa parser, SQL, autenticação ou armazenamento externos, e não autoriza publicação clínica. A interface usa o registro da tentativa original, não uma contagem atual de candidatas.
