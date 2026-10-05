// F17 T8 (G09): "Compartilhar" no editor, /m/<token> sem sessão (só leitura, faixa, noindex), dono vai para o editor (D-295),
// senha (5 erradas = 401, a 6ª = 429), cópia pelo aluno B, novo link e "Só eu" dão 404. Precisa da API em :4000 e do web em :3000.
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { createSepseBoard, signUpAndLogin } from './visual/fixture';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const proxySecret = () => process.env.PROXY_SHARED_SECRET ?? /^PROXY_SHARED_SECRET="?([^"\n]*)/m.exec(readFileSync('.env.local', 'utf8'))?.[1] ?? '';
const axe = async (page: Page) => {
  await Promise.race([page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)))), page.waitForTimeout(1500)]);
  await page.waitForTimeout(200);
  // The read-only canvas (React Flow) is decorative here; the page landmarks, banner and CTA are what axe checks.
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};
const pathOf = (url: string) => new URL(url).pathname;

test.use({ viewport: { width: 1440, height: 900 } });

test('Público: copiar link, leitura sem sessão com faixa e noindex, dono vai ao editor, B copia, novo link e "Só eu" dão 404', async ({ page, browser, request }) => {
  test.setTimeout(240_000);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const { headers } = await signUpAndLogin(page, request);
  const boardId = await createSepseBoard(request, headers);

  // FR-12: diálogo no editor.
  await page.goto(`/app/mapas/${boardId}`);
  await page.getByRole('button', { name: 'Compartilhar' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Compartilhar' });
  await dialog.getByRole('radio', { name: 'Público' }).click();
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  const field = dialog.getByLabel('Link de compartilhamento');
  await expect(field).toHaveValue(/\/m\/[A-Za-z0-9_-]{43}$/);
  const url = await field.inputValue();
  expect(await axe(page), 'diálogo Compartilhar').toEqual([]);
  await dialog.getByRole('button', { name: 'Copiar' }).click();
  await expect(page.getByText('Link copiado').first()).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);

  // D-295: o dono que abre o próprio link vai para o editor.
  await page.goto(pathOf(url));
  await expect(page).toHaveURL(new RegExp(`/app/mapas/${boardId}$`));

  // FR-13: sem sessão, só leitura, faixa, noindex, sem dado do dono.
  const anon = await browser.newContext();
  const a = await anon.newPage();
  await a.goto(url);
  await expect(a.getByTestId('shared-board-disclaimer')).toHaveText('Mapa criado por um aluno. Não passou por revisão médica do Remoa.');
  await expect(a.getByRole('heading', { level: 1, name: 'Sepse' })).toBeVisible();
  await expect(a.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(a.getByRole('button', { name: /Renomear|Excluir|Compartilhar|Novo card/ })).toHaveCount(0);
  await expect(a.getByRole('button', { name: 'Copiar para os meus mapas' })).toBeVisible();
  expect(await axe(a), 'página pública').toEqual([]);

  // FR-15/FR-16: aluno B copia; a cópia é dele, abre no editor e tem a origem.
  const ctxB = await browser.newContext();
  const b = await ctxB.newPage();
  const { headers: hb } = await signUpAndLogin(b, request);
  await b.goto(url);
  await b.getByRole('button', { name: 'Copiar para os meus mapas' }).click();
  await expect(b).toHaveURL(/\/app\/mapas\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  const copyId = b.url().split('/').pop()!;
  expect(copyId).not.toBe(boardId);
  const copy = (await (await request.get(`${API}/v1/boards/${copyId}`, { headers: hb })).json()).data.board as { title: string; access: string; copiedFrom: { at: string } | null };
  expect(copy).toMatchObject({ title: 'Sepse', access: 'owner' });
  expect(copy.copiedFrom?.at).toEqual(expect.any(String));

  // Gerar novo link: o antigo dá 404. Voltar para "Só eu": o novo também.
  const rotated = (await (await request.put(`${API}/v1/boards/${boardId}/share`, { headers, data: { access: 'public', rotate: true } })).json()).data as { url: string };
  expect(rotated.url).not.toBe(url);
  await a.goto(url);
  await expect(a.getByText('Este link não está mais ativo')).toBeVisible();
  expect((await request.get(`${API}/v1/public/shared/${url.split('/m/')[1]}`)).status()).toBe(404);
  expect((await request.put(`${API}/v1/boards/${boardId}/share`, { headers, data: { access: 'owner' } })).status()).toBe(200);
  await a.goto(rotated.url);
  await expect(a.getByText('Este link não está mais ativo')).toBeVisible();
  await anon.close();
  await ctxB.close();
});

test('Privado: nada antes da senha; a certa libera; 5 erradas = 401 e a 6ª = 429', async ({ page, browser, request }) => {
  test.setTimeout(180_000);
  const { headers } = await signUpAndLogin(page, request);
  const boardId = await createSepseBoard(request, headers);
  const share = (await (await request.put(`${API}/v1/boards/${boardId}/share`, { headers, data: { access: 'password', password: 'turma2026' } })).json()).data as { url: string };
  const token = share.url.split('/m/')[1]!;

  // FR-14: só a tela de senha; a certa libera o mapa.
  const ok = await browser.newContext();
  const p = await ok.newPage();
  await p.goto(share.url);
  await expect(p.getByText('Mapa protegido por senha')).toBeVisible();
  await expect(p.getByText('Sepse')).toHaveCount(0);
  await expect(p.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  expect(await axe(p), 'tela de senha').toEqual([]);
  await p.getByLabel('Senha', { exact: true }).fill('turma2026');
  await p.getByRole('button', { name: 'Entrar' }).click();
  await expect(p.getByRole('heading', { level: 1, name: 'Sepse' })).toBeVisible();
  await ok.close();

  // 5 erradas pela tela: "Senha incorreta" (401 genérico); a 6ª: "Muitas tentativas" (429) e nada do mapa.
  const bad = await browser.newContext();
  const q = await bad.newPage();
  await q.goto(share.url);
  for (let i = 0; i < 5; i++) {
    await q.getByLabel('Senha', { exact: true }).fill(`errada-${i}`);
    await q.getByRole('button', { name: 'Entrar' }).click();
    await expect(q.getByText('Senha incorreta')).toBeVisible();
    await expect(q.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  }
  await q.getByLabel('Senha', { exact: true }).fill('turma2026');
  await q.getByRole('button', { name: 'Entrar' }).click();
  await expect(q.getByText('Muitas tentativas. Tente de novo em 15 minutos.')).toBeVisible();
  await expect(q.getByText('Sepse')).toHaveCount(0);

  // Mesma regra na API (por IP e link): 5 × 401 e a 6ª, mesmo com a senha certa, 429. D-537: o IP só vale pelo par confiável
  // (o mesmo que o servidor Next manda); um x-forwarded-for solto é ignorado e não abre um balde novo.
  const ip = { 'x-remoa-client-ip': `203.0.113.${Math.floor(Math.random() * 250)}`, 'x-remoa-proxy-secret': proxySecret() };
  // Rotating a spoofed x-forwarded-for stays in one bucket (the socket): after 6 wrong ones, the right password is 429.
  for (let i = 0; i < 6; i++) await request.post(`${API}/v1/public/shared/${token}/unlock`, { headers: { 'x-forwarded-for': `198.51.100.${i}` }, data: { password: `errada-${i}` } });
  expect((await request.post(`${API}/v1/public/shared/${token}/unlock`, { headers: { 'x-forwarded-for': '198.51.100.99' }, data: { password: 'turma2026' } })).status()).toBe(429);
  for (let i = 0; i < 5; i++) expect((await request.post(`${API}/v1/public/shared/${token}/unlock`, { headers: ip, data: { password: `errada-${i}` } })).status()).toBe(401);
  expect((await request.post(`${API}/v1/public/shared/${token}/unlock`, { headers: ip, data: { password: 'turma2026' } })).status()).toBe(429);
  await bad.close();
});
