import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { createSepseBoard, signUpAndLogin } from '../visual/fixture';

test.use({ viewport: { width: 1440, height: 900 } });

test('navbar: presença por rota, painel do plano Free (hover, clique, Esc, Tab) e a11y', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { headers } = await signUpAndLogin(page, request);
  const board = await createSepseBoard(request, headers);
  const bar = page.getByRole('banner');
  const chip = page.getByRole('button', { name: 'Ver detalhes do plano' });

  await page.goto('/app/hoje');
  await expect(bar).toBeVisible();
  await page.goto('/app/mapas');
  await expect(bar).toBeVisible();
  await expect(chip).toHaveText('Plano Free');
  await expect(page.getByRole('button', { name: 'Fazer upgrade' })).toBeVisible();

  const panel = page.getByRole('dialog', { name: 'Ver detalhes do plano' });
  await chip.hover();
  await expect(panel).toBeVisible();
  await page.mouse.move(700, 600);
  await expect(panel).toBeHidden();

  await chip.click();
  await expect(panel).toBeVisible();
  await page.mouse.move(700, 600);
  await expect(panel).toBeVisible(); // fixado
  await expect(panel.getByText('1 de 2')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();

  await chip.focus();
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: 'Fazer upgrade' })).toBeFocused();

  await page.waitForTimeout(700); // entrada pop (400 ms) e barras fillx: axe lê cor com opacidade parcial
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('navbar-painel-free.png') });

  await page.goto(`/app/mapas/${board}`);
  await expect(page.getByRole('banner')).toHaveCount(0);
});
