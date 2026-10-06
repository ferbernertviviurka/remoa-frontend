// G15 Revisar: baseline 1440x900 do painel da fila (estado ativo e vazio). Só darwin. Update só de propósito:
// `npx playwright test e2e/visual/revisar --update-snapshots`. Título e data mudam com o relógio: mascarados.
import { expect, test } from '@playwright/test';
import { seedMock, signUpAndLogin } from './fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });

const settle = async (page: import('@playwright/test').Page) => {
  await page.waitForLoadState('networkidle');
  await page.mouse.move(2, 2);
  await page.waitForTimeout(2600); // anel 1,4 s + atraso, contagem 0,7 s
};

test('revisar: painel da fila e estado vazio', async ({ page, request }) => {
  test.setTimeout(180_000);
  const { userId, headers } = await signUpAndLogin(page, request);
  const masks = () => [page.getByRole('heading', { level: 1 }), page.locator('time'), page.locator('nextjs-portal'), page.getByText(/(segunda|terça|quarta|quinta|sexta|sábado|domingo)-?(feira)?, \d+ de/)];
  await page.goto('/app/revisar');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Vamos começar?');
  await settle(page);
  if (process.platform === 'darwin') await expect(page).toHaveScreenshot('revisar-vazio.png', { mask: masks(), stylePath: 'e2e/visual/hide-dev-badge.css' });
  if (process.env.R1_SHOTS) await page.screenshot({ path: `${process.env.R1_SHOTS}/revisar-vazio-1440.png`, fullPage: true });

  await seedMock(request, headers, userId);
  await expect(async () => { // hub cached 60 s on the API (only attempts invalidate it): reload until the seeded cards show
    await page.goto('/app/revisar');
    await expect(page.getByRole('button', { name: /^Começar revisão · \d+$/ })).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 90_000, intervals: [5_000] });
  await settle(page);
  if (process.platform === 'darwin') await expect(page).toHaveScreenshot('revisar-pendente.png', { mask: masks(), stylePath: 'e2e/visual/hide-dev-badge.css' });
  if (process.env.R1_SHOTS) {
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${process.env.R1_SHOTS}/revisar-pendente-1440.png`, fullPage: true });
  }
});
