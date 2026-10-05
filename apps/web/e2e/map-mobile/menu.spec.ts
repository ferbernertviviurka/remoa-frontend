// F23 T8: aside (progress, layers, favorite, actions) and list mode on the phone map (Pixel 5 and iPhone 12).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createSepseBoard, signUpAndLogin } from '../visual/fixture';

test.use({ colorScheme: 'light' });
test.skip(({ isMobile }) => !isMobile, 'phone-only spec');

const aside = (page: Page) => page.getByRole('dialog', { name: 'Menu do mapa' });
const axe = async (page: Page) => {
  await page.waitForTimeout(700); // cascade + slide
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('nextjs-portal').analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
};

test('aside: progresso, camadas e favorito persistem; lista por prioridade; suporte; axe', async ({ page, request, browserName }) => {
  test.setTimeout(180_000);
  const { headers } = await signUpAndLogin(page, request);
  const board = await createSepseBoard(request, headers);
  await page.goto(`/app/mapas/${board}`);
  await expect(page.locator('.react-flow__node').first()).toBeVisible();

  const menu = page.getByRole('button', { name: 'Abrir o menu do mapa' });
  await menu.click();
  await expect(aside(page)).toBeVisible();
  await expect(aside(page).getByRole('heading', { name: 'Sepse' })).toBeVisible();
  const progress = aside(page).getByRole('region', { name: 'Progresso' });
  await expect(progress).toContainText(/lembrança estimada/);
  await expect(progress.getByRole('button', { name: /^Revisar este mapa/ })).toBeVisible();
  await expect(aside(page).getByRole('button', { name: /Vender na Loja/ })).toBeDisabled();
  for (const b of await aside(page).getByRole('button').all()) {
    const box = await b.boundingBox();
    if (box && (await b.isVisible())) expect(box.height, (await b.textContent()) ?? '').toBeGreaterThanOrEqual(44);
  }
  await axe(page);

  // layers + favorite survive a reload (prefs on this device)
  await aside(page).getByRole('switch', { name: /Mapa de calor da memória/ }).click();
  await aside(page).getByRole('switch', { name: /Rótulos das conexões/ }).click();
  await aside(page).getByRole('switch', { name: 'Favoritar' }).click();
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.locator('.react-flow__node').first()).toBeVisible();
  await menu.click();
  await expect(aside(page).getByRole('switch', { name: /Mapa de calor da memória/ })).toHaveAttribute('aria-checked', 'false');
  await expect(aside(page).getByRole('switch', { name: /Rótulos das conexões/ })).toHaveAttribute('aria-checked', 'false');
  await expect(aside(page).getByRole('switch', { name: 'Remover de favoritos' })).toBeVisible();

  // support opens the F19 modal over the map
  await aside(page).getByRole('button', { name: /Falar com o suporte/ }).click();
  await expect(page.getByRole('dialog', { name: /suporte|ajuda|fale/i })).toBeVisible();
  await page.keyboard.press('Escape');

  // list mode from the aside: ordered by urgency, real list, row goes back to the canvas
  await menu.click();
  await aside(page).getByRole('button', { name: /Cards em lista/ }).click();
  const list = page.getByRole('region', { name: 'Cards em ordem de prioridade' });
  await expect(list).toBeVisible();
  await expect(page.locator('.react-flow')).toHaveCount(0);
  const rows = list.getByRole('listitem');
  expect(await rows.count()).toBeGreaterThan(1);
  await expect(rows.first()).toContainText(/Revisitar|Acompanhar|Mais estável|Sem revisões/);
  for (const b of await list.getByRole('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await axe(page);
  await rows.first().getByRole('button').click();
  await expect(page.locator('.react-flow')).toHaveCount(1);
  await expect(page.locator('.react-flow__node.selected')).toHaveCount(1);

  // the toggle on the bar is the same view and survives a reload
  await page.getByRole('button', { name: 'Mostrar cards em lista' }).click();
  await page.waitForTimeout(600);
  await page.reload();
  await expect(list).toBeVisible();

  if (browserName === 'chromium') {
    // Android only (Q-088): swipe from the left edge opens the aside (CDP touch)
    await page.getByRole('button', { name: 'Voltar ao mapa' }).click();
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: 400 }] });
    await touch('touchStart', 6);
    for (const x of [30, 60, 100, 140]) await touch('touchMove', x);
    await touch('touchEnd', 140);
    await expect(aside(page)).toBeVisible();
  }
});
