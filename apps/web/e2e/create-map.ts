import { expect, type Page } from '@playwright/test';

/** Meus mapas › Novo mapa › Em branco › Sobre o mapa › Criar mapa (F17, D-079). Leaves the page on the new board's editor. */
export async function createBlankBoard(page: Page, title: string) {
  await page.getByRole('button', { name: 'Novo mapa' }).first().click();
  await expect(page).toHaveURL(/\/mapas\/novo$/);
  await page.getByRole('button', { name: /Em branco/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Nome do mapa').fill(title);
  await page.getByRole('button', { name: 'Criar mapa', exact: true }).click();
  await expect(page).toHaveURL(/\/mapas\/[0-9a-f-]{36}$/);
}
