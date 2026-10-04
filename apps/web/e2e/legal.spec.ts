// F16 FR-15 (D-513): /termos and /privacidade are public, static, marked as preliminary and axe-clean.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const [path, title] of [['/termos', 'Termos de uso'], ['/privacidade', 'Política de privacidade']] as const) {
  test(`${path}: 200, título, aviso de versão preliminar e axe`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole('note')).toContainText('aguardando revisão jurídica (Q-016)');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
