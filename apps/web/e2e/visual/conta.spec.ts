// F13 / G03 T13: baselines 1440x900 (toHaveScreenshot) das 5 seções da Minha conta (+ Plano Pro), da foto e da exclusão.
// Só darwin (fontes e antialiasing do baseline). Update só de propósito: `pnpm test:e2e e2e/visual/conta --update-snapshots`.
// O lado a lado contra docs/design/v2/screens/conta-*.png está em docs/g03-lado-a-lado/ (o mock tem dados que o produto não reproduz).
import { expect, test } from '@playwright/test';
import { accountUser, sections } from '../account/fixture';
import { mask } from './fixture';

test.use({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
test.skip(process.platform !== 'darwin', 'baselines só em darwin');

test('visual conta: 5 seções, Pro, foto e exclusão', async ({ page, request }) => {
  test.setTimeout(240_000);
  const { email } = await accountUser(page, request, 'Admin');
  const shot = async (name: string, full = false) => {
    await page.waitForLoadState('networkidle');
    await page.mouse.move(2, 2);
    await page.waitForTimeout(1500); // slide 450 ms + anel/barras 900 ms
    const volatile = [
      ...mask(page, email),
      page.getByText(/Entrou em /), // mês corrente
      page.getByText(/[Rr]enova (em|às)|Ativo até/), // datas relativas ao dia
      page.getByText(/Última alteração/),
      page.getByText(/Visto |agora/), // dispositivos
      page.getByRole('list', { name: 'Lista de dispositivos' }).getByText(/Safari|Chrome|desconhecido/),
    ];
    await expect(page).toHaveScreenshot(name, { fullPage: full, mask: volatile, animations: 'disabled', maxDiffPixelRatio: 0.02 });
  };

  for (const s of sections) {
    await page.goto(`/app/conta/${s}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await shot(`conta-${s}.png`, true);
  }

  await page.goto('/app/conta/seguranca');
  await page.getByRole('button', { name: 'Alterar senha' }).click();
  await shot('conta-seguranca-senha.png', true);

  await page.goto('/app/conta/perfil');
  await page.getByRole('button', { name: 'Adicionar foto' }).click();
  await expect(page.getByRole('dialog', { name: 'Foto de perfil' })).toBeVisible();
  await shot('conta-foto.png');
  await page.keyboard.press('Escape');

  await page.goto('/app/conta/dados');
  await page.getByRole('button', { name: 'Excluir conta' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('textbox').blur();
  await shot('conta-excluir.png');
  await page.keyboard.press('Escape');

  // Pro: assina pelo checkout mock (STRIPE=mock), como o billing.spec.
  await page.goto('/app/planos');
  await page.getByRole('radio', { name: /^Cartão/ }).click();
  await page.getByRole('button', { name: 'Assinar o Pro' }).click();
  await expect(page).toHaveURL(/\/planos\/sucesso/);
  await expect(page.getByRole('dialog', { name: 'Você agora é Pro.' })).toBeVisible();
  await page.goto('/app/conta/plano');
  await shot('conta-plano-pro.png', true);
});
