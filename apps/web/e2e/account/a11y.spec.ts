// F13 / G03 T13: axe nas 5 seções e nos 2 diálogos, foco nos diálogos, aria-live, alvos de toque e movimento reduzido.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { accountUser, sections } from './fixture';

const axe = async (page: Page) => {
  await page.waitForTimeout(1000); // axe lê opacidade no meio de transições (slide 450 ms, anel 900 ms)
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
};

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('axe: 5 seções, formulário de senha e 2 diálogos', async ({ page, request }) => {
    test.setTimeout(180_000);
    await accountUser(page, request);
    for (const s of sections) {
      await page.goto(`/conta/${s}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await axe(page), s).toEqual([]);
    }
    await page.goto('/conta/seguranca');
    await page.getByRole('button', { name: 'Alterar senha' }).click();
    await page.getByLabel('Nova senha').fill('abc12345');
    expect(await axe(page), 'seguranca: formulário aberto').toEqual([]);

    await page.goto('/conta/perfil');
    await page.getByRole('button', { name: 'Adicionar foto' }).click();
    await expect(page.getByRole('dialog', { name: 'Foto de perfil' })).toBeVisible();
    expect(await axe(page), 'diálogo da foto').toEqual([]);
    await page.keyboard.press('Escape');

    await page.goto('/conta/dados');
    await page.getByRole('button', { name: 'Excluir conta' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await axe(page), 'diálogo de exclusão').toEqual([]);
  });

  test('teclado: foco preso nos diálogos e devolvido ao abrir', async ({ page, request }) => {
    test.setTimeout(120_000);
    await accountUser(page, request);
    await page.goto('/conta/perfil');
    const avatar = page.getByRole('button', { name: 'Alterar foto de perfil' });
    await avatar.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Foto de perfil' });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((d) => d.contains(document.activeElement)), `Tab ${i + 1}`).toBe(true);
    }
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(avatar).toBeFocused();

    await page.goto('/conta/dados');
    const del = page.getByRole('button', { name: 'Excluir conta' });
    await del.focus();
    await page.keyboard.press('Enter');
    const d2 = page.getByRole('dialog');
    await expect(d2).toBeVisible();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      expect(await d2.evaluate((d) => d.contains(document.activeElement)), `Tab ${i + 1}`).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(d2).toBeHidden();
    await expect(del).toBeFocused();
  });

  test('aria-live: os avisos são anunciados', async ({ page, request }) => {
    await accountUser(page, request);
    await page.goto('/conta/perfil');
    await page.getByRole('button', { name: 'Editar nome' }).click();
    await page.getByLabel('Nome', { exact: true }).fill('Novo Nome');
    await page.getByRole('button', { name: 'Salvar nome' }).click();
    const live = page.locator('[aria-live], [role="status"], [role="alert"]').filter({ hasText: 'Nome atualizado' });
    await expect(live.first()).toBeVisible();
  });
});

test.describe('mobile (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('alvos de toque >= 44 px em todas as seções', async ({ page, request }) => {
    test.setTimeout(180_000);
    await accountUser(page, request);
    for (const s of sections) {
      await page.goto(`/conta/${s}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForTimeout(1000);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('main button, main a[href], main input:not([type=hidden]), main [role=switch], main [role=radio]')]
          .filter((el) => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden]'))
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ el, r }) => r.width > 0 && (r.height < 43.5 || (r.width < 43.5 && el.tagName !== 'INPUT')) && !(el.tagName === 'A' && getComputedStyle(el).display === 'inline'))
          .map(({ el, r }) => `${el.tagName}.${(el.getAttribute('aria-label') ?? el.textContent ?? '').slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`),
      );
      expect(small, s).toEqual([]);
    }
  });
});

test.describe('movimento', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  const running = (page: Page) => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);

  test('sem preferência: a tela tem animação (estrela pulsa); prefers-reduced-motion e "Reduzir movimento" a desligam', async ({ page, request }) => {
    test.setTimeout(150_000);
    await accountUser(page, request);
    await page.goto('/conta/perfil');
    await page.waitForTimeout(1500);
    expect(await running(page), 'baseline anima').toBeGreaterThan(0);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/conta/perfil');
    await page.waitForTimeout(1500);
    expect(await running(page), 'prefers-reduced-motion').toBe(0);
    // valores finais direto: o arco do anel já está no valor (40% de 389,6 ≈ 155,8), não em 0
    const dash = await page.getByTestId('completeness-arc').getAttribute('stroke-dasharray');
    expect(Number(dash!.split(' ')[0])).toBeGreaterThan(100);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/conta/preferencias');
    await page.getByRole('switch', { name: 'Reduzir movimento' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await page.goto('/conta/perfil'); // preferência salva vale em toda a /conta e vem do servidor (cookie no SSR)
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await page.waitForTimeout(1500);
    expect(await running(page), 'opção Reduzir movimento').toBe(0);
    await page.getByRole('button', { name: 'Editar nome' }).click(); // expansão do formulário sem animar
    expect(await running(page), 'após expandir').toBe(0);
  });
});
