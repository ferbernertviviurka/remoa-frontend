import { expect, type Page } from '@playwright/test';

/**
 * Meus mapas › Novo mapa › Em branco › Sobre o mapa › Criar mapa (F17, D-079). Leaves the page on the new board's editor.
 * G14: `?caminho=blank` already opens on "Sobre o mapa" (same path the onboarding takes). Clicks made before hydration are lost
 * (the dev server may also remount the page while compiling), so the form is retried from a fresh load until the board exists.
 */
export async function createBlankBoard(page: Page, title: string) {
  await expect(async () => {
    if (!/\/mapas\/novo/.test(page.url())) {
      const novo = page.getByRole('button', { name: 'Novo mapa' }).first();
      if (await novo.count()) await novo.click();
      else await page.goto('/app/mapas/novo');
    }
    await expect(page).toHaveURL(/\/mapas\/novo$/, { timeout: 4000 });
  }).toPass({ timeout: 20_000 });
  await expect(async () => {
    // A retry that already landed on the new board must not open the form again: that second click creates another map.
    if (/\/mapas\/[0-9a-f-]{36}$/.test(page.url())) return;
    if (!/caminho=blank/.test(page.url())) await page.goto('/app/mapas/novo?caminho=blank');
    await page.getByLabel('Nome do mapa').fill(title, { timeout: 5000 });
    await page.getByRole('button', { name: 'Criar mapa', exact: true }).click({ timeout: 5000 });
    await expect(page).toHaveURL(/\/mapas\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  }).toPass({ timeout: 45_000 });
}
