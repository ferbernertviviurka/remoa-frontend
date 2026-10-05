import { expect, test } from '@playwright/test';
import { signUpAndLogin } from '../visual/fixture';

// G16/F22 Fase A contra a API real (/v1/store/*, migration 0025). O estado é por usuário: cada teste cria a sua conta.
test.use({ viewport: { width: 1440, height: 900 } });

test('trilho (etiqueta Breve) e Hoje levam à Loja em breve; simulador, prévia travada e lista de espera', async ({ page, request }) => {
  test.setTimeout(120_000);
  await signUpAndLogin(page, request);
  await page.goto('/app/hoje');
  const rail = page.getByRole('navigation', { name: 'Principal' });
  await expect(rail.getByRole('link', { name: /^Loja/ })).toContainText('Breve');
  await page.getByRole('link', { name: /Loja de mapas · Em breve/ }).click();
  await expect(page).toHaveURL(/\/app\/loja$/);
  await expect(page.getByRole('status').first()).toContainText('A Loja de mapas ainda não está disponível');

  // simulador: rótulo de exemplo, valor anunciado
  const slider = page.getByRole('slider', { name: 'Preço do mapa' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuetext', /R\$\s*54,00/);

  // prévia travada: nada focalizável
  const locked = page.locator('[aria-disabled="true"]').first();
  await expect(locked).toBeVisible();
  expect(await page.locator('[aria-disabled="true"] :is(a,button,input)').count()).toBe(0);

  // lista de espera: e-mail da conta pré-preenchido, vender exige perfil
  const email = page.getByRole('textbox', { name: 'E-mail' });
  await expect(email).not.toHaveValue('');
  await page.getByRole('button', { name: 'Quero vender os meus' }).click();
  await page.getByRole('button', { name: 'Entrar na lista de espera' }).last().click();
  await expect(page.locator('#lista').getByRole('alert')).toContainText('Conte se você é professor');
  await page.getByRole('group', { name: 'Quem você é' }).getByRole('button', { name: 'Médico formado' }).click();
  await page.getByRole('button', { name: 'Entrar na lista de espera' }).last().click();
  await expect(page.getByText('Você está na lista.')).toBeVisible();
  await page.getByRole('button', { name: 'Alterar minhas respostas' }).click();
  await expect(page.getByRole('button', { name: 'Quero vender os meus' })).toHaveAttribute('aria-pressed', 'true');

  // Minha conta: sair da lista
  await page.getByRole('button', { name: 'Entrar na lista de espera' }).last().click();
  await expect(page.getByText('Você está na lista.')).toBeVisible();
  await page.reload(); // estado vem da API, por usuário
  await expect(page.getByText('Você está na lista.')).toBeVisible();
  await page.goto('/app/conta/preferencias');
  await page.getByRole('button', { name: 'Sair da lista' }).click();
  await expect(page.getByRole('button', { name: 'Sair da lista' })).toHaveCount(0);
});
