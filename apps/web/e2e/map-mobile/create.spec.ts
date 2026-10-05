import { createBlankBoard } from '../create-map';
import { signUpViaForm } from '../sign-up';
import { expect, test } from '@playwright/test';

// F23 T7 (Pixel 5). Each test signs up and creates its own board (T10).
// Behaviour of the sheet and the editor is covered at unit level in features/cards/mobile/*.test.tsx.
test.describe('F23: criar card pela sheet (Pixel 5)', () => {
  test('+ → Conceito → editor em folha cheia → Salvar → o card entra no mapa', async ({ page }) => {
    await signUpViaForm(page, `e2e-mmap-create-${Date.now()}@remoa.test`);
    await page.goto('/app/mapas');
    await createBlankBoard(page, 'Sepse mobile');
    await page.getByRole('button', { name: 'Criar card' }).click();
    await page.getByRole('button', { name: /^Conceito/ }).click();
    const editor = page.getByRole('dialog', { name: 'Novo conceito' });
    await expect(editor).toBeVisible();
    await editor.getByLabel('Título').fill('Lactato na sepse');
    await editor.getByRole('button', { name: 'Salvar' }).click();
    await expect(editor).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Lactato na sepse/ })).toBeVisible();
  });

  test('descartar alterações pede confirmação', async ({ page }) => {
    await signUpViaForm(page, `e2e-mmap-discard-${Date.now()}@remoa.test`);
    await page.goto('/app/mapas');
    await createBlankBoard(page, 'Descartar mobile');
    await page.getByRole('button', { name: 'Criar card' }).click();
    await page.getByRole('button', { name: /^Conceito/ }).click();
    const editor = page.getByRole('dialog', { name: 'Novo conceito' });
    await editor.getByLabel('Título').fill('Rascunho');
    await editor.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog', { name: 'Descartar as alterações?' })).toBeVisible();
  });
});
