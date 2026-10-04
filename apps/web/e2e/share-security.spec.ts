// G09 revisão de segurança (qa, opus; D-542–D-544): senha, link e cópia vistos do lado de quem ataca.
// Precisa da API em :4000 e do web em :3000.
import { expect, test } from '@playwright/test';
import { createSepseBoard, signUpAndLogin } from './visual/fixture';

const API = 'http://localhost:4000';
test.use({ viewport: { width: 1440, height: 900 } });

test('Privado: cookie httpOnly/Lax no escopo do link; troca de senha volta para a tela de senha (sem erro) e a nova libera', async ({ page, browser, request }) => {
  test.setTimeout(180_000);
  const { headers } = await signUpAndLogin(page, request);
  const boardId = await createSepseBoard(request, headers);
  const share = (await (await request.put(`${API}/v1/boards/${boardId}/share`, { headers, data: { access: 'password', password: 'turma2026' } })).json()).data as { url: string };
  const token = share.url.split('/m/')[1]!;

  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(share.url);
  await p.getByLabel('Senha', { exact: true }).fill('turma2026');
  await p.getByRole('button', { name: 'Entrar' }).click();
  await expect(p.getByRole('heading', { level: 1, name: 'Sepse' })).toBeVisible();
  const cookie = (await ctx.cookies()).find((c) => c.name === 'remoa_share')!;
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: `/m/${token}` });
  expect(cookie.value).not.toContain('turma2026');
  expect(cookie.expires * 1000 - Date.now()).toBeLessThanOrEqual(12 * 3600 * 1000 + 60_000);

  // D-542: a liberação antiga (versão anterior) não pode derrubar a página; volta para a senha.
  expect((await request.put(`${API}/v1/boards/${boardId}/share`, { headers, data: { access: 'password', password: 'nova-senha' } })).status()).toBe(200);
  const res = await p.goto(share.url);
  expect(res?.status()).toBe(200);
  await expect(p.getByText('Mapa protegido por senha')).toBeVisible();
  await expect(p.getByText('Sepse')).toHaveCount(0);
  await p.getByLabel('Senha', { exact: true }).fill('nova-senha');
  await p.getByRole('button', { name: 'Entrar' }).click();
  await expect(p.getByRole('heading', { level: 1, name: 'Sepse' })).toBeVisible();
  await ctx.close();
});

test('API pública: noindex/no-store, nada privado na resposta; cópia exige liberação; "Só eu" e IDOR dão 404', async ({ page, browser, request }) => {
  test.setTimeout(180_000);
  const { headers, userId, email } = await signUpAndLogin(page, request);
  const boardId = await createSepseBoard(request, headers);
  const pub = (await (await request.put(`${API}/v1/boards/${boardId}/share`, { headers, data: { access: 'public' } })).json()).data as { url: string };
  const token = pub.url.split('/m/')[1]!;

  const r = await request.get(`${API}/v1/public/shared/${token}`);
  expect(r.headers()['x-robots-tag']).toBe('noindex');
  expect(r.headers()['cache-control']).toContain('no-store');
  const raw = await r.text();
  for (const leak of [userId, email, boardId, token, 'scrypt$', 'share_', 'userId', 'stability', 'retrievability']) expect(raw).not.toContain(leak);

  // aluno B: não lê, não muda e não vincula nada do mapa de A (404, nunca 403)
  const ctxB = await browser.newContext();
  const { headers: hb } = await signUpAndLogin(await ctxB.newPage(), request);
  const asB = async (method: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE', path: string, data?: unknown) => (await request.fetch(`${API}${path}`, { method, headers: hb, data })).status();
  expect(await asB('GET', `/v1/boards/${boardId}/share`)).toBe(404);
  expect(await asB('PUT', `/v1/boards/${boardId}/share`, { access: 'public', rotate: true })).toBe(404);
  expect(await asB('PATCH', `/v1/boards/${boardId}`, { title: 'hack' })).toBe(404);
  expect(await asB('PATCH', `/v1/boards/${boardId}`, { area: 'PED' })).toBe(404);
  const item = ((await (await request.get(`${API}/v1/matrix/items?area=CM`, { headers: hb })).json()).data as { id: string; parentId: string | null }[]).find((i) => i.parentId)!;
  expect(await asB('POST', '/v1/matrix/links', { boardId, matrixItemId: item.id })).toBe(404);
  expect((await (await request.get(`${API}/v1/boards/${boardId}`, { headers })).json()).data.board.title).toBe('Sepse');

  // Privado: B sem liberação (ou com uma forjada) não copia; "Só eu" = 404 na leitura, no unlock e na cópia.
  expect((await request.put(`${API}/v1/boards/${boardId}/share`, { headers, data: { access: 'password', password: 'turma2026' } })).status()).toBe(200);
  expect(await asB('POST', '/v1/boards/copy', { token })).toBe(403);
  expect((await request.post(`${API}/v1/boards/copy`, { headers: { ...hb, 'x-remoa-share-access': `g1.${Math.floor(Date.now() / 1000) + 3600}.forjada` }, data: { token } })).status()).toBe(403);
  expect((await request.get(`${API}/v1/public/shared/${token}`)).status()).toBe(200);
  expect(await (await request.get(`${API}/v1/public/shared/${token}`)).json()).toEqual({ ok: true, data: { locked: true } });
  expect((await request.put(`${API}/v1/boards/${boardId}/share`, { headers, data: { access: 'owner' } })).status()).toBe(200);
  expect((await request.get(`${API}/v1/public/shared/${token}`)).status()).toBe(404);
  expect((await request.post(`${API}/v1/public/shared/${token}/unlock`, { data: { password: 'turma2026' } })).status()).toBe(404);
  expect(await asB('POST', '/v1/boards/copy', { token })).toBe(404);
  await ctxB.close();
});

test('XSS: título e textos do aluno saem como texto na página pública', async ({ page, browser, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  const payload = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>';
  const id = (await (await request.post(`${API}/v1/boards`, { headers, data: { title: payload } })).json()).data.id as string;
  const ops = [{ op: 'createCard', opId: crypto.randomUUID(), boardId: id, card: { id: crypto.randomUUID(), type: 'concept', title: payload, position: { x: 0, y: 0 } } }];
  expect((await request.post(`${API}/v1/boards/ops`, { headers, data: { ops } })).status()).toBe(200);
  const url = ((await (await request.put(`${API}/v1/boards/${id}/share`, { headers, data: { access: 'public' } })).json()).data as { url: string }).url;
  const ctx = await browser.newContext();
  const a = await ctx.newPage();
  await a.goto(url);
  await expect(a.getByRole('heading', { level: 1 })).toHaveText(payload);
  await a.waitForTimeout(1500);
  expect(await a.evaluate(() => (window as { __xss?: number }).__xss)).toBeUndefined();
  await ctx.close();
});

test('D-544: abrir /m/<token>?copiar=1 recebido de outra pessoa não copia sozinho para quem já está logado', async ({ page, browser, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  const url = ((await (await request.put(`${API}/v1/boards/${await createSepseBoard(request, headers)}/share`, { headers, data: { access: 'public' } })).json()).data as { url: string }).url;
  const ctxB = await browser.newContext();
  const b = await ctxB.newPage();
  const { headers: hb } = await signUpAndLogin(b, request);
  await b.goto(`${url}?copiar=1`);
  await expect(b.getByRole('button', { name: 'Copiar para os meus mapas' })).toBeVisible();
  await b.waitForTimeout(3000);
  expect(b.url()).toContain('/m/');
  expect(((await (await request.get(`${API}/v1/boards`, { headers: hb })).json()).data as unknown[]).length).toBe(0);
  await ctxB.close();
});
