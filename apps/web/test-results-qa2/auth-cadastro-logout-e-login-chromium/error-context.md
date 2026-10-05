# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> cadastro, logout e login
- Location: e2e/auth.spec.ts:13:1

# Error details

```
Error: page.waitForURL: Timeout 3000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "http://localhost:3198/app/hoje"
  "domcontentloaded" event fired
============================================================

Call Log:
- Timeout 30000ms exceeded while waiting on the predicate
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
          - img "e2e-1791228828160@remoa.test" [ref=f1e55]: E
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
  1  | import { expect, type Page } from '@playwright/test';
  2  | 
  3  | /** The auth forms set `data-ready` once hydrated; text typed before that is wiped by the controlled inputs (G08). */
  4  | export const formReady = (page: Page) => page.locator('form[data-ready]').waitFor();
  5  | 
  6  | /** Passo "Sobre você" (G14 15): só o tipo de usuário é obrigatório; segue para a confirmação. */
  7  | export async function fillAbout(page: Page, userType = 'Aluno') {
  8  |   await page.getByRole('radio', { name: userType }).click();
  9  |   await page.getByRole('button', { name: 'Continuar' }).click();
  10 | }
  11 | 
  12 | /** Cadastro pelo formulário em 3 passos (G08): conta, sobre você (tipo de usuário obrigatório), confirmação. */
  13 | export async function signUpViaForm(page: Page, email: string, password = 'senha-forte-123') {
  14 |   await page.goto('/cadastro');
  15 |   await formReady(page);
  16 |   await page.getByLabel('E-mail').fill(email);
  17 |   await page.getByLabel('Senha').fill(password);
  18 |   await page.getByRole('button', { name: 'Continuar' }).click();
  19 |   await fillAbout(page);
  20 |   await page.getByRole('checkbox').click();
  21 |   await page.getByRole('button', { name: 'Criar conta' }).click();
  22 |   await skipOnboarding(page);
  23 | }
  24 | 
  25 | /** F12: a new account lands in the onboarding first; most specs are about something else, so they skip it and end on Hoje. */
  26 | export async function skipOnboarding(page: Page) {
  27 |   // a new account always lands here (the redirect may flash /app/hoje first); under a long dev-server run the first /app/hoje render can stall: go to the onboarding directly
  28 |   await page.waitForURL(/\/app\/onboarding$/, { timeout: 30_000 }).catch(() => page.goto('/app/onboarding'));
  29 |   // a click before hydration is lost: retry until the navigation happens
  30 |   await expect(async () => {
  31 |     await page.getByRole('button', { name: 'Pular por enquanto' }).click();
  32 |     await page.waitForURL(/\/app\/hoje$/, { timeout: 3000 });
> 33 |   }).toPass({ timeout: 30_000 });
     |      ^ Error: page.waitForURL: Timeout 3000ms exceeded.
  34 | }
  35 | 
```