// G01 v2 / T8: 1440x900 baselines (toHaveScreenshot) das telas do canvas v2. Update só de propósito: `pnpm test:e2e e2e/visual --update-snapshots`.
// MOCK_OUT=<dir> também grava os PNGs crus para comparar com docs/design/v2/screens (razão de diferença por tela; o mock tem dados que o produto não reproduz, D-088).
import { expect, test, type Locator } from '@playwright/test';
import { mask, seedMock, signUpAndLogin } from './fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

test('visual v2: Hoje, Meus mapas, Novo mapa (3 passos) e Editor', async ({ page, request }) => {
  test.setTimeout(240_000);
  const { email, userId, headers } = await signUpAndLogin(page, request);
  const { sepse } = await seedMock(request, headers, userId);
  const shot = async (name: string, extra: Locator[] = []) => {
    await page.waitForLoadState('networkidle');
    await page.mouse.move(2, 2);
    await page.waitForTimeout(500); // fitView / transitions
    if (process.env.MOCK_OUT) await page.screenshot({ path: `${process.env.MOCK_OUT}/${name}`, animations: 'disabled' });
    await expect(page).toHaveScreenshot(name, { mask: [...mask(page, email), ...extra], animations: 'disabled', maxDiffPixelRatio: 0.02 });
  };

  await page.goto('/app/hoje');
  await expect(page.getByRole('link', { name: 'Abrir o mapa Sepse' })).toBeVisible();
  // Saudação (hora do dia) e data do eyebrow são voláteis.
  // P-082: "Sua semana" (barras por dia da semana) e "Próximas revisões" (datas relativas) mudam com o dia da execução.
  await shot('hoje.png', [page.getByRole('heading', { level: 1 }), page.locator('h1').locator('xpath=preceding-sibling::span'), page.getByRole('region', { name: 'Sua semana' }), page.getByRole('region', { name: 'Próximas revisões' })]);

  await page.goto('/app/mapas');
  await expect(page.getByRole('link', { name: 'Sepse' }).first()).toBeVisible();
  await shot('mapas.png');

  await page.goto('/app/mapas/novo');
  await expect(page.getByRole('button', { name: /Em branco/ })).toBeVisible();
  await shot('novo-mapa.png');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await shot('novo-mapa-2.png');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await shot('novo-mapa-3.png');

  await page.goto(`/app/mapas/${sepse}`);
  await expect(page.locator('.react-flow__node')).toHaveCount(6);
  await expect(page.locator('.react-flow__edge')).toHaveCount(6);
  await page.waitForTimeout(1500);
  await shot('editor.png');
  await page.getByRole('button', { name: 'Selecionar Choque séptico' }).click();
  await expect(page.getByRole('complementary', { name: 'Painel do mapa' }).getByRole('heading', { level: 2, name: 'Choque séptico' })).toBeVisible();
  await page.waitForTimeout(600);
  await shot('editor-card.png');

  // Desafio (T6): mesmo editor com ?modo=desafio; a resposta digitada é o que o mock mostra.
  await page.goto(`/app/mapas/${sepse}?modo=desafio`);
  await expect(page.getByRole('button', { name: 'Corrigir resposta' })).toBeVisible();
  await page.getByLabel('Sua resposta').fill('Iniciar noradrenalina');
  await page.waitForTimeout(1200);
  await shot('desafio.png');
});
