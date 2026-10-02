// G01 v2 / T8: critérios de aceite verificáveis no navegador (teclado, abas, foco, pulse, camadas sem reflow, paleta ⌘K, zoom).
import { expect, test, type Page } from '@playwright/test';
import { seedMock, signUpAndLogin } from './visual/fixture';

test.use({ viewport: { width: 1440, height: 900 } });

const openSepse = async (page: Page, request: Parameters<typeof signUpAndLogin>[1]) => {
  const { userId, headers } = await signUpAndLogin(page, request);
  const { sepse } = await seedMock(request, headers, userId);
  await page.goto(`/mapas/${sepse}`);
  await expect(page.locator('.react-flow__node')).toHaveCount(6);
  await page.waitForTimeout(1200);
};
const anim = (page: Page) => page.locator('article.cv-pulse').evaluateAll((els) => els.map((e) => getComputedStyle(e).animationName));

test('nós: <button> dentro de <article>, operáveis por teclado, foco visível; abas com role=tablist', async ({ page, request }) => {
  test.setTimeout(120_000);
  await openSepse(page, request);
  const node = page.locator('article', { hasText: 'Choque séptico' }).first();
  await expect(node.locator('button')).toHaveCount(1);
  const btn = page.getByRole('button', { name: 'Selecionar Choque séptico' });
  await btn.focus();
  // foco visível: outline (ou box-shadow) não nulo no botão ou no article via :focus-within
  const ring = await btn.evaluate((e) => { const s = getComputedStyle(e); const a = getComputedStyle(e.closest('article')!); return { o: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, b: s.boxShadow !== 'none', a: a.outlineStyle !== 'none' || a.boxShadow !== 'none' }; });
  expect(ring.o || ring.b || ring.a).toBe(true);
  await page.keyboard.press('Enter');
  const panel = page.getByRole('complementary', { name: 'Painel do mapa' });
  await expect(panel.getByRole('heading', { level: 2, name: 'Choque séptico' })).toBeVisible();
  await expect(panel.getByRole('tablist')).toHaveCount(1);
  expect(await panel.getByRole('tab').count()).toBe(4);
  // setas navegam entre abas (padrão APG)
  await panel.getByRole('tab', { name: 'Conteúdo' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(panel.getByRole('tab', { name: 'Rubrica' })).toHaveAttribute('aria-selected', 'true');
  await expect(panel.getByRole('tabpanel')).toBeVisible();
  // botões só-ícone têm nome acessível (controles do canvas)
  const unnamed = await page.locator('button').evaluateAll((bs) => bs.filter((b) => !(b.getAttribute('aria-label') || b.textContent?.trim() || b.getAttribute('aria-labelledby'))).length);
  expect(unnamed).toBe(0);
});

test('camadas trocam cor/rodapé sem reflow; pulse só em vencido na Lembrança e some com reduced motion', async ({ page, request }) => {
  test.setTimeout(120_000);
  await openSepse(page, request);
  const boxes = () => page.locator('article').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }));
  await page.getByRole('button', { name: 'Lembrança', exact: true }).click();
  const base = await boxes();
  const footer = await page.locator('article', { hasText: 'Choque séptico' }).first().innerText();
  for (const layer of ['Estrutura', 'Cobertura', 'Lembrança']) {
    await page.getByRole('button', { name: layer, exact: true }).click();
    await page.waitForTimeout(300);
    expect(await boxes(), `reflow em ${layer}`).toEqual(base);
  }
  await page.getByRole('button', { name: 'Estrutura', exact: true }).click();
  expect(await page.locator('article', { hasText: 'Choque séptico' }).first().innerText()).not.toBe(footer); // rodapé muda
  // pulse: só na Lembrança, só nos vencidos (Choque séptico e Pacote), nunca nos demais
  await expect(page.locator('article.cv-pulse')).toHaveCount(0);
  await page.getByRole('button', { name: 'Lembrança', exact: true }).click();
  await expect(page.locator('article.cv-pulse')).toHaveCount(2);
  expect(new Set(await anim(page))).toEqual(new Set(['cv-ring']));
  for (const name of ['Sepse', 'Triagem', 'Caso 12']) await expect(page.locator('article', { hasText: name }).first()).not.toHaveClass(/cv-pulse/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(new Set(await anim(page))).toEqual(new Set(['none']));
});

test('paleta ⌘K: foco preso, busca, esc fecha e devolve o foco; zoom 60–140%', async ({ page, request }) => {
  test.setTimeout(120_000);
  await openSepse(page, request);
  const opener = page.getByRole('button', { name: 'Buscar ou comandar' });
  await opener.focus();
  await page.keyboard.press('Meta+k');
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole('combobox')).toBeFocused();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')), `Tab ${i} saiu do diálogo`).toBe(true);
  }
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(true);
  await dlg.getByRole('combobox').fill('choque');
  await expect(dlg.getByRole('option').first()).toContainText(/choque/i);
  await page.keyboard.press('Escape');
  await expect(dlg).toHaveCount(0);
  await expect(opener).toBeFocused();

  const pct = () => page.getByRole('group', { name: 'Controles de zoom' }).innerText();
  for (let i = 0; i < 12; i++) { await page.getByRole('button', { name: 'Diminuir zoom' }).click({ timeout: 1000 }).catch(() => undefined); await page.waitForTimeout(350); } // zoom anima
  expect(await pct()).toContain('60%');
  await expect(page.getByRole('button', { name: 'Diminuir zoom' })).toBeDisabled();
  for (let i = 0; i < 12; i++) { await page.getByRole('button', { name: 'Aumentar zoom' }).click({ timeout: 1000 }).catch(() => undefined); await page.waitForTimeout(350); }
  expect(await pct()).toContain('140%');
  await expect(page.getByRole('button', { name: 'Aumentar zoom' })).toBeDisabled();
});
