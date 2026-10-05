# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y.spec.ts >> axe: Hoje, Meus mapas e Novo mapa (3 passos)
- Location: e2e/a11y.spec.ts:16:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/(app\/hoje)?$/
Received string:  "http://localhost:3198/entrar"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    24 × locator resolved to <html lang="pt-BR" class="__variable_01ae00 __variable_be5b54">…</html>
       - unexpected value "http://localhost:3198/entrar"


Call Log:
- Timeout 60000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - generic [ref=f1e2]:
    - banner [ref=f1e4]:
      - generic [ref=f1e5]:
        - link "Remoa, ir para Hoje" [ref=f1e6] [cursor=pointer]:
          - /url: /app/hoje
          - img "remoa" [ref=f1e7]
        - button "Ver detalhes do plano" [ref=f1e14] [cursor=pointer]: Plano Free
      - generic [ref=f1e18]:
        - button "Buscar ou comandar" [ref=f1e19] [cursor=pointer]:
          - generic [ref=f1e24]:
            - generic [ref=f1e25]: Buscar ou comandar
            - generic [aria-hidden] [ref=f1e26]: Buscar
            - generic [aria-hidden] [ref=f1e28]: ou
            - generic [aria-hidden] [ref=f1e30]: comandar
          - generic [ref=f1e32]: ⌘K
        - button "Notificações" [ref=f1e33] [cursor=pointer]
        - button "Indique e ganhe" [ref=f1e38] [cursor=pointer]
        - button "Fazer upgrade" [ref=f1e44] [cursor=pointer]:
          - generic [ref=f1e48]:
            - generic [ref=f1e49]: Fazer upgrade
            - generic [aria-hidden] [ref=f1e50]: Fazer
            - generic [aria-hidden] [ref=f1e52]: upgrade
        - link "Minha conta" [ref=f1e53] [cursor=pointer]:
          - /url: /app/conta/perfil
          - img "e2e-visual-1791228717051-8i4x@remoa.test" [ref=f1e55]: E
    - generic [ref=f1e56]:
      - navigation "Principal" [ref=f1e58]:
        - link "Hoje" [ref=f1e59] [cursor=pointer]:
          - /url: /app/hoje
        - link "Mapas" [ref=f1e64] [cursor=pointer]:
          - /url: /app/mapas
        - link "Revisar" [ref=f1e71] [cursor=pointer]:
          - /url: /app/revisar
        - link "Calendário" [ref=f1e75] [cursor=pointer]:
          - /url: /app/calendario
        - link "Enamed" [ref=f1e80] [cursor=pointer]:
          - /url: /app/cobertura
        - link "Progresso" [ref=f1e84] [cursor=pointer]:
          - /url: /app/progresso
        - link "Loja Breve" [ref=f1e88] [cursor=pointer]:
          - /url: /app/loja
          - generic [ref=f1e91]: Loja
          - generic [ref=f1e92]: Breve
      - main [ref=f1e94]:
        - generic [ref=f1e95]:
          - generic [ref=f1e96]:
            - generic [ref=f1e97]:
              - generic [ref=f1e98]: Segunda-feira, 5 de outubro
              - heading "Boa tarde. Seu primeiro mapa começa aqui." [level=1] [ref=f1e99]
            - generic [ref=f1e100]:
              - button "Importar" [ref=f1e101] [cursor=pointer]:
                - generic [ref=f1e105]:
                  - generic [ref=f1e106]: Importar
                  - generic [aria-hidden] [ref=f1e107]: I
                  - generic [aria-hidden] [ref=f1e108]: m
                  - generic [aria-hidden] [ref=f1e109]: p
                  - generic [aria-hidden] [ref=f1e110]: o
                  - generic [aria-hidden] [ref=f1e111]: r
                  - generic [aria-hidden] [ref=f1e112]: t
                  - generic [aria-hidden] [ref=f1e113]: a
                  - generic [aria-hidden] [ref=f1e114]: r
              - button "Novo mapa" [ref=f1e115] [cursor=pointer]:
                - generic [ref=f1e119]:
                  - generic [ref=f1e120]: Novo mapa
                  - generic [aria-hidden] [ref=f1e121]: Novo
                  - generic [aria-hidden] [ref=f1e123]: mapa
          - generic [ref=f1e124]:
            - generic [ref=f1e125]:
              - region [ref=f1e126]:
                - generic [ref=f1e127]:
                  - heading "Comece por aqui" [level=2] [ref=f1e128]
                  - generic [ref=f1e129]: 0 de 4 concluídos
                - progressbar "Comece por aqui" [ref=f1e130]
                - list [ref=f1e131]:
                  - listitem [ref=f1e132]:
                    - generic [ref=f1e134]:
                      - generic [ref=f1e135]: Criar 20 cards
                      - generic [ref=f1e136]: 0 de 20
                  - listitem [ref=f1e137]:
                    - generic [ref=f1e139]:
                      - generic [ref=f1e140]: Ligar 5 conexões
                      - generic [ref=f1e141]: 0 de 5
                  - listitem [ref=f1e142]:
                    - generic [ref=f1e144]:
                      - generic [ref=f1e145]: Fazer 1 sessão
                      - generic [ref=f1e146]: 0 de 1
                  - listitem [ref=f1e147]:
                    - generic [ref=f1e149]:
                      - generic [ref=f1e150]: Instalar no celular
                      - generic [ref=f1e151]: Abra o menu do navegador e escolha Instalar ou Adicionar à tela inicial.
              - region [ref=f1e152]:
                - generic [ref=f1e153]:
                  - generic [ref=f1e154]: Revisão de hoje
                  - heading "Crie o seu primeiro mapa." [level=2] [ref=f1e155]
                  - generic [ref=f1e156]: Cada card do mapa entra na revisão espaçada e a cobertura da matriz aparece aqui.
                  - button "Novo mapa" [ref=f1e158] [cursor=pointer]:
                    - generic [ref=f1e159]:
                      - generic [ref=f1e160]: Novo mapa
                      - generic [aria-hidden] [ref=f1e161]: Novo
                      - generic [aria-hidden] [ref=f1e163]: mapa
              - region [ref=f1e168]:
                - generic [ref=f1e169]:
                  - heading "Continue de onde parou" [level=2] [ref=f1e170]
                  - generic [ref=f1e171]:
                    - generic [ref=f1e172]:
                      - button "Mapas anteriores" [disabled] [ref=f1e173]
                      - button "Próximos mapas" [disabled] [ref=f1e176]
                    - link "Ver todos" [ref=f1e179] [cursor=pointer]:
                      - /url: /app/mapas
                - generic "Carrossel de mapas. Use as setas para navegar." [ref=f1e180]:
                  - generic [ref=f1e181]:
                    - group "1 de 2" [ref=f1e182]:
                      - link "Criar um novo mapa" [ref=f1e183] [cursor=pointer]:
                        - /url: /app/mapas/novo
                        - generic [ref=f1e188]:
                          - generic [ref=f1e189]: Novo mapa
                          - generic "Você ainda pode criar 2 mapas no plano Free." [ref=f1e190]
                    - group "2 de 2" [ref=f1e191]:
                      - generic [ref=f1e212]:
                        - generic "Limite do plano Free" [ref=f1e213]
                        - generic "O Free permite até 2 mapas. Faça upgrade para criar o próximo." [ref=f1e214]
                        - button "Fazer upgrade" [ref=f1e216] [cursor=pointer]:
                          - generic [ref=f1e220]:
                            - generic [ref=f1e221]: Fazer upgrade
                            - generic [aria-hidden] [ref=f1e222]: Fazer
                            - generic [aria-hidden] [ref=f1e224]: upgrade
              - region [ref=f1e225]:
                - generic [ref=f1e226]:
                  - heading "Cobertura da matriz do Enamed" [level=2] [ref=f1e227]
                  - generic [ref=f1e228]: Conteúdo mapeado, não peso de prova
                - paragraph [ref=f1e229]: Ligue um mapa a um item da matriz ao criar para ver a cobertura aqui.
            - complementary "Sua semana" [ref=f1e230]:
              - region [ref=f1e231]:
                - generic [ref=f1e232]:
                  - heading "Sua semana" [level=2] [ref=f1e233]
                  - generic [ref=f1e234]: 0 dias seguidos
                - generic [ref=f1e235]:
                  - generic [ref=f1e236]:
                    - 'img "Seg: 0 feitos, 0 previstos" [ref=f1e237]'
                    - generic [aria-hidden] [ref=f1e238]: Seg
                  - generic [ref=f1e239]:
                    - 'img "Ter: 0 feitos, 0 previstos" [ref=f1e240]'
                    - generic [aria-hidden] [ref=f1e242]: Ter
                  - generic [ref=f1e243]:
                    - 'img "Qua: 0 feitos, 0 previstos" [ref=f1e244]'
                    - generic [aria-hidden] [ref=f1e246]: Qua
                  - generic [ref=f1e247]:
                    - 'img "Qui: 0 feitos, 0 previstos" [ref=f1e248]'
                    - generic [aria-hidden] [ref=f1e250]: Qui
                  - generic [ref=f1e251]:
                    - 'img "Sex: 0 feitos, 0 previstos" [ref=f1e252]'
                    - generic [aria-hidden] [ref=f1e254]: Sex
                  - generic [ref=f1e255]:
                    - 'img "Sáb: 0 feitos, 0 previstos" [ref=f1e256]'
                    - generic [aria-hidden] [ref=f1e258]: Sáb
                  - generic [ref=f1e259]:
                    - 'img "Dom: 0 feitos, 0 previstos" [ref=f1e260]'
                    - generic [aria-hidden] [ref=f1e262]: Dom
                - generic [ref=f1e263]:
                  - generic [ref=f1e264]: Feitos
                  - generic [ref=f1e266]: Previstos
              - region [ref=f1e268]:
                - heading "Próximas revisões" [level=2] [ref=f1e269]
                - generic [ref=f1e270]:
                  - generic [ref=f1e271]: Hoje
                  - generic [ref=f1e272]: "0"
                - generic [ref=f1e273]:
                  - generic [ref=f1e274]: Amanhã
                  - generic [ref=f1e275]: "0"
                - generic [ref=f1e276]:
                  - generic [ref=f1e277]: Quarta-feira
                  - generic [ref=f1e278]: "0"
                - generic [ref=f1e279]:
                  - generic [ref=f1e280]: Quinta-feira
                  - generic [ref=f1e281]: "0"
              - region [ref=f1e282]:
                - heading "Próximos compromissos" [level=2] [ref=f1e284]
                - generic [ref=f1e285]:
                  - paragraph [ref=f1e286]: Nada marcado ainda. Adicione suas provas e receba um aviso por e-mail 1 dia antes e no dia.
                  - link "Adicionar compromisso" [ref=f1e287] [cursor=pointer]:
                    - /url: /app/calendario
              - region [ref=f1e290]:
                - heading "Comece algo novo" [level=2] [ref=f1e291]
                - link "Gerar mapa de um PDF Rascunho por IA para revisar" [ref=f1e292] [cursor=pointer]:
                  - /url: /app/mapas/novo?caminho=pdf
                  - generic [ref=f1e296]:
                    - generic [ref=f1e297]: Gerar mapa de um PDF
                    - generic [ref=f1e298]: Rascunho por IA para revisar
                - link "Importar do Anki Seu .apkg vira mapa" [ref=f1e299] [cursor=pointer]:
                  - /url: /app/mapas/novo?caminho=anki
                  - generic [ref=f1e303]:
                    - generic [ref=f1e304]: Importar do Anki
                    - generic [ref=f1e305]: Seu .apkg vira mapa
                - link "Mapa pronto Revisado por médico, com fonte" [ref=f1e306] [cursor=pointer]:
                  - /url: /app/mapas/novo?caminho=seed
                  - generic [ref=f1e311]:
                    - generic [ref=f1e312]: Mapa pronto
                    - generic [ref=f1e313]: Revisado por médico, com fonte
                - link "Indique um amigo Vocês dois ganham 1 mês de Pro." [ref=f1e314] [cursor=pointer]:
                  - /url: /app/indicar?de=home
                  - generic [ref=f1e319]:
                    - generic [ref=f1e320]: Indique um amigo
                    - generic [ref=f1e321]: Vocês dois ganham 1 mês de Pro.
                - link "Loja de mapas · Em breve Mapas feitos por quem já passou por isso" [ref=f1e322] [cursor=pointer]:
                  - /url: /app/loja
                  - generic [ref=f1e326]:
                    - generic [ref=f1e327]: Loja de mapas · Em breve
                    - generic [ref=f1e328]: Mapas feitos por quem já passou por isso
  - status [ref=f1e329]
  - status
  - button "Abrir suporte" [ref=f1e330] [cursor=pointer]: Suporte
  - status [ref=f1e334]
  - button "Open Next.js Dev Tools" [ref=f1e341] [cursor=pointer]
  - alert [ref=f1e345]
```

# Test source

```ts
  1   | // Shared by visual + a11y specs: fresh user via Supabase/API, optional "Sepse" board (test fixture, not content).
  2   | import { execFileSync } from 'node:child_process';
  3   | import { readFileSync } from 'node:fs';
  4   | import { expect, type APIRequestContext, type Page } from '@playwright/test';
  5   | import { formReady } from '../sign-up';
  6   | 
  7   | const env = (k: string) =>
  8   |   process.env[k] ?? new RegExp(`^${k}="?([^"\\n]*)"?$`, 'm').exec(readFileSync('.env.local', 'utf8'))?.[1] ?? '';
  9   | const SUPABASE = env('NEXT_PUBLIC_SUPABASE_URL');
  10  | const ANON = env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  11  | const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  12  | 
  13  | export async function signUpAndLogin(page: Page, request: APIRequestContext) {
  14  |   const email = `e2e-visual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@remoa.test`;
  15  |   const password = 'senha-forte-123';
  16  |   const signup = await request.post(`${SUPABASE}/auth/v1/signup`, { headers: { apikey: ANON }, data: { email, password } });
  17  |   const su = await signup.json();
  18  |   const token = su.access_token as string;
  19  |   await request.post(`${API}/v1/onboarding/complete`, { headers: { authorization: `Bearer ${token}` } }).catch(() => undefined); // F12: skip the onboarding redirect
  20  |   await expect(async () => { // retried: a submit before hydration is a native GET
  21  |     await page.goto('/entrar');
  22  |     await formReady(page);
  23  |     await page.getByLabel('E-mail').fill(email);
  24  |     await page.getByLabel('Senha').fill(password);
  25  |     await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  26  |     await expect(page).toHaveURL(/\/(app\/hoje)?$/, { timeout: 10_000 }); // D-086: pós-login cai no Hoje (10 s: Hoje compila/carrega devagar com a máquina carregada)
  27  |     await page.goto('/app/mapas');
> 28  |   }).toPass({ timeout: 60_000 });
      |      ^ Error: expect(page).toHaveURL(expected) failed
  29  |   return { email, userId: su.user.id as string, headers: { authorization: `Bearer ${token}` } };
  30  | }
  31  | 
  32  | const titles = ['Sepse', 'Choque séptico', 'Lactato', 'Culturas', 'Antibiótico precoce', 'Disfunção orgânica'];
  33  | const pos = [[320, 0], [0, 180], [320, 180], [640, 180], [160, 360], [480, 360]];
  34  | const links: [number, number, string][] = [[0, 1, 'pode evoluir para'], [1, 2, 'eleva'], [0, 3, 'colher'], [3, 4, 'antes de'], [0, 5, 'causa'], [5, 2, 'reflete']];
  35  | 
  36  | export async function createSepseBoard(request: APIRequestContext, headers: { authorization: string }) {
  37  |   const board = (await (await request.post(`${API}/v1/boards`, { headers, data: { title: 'Sepse' } })).json()).data.id as string;
  38  |   const ids = titles.map(() => crypto.randomUUID());
  39  |   const ops = [
  40  |     ...ids.map((id, i) => ({ op: 'createCard', opId: crypto.randomUUID(), boardId: board, card: { id, type: 'concept', title: titles[i], position: { x: pos[i]![0]!, y: pos[i]![1]! } } })),
  41  |     ...links.map(([a, b, label]) => ({ op: 'createEdge', opId: crypto.randomUUID(), boardId: board, edge: { id: crypto.randomUUID(), fromCardId: ids[a], toCardId: ids[b], label } })),
  42  |   ];
  43  |   expect((await request.post(`${API}/v1/boards/ops`, { headers, data: { ops } })).status()).toBe(200);
  44  |   return board;
  45  | }
  46  | 
  47  | // ---- G01 v2: dados do mock (Editor.dc.html "Sepse" + biblioteca) que o produto consegue reproduzir ----
  48  | type Headers = { authorization: string };
  49  | const call = async <T>(request: APIRequestContext, headers: Headers, path: string, method: 'GET' | 'POST' | 'PUT' = 'GET', data?: unknown) => {
  50  |   const r = await request.fetch(`${API}${path}`, { method, headers, data });
  51  |   expect(r.ok(), `${path} ${r.status()}`).toBeTruthy();
  52  |   return (await r.json()).data as T;
  53  | };
  54  | const psql = (sql: string) => {
  55  |   const db = process.env.DATABASE_URL ?? /DATABASE_URL="?([^"\n]*)/.exec(readFileSync('../../../remoa-backend/.env', 'utf8'))?.[1] ?? '';
  56  |   execFileSync('psql', [db, '-q', '-c', sql]);
  57  | };
  58  | const DAY = 86_400_000;
  59  | // FSRS-6 default decay: lastReview such that R(t, S=10d) = r.
  60  | const elapsedDays = (r: number) => { const d = 0.1542; return ((Math.pow(r, -1 / d) - 1) / (Math.pow(0.9, -1 / d) - 1)) * 10; };
  61  | 
  62  | type MockNode = [key: string, type: 'concept' | 'case' | 'flow' | 'image', title: string, x: number, y: number, r?: number, dueInDays?: number];
  63  | type MockEdge = [from: string, to: string, label: string];
  64  | 
  65  | async function mockBoard(request: APIRequestContext, headers: Headers, userId: string, title: string, nodes: MockNode[], edges: MockEdge[], matrixItemId: string | null) {
  66  |   const board = (await call<{ id: string }>(request, headers, '/v1/boards', 'POST', { title, area: 'CM', matrixItemId })).id;
  67  |   const id = Object.fromEntries(nodes.map(([k]) => [k, crypto.randomUUID()])) as Record<string, string>;
  68  |   await call(request, headers, '/v1/boards/ops', 'POST', { ops: [
  69  |     ...nodes.map(([k, type, t, x, y]) => ({ op: 'createCard', opId: crypto.randomUUID(), boardId: board, card: { id: id[k], type, title: t, position: { x, y } } })),
  70  |     ...edges.map(([a, b, label]) => ({ op: 'createEdge', opId: crypto.randomUUID(), boardId: board, edge: { id: crypto.randomUUID(), fromCardId: id[a], toCardId: id[b], label } })),
  71  |   ] });
  72  |   const now = Date.now();
  73  |   const rows = nodes.filter((n) => n[5] != null).map((n) => {
  74  |     const last = new Date(now - elapsedDays(n[5]!) * DAY).toISOString();
  75  |     const due = new Date(n[6] ? now + n[6] * DAY : now - 3_600_000).toISOString();
  76  |     return `('${userId}','${id[n[0]]}','',10,5,'${due}',3,0,'${last}','review',0,10)`;
  77  |   });
  78  |   if (rows.length) psql(`insert into fsrs_state (user_id, card_id, sub_id, stability, difficulty, due, reps, lapses, last_review, state, learning_steps, scheduled_days) values ${rows.join(',')}`);
  79  |   return { board, id };
  80  | }
  81  | 
  82  | /** Mapa "Sepse" do Editor.dc.html: 6 cards (tipos, posições, rótulos), conteúdo e estados FSRS (Choque séptico e Pacote vencem hoje a 58%/64%). */
  83  | export async function createMockSepse(request: APIRequestContext, headers: Headers, userId: string) {
  84  |   const items = await call<{ id: string; title: string }[]>(request, headers, '/v1/matrix/items?area=CM');
  85  |   const matrixItemId = items.find((i) => /sepse/i.test(i.title))?.id ?? null;
  86  |   const { board, id } = await mockBoard(request, headers, userId, 'Sepse', [
  87  |     ['sepse', 'concept', 'Sepse', 64, 150, 0.94, 6], ['triagem', 'concept', 'Triagem', 376, 120, 0.71, 3], ['caso12', 'case', 'Caso 12', 672, 130, 0.83, 4],
  88  |     ['choque', 'concept', 'Choque séptico', 64, 380, 0.58, 0], ['pacote', 'flow', 'Pacote da 1ª hora', 368, 350, 0.64, 0], ['rx', 'image', 'Rx de tórax: foco', 672, 380],
  89  |   ], [['sepse', 'triagem', 'suspeita'], ['triagem', 'caso12', 'treina'], ['sepse', 'choque', 'evolui para'], ['triagem', 'pacote', 'positiva'], ['pacote', 'choque', 'PAM < 65'], ['rx', 'pacote', 'foco']], matrixItemId);
  90  |   const put = (cid: string, body: object) => call(request, headers, `/v1/cards/${cid}`, 'PUT', { front: null, source: null, payload: {}, ...body });
  91  |   await put(id.sepse!, { title: 'Sepse', type: 'concept', back: 'Disfunção orgânica grave por resposta desregulada à infecção.', source: 'Sepsis-3 · Surviving Sepsis Campaign 2021' });
  92  |   await put(id.triagem!, { title: 'Triagem', type: 'concept', back: 'SIRS, NEWS2 ou qSOFA: nenhum isolado afasta sepse.' });
  93  |   await put(id.choque!, { title: 'Choque séptico', type: 'concept', back: 'Vasopressor para PAM ≥ 65 e lactato > 2 apesar de volume.', source: 'Sepsis-3 · Surviving Sepsis Campaign 2021' });
  94  |   await put(id.caso12!, { title: 'Caso 12', type: 'case', back: null, payload: { caseSteps: [{ stage: 'workup', text: 'PA 80/50, lactato 3,4' }, { stage: 'diagnosis', text: 'Choque séptico' }, { stage: 'management', text: 'Pacote da 1ª hora' }] } });
  95  |   await put(id.pacote!, { title: 'Pacote da 1ª hora', type: 'flow', back: null, payload: { steps: ['Dosar lactato', 'Hemoculturas antes do ATB', 'ATB de amplo espectro', 'Cristaloide 30 mL/kg', 'Noradrenalina se PAM < 65'].map((text, i) => ({ id: `s${i + 1}`, text })) } });
  96  |   psql(`update cards set rubric = '{"points":[{"text":"Noradrenalina se PAM < 65","essential":true}],"source":"Sepsis-3","version":1,"status":"rascunho","reviewerId":null}'::jsonb where board_id = '${board}'`);
  97  |   const pacoteSub = `('${userId}','${id.pacote}','s5',10,5,'${new Date(Date.now() - 3_600_000).toISOString()}',3,1,'${new Date(Date.now() - elapsedDays(0.5) * DAY).toISOString()}','review',0,10)`;
  98  |   psql(`insert into fsrs_state (user_id, card_id, sub_id, stability, difficulty, due, reps, lapses, last_review, state, learning_steps, scheduled_days) values ${pacoteSub}`);
  99  |   return board;
  100 | }
  101 | 
  102 | /** Hoje/Meus mapas completos: Sepse + 2 mapas menores com vencidos + tentativas nos 3 dias anteriores (semana preenchida). */
  103 | export async function seedMock(request: APIRequestContext, headers: Headers, userId: string) {
  104 |   // D-108: Free has 2 maps. The mock needs 3 (a legacy account keeps what it has), so create them as Pro and go back to Free.
  105 |   psql(`insert into subscriptions (user_id, plan, status) values ('${userId}','pro','active') on conflict (user_id) do update set plan='pro'`);
  106 |   try {
  107 |     return await seedMockBoards(request, headers, userId);
  108 |   } finally {
  109 |     psql(`delete from subscriptions where user_id = '${userId}'`);
  110 |   }
  111 | }
  112 | 
  113 | async function seedMockBoards(request: APIRequestContext, headers: Headers, userId: string) {
  114 |   const sepse = await createMockSepse(request, headers, userId);
  115 |   const ring = (t: string): [MockNode[], MockEdge[]] => [
  116 |     [['a', 'concept', t, 0, 0, 0.9, 5], ['b', 'concept', 'Conceito B', 300, 0, 0.6, 0], ['c', 'concept', 'Conceito C', 0, 180, 0.8, 4], ['d', 'concept', 'Conceito D', 300, 180, 0.55, 0]],
  117 |     [['a', 'b', 'leva a'], ['a', 'c', 'inclui'], ['b', 'd', 'causa']],
  118 |   ];
  119 |   const [n1, e1] = ring('Insuficiência cardíaca'); const [n2, e2] = ring('Pneumonia');
  120 |   const hf = await mockBoard(request, headers, userId, 'Insuficiência cardíaca', n1, e1, null);
  121 |   const pn = await mockBoard(request, headers, userId, 'Pneumonia', n2, e2, null);
  122 |   const cardId = Object.values(hf.id)[0]!;
  123 |   const att = [3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1]
  124 |     .map((d, i) => `(gen_random_uuid(),'${userId}','${cardId}','a${i}','hidden_card','text',3,now() - interval '${d} days')`).join(',');
  125 |   psql(`insert into attempts (id, user_id, card_id, sub_id, mode, input_kind, grade, created_at) values ${att}`);
  126 |   return { sepse, hf: hf.board, pn: pn.board };
  127 | }
  128 | 
```