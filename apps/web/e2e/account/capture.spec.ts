// Capture tool for the side-by-side review (G03): 1440x900 full-page of each section + the 2 dialogs + Pro plan.
// SHOTS_OUT=<dir> pnpm exec playwright test e2e/account/capture.spec.ts   (writes app-<name>.png; compare with docs/design/v2/screens)
import { test } from '@playwright/test';
import { accountUser, sections } from './fixture';

test.skip(!process.env.SHOTS_OUT, 'ferramenta de captura: defina SHOTS_OUT');
test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
test('shots', async ({ page, request }) => {
  test.setTimeout(240_000);
  const out = process.env.SHOTS_OUT ?? '/tmp';
  const only = process.env.SECTIONS?.split(',') ?? [...sections];
  await accountUser(page, request, 'Admin');
  const settle = async () => { await page.waitForLoadState('networkidle'); await page.waitForTimeout(1500); };
  for (const s of only) {
    await page.goto(`/conta/${s}`);
    await settle();
    await page.screenshot({ path: `${out}/app-${s}.png`, fullPage: true, animations: 'disabled' });
  }
  if (process.env.DIALOGS === '1') {
    await page.goto('/conta/perfil');
    await settle();
    await page.getByRole('button', { name: 'Adicionar foto' }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/app-foto.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await page.goto('/conta/dados');
    await settle();
    await page.getByRole('button', { name: 'Excluir conta' }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/app-excluir.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await page.goto('/conta/seguranca');
    await settle();
    await page.getByRole('button', { name: 'Alterar senha' }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/app-seguranca-senha.png`, fullPage: true, animations: 'disabled' });
  }
});
