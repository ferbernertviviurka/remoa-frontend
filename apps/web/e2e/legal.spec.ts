// F27 FR-42 (D-904): /termos-de-uso and /politica-de-privacidade are public, static, indexable and axe-clean; the old paths redirect.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const [path, old, title] of [['/termos-de-uso', '/termos', 'Termos de Uso'], ['/politica-de-privacidade', '/privacidade', 'Política de Privacidade']] as const) {
  test(`${path}: 200, título, índice e axe; ${old} redireciona`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Índice do documento' })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.goto(old);
    expect(new URL(page.url()).pathname).toBe(path);
  });
}
