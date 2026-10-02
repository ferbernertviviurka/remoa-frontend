// G01 v2 / T8: Novo mapa, 3 caminhos até o editor ou até o estado honesto (D-068/D-071/D-088).
import { expect, test, type Page } from '@playwright/test';
import { signUpAndLogin } from './visual/fixture';

test.use({ viewport: { width: 1440, height: 900 } });

const toStep3 = async (page: Page) => {
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sobre o que é este mapa?' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
};

test('novo mapa: em branco cria e abre o editor com matrixItemId; PDF, Anki e mapa pronto não fingem gerar', async ({ page, request }) => {
  test.setTimeout(120_000);
  await signUpAndLogin(page, request);
  const posts: { url: string; body: Record<string, unknown> }[] = [];
  const other: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'POST' || !r.url().includes('/v1/')) return;
    if (r.url().endsWith('/v1/boards')) posts.push({ url: r.url(), body: r.postDataJSON() });
    else other.push(r.url());
  });

  // PDF e Anki: CTA só com arquivo; depois, "Em breve" sem chamada à API.
  for (const [caminho, file, cta] of [['pdf', 'a.pdf', 'Gerar rascunho do mapa'], ['anki', 'a.apkg', 'Importar para o mapa']] as const) {
    await page.goto(`/mapas/novo?caminho=${caminho}`);
    await toStep3(page);
    await expect(page.getByRole('button', { name: cta })).toBeDisabled();
    await page.locator('input[type=file]').setInputFiles({ name: file, mimeType: 'application/octet-stream', buffer: Buffer.from('x') });
    await page.getByRole('button', { name: cta }).click();
    await expect(page.getByRole('dialog', { name: 'Em breve' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Fechar' }).first().click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  expect(posts).toEqual([]);

  // Mapa pronto: não existe (D-088): aviso honesto, CTA desabilitado.
  await page.goto('/mapas/novo?caminho=pronto');
  await expect(page.getByRole('button', { name: /De um mapa pronto/ })).toHaveAttribute('aria-pressed', 'true');
  await toStep3(page);
  await expect(page.getByRole('status')).toContainText('Os mapas prontos aparecem aqui');
  await expect(page.getByRole('button', { name: 'Adicionar ao meu mapa' })).toBeDisabled();

  // ?caminho= inválido cai em "Em branco"; padrão sem query é PDF.
  await page.goto('/mapas/novo?caminho=xyz');
  await expect(page.getByRole('button', { name: /Em branco/ })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/mapas/novo');
  await expect(page.getByRole('button', { name: /Do meu PDF/ })).toHaveAttribute('aria-pressed', 'true');

  // Em branco: cria, vai para o editor, com o item da matriz sugerido.
  await page.goto('/mapas/novo?caminho=blank');
  await toStep3(page);
  await expect(page.getByText('Tudo pronto para criar')).toBeVisible();
  await page.getByRole('button', { name: 'Criar mapa', exact: true }).click();
  await expect(page).toHaveURL(/\/mapas\/[0-9a-f-]{36}$/);
  expect(posts).toHaveLength(1);
  expect(posts[0]!.body.matrixItemId).toEqual(expect.any(String));
  expect(posts[0]!.body.area).toBe('CM');
  expect(other).toEqual([]);
  await expect(page.locator('.react-flow')).toBeVisible();
});
