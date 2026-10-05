// F18 T7: baselines 1440x900 de /i/[code] contra docs/design/v2/screens/convite-{valido,sucesso,invalido}.png. Só darwin.
// Update só de propósito: `pnpm test:e2e e2e/referral/convite-visual --update-snapshots`.
import { expect, test } from '@playwright/test';
import { createInviter, fillSignUp, openInvite } from './fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', reducedMotion: 'reduce' });
test.skip(process.platform !== 'darwin', 'baselines só em darwin');

test('visual convite: válido, sucesso e inválido', async ({ page, request }) => {
  test.setTimeout(120_000);
  const { code } = await createInviter(request, 'Ana');
  const shot = async (name: string) => {
    await page.mouse.move(2, 2);
    await page.waitForTimeout(700);
    await expect(page).toHaveScreenshot(`convite-${name}.png`, { animations: 'disabled', maxDiffPixelRatio: 0.02, mask: [page.locator('nextjs-portal')] });
  };

  await openInvite(page, 'ZZZZZZZZ');
  await shot('invalido');

  await openInvite(page, code);
  await shot('valido');
  await fillSignUp(page, `e2e-visual-conv-${Date.now()}@remoa.test`);
  await expect(page.getByRole('heading', { name: 'Conta criada.' })).toBeVisible();
  await shot('sucesso');
});
