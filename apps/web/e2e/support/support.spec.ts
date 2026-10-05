// F19 T6 (FR-1..FR-10): botão, envio, número, Meus chamados, ausência no editor, axe.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { accountUser, API } from '../account/fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

const axe = async (page: Page) => {
  await page.waitForTimeout(1200); // pop 400 ms, anel 900 ms
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};

test('abre pelo botão, envia, vê o número e o chamado em Meus chamados; axe limpo', async ({ page, request }) => {
  test.setTimeout(120_000);
  await accountUser(page, request);
  await page.goto('/app/hoje');
  await page.getByRole('button', { name: /Abrir suporte/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Fale com o suporte' });
  await expect(dialog).toBeVisible();
  expect(await axe(page), 'formulário').toEqual([]);

  const send = dialog.getByRole('button', { name: 'Enviar chamado' });
  await expect(send).toBeDisabled();
  await dialog.getByRole('button', { name: 'Algo não funciona' }).click();
  await dialog.getByLabel('Assunto').fill('O mapa não salva a conexão');
  await dialog.getByLabel('O que aconteceu?').fill('Quando ligo dois cards a conexão some depois de recarregar a página.');
  await expect(send).toBeEnabled();
  await send.click();

  const sent = dialog.getByRole('status').filter({ hasText: /Chamado #\d+ enviado\./ });
  await expect(sent, await dialog.innerText()).toBeVisible();
  const number = /#(\d+)/.exec((await sent.textContent()) ?? '')![1]!;
  expect(await axe(page), 'sucesso').toEqual([]);

  await dialog.getByRole('button', { name: 'Ver meus chamados' }).click();
  const item = dialog.getByRole('button', { name: new RegExp(`#${number}`) });
  await expect(item).toBeVisible();
  expect(await axe(page), 'meus chamados').toEqual([]);
  await item.click();
  await expect(dialog.getByRole('log')).toContainText('Quando ligo dois cards');
  await dialog.getByLabel('Responder').fill('Mais um detalhe: acontece só no Chrome.');
  await dialog.getByRole('button', { name: 'Enviar resposta' }).click();
  await expect(dialog.getByRole('log')).toContainText('só no Chrome');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /Abrir suporte/ })).toBeFocused();
});

test('ausente no editor e em novo mapa; ⌘K abre o suporte no editor', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await accountUser(page, request);
  const board = await request.post(`${API}/v1/boards`, { headers, data: { title: 'Sepse' } });
  const id = (await board.json()).data.id as string;
  await page.goto('/app/hoje');
  await expect(page.getByRole('button', { name: /Abrir suporte/ })).toBeVisible();
  await page.goto('/app/mapas/novo');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /Abrir suporte/ })).toHaveCount(0);
  await page.goto(`/app/mapas/${id}`);
  await expect(page.getByRole('button', { name: /Abrir suporte/ })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'Desafio' })).toBeVisible();
  await page.waitForTimeout(1500); // hydration: the ⌘K listener mounts with the canvas
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('suporte');
  await page.getByRole('option', { name: /Falar com o suporte/ }).click();
  await expect(page.getByRole('dialog', { name: 'Fale com o suporte' })).toBeVisible();
});
