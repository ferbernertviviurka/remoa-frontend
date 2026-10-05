// F17/G09 "Copiar" + FR-19/FR-21: copiar da página pública sem sessão (login e volta copiando), Free no limite vê o paywall,
// selo de acesso em Meus mapas e "Propriedades do mapa". Precisa da API em :4000 e do web em :3000.
import { expect, test } from '@playwright/test';
import { createSepseBoard, signUpAndLogin } from './visual/fixture';
import { formReady } from './sign-up';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
test.use({ viewport: { width: 1440, height: 900 } });

const publish = async (request: import('@playwright/test').APIRequestContext, headers: { authorization: string }, boardId: string) =>
  ((await (await request.put(`${API}/v1/boards/${boardId}/share`, { headers, data: { access: 'public' } })).json()).data as { url: string }).url;

test('Copiar sem sessão: login e volta copiando; Free no limite cai no paywall', async ({ page, browser, request }) => {
  test.setTimeout(240_000);
  const { headers } = await signUpAndLogin(page, request);
  const url = await publish(request, headers, await createSepseBoard(request, headers));

  // aluno B existe (conta nova, 0 mapas), mas a visita começa sem sessão
  const ctxB = await browser.newContext();
  const { email } = await signUpAndLogin(await ctxB.newPage(), request);
  const anon = await browser.newContext();
  const a = await anon.newPage();
  await a.goto(url);
  await expect(async () => {
    await a.getByRole('button', { name: 'Copiar para os meus mapas' }).click();
    await expect(a).toHaveURL(/\/entrar\?next=/, { timeout: 6000 });
  }).toPass({ timeout: 45_000 });
  await expect(async () => {
    await formReady(a);
    await a.getByLabel('E-mail').fill(email);
    await a.getByLabel('Senha').fill('senha-forte-123');
    await a.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(a).toHaveURL(/\/app\/mapas\/[0-9a-f-]{36}$/, { timeout: 8000 });
  }).toPass({ timeout: 60_000 }); // volta para /m/<token>?copiar=1 e copia sozinho
  await expect(a.getByRole('heading', { name: 'Sepse' }).first()).toBeVisible();
  await anon.close();

  // Free no limite (2 mapas): copiar abre o paywall e não cria o mapa
  const ctxC = await browser.newContext();
  const c = await ctxC.newPage();
  const { headers: hc } = await signUpAndLogin(c, request);
  await createSepseBoard(request, hc);
  await createSepseBoard(request, hc);
  await c.goto(url);
  await expect(async () => { // a click before hydration is lost: retry (at the limit, nothing is created)
    await c.getByRole('button', { name: 'Copiar para os meus mapas' }).click();
    await expect(c.getByRole('dialog', { name: 'Você chegou ao limite do Free' })).toBeVisible({ timeout: 6000 });
  }).toPass({ timeout: 45_000 });
  const list = (await (await request.get(`${API}/v1/boards`, { headers: hc })).json()).data as unknown[];
  expect(list).toHaveLength(2);
  await ctxB.close();
  await ctxC.close();
});

test('FR-19 selo de acesso em Meus mapas e FR-21 Propriedades do mapa', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  const boardId = await createSepseBoard(request, headers);
  await page.goto('/app/mapas');
  await expect(page.getByText('Público')).toHaveCount(0);

  await page.goto(`/app/mapas/${boardId}`);
  await page.getByRole('button', { name: 'Mais ações' }).first().click();
  await page.getByRole('menuitem', { name: 'Propriedades do mapa' }).click();
  const dialog = page.getByRole('dialog', { name: 'Propriedades do mapa' });
  await dialog.getByLabel('Nome do mapa').fill('Sepse revisada');
  await dialog.getByRole('radio', { name: 'Público' }).click();
  await dialog.getByRole('button', { name: 'Pediatria' }).click();
  await expect(dialog.getByText(/serão removidos deste mapa/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(dialog).toHaveCount(0);

  const b = (await (await request.get(`${API}/v1/boards/${boardId}`, { headers })).json()).data.board as { title: string; access: string; area: string };
  expect(b).toMatchObject({ title: 'Sepse revisada', access: 'public', area: 'PED' });
  await page.goto('/app/mapas');
  await expect(page.getByText('Público', { exact: true })).toBeVisible();
});
