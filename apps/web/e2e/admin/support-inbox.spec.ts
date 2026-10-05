// F19 FR-18: the full support loop. User files a ticket in the FAB modal, the admin answers in the inbox, the user sees the badge and the reply and answers back.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { accountUser, API, psql } from '../account/fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

test('user ticket → admin reply → user sees badge and reply → user answers; inbox axe clean', async ({ page, request, browser }) => {
  test.setTimeout(180_000);
  const user = await accountUser(page, request);
  const admin = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const apage = await admin.newPage();
  const a = await accountUser(apage, request, 'Equipe Teste');
  psql(`update profiles set role = 'admin' where user_id = '${a.userId}'`);
  const me = await request.get(`${API}/v1/admin/tickets`, { headers: a.headers });
  test.skip(me.status() !== 200, 'backend /v1/admin/tickets not available');

  const subject = `O mapa não salva ${Date.now()}`;
  await page.goto('/app/hoje');
  await page.getByRole('button', { name: /Abrir suporte/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Fale com o suporte' });
  await dialog.getByRole('button', { name: 'Algo não funciona' }).click();
  await dialog.getByLabel('Assunto').fill(subject);
  await dialog.getByLabel('O que aconteceu?').fill('Quando ligo dois cards a conexão some depois de recarregar a página.');
  await dialog.getByRole('button', { name: 'Enviar chamado' }).click();
  await expect(dialog.getByRole('status').filter({ hasText: /Chamado #\d+ enviado\./ })).toBeVisible();
  await page.keyboard.press('Escape');

  await apage.goto('/admin/suporte');
  await apage.getByRole('button', { name: new RegExp(subject) }).click();
  await expect(apage).toHaveURL(/[?&]t=/);
  await expect(apage.getByRole('heading', { level: 2, name: subject })).toBeVisible();
  await expect(apage.getByRole('log')).toContainText('Quando ligo dois cards');
  await apage.waitForTimeout(1000); // slide/pop animations
  const axe = await new AxeBuilder({ page: apage }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);

  // an internal note never reaches the user
  await apage.getByRole('switch', { name: 'Nota interna' }).click();
  await apage.getByLabel('Resposta').fill('Reproduzi aqui, parece o bug do autosave.');
  await apage.getByRole('button', { name: 'Salvar nota interna' }).click();
  await expect(apage.getByRole('log')).toContainText('parece o bug do autosave');
  await apage.getByRole('switch', { name: 'Nota interna' }).click();

  await apage.getByRole('button', { name: 'Estamos investigando' }).click();
  await apage.getByRole('button', { name: 'Enviar resposta' }).click();
  await expect(apage.getByRole('heading', { level: 2, name: subject }).locator('xpath=../..').getByText('Respondido', { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: /Abrir suporte, 1 resposta/ })).toBeVisible();
  await page.getByRole('button', { name: /Abrir suporte/ }).click();
  await dialog.getByRole('tab', { name: /Meus chamados/ }).click();
  await dialog.getByRole('button', { name: new RegExp(subject) }).click();
  await expect(dialog.getByRole('log')).toContainText('Já estamos investigando');
  await expect(dialog.getByRole('log')).not.toContainText('autosave');
  await dialog.getByLabel('Responder').fill('Obrigado, aguardo.');
  await dialog.getByRole('button', { name: 'Enviar resposta' }).click();
  await expect(dialog.getByRole('log')).toContainText('aguardo');

  await apage.reload();
  await apage.getByRole('button', { name: 'Marcar como resolvido' }).click();
  await expect(apage.getByRole('heading', { level: 2, name: subject }).locator('xpath=../..').getByText('Resolvido', { exact: true })).toBeVisible();
  void user;
  await admin.close();
});
