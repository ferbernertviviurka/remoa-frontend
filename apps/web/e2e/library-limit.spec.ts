import { expect, test } from '@playwright/test';
import { createSepseBoard, signUpAndLogin } from './visual/fixture';

// F14 FR-20/21: the Free limit (2 maps, D-108) in Meus mapas. New accounts are Free.
test('meus mapas: limite Free de 2 mapas', async ({ page, request }) => {
  const { headers } = await signUpAndLogin(page, request);
  await createSepseBoard(request, headers);
  await page.goto('/app/mapas');

  // 1 of 2: new-map card with the remaining count + lock card; the header button still creates
  await expect(page.getByRole('link', { name: 'Criar um novo mapa' })).toContainText('Você ainda pode criar 1 mapa no plano Free.');
  await expect(page.getByText('Limite do plano Free')).toBeVisible();

  // search and list view hide the extra cards
  await page.getByLabel('Buscar mapa').fill('sepse');
  await expect(page.getByText('Limite do plano Free')).toHaveCount(0);
  await page.getByLabel('Buscar mapa').fill('');
  await page.getByRole('button', { name: 'Ver em lista' }).click();
  await expect(page.getByText('Limite do plano Free')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver em grade' }).click();

  // create the 2nd through the card, back in Meus mapas the plan is at the limit
  await page.getByRole('link', { name: 'Criar um novo mapa' }).click();
  await expect(page).toHaveURL(/\/mapas\/novo$/);
  await page.getByRole('button', { name: /Em branco/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Nome do mapa').fill('Segundo');
  await page.getByRole('button', { name: 'Criar mapa', exact: true }).click();
  await expect(page).toHaveURL(/\/mapas\/[0-9a-f-]{36}$/);
  await page.goto('/app/mapas');

  await expect(page.getByRole('link', { name: 'Criar um novo mapa' })).toHaveCount(0);
  await expect(page.getByText('O Free permite até 2 mapas. Faça upgrade para criar o próximo.')).toBeVisible();

  // lock button -> /planos, with the telemetry event
  await page.getByRole('button', { name: 'Novo mapa' }).first().click();
  await expect(page).toHaveURL(/\/planos\?de=library_lock$/);
  const events = await page.evaluate(() => window.__remoaEvents ?? []);
  expect(events).toContainEqual(expect.objectContaining({ event: 'upgrade_clicked', props: expect.objectContaining({ source: 'library_lock' }) }));
});
