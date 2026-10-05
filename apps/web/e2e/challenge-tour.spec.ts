// G14 ponto 19 (D-606): the challenge tour opens once, on the student's first own map; "Ver de novo" from the map menu / ⌘K.
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createBlankBoard } from './create-map';
import { signUpViaForm } from './sign-up';

test.use({ storageState: { cookies: [], origins: [] } }); // the config marks the tour as seen for every other spec

test('primeiro mapa: tutorial animado do desafio uma vez, quadros estáticos com movimento reduzido, "Ver de novo"', async ({ page }) => {
  test.setTimeout(120_000);
  await signUpViaForm(page, `e2e-tour-${Date.now()}@remoa.test`);
  await expect(page).toHaveURL(/\/app\/hoje$/);
  await page.goto('/app/mapas');
  await createBlankBoard(page, 'Primeiro mapa');
  const tour = page.getByRole('dialog', { name: 'Como funciona o desafio' });
  await expect(tour).toBeVisible();
  await expect(tour.getByText('Passo 1 de 4')).toBeVisible();
  // axe lê a cor no meio da entrada (opacity < 1) como falha de contraste: espera as animações finitas acabarem
  await page.waitForFunction(() => document.getAnimations().every((a) => a.effect?.getComputedTiming().iterations === Infinity || a.playState !== 'running'));
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations.map((v) => v.id)).toEqual([]);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const animations = () => tour.locator('.pop, .slide').evaluateAll((els) => els.map((e) => getComputedStyle(e).animationName));
  expect(new Set(await animations())).toEqual(new Set(['none']));
  for (const step of ['Responda um card', 'Revele e marque', 'Veja o mapa acender']) {
    await tour.getByRole('button', { name: 'Próximo' }).click();
    await expect(tour.getByRole('heading', { name: step })).toBeVisible();
  }
  await tour.getByRole('button', { name: 'Entendi' }).click();
  await expect(tour).toHaveCount(0);

  await page.reload();
  await expect(page.locator('.react-flow__pane')).toBeVisible();
  await expect(tour).toHaveCount(0); // once

  await page.getByRole('button', { name: 'Mais ações do mapa' }).first().click();
  await page.getByRole('menuitem', { name: 'Como funciona o desafio' }).click();
  await expect(tour).toBeVisible();
});
